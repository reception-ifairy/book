import express, { type NextFunction, type Request, type Response } from 'express';
import { api } from './routes';
import { admin } from './admin';
import { MEDIA_DIR } from './story/store';

/**
 * Builds the HTTP app without listening, so tests can drive it on an ephemeral port.
 * `server.ts` adds the Vite dev middleware or the static build on top.
 */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Behind Cloud Run / a reverse proxy the client IP arrives in X-Forwarded-For; the rate limiter needs it.
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '8mb' }));
  app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }));
  app.use('/api/admin', admin);
  app.use('/api', api);
  app.use('/media', express.static(MEDIA_DIR, { maxAge: '7d', fallthrough: false }));

  // Malformed or oversized JSON bodies come back as JSON errors instead of Express's HTML page.
  app.use('/api', (err: any, _req: Request, res: Response, next: NextFunction) => {
    if (!err) return next();
    const status = err.type === 'entity.too.large' ? 413 : err.type === 'entity.parse.failed' ? 400 : err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status === 413 ? 'Request too large.' : status === 400 ? 'Malformed JSON.' : 'Server error.' });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown endpoint.' }));

  return app;
}
