/**
 * @file src/middlewares/error.middleware.js
 * @description Centralized global error handling middleware wrapper.
 */

import logger from '../config/logger.js';
import fs from 'fs';
import path from 'path';

// logs/ lives at the project root (process.cwd() when started via server.js)
const ERROR_TRACE_PATH = path.resolve(process.cwd(), 'logs', 'error_trace.log');
try {
  fs.mkdirSync(path.dirname(ERROR_TRACE_PATH), { recursive: true });
} catch {
  // read-only filesystem (e.g. Vercel serverless) — trace file writes will just be skipped
}

export const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Standard log format
  logger.error(`[Error Handler] Routing Error: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  try {
    const logMsg = `\n[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\nError: ${err.message}\nStack: ${err.stack}\nBody: ${JSON.stringify(req.body)}\n`;
    // Non-blocking write — never stall the event loop while answering a request
    fs.promises.appendFile(ERROR_TRACE_PATH, logMsg).catch((logErr) => {
      logger.error('Failed to write error to trace log: ' + logErr.message);
    });
  } catch (logErr) {
    logger.error('Failed to write error to trace log: ' + logErr.message);
  }

  // Development VS Production responses
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }

  // Production response (clean sanitization)
  return res.status(err.statusCode).json({
    status: err.status,
    message: err.statusCode === 500 ? 'An unexpected internal server error occurred' : err.message,
  });
};

export default errorMiddleware;
