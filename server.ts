import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app';
import { initAdminAuth } from './server/adminAuth';
import { startCharacterRefresh } from './server/story/characters';
import { todayBoard } from './server/daily';
import { indexHtml } from './server/branding';
import { warmPacks } from './server/dailyPack';
import { t1000Configured } from './server/db';

const app = createApp();
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // index.html is rendered with the branding baked in (title, meta tags, theme), never served raw.
    app.use(express.static(distPath, { index: false }));
    const template = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.type('html').send(indexHtml(template));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
initAdminAuth();
startCharacterRefresh();
// Keep today's board (and its glitch for the story prompt) warm.
void todayBoard();
setInterval(() => void todayBoard(), 5 * 60 * 1000).unref();
// Today's quiz and incident get written before the first agent asks (cheap when they already exist).
void todayBoard().then(() => warmPacks());
setInterval(() => void warmPacks(), 15 * 60 * 1000).unref();
if (!t1000Configured()) console.warn('[agents] T1000_DATABASE_URL is not set: agents and XP live in memory and vanish on restart.');
