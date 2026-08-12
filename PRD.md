# PRD — YouTube Downloader

## Objetivo
Web app simple para descargar videos de YouTube completos, solo audio, o un clip (rango de tiempo específico), para uso personal.

## Usuarios
Un solo usuario, sin autenticación en el MVP.

## User stories
1. Como usuario, pego una URL de YouTube y veo un preview: título, thumbnail, duración y canal.
2. Como usuario, elijo descargar el video completo, seleccionando calidad (ej. best, 1080p, 720p, 480p).
3. Como usuario, elijo descargar solo el audio en mp3, seleccionando calidad (ej. 320kbps, 192kbps, 128kbps).
4. Como usuario, opcionalmente indico un rango de tiempo (inicio/fin en mm:ss) para descargar solo un clip, tanto en video como en audio.
5. Como usuario, veo el progreso de la descarga en tiempo real (%).
6. Como usuario, al terminar, descargo el archivo con un botón.

## Fuera de alcance (MVP)
- Playlists completas
- Livestreams / videos en vivo
- Cuentas de usuario / historial persistente
- Videos con restricción de edad que requieran cookies de sesión

## Validaciones y casos borde
- URL inválida o que no sea de YouTube → error claro en el frontend
- Video privado/eliminado/no disponible → mostrar error devuelto por el backend
- Clip: validar que `start < end` y `end <= duración total del video`
- Timeout de descarga (ej. 10 min) → marcar job como error

## Uso responsable
Herramienta pensada para uso personal (backups, contenido propio, contenido con licencia libre). El usuario es responsable de respetar los Términos de Servicio de YouTube y la legislación de copyright aplicable.

## Criterios de aceptación del MVP
- [ ] Preview de metadata funciona para URLs válidas
- [ ] Descarga de video completo en al menos 2 calidades
- [ ] Descarga de audio en mp3
- [ ] Descarga de clip (start/end) tanto en video como audio
- [ ] Barra de progreso funcional
- [ ] Manejo de errores visible en la UI
