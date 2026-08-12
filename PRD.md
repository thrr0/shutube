# PRD — shutube

## Goal
A simple web app to download full YouTube videos, audio-only, or a specific time-range clip. Free to use; users are responsible for complying with applicable law and YouTube's Terms of Service.

## Users
Anyone. No authentication in the MVP.

## User stories
1. As a user, I paste a YouTube URL and see a preview: title, thumbnail, duration, and channel.
2. As a user, I choose to download the full video, selecting quality (e.g. best, 1080p, 720p, 480p).
3. As a user, I choose to download audio-only as MP3, selecting quality (e.g. 320kbps, 192kbps, 128kbps).
4. As a user, I optionally specify a time range (start/end in mm:ss) to download only a clip, for both video and audio.
5. As a user, I see download progress in real time (%).
6. As a user, once complete, I download the file with a button.

## Out of scope (MVP)
- Full playlist downloads
- Livestreams / active broadcasts
- User accounts / persistent history
- Age-restricted videos requiring session cookies

## Validations and edge cases
- Invalid URL or non-YouTube URL → clear error in the frontend
- Private / deleted / unavailable video → show error returned by the backend
- Clip: validate that `start < end` and `end <= total video duration`
- Download timeout (e.g. 10 min) → mark job as error

## Responsible use
shutube is a free tool. Users are solely responsible for respecting YouTube's Terms of Service and the copyright legislation applicable in their jurisdiction.

## MVP acceptance criteria
- [ ] Metadata preview works for valid URLs
- [ ] Full video download in at least 2 quality levels
- [ ] Audio-only download as MP3
- [ ] Clip download (start/end) for both video and audio
- [ ] Working progress bar
- [ ] Error handling visible in the UI
