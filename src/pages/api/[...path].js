/**
 * @file src/pages/api/[...path].js
 * @description Serverless entry for the Express API (used on Vercel).
 *
 * Every /api/* request is handed to the same Express app that server.js uses locally.
 * (When running server.js, /api requests reach Express directly and never get here.)
 */

// Must be set before the backend loads: switches Socket.IO to its serverless no-op mode
process.env.OMS_SERVERLESS = 'true';

export const config = {
  api: {
    bodyParser: false,        // Express parses the body itself (JSON / urlencoded)
    externalResolver: true,   // the response is sent by Express, not by this function
    responseLimit: false
  },
  maxDuration: 60
};

const REQUIRED_ENV = ['DB_URI', 'JWT_SECRET'];

const sendJson = (res, statusCode, body) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

export default async function handler(req, res) {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    sendJson(res, 503, {
      status: 'error',
      message: `Server is not configured: add ${missing.join(', ')} in Vercel → Project Settings → Environment Variables, then redeploy.`
    });
    return;
  }

  let app;
  try {
    const backend = await import('@/server/serverless');
    app = backend.default;
    await backend.ensureReady();
  } catch (err) {
    console.error('[API] Backend failed to start:', err);
    sendJson(res, 503, {
      status: 'error',
      message: 'Backend could not connect to the database. Check DB_URI and that MongoDB Atlas Network Access allows 0.0.0.0/0.'
    });
    return;
  }

  // Hand the raw Node request/response to Express:
  //  - Next.js pre-fills req.query with the catch-all `path` param; let Express parse the real query string
  //  - Next.js attaches its own res.status/json/send/redirect helpers; remove them so Express's are used
  try {
    delete req.query;
  } catch (_) { /* not configurable */ }
  req.query = undefined;
  for (const helper of ['status', 'send', 'json', 'redirect']) {
    if (Object.prototype.hasOwnProperty.call(res, helper)) delete res[helper];
  }

  await new Promise((resolve) => {
    res.on('finish', resolve);
    res.on('close', resolve);
    app(req, res);
  });
}
