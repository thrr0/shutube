import { fetchVideoInfo, createDownload, pollJob, fileUrl, VideoInfo } from './api.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────

const urlInput      = document.getElementById('url-input')      as HTMLInputElement;
const btnSearch     = document.getElementById('btn-search')      as HTMLButtonElement;
const urlError      = document.getElementById('url-error')       as HTMLParagraphElement;

const sectionPreview = document.getElementById('section-preview') as HTMLElement;
const previewThumb   = document.getElementById('preview-thumb')   as HTMLImageElement;
const previewTitle   = document.getElementById('preview-title')   as HTMLHeadingElement;
const previewChannel = document.getElementById('preview-channel') as HTMLParagraphElement;
const previewDur     = document.getElementById('preview-duration')as HTMLParagraphElement;

const sectionOptions = document.getElementById('section-options') as HTMLElement;
const btnTypeVideo   = document.getElementById('btn-type-video')  as HTMLButtonElement;
const btnTypeAudio   = document.getElementById('btn-type-audio')  as HTMLButtonElement;
const selectQuality  = document.getElementById('select-quality')  as HTMLSelectElement;
const clipToggle     = document.getElementById('clip-toggle')     as HTMLInputElement;
const clipFields     = document.getElementById('clip-fields')     as HTMLElement;
const clipStart      = document.getElementById('clip-start')      as HTMLInputElement;
const clipEnd        = document.getElementById('clip-end')        as HTMLInputElement;
const clipError      = document.getElementById('clip-error')      as HTMLParagraphElement;
const btnDownload    = document.getElementById('btn-download')    as HTMLButtonElement;
const downloadError  = document.getElementById('download-error')  as HTMLParagraphElement;

const sectionProgress = document.getElementById('section-progress') as HTMLElement;
const progressLabel   = document.getElementById('progress-label')   as HTMLParagraphElement;
const progressFill    = document.getElementById('progress-fill')    as HTMLDivElement;
const progressPct     = document.getElementById('progress-pct')     as HTMLParagraphElement;
const progressError   = document.getElementById('progress-error')   as HTMLParagraphElement;

const sectionDone = document.getElementById('section-done') as HTMLElement;
const btnSave     = document.getElementById('btn-save')     as HTMLAnchorElement;
const btnNew      = document.getElementById('btn-new')      as HTMLButtonElement;

// ── State ─────────────────────────────────────────────────────────────────────

let currentUrl   = '';
let currentInfo: VideoInfo | null = null;
let selectedType: 'video' | 'audio' = 'video';

// ── Helpers ───────────────────────────────────────────────────────────────────

