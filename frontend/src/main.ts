import { fetchVideoInfo, createDownload, pollJob, fileUrl, checkHealth, VideoInfo } from './api.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────

const urlInput        = document.getElementById('url-input')        as HTMLInputElement;
const btnSearch       = document.getElementById('btn-search')        as HTMLButtonElement;
const urlError        = document.getElementById('url-error')         as HTMLParagraphElement;

const sectionPreview  = document.getElementById('section-preview')  as HTMLElement;
const previewThumb    = document.getElementById('preview-thumb')     as HTMLImageElement;
const previewTitle    = document.getElementById('preview-title')     as HTMLParagraphElement;
const previewChannel  = document.getElementById('preview-channel')   as HTMLSpanElement;
const previewDur      = document.getElementById('preview-duration')  as HTMLSpanElement;

const sectionOptions  = document.getElementById('section-options')  as HTMLElement;
const btnTypeVideo    = document.getElementById('btn-type-video')    as HTMLButtonElement;
const btnTypeAudio    = document.getElementById('btn-type-audio')    as HTMLButtonElement;
const formatGroup     = document.getElementById('format-group')      as HTMLElement;
const qualityGroupEl  = document.getElementById('quality-group-pills') as HTMLElement;
const qualityRow      = document.getElementById('quality-row')       as HTMLElement;
const clipToggle      = document.getElementById('clip-toggle')       as HTMLInputElement;
const clipFields      = document.getElementById('clip-fields')       as HTMLElement;
const clipStart       = document.getElementById('clip-start')        as HTMLInputElement;
const clipEnd         = document.getElementById('clip-end')          as HTMLInputElement;
const clipError       = document.getElementById('clip-error')        as HTMLParagraphElement;
const btnDownload     = document.getElementById('btn-download')      as HTMLButtonElement;
const downloadError   = document.getElementById('download-error')    as HTMLParagraphElement;

const sectionProgress = document.getElementById('section-progress') as HTMLElement;
const progressLabel   = document.getElementById('progress-label')   as HTMLSpanElement;
const progressFill    = document.getElementById('progress-fill')    as HTMLDivElement;
const progressPct     = document.getElementById('progress-pct')     as HTMLSpanElement;
const progressError   = document.getElementById('progress-error')   as HTMLParagraphElement;

const sectionDone = document.getElementById('section-done') as HTMLElement;
const btnSave     = document.getElementById('btn-save')     as HTMLAnchorElement;
const btnNew      = document.getElementById('btn-new')      as HTMLButtonElement;

// ── State ─────────────────────────────────────────────────────────────────────

let currentUrl  = '';
let currentInfo: VideoInfo | null = null;
let selectedType: 'video' | 'audio' = 'video';
let selectedFormat  = 'mp4';
let selectedQuality = 'best';

// ── Pill options ───────────────────────────────────────────────────────────────

interface PillOption { value: string; label: string; }

const VIDEO_FORMATS: PillOption[]   = [{ value: 'mp4', label: 'MP4' }, { value: 'webm', label: 'WebM' }, { value: 'mkv', label: 'MKV' }];
const AUDIO_FORMATS: PillOption[]   = [{ value: 'mp3', label: 'MP3' }, { value: 'm4a', label: 'M4A' }, { value: 'opus', label: 'Opus' }, { value: 'wav', label: 'WAV' }, { value: 'flac', label: 'FLAC' }];
const VIDEO_QUALITIES: PillOption[] = [{ value: 'best', label: 'Best' }, { value: '1080p', label: '1080p' }, { value: '720p', label: '720p' }, { value: '480p', label: '480p' }];
const AUDIO_QUALITIES: PillOption[] = [{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }];

const LOSSLESS = new Set(['wav', 'flac']);

// ── Helpers ───────────────────────────────────────────────────────────────────

function show(el: HTMLElement)  { el.classList.remove('hidden'); }
function hide(el: HTMLElement)  { el.classList.add('hidden'); }
function setError(el: HTMLParagraphElement, msg: string) { el.textContent = msg; show(el); }
function clearError(el: HTMLParagraphElement) { el.textContent = ''; hide(el); }

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function parseTime(str: string): number | null {
  const parts = str.trim().split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function setProgress(pct: number) {
  progressFill.style.width = `${pct}%`;
  progressPct.textContent = `${Math.round(pct)}%`;
}

function createPillGroup(
  container: HTMLElement,
  options: PillOption[],
  selected: string,
  onSelect: (value: string) => void
): void {
  container.innerHTML = '';
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill' + (opt.value === selected ? ' active' : '');
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      container.querySelectorAll<HTMLButtonElement>('.pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      onSelect(opt.value);
    });
    container.appendChild(btn);
  }
}

// ── Type / format / quality ───────────────────────────────────────────────────

function updateAudioQualityVisibility() {
  if (LOSSLESS.has(selectedFormat)) hide(qualityRow);
  else show(qualityRow);
}

