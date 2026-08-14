import { execa } from 'execa';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { VideoInfoResponse, DownloadType, Clip } from '../types/index';

const YOUTUBE_URL_RE = /^https?:\/\/(www\.)?(youtube\.com\/watch\?.*v=|youtu\.be\/)[A-Za-z0-9_-]+/;

export function isValidYouTubeUrl(url: string): boolean {
  return YOUTUBE_URL_RE.test(url);
}

// /etc/secrets/ is read-only on Render; yt-dlp needs a writable cookies file.
const COOKIES_SRC = process.env.YTDLP_COOKIES_FILE;
const COOKIES_TMP = path.join(os.tmpdir(), 'yt-dlp-cookies.txt');
if (COOKIES_SRC && fs.existsSync(COOKIES_SRC)) {
  fs.copyFileSync(COOKIES_SRC, COOKIES_TMP);
}

const BASE_ARGS = [
  '--extractor-args', 'youtube:player_client=web',
  '--remote-components', 'ejs:github',
  ...(COOKIES_SRC ? ['--cookies', COOKIES_TMP] : []),
];

export async function getVideoInfo(url: string): Promise<VideoInfoResponse> {
  const result = await execa('yt-dlp', [...BASE_ARGS, '--dump-json', '--no-playlist', url], {
    timeout: 30_000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = JSON.parse(result.stdout);

  return {
    title: String(data.title ?? ''),
    durationSeconds: Number(data.duration ?? 0),
    thumbnailUrl: String(data.thumbnail ?? ''),
    channel: String(data.uploader ?? data.channel ?? ''),
  };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s.-]/g, '_').replace(/\s+/g, '_').slice(0, 200);
}

function buildFormatSelector(type: DownloadType, quality: string): string {
  if (type === 'audio') return 'bestaudio/best';
  switch (quality) {
    case '1080p': return 'bestvideo[height<=1080]+bestaudio/best[height<=1080]';
    case '720p':  return 'bestvideo[height<=720]+bestaudio/best[height<=720]';
    case '480p':  return 'bestvideo[height<=480]+bestaudio/best[height<=480]';
    default:      return 'bestvideo+bestaudio/best';
  }
}

const LOSSLESS_AUDIO_FORMATS = new Set(['wav', 'flac']);

function buildAudioQualityArg(quality: string): string {
  switch (quality) {
    case 'high':   return '0';
    case 'medium': return '5';
    case 'low':    return '7';
    default:       return '0';
  }
}

export interface DownloadOptions {
  url: string;
  type: DownloadType;
  format: string;
  quality: string;
  clip?: Clip;
  onProgress: (pct: number) => void;
}

// Patterns that indicate the FINAL output file (in order of precedence, last wins)
const DEST_PATTERNS = [
  /\[download\] Destination: (.+)/,
  /\[ExtractAudio\] Destination: (.+)/,
  /\[ffmpeg\] Destination: (.+)/,
  /\[Merger\] Merging formats into "(.+)"/,
  /\[VideoConvertor\] Converting video from \w+ to \w+; Destination: (.+)/,
];

function parseDestinations(text: string): string[] {
  const found: string[] = [];
  for (const line of text.split('\n')) {
    for (const re of DEST_PATTERNS) {
      const m = re.exec(line);
      if (m) { found.push(m[1].trim()); break; }
    }
  }
  return found;
}

function findOutputFile(tmpDir: string, baseName: string, type: DownloadType): string | null {
  const entries = fs.readdirSync(tmpDir)
    .filter((f) => f.startsWith(baseName) && !f.endsWith('.part') && !f.endsWith('.ytdl'));

  if (entries.length === 0) return null;
  if (entries.length === 1) return path.join(tmpDir, entries[0]);

  // Multiple files (intermediate streams + merged): prefer final format
  const preferred = type === 'audio'
    ? entries.find((f) => f.endsWith('.mp3'))
    : entries.find((f) => !/\.\w+\.\w+$/.test(f)); // no double extension like .f137.mp4

  const winner = preferred ?? entries[entries.length - 1];
  return path.join(tmpDir, winner);
}

export async function downloadMedia(opts: DownloadOptions): Promise<string> {
  const { url, type, format, quality, clip, onProgress } = opts;

  const tmpDir = os.tmpdir();
  const baseName = sanitizeFilename(`shutube_${Date.now()}`);
  // Always use %(ext)s — never hardcode extension; yt-dlp decides the real format
  const outputTemplate = path.join(tmpDir, `${baseName}.%(ext)s`);

  const args: string[] = [...BASE_ARGS, '--no-playlist', '--progress', '--newline'];

  if (type === 'audio') {
    args.push('-x', '--audio-format', format);
    if (!LOSSLESS_AUDIO_FORMATS.has(format)) {
      args.push('--audio-quality', buildAudioQualityArg(quality));
    }
  } else {
    args.push('-f', buildFormatSelector(type, quality));
    args.push('--merge-output-format', format);
  }

  if (clip) {
    const fmt = (s: number) => {
      const m = Math.floor(s / 60).toString().padStart(2, '0');
      const sec = (s % 60).toFixed(3).padStart(6, '0');
      return `${m}:${sec}`;
    };
    args.push('--download-sections', `*${fmt(clip.startSeconds)}-${fmt(clip.endSeconds)}`);
    args.push('--force-keyframes-at-cuts');
  }

  args.push('-o', outputTemplate, url);

  const PROGRESS_RE = /\[download\]\s+([\d.]+)%/;
  const capturedDests: string[] = [];
  let stdoutBuf = '';
  let stderrBuf = '';

  const proc = execa('yt-dlp', args, { timeout: 600_000, reject: false });

  proc.stdout?.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    stdoutBuf += text;
    // parse progress line by line
    for (const line of text.split('\n')) {
      const m = PROGRESS_RE.exec(line);
      if (m) onProgress(parseFloat(m[1]));
    }
    capturedDests.push(...parseDestinations(text));
  });

  proc.stderr?.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    stderrBuf += text;
    capturedDests.push(...parseDestinations(text));
  });

  const result = await proc;

  if (result.exitCode !== 0) {
    throw new Error(stderrBuf || stdoutBuf || 'yt-dlp failed');
  }

  // Use the last captured destination that actually exists on disk
  let resolvedPath = '';
  for (let i = capturedDests.length - 1; i >= 0; i--) {
    if (fs.existsSync(capturedDests[i])) {
      resolvedPath = capturedDests[i];
      break;
    }
  }

  // Fallback: scan tmpDir for any file we created
  if (!resolvedPath) {
    const found = findOutputFile(tmpDir, baseName, type);
    if (!found) throw new Error('Output file not found after download');
    resolvedPath = found;
  }

  onProgress(100);
  return resolvedPath;
}
