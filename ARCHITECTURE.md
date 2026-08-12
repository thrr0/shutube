# ARCHITECTURE.md

## Stack rationale
- **yt-dlp**: download engine, actively maintained (unlike `ytdl-core`, which breaks frequently with YouTube changes). Invoked as an external binary.
- **ffmpeg**: used for clip trimming when yt-dlp can't handle it directly, and for audio extraction/transcoding.
- **Express + TypeScript backend**: simple, sufficient for the project scope.
- **No external queue (Redis/BullMQ)**: in-memory jobs (`Map<jobId, JobState>`) are enough for the MVP. Migrate to a persistent queue if multi-user scale is needed.

## System prerequisites (not npm)
- `yt-dlp` installed and in PATH
- `ffmpeg` installed and in PATH

## API contract

### POST /api/video-info
Request:
```json
{ "url": "string" }
```
Response:
```json
{
  "title": "string",
  "durationSeconds": 0,
  "thumbnailUrl": "string",
  "channel": "string"
}
```

### POST /api/downloads
Request:
```json
{
  "url": "string",
  "type": "video | audio",
  "quality": "string",
  "clip": { "startSeconds": 0, "endSeconds": 0 }
}
```
(`clip` is optional; `quality` examples: `"1080p"` | `"720p"` | `"best"` | `"320kbps"` | `"192kbps"`)

Response:
```json
{ "jobId": "string" }
```

### GET /api/downloads/:jobId
Response:
```json
{
  "status": "queued | processing | done | error",
  "progress": 0,
  "error": "string (optional)"
}
```

### GET /api/downloads/:jobId/file
Returns the file (`Content-Disposition: attachment`). After the stream ends, the temp file is scheduled for deletion.

## Internal download flow
1. Validate that the URL belongs to youtube.com or youtu.be (regex).
2. Info: `yt-dlp --dump-json <url>` → parse JSON from stdout.
3. Create job in memory, kick off async process:
   - Full video: `yt-dlp -f <selector based on quality> -o <tempPath> <url>`
   - Audio: `yt-dlp -x --audio-format mp3 --audio-quality <q> -o <tempPath> <url>`
   - Clip: use `--download-sections "*start-end"` (downloads only the needed fragment when the format supports it). Fallback to full download + ffmpeg trim (`-ss start -to end`) if unsupported.
4. Parse yt-dlp stdout line by line (reports progress as `[download]  42.0% of ...`) with regex to update job `progress`.
5. After completion, resolve the actual output file on disk (verify the captured path exists; fall back to `readdirSync` scan if not). Mark `status: done`.

## Security
- Run yt-dlp/ffmpeg via `execa` with arguments as an array — never `shell: true` or user-input string concatenation.
- Domain whitelist (youtube.com / youtu.be) before passing the URL to yt-dlp.
- Sanitize output filenames (strip non-alphanumeric problematic characters).
- Basic rate limiting by IP (`express-rate-limit`) to prevent abuse.
- Configurable max download/clip duration to avoid runaway jobs.
- Temp file cleanup: delete after serving, or via TTL (cron every 15 min deletes `done` jobs older than X minutes).

## Folder structure
See `CLAUDE.md`.
