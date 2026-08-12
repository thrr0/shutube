import { Router, Request, Response } from 'express';
import fs from 'fs';
import { isValidYouTubeUrl } from '../services/ytdlp';
import { createJob, getJob, scheduleFileDeletion } from '../services/jobManager';
import { CreateDownloadRequest, Clip } from '../types/index';

const router = Router();

const VALID_VIDEO_QUALITIES = new Set(['best', '1080p', '720p', '480p']);
const VALID_AUDIO_QUALITIES = new Set(['320kbps', '192kbps', '128kbps']);

router.post('/', (req: Request, res: Response): void => {
  const { url, type, quality, clip } = req.body as CreateDownloadRequest & { clip?: unknown };

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required' });
    return;
  }
  if (!isValidYouTubeUrl(url)) {
    res.status(400).json({ error: 'URL must be a valid youtube.com or youtu.be link' });
    return;
  }
  if (type !== 'video' && type !== 'audio') {
    res.status(400).json({ error: 'type must be "video" or "audio"' });
    return;
  }
  if (type === 'video' && !VALID_VIDEO_QUALITIES.has(quality)) {
    res.status(400).json({ error: `quality must be one of: ${[...VALID_VIDEO_QUALITIES].join(', ')}` });
    return;
  }
  if (type === 'audio' && !VALID_AUDIO_QUALITIES.has(quality)) {
    res.status(400).json({ error: `quality must be one of: ${[...VALID_AUDIO_QUALITIES].join(', ')}` });
    return;
  }

  let validatedClip: Clip | undefined;
  if (clip !== undefined && clip !== null) {
    const c = clip as unknown as Record<string, unknown>;
    const start = Number(c.startSeconds);
    const end = Number(c.endSeconds);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      res.status(400).json({ error: 'clip.startSeconds and clip.endSeconds must be numbers' });
      return;
    }
    if (start < 0 || end <= start) {
      res.status(400).json({ error: 'clip must satisfy 0 <= startSeconds < endSeconds' });
      return;
    }
    validatedClip = { startSeconds: start, endSeconds: end };
  }

  const jobId = createJob({ url, type, quality, clip: validatedClip });
  res.status(202).json({ jobId });
});

router.get('/:jobId', (req: Request, res: Response): void => {
  const job = getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json({ status: job.status, progress: job.progress, error: job.error });
});

router.get('/:jobId/file', (req: Request, res: Response): void => {
  const job = getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  if (job.status !== 'done' || !job.filePath) {
    res.status(409).json({ error: 'File not ready yet' });
    return;
  }
  if (!fs.existsSync(job.filePath)) {
    res.status(410).json({ error: 'File has already been deleted' });
    return;
  }

  const fileName = job.fileName ?? 'download';
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'application/octet-stream');

  const stream = fs.createReadStream(job.filePath);
  stream.pipe(res);
  stream.on('close', () => {
    if (job.filePath) scheduleFileDeletion(job.filePath);
  });
});

export default router;
