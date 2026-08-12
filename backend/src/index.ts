import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import videoInfoRouter from './routes/videoInfo';
import downloadsRouter from './routes/downloads';

const app = express();
const PORT = process.env.PORT ?? 3001;
const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  app.use(cors({ origin: 'http://localhost:5173' }));
}

app.use(express.json());

app.use(
  rateLimit({
    windowMs: 60_000,
    max: 30,
    message: { error: 'Too many requests, please slow down.' },
  })
);

app.use('/api/video-info', videoInfoRouter);
app.use('/api/downloads', downloadsRouter);

// In production, Express serves the built frontend
if (isProd) {
  const staticDir = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(staticDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`shutube running on http://localhost:${PORT}`);
});
