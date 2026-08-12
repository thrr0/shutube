import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import videoInfoRouter from './routes/videoInfo';
import downloadsRouter from './routes/downloads';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Public tool — allow all origins. In dev, restrict to Vite's port.
app.use(
  process.env.NODE_ENV === 'production'
    ? cors()
    : cors({ origin: 'http://localhost:5173' })
);
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 60_000,
    max: 30,
    message: { error: 'Too many requests, please slow down.' },
  })
);

app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });
app.use('/api/video-info', videoInfoRouter);
app.use('/api/downloads', downloadsRouter);

app.listen(PORT, () => {
  console.log(`shutube backend running on http://localhost:${PORT}`);
});
