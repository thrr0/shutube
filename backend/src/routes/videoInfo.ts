import { Router, Request, Response } from 'express';
import { isValidYouTubeUrl, getVideoInfo } from '../services/ytdlp';
import { VideoInfoRequest } from '../types/index';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body as VideoInfoRequest;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  if (!isValidYouTubeUrl(url)) {
    res.status(400).json({ error: 'URL must be a valid youtube.com or youtu.be link' });
    return;
  }

  try {
    const info = await getVideoInfo(url);
    res.json(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Private video') || message.includes('Video unavailable')) {
      res.status(404).json({ error: 'Video not available (private or deleted)' });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

export default router;
