# CLAUDE.md

## Project context
Web app to download YouTube videos and audio (full or clipped) — free to use, with responsibility falling on the user.

## Stack
- Backend: Node.js + TypeScript + Express
- Download engine: yt-dlp (external binary, invoked via `execa`)
- Media processing: ffmpeg (clip trimming, audio extraction)
- Frontend: Vite + vanilla TypeScript (no framework), plain HTML/CSS
- No database: job state held in memory (`Map`), sufficient for MVP

## Conventions
- TypeScript in `strict` mode throughout
- Never invoke yt-dlp/ffmpeg with `shell: true` or interpolate user input into a command string — always pass arguments as an array (`execa`) to prevent command injection
- Validate that the URL belongs to youtube.com or youtu.be before processing any request
- Sanitize output filenames (strip special characters and path separators)
- Clean up temp files after serving them, or via TTL (15 min)

## Folder structure
```
shutube/
  backend/
    src/
      routes/
      services/        (yt-dlp wrapper, ffmpeg wrapper, job manager)
      types/
    package.json
    tsconfig.json
  frontend/
    src/
    index.html
    package.json
```

## Commands
- Backend: `npm run dev` (ts-node-dev), `npm run build`, `npm test`
- Frontend: `npm run dev` (vite), `npm run build`

## Reference documents
Read `PRD.md` (requirements and user stories) and `ARCHITECTURE.md` (API contract and technical design) before generating code. Stack and structure decisions defined there are not changed without confirming first.

## Scope
Free tool — users are responsible for their own use. Out of scope for MVP: full playlist downloads, livestreams, user accounts, age/region restriction bypass.
