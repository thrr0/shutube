# shutube

A web app to download YouTube videos and audio — full downloads or time-clipped segments — free to use.

## Prerequisites
- Node.js 20+
- `yt-dlp` in your PATH (`pip install -U yt-dlp` or standalone binary)
- `ffmpeg` in your PATH

## Setup
```bash
cd backend && npm install
cd ../frontend && npm install
```

## Development
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
# → http://localhost:5173
```

## Production build
```bash
cd backend && npm run build
cd frontend && npm run build
```

## Disclaimer
shutube is a free, open tool. Users are solely responsible for complying with YouTube's Terms of Service and any applicable copyright law in their jurisdiction. The authors provide no warranties and accept no liability for how this tool is used.
