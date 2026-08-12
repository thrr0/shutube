import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { JobState, CreateDownloadRequest } from '../types/index';
import { downloadMedia } from './ytdlp';
import path from 'path';

const jobs = new Map<string, JobState>();
const TTL_MS = 15 * 60 * 1000;

export function getJob(id: string): JobState | undefined {
  return jobs.get(id);
}

export function createJob(req: CreateDownloadRequest): string {
  const id = uuidv4();
  const job: JobState = {
    id,
    status: 'queued',
    progress: 0,
    createdAt: new Date(),
  };
  jobs.set(id, job);
  runJob(id, req);
  return id;
}

async function runJob(id: string, req: CreateDownloadRequest): Promise<void> {
  const job = jobs.get(id);
  if (!job) return;

  job.status = 'processing';

  try {
    const filePath = await downloadMedia({
      url: req.url,
      type: req.type,
      format: req.format,
      quality: req.quality,
      clip: req.clip,
      onProgress: (pct) => {
        const j = jobs.get(id);
        if (j) j.progress = pct;
      },
    });

    job.filePath = filePath;
    job.fileName = path.basename(filePath);
    job.status = 'done';
    job.progress = 100;
  } catch (err) {
    job.status = 'error';
    job.error = err instanceof Error ? err.message : String(err);
  }
}

export function scheduleFileDeletion(filePath: string, delayMs = 60_000): void {
  setTimeout(() => {
    fs.unlink(filePath, () => {});
  }, delayMs);
}

// TTL cleanup — runs every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, job] of jobs) {
    if (job.createdAt.getTime() < cutoff) {
      if (job.filePath) fs.unlink(job.filePath, () => {});
      jobs.delete(id);
    }
  }
}, 5 * 60 * 1000);
