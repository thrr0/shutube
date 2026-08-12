# CLAUDE.md

## Contexto del proyecto
App web para descargar videos y audio de YouTube (completos o en clips) para uso personal.

## Stack
- Backend: Node.js + TypeScript + Express
- Motor de descarga: yt-dlp (binario externo, invocado via `execa`)
- Procesamiento de media: ffmpeg (recorte de clips, extracción de audio)
- Frontend: Vite + TypeScript vanilla (sin framework), HTML/CSS simple
- Sin base de datos: estado de jobs en memoria (`Map`), suficiente para uso single-user/MVP

## Convenciones
- TypeScript en modo `strict` en todo el proyecto
- Nunca invocar yt-dlp/ffmpeg con `shell: true` ni interpolar el input del usuario en un string de comando — siempre pasar argumentos como array (`execa`) para evitar command injection
- Validar que la URL sea de youtube.com o youtu.be antes de procesar cualquier request
- Nombres de archivo de salida sanitizados (sin caracteres especiales/paths)
- Limpiar archivos temporales después de servirlos, o por TTL (15 min)

## Estructura de carpetas
```
yt-downloader/
  backend/
    src/
      routes/
      services/        (wrapper yt-dlp, wrapper ffmpeg, job manager)
      types/
    package.json
    tsconfig.json
  frontend/
    src/
    index.html
    package.json
```

## Comandos
- Backend: `npm run dev` (ts-node-dev), `npm run build`, `npm test`
- Frontend: `npm run dev` (vite), `npm run build`

## Documentos de referencia
Leer `PRD.md` (requisitos y user stories) y `ARCHITECTURE.md` (contrato de API y diseño técnico) antes de generar código. Las decisiones de stack y estructura ahí definidas no se cambian sin confirmar antes.

## Alcance
Herramienta de uso personal. No implementar en el MVP: descarga de playlists completas, livestreams, cuentas de usuario, ni bypass de restricciones de edad/región.
