import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { api } from './server/routes';
import { admin } from './server/admin';
import { MEDIA_DIR } from './server/story/store';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '8mb' }));
app.use('/api/admin', admin);
app.use('/api', api);
app.use('/media', express.static(MEDIA_DIR, { maxAge: '7d', fallthrough: false }));

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