function show(el: HTMLElement)  { el.classList.remove('hidden'); }
function hide(el: HTMLElement)  { el.classList.add('hidden'); }
function setError(el: HTMLParagraphElement, msg: string) { el.textContent = msg; show(el); }
function clearError(el: HTMLParagraphElement) { el.textContent = ''; hide(el); }

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function parseTime(str: string): number | null {
  const clean = str.trim();
  const parts = clean.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function setVideoQualities() {
  selectQuality.innerHTML = `
    <option value="best">Mejor disponible</option>
    <option value="1080p">1080p</option>
    <option value="720p">720p</option>
    <option value="480p">480p</option>
  `;
}

function setAudioQualities() {
  selectQuality.innerHTML = `
    <option value="320kbps">320 kbps</option>
    <option value="192kbps">192 kbps</option>
    <option value="128kbps">128 kbps</option>
  `;
}

function setProgress(pct: number) {
  progressFill.style.width = `${pct}%`;
  progressPct.textContent = `${Math.round(pct)}%`;
}

// ── Search ────────────────────────────────────────────────────────────────────

async function handleSearch() {
  clearError(urlError);
  const url = urlInput.value.trim();
  if (!url) { setError(urlError, 'Ingresá una URL'); return; }

  btnSearch.disabled = true;
  btnSearch.textContent = 'Buscando…';

  try {
    const info = await fetchVideoInfo(url);
    currentUrl = url;
    currentInfo = info;

    previewThumb.src   = info.thumbnailUrl;
    previewTitle.textContent   = info.title;
    previewChannel.textContent = info.channel;
    previewDur.textContent     = `Duración: ${formatDuration(info.durationSeconds)}`;

    show(sectionPreview);
    show(sectionOptions);
    hide(sectionProgress);
    hide(sectionDone);
  } catch (err) {
    setError(urlError, err instanceof Error ? err.message : 'Error al obtener información del video');
  } finally {
    btnSearch.disabled = false;
    btnSearch.textContent = 'Buscar';
  }
}

urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
btnSearch.addEventListener('click', handleSearch);

// ── Type toggle ───────────────────────────────────────────────────────────────

function selectType(type: 'video' | 'audio') {
  selectedType = type;
  btnTypeVideo.classList.toggle('active', type === 'video');
  btnTypeAudio.classList.toggle('active', type === 'audio');
  if (type === 'video') setVideoQualities();
  else setAudioQualities();
}

btnTypeVideo.addEventListener('click', () => selectType('video'));
btnTypeAudio.addEventListener('click', () => selectType('audio'));

// ── Clip toggle ───────────────────────────────────────────────────────────────

clipToggle.addEventListener('change', () => {
  if (clipToggle.checked) show(clipFields);
  else { hide(clipFields); clearError(clipError); }
});

// ── Download ──────────────────────────────────────────────────────────────────

async function handleDownload() {
  clearError(downloadError);
  clearError(clipError);

  if (!currentUrl || !currentInfo) return;

  let clip: { startSeconds: number; endSeconds: number } | undefined;

  if (clipToggle.checked) {
    const start = parseTime(clipStart.value);
    const end   = parseTime(clipEnd.value);

    if (start === null || end === null) {
      setError(clipError, 'Formato de tiempo inválido. Usá mm:ss o hh:mm:ss');
      return;
    }
    if (start < 0 || end <= start) {
      setError(clipError, 'El inicio debe ser menor al fin y ambos deben ser positivos');
      return;
    }
    if (end > currentInfo.durationSeconds) {
      setError(clipError, `El fin (${formatDuration(end)}) supera la duración del video (${formatDuration(currentInfo.durationSeconds)})`);
      return;
    }
    clip = { startSeconds: start, endSeconds: end };
  }

  btnDownload.disabled = true;
  btnDownload.textContent = 'Iniciando…';
  hide(sectionOptions);
  show(sectionProgress);
  progressLabel.textContent = 'Procesando…';
  setProgress(0);
  clearError(progressError);

  try {
    const jobId = await createDownload({
      url: currentUrl,
      type: selectedType,
      quality: selectQuality.value,
      clip,
    });

    await pollUntilDone(jobId);
  } catch (err) {
    setError(progressError, err instanceof Error ? err.message : 'Error inesperado');
    btnDownload.disabled = false;
    btnDownload.textContent = 'Descargar';
  }
}

btnDownload.addEventListener('click', handleDownload);

async function pollUntilDone(jobId: string): Promise<void> {
  const INTERVAL = 800;

  while (true) {
    const status = await pollJob(jobId);

    if (status.status === 'done') {
      setProgress(100);
      progressLabel.textContent = '¡Listo!';
      await new Promise((r) => setTimeout(r, 400));

      hide(sectionProgress);
      show(sectionDone);
      btnSave.href = fileUrl(jobId);
      return;
    }

    if (status.status === 'error') {
      setError(progressError, status.error ?? 'El proceso falló sin mensaje de error');
      show(sectionOptions);
      btnDownload.disabled = false;
      btnDownload.textContent = 'Descargar';
      return;
    }

    setProgress(status.progress);
    if (status.status === 'queued') {
      progressLabel.textContent = 'En cola…';
    } else {
      progressLabel.textContent = 'Descargando…';
    }

    await new Promise((r) => setTimeout(r, INTERVAL));
  }
}

// ── New download ──────────────────────────────────────────────────────────────

btnNew.addEventListener('click', () => {
  hide(sectionDone);
  hide(sectionPreview);
  show(sectionOptions);
  urlInput.value = '';
  currentUrl = '';
  currentInfo = null;
  clipToggle.checked = false;
  hide(clipFields);
  clearError(clipError);
  clearError(downloadError);
  clearError(progressError);
  selectType('video');
  btnDownload.disabled = false;
  btnDownload.textContent = 'Descargar';
});
