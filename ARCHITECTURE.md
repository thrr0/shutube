# ARCHITECTURE.md

## Stack y justificación
- **yt-dlp**: motor de descarga, activamente mantenido (a diferencia de `ytdl-core`, que se rompe seguido con cambios de YouTube). Se invoca como binario externo.
- **ffmpeg**: usado para recorte de clips cuando yt-dlp no puede resolverlo directamente, y para extracción/transcodificación de audio.
- **Backend Express + TS**: simple, suficiente para el alcance del proyecto.
- **Sin cola externa (Redis/BullMQ)**: jobs en memoria (`Map<jobId, JobState>`) alcanza para single-user MVP. Si se escala a multi-usuario, migrar a una cola persistente.

## Prerrequisitos del sistema (no npm)
- `yt-dlp` instalado y en el PATH
- `ffmpeg` instalado y en el PATH

## Contrato de API

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
(`clip` es opcional; `quality` ej: "1080p" | "720p" | "best" | "320kbps" | "192kbps")

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
  "error": "string (opcional)"
}
```

### GET /api/downloads/:jobId/file
Devuelve el archivo (`Content-Disposition: attachment`). Al finalizar el stream se agenda el borrado del archivo temporal.

## Flujo interno de descarga
1. Validar que la URL sea de youtube.com/youtu.be (regex).
2. Info: `yt-dlp --dump-json <url>` → parsear JSON de stdout.
3. Crear job en memoria, disparar proceso async:
   - Video completo: `yt-dlp -f <selector según quality> -o <tempPath> <url>`
   - Audio: `yt-dlp -x --audio-format mp3 --audio-quality <q> -o <tempPath> <url>`
   - Clip: usar `--download-sections "*start-end"` de yt-dlp (descarga solo el fragmento necesario cuando el formato lo permite) en vez de bajar el video completo y recortar después. Si no está soportado para ese formato, fallback a descarga completa + recorte con ffmpeg (`-ss start -to end`).
4. Parsear el stdout de yt-dlp (reporta progreso tipo `[download]  42.0% of ...`) con regex para actualizar `progress` del job.
5. Al terminar, guardar la ruta del archivo final en el job y marcar `status: done`.

## Seguridad
- Ejecutar yt-dlp/ffmpeg con `execa` pasando argumentos como array — nunca `shell: true` ni concatenar el input del usuario en un string.
- Whitelist de dominio (youtube.com / youtu.be) antes de pasar la URL a yt-dlp.
- Sanitizar nombres de archivo de salida (quitar caracteres no alfanuméricos problemáticos).
- Rate limiting básico por IP (ej. `express-rate-limit`) para evitar abuso.
- Límite de duración máxima de descarga/clip configurable (evitar jobs eternos).
- Limpieza de temporales: borrar tras servir el archivo, o por TTL (cron cada 15 min borra jobs `done` con más de X min de antigüedad).

## Estructura de carpetas
Ver `CLAUDE.md`.
