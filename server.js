/**
 * @file server.js
 * @description Single application entry point — one HTTP server for everything:
 *
 *   /api/*, /health, /uploads/*  → Express REST API      (src/server/app.js)
 *   /socket.io/*                 → Socket.IO realtime     (src/server/config/socket.js)
 *   everything else              → Next.js web app        (src/app)
 *
 * Usage:
 *   npm run dev     → Next.js dev mode (HMR) + API, restarts on backend changes (nodemon)
 *   npm run build   → production build of the web app
 *   npm start       → production web app + API (node server.js --prod)
 */

import dotenv from 'dotenv';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import next from 'next';
import app from './src/server/app.js';
import logger from './src/server/config/logger.js';
import database from './src/server/config/database.js';
import { startEventScheduler } from './src/server/modules/events/event.scheduler.js';
import { startConnectionCleanupJob } from './src/server/jobs/connectionCleanup.job.js';
import { startImageKitCleanupJob } from './src/server/jobs/imagekitCleanup.job.js'; // eslint-disable-line no-unused-vars
import { startPollExpiryJob } from './src/server/jobs/pollExpiry.job.js';
import { startAttendanceAutomationJob } from './src/server/jobs/attendanceAutomation.job.js';
import { closeAllConnections } from './src/server/utils/multidbConnection.js';
import { initSocket, getIO } from './src/server/config/socket.js';
import { getActiveWrites } from './src/server/modules/chat/chat.socket.js';
import redisClient from './src/server/config/redis.js';

// Load environment variables
dotenv.config();

// Verify REDIS_URL exists
if (!process.env.REDIS_URL) {
  logger.error('❌ REDIS_URL is missing');
  process.exit(1);
}

const PORT = parseInt(process.env.PORT || '5000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
// The web app runs in production mode with `--prod` (npm start) or NODE_ENV=production.
// Backend behaviour (rate limits, CORS, logging) still follows NODE_ENV exactly as before.
const isProdWeb = process.argv.includes('--prod') || NODE_ENV === 'production';

const nextApp = next({
  dev: !isProdWeb,
  dir: fileURLToPath(new URL('.', import.meta.url)),
  port: PORT
});
const handleNext = nextApp.getRequestHandler();

/** Requests owned by the Express API (everything else is the Next.js app). */
const isApiRequest = (url = '') => {
  const path = url.split('?')[0];
  return (
    path === '/api' || path.startsWith('/api/') ||
    path === '/health' || path.startsWith('/health/') ||
    path.startsWith('/uploads/')
  );
};

let server;
let isShuttingDown = false;

/**
 * Handle graceful shutdown of the application
 */
const shutdown = async (signal, error = null) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn(`Received ${signal}. Gracefully shutting down servers...`);
  if (error) {
    logger.error(`Shutdown triggered due to error: ${error.message || error}`, { stack: error.stack });
  }

  try {
    const io = getIO();
    if (io) {
      io.isShuttingDown = true;
      logger.info('Socket.io marked as shutting down. Stop accepting new connections.');
    }
  } catch (e) {
    logger.warn(`Socket.io is not initialized or getIO failed: ${e.message}`);
  }

  // Close servers immediately to stop listening on ports
  if (server) {
    server.close(() => {
      logger.info('HTTP (web + REST) and Socket.io server closed.');
    });
  }

  // 5-second drain window
  const drainTimeout = 5000;
  const startTime = Date.now();

  const checkDrain = async () => {
    const activeWrites = getActiveWrites();
    const elapsed = Date.now() - startTime;

    if (activeWrites === 0 || elapsed >= drainTimeout) {
      if (activeWrites > 0) {
        logger.warn(`Drain timeout reached. Forcefully shutting down with ${activeWrites} active writes in-flight.`);
      } else {
        logger.info('All in-flight message saves completed.');
      }

      // Force disconnect remaining socket connections
      try {
        const io = getIO();
        if (io) {
          logger.info('Closing active socket connections...');
          io.disconnectSockets(true);
        }
      } catch (e) {
        logger.error(`Error disconnecting active sockets: ${e.message}`);
      }

      try {
        await nextApp.close();
      } catch (e) {
        logger.warn(`Error closing Next.js: ${e.message}`);
      }

      try {
        await closeAllConnections();
        logger.info('Closed all database tenant connections.');
      } catch (err) {
        logger.error(`Error closing tenant connections during shutdown: ${err.message}`);
      }

      try {
        if (redisClient.isAvailable) {
          await redisClient.quit();
          logger.info('Redis connection closed gracefully.');
        }
      } catch (redisErr) {
        logger.error(`Error closing Redis connection during shutdown: ${redisErr.message}`);
      }

      try {
        await database.disconnect();
        logger.info('Main database connection closed.');
      } catch (dbErr) {
        logger.error(`Error closing main database connection during shutdown: ${dbErr.message}`);
      }

      process.exit(error ? 1 : 0);
    } else {
      setTimeout(checkDrain, 100);
    }
  };

  await checkDrain();
};

