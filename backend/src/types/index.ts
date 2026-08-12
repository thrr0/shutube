export type JobStatus = 'queued' | 'processing' | 'done' | 'error';

export type DownloadType = 'video' | 'audio';

export interface Clip {
  startSeconds: number;
  endSeconds: number;
}

export interface JobState {
  id: string;
  status: JobStatus;
  progress: number;
  filePath?: string;
  fileName?: string;
  error?: string;
  createdAt: Date;
}

export interface VideoInfoRequest {
  url: string;
}

export interface VideoInfoResponse {
  title: string;
  durationSeconds: number;
  thumbnailUrl: string;
  channel: string;
}

export interface CreateDownloadRequest {
  url: string;
  type: DownloadType;
  format: string;
  quality: string;
  clip?: Clip;
}

export interface JobStatusResponse {
  status: JobStatus;
  progress: number;
  error?: string;
}