function selectType(type: 'video' | 'audio') {
  selectedType = type;
  btnTypeVideo.classList.toggle('active', type === 'video');
  btnTypeAudio.classList.toggle('active', type === 'audio');

  if (type === 'video') {
    selectedFormat  = 'mp4';
    selectedQuality = 'best';
    createPillGroup(formatGroup, VIDEO_FORMATS, selectedFormat, (v) => { selectedFormat = v; });
    createPillGroup(qualityGroupEl, VIDEO_QUALITIES, selectedQuality, (v) => { selectedQuality = v; });
    show(qualityRow);
  } else {
    selectedFormat  = 'mp3';
    selectedQuality = 'high';
    createPillGroup(formatGroup, AUDIO_FORMATS, selectedFormat, (v) => {
      selectedFormat = v;
      updateAudioQualityVisibility();
    });
    createPillGroup(qualityGroupEl, AUDIO_QUALITIES, selectedQuality, (v) => { selectedQuality = v; });
    updateAudioQualityVisibility();
  }
}

btnTypeVideo.addEventListener('click', () => selectType('video'));
btnTypeAudio.addEventListener('click', () => selectType('audio'));

// ── Clip toggle ───────────────────────────────────────────────────────────────

clipToggle.addEventListener('change', () => {
  if (clipToggle.checked) show(clipFields);
  else { hide(clipFields); clearError(clipError); }
});

// ── Search ────────────────────────────────────────────────────────────────────

async function handleSearch() {
  clearError(urlError);
  const url = urlInput.value.trim();
  if (!url) { setError(urlError, 'Enter a YouTube URL'); return; }

  btnSearch.disabled = true;
  try {
    const info = await fetchVideoInfo(url);
    currentUrl  = url;
    currentInfo = info;

    previewThumb.src         = info.thumbnailUrl;
    previewTitle.textContent = info.title;
    previewChannel.textContent = info.channel;
    previewDur.textContent   = formatDuration(info.durationSeconds);

    show(sectionPreview);
    show(sectionOptions);
    hide(sectionProgress);
    hide(sectionDone);
  } catch (err) {
    setError(urlError, err instanceof Error ? err.message : 'Could not fetch video info');
  } finally {
    btnSearch.disabled = false;
  }
}

urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
btnSearch.addEventListener('click', handleSearch);

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
      setError(clipError, 'Invalid time format — use m:ss or h:mm:ss');
      return;
    }
    if (start < 0 || end <= start) {
      setError(clipError, 'Start must be less than end and both must be positive');
      return;
    }
    if (end > currentInfo.durationSeconds) {
      setError(clipError, `End (${formatDuration(end)}) exceeds video duration (${formatDuration(currentInfo.durationSeconds)})`);
      return;
    }
    clip = { startSeconds: start, endSeconds: end };
  }

  btnDownload.disabled = true;
  btnDownload.textContent = 'Starting…';
  hide(sectionOptions);
  show(sectionProgress);
  progressLabel.textContent = 'Processing…';
  setProgress(0);
  clearError(progressError);

  try {
    const jobId = await createDownload({
      url: currentUrl,
      type: selectedType,
      format: selectedFormat,
      quality: selectedQuality,
      clip,
    });
    await pollUntilDone(jobId);
  } catch (err) {
    setError(progressError, err instanceof Error ? err.message : 'Unexpected error');
    show(sectionOptions);
    btnDownload.disabled = false;
    btnDownload.textContent = 'Download';
  }
}

btnDownload.addEventListener('click', handleDownload);

async function pollUntilDone(jobId: string): Promise<void> {
  while (true) {
    const status = await pollJob(jobId);

    if (status.status === 'done') {
      setProgress(100);
      progressLabel.textContent = 'Done';
      await new Promise((r) => setTimeout(r, 350));
      hide(sectionProgress);
      show(sectionDone);
      btnSave.href = fileUrl(jobId);
      return;
    }

    if (status.status === 'error') {
      setError(progressError, status.error ?? 'Process failed without an error message');
      show(sectionOptions);
      btnDownload.disabled = false;
      btnDownload.textContent = 'Download';
      return;
    }

    setProgress(status.progress);
    progressLabel.textContent = status.status === 'queued' ? 'Queued…' : 'Downloading…';

    await new Promise((r) => setTimeout(r, 800));
  }
}

// ── New download ──────────────────────────────────────────────────────────────

btnNew.addEventListener('click', () => {
  hide(sectionDone);
  hide(sectionPreview);
  show(sectionOptions);
  urlInput.value = '';
  currentUrl     = '';
  currentInfo    = null;
  clipToggle.checked = false;
  hide(clipFields);
  clearError(clipError);
  clearError(downloadError);
  clearError(progressError);
  selectType('video');
  btnDownload.disabled = false;
  btnDownload.textContent = 'Download';
});

// ── Server status polling ─────────────────────────────────────────────────────

async function pollServerStatus(): Promise<void> {
  const dot  = document.getElementById('status-dot')  as HTMLElement;
  const text = document.getElementById('status-text') as HTMLElement;

  while (true) {
    const online = await checkHealth();
    if (online) {
      dot.className    = 'status-dot online';
      text.textContent = 'Server online';
      await new Promise(r => setTimeout(r, 60_000));
    } else {
      dot.className    = 'status-dot offline';
      text.textContent = 'Server waking up…';
      await new Promise(r => setTimeout(r, 5_000));
    }
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

selectType('video');
pollServerStatus();