/**
 * Connect Redis and verify it is functional (falls back to in-memory mode when not)
 */
const connectRedis = async () => {
  try {
    await redisClient.connect();
    // Functional write check to ensure Redis is fully usable (e.g. not limited by free-tier limits)
    await redisClient.set('startup_test_key', 'ok', { EX: 2 });
    await redisClient.del('startup_test_key');
    const pingResponse = await redisClient.ping();
    logger.info('✅ Redis Connected');
    logger.info(`Redis Ping: ${pingResponse}`);
    console.log('✅ Redis Connected');
  } catch (err) {
    logger.error(`[Redis] Failed to connect or functional check failed on startup: ${err.message || err}`);
    redisClient.isAvailable = false;
    try {
      await redisClient.disconnect();
    } catch (_) { /* already closed */ }
    logger.warn('[Redis] Operating in fallback offline mode (in-memory caching & rate-limiting enabled)');
  }
};

/**
 * Initialize database, Redis, background jobs, Next.js and bind the shared HTTP server
 */
const bootstrap = async () => {
  try {
    // Prepare Next.js while the database and Redis connect — independent work, done in parallel
    await Promise.all([
      nextApp.prepare(),
      (async () => {
        await database.connect();
        await connectRedis();
      })()
    ]);

    // Background jobs run by default. Set BACKGROUND_JOBS=false on extra instances
    // (e.g. a second server against the same database) so reminders / auto punch-outs
    // aren't executed twice.
    if (process.env.BACKGROUND_JOBS !== 'false') {
      // Start background meeting reminder checks
      startEventScheduler();

      // Start background multi-db connection cleanup checks
      startConnectionCleanupJob();

      // Start background poll expiry checks
      startPollExpiryJob();

      // Start background attendance automation (Auto Punch-Out, Reminders, Missing Alerts)
      startAttendanceAutomationJob();

      // Background ImageKit cleanup sweep disabled as per user instruction
      // startImageKitCleanupJob();
    } else {
      logger.warn('BACKGROUND_JOBS=false — background jobs are not started on this instance.');
    }

    const httpServer = createServer((req, res) => {
      if (isApiRequest(req.url)) {
        app(req, res);
        return;
      }
      handleNext(req, res).catch((err) => {
        logger.error(`Next.js request handler error for ${req.url}: ${err.message}`, { stack: err.stack });
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });
    });

    // Socket.IO attaches its own `request`/`upgrade` listeners for /socket.io
    await initSocket(httpServer);

    // Remaining websocket upgrades (Next.js dev HMR) go to Next.js
    const handleNextUpgrade = nextApp.getUpgradeHandler();
    httpServer.on('upgrade', (req, socket, head) => {
      if ((req.url || '').startsWith('/socket.io')) return; // owned by Socket.IO
      handleNextUpgrade(req, socket, head).catch((err) => {
        logger.warn(`Next.js upgrade handler error: ${err.message}`);
        socket.destroy();
      });
    });

    server = httpServer.listen(PORT, () => {
      logger.info(`  Web app (Next.js ${isProdWeb ? 'production' : 'development'}), REST API and Socket.io running in [${NODE_ENV}] mode on port ${PORT}`);
      logger.info(`  Open http://localhost:${PORT}`);
      logger.info(`  Client URL allowed: ${process.env.CLIENT_URL || 'http://localhost:5000'}`);
    });

  } catch (error) {
    logger.error('Failed to bootstrap application server:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  shutdown('uncaughtException', error);
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap();
