/**
 * @file src/server/serverless.js
 * @description Runs the Express API inside a serverless function (Vercel) instead of server.js.
 *
 * Each function instance connects to MongoDB/Redis once (on its first request) and reuses the
 * connections for later requests. There is no Socket.IO server and no background jobs here:
 * realtime broadcasts are no-ops (see config/socket.js) — full realtime needs server.js.
 */

import dns from 'dns';
import mongoose from 'mongoose';
import app from './app.js';
import database from './config/database.js';
import redisClient from './config/redis.js';
import logger from './config/logger.js';

let readyPromise = null;

const connectRedis = async () => {
  if (!process.env.REDIS_URL || redisClient.isOpen || redisClient.isReady) return;
  try {
    await redisClient.connect();
  } catch (err) {
    logger.warn(`[Serverless] Redis unavailable, using in-memory fallback: ${err.message || err}`);
    redisClient.isAvailable = false;
    try {
      await redisClient.disconnect();
    } catch (_) { /* already closed */ }
  }
};

/**
 * Connect MongoDB + Redis once per function instance. If MongoDB isn't connected
 * afterwards, the next request retries instead of staying offline for the instance's lifetime.
 */
export const ensureReady = () => {
  if (!readyPromise) {
    readyPromise = (async () => {
      // Same public resolvers database.js uses for Atlas SRV records — applied right before
      // connecting so they're in effect for the driver's lookup in every runtime.
      try {
        dns.setServers(['1.1.1.1', '8.8.8.8']);
        dns.promises.setServers(['1.1.1.1', '8.8.8.8']);
      } catch (err) {
        logger.warn(`[Serverless] Could not set DNS servers: ${err.message}`);
      }
      await database.connect();
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB connection could not be established');
      }
      await connectRedis();
    })().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
};

export default app;
