export interface VideoInfo {
  title: string;
  durationSeconds: number;
  thumbnailUrl: string;
  channel: string;
}

export interface JobStatus {
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
}

// In dev: falls back to /api (Vite proxy → localhost:3001)
// In production on Vercel: set VITE_API_URL=https://your-app.onrender.com/api
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const res = await fetch(`${BASE}/video-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error desconocido');
  return data as VideoInfo;
}

export async function createDownload(payload: {
  url: string;
  type: 'video' | 'audio';
  format: string;
  quality: string;
  clip?: { startSeconds: number; endSeconds: number };
}): Promise<string> {
  const res = await fetch(`${BASE}/downloads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error desconocido');
  return (data as { jobId: string }).jobId;
}

export async function pollJob(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${BASE}/downloads/${jobId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error desconocido');
  return data as JobStatus;
}

export function fileUrl(jobId: string): string {
  return `${BASE}/downloads/${jobId}/file`;
}
