/**
 * BlackMamba Studio - Script de Renderizado
 * Editor de Video Profesional con UI Cinematográfica
 */

const { videoEditorAPI } = window;

// Estado
let mediaLibrary = [];
let timelineClips = [];
let selectedClip = null;
let selectedPreset = 'youtube1080p';
let availablePresets = {};
let isPlaying = false;
let currentSection = 'edit'; // eslint-disable-line no-unused-vars
let renderStartTime = null;

// Estado de Auto-Edit
let autoEditStyles = [];
let selectedAutoEditStyle = 'highlights';
let contentAnalysis = null;

// Elementos del DOM
const elements = {};

/**
 * Inicializar aplicación
 */
async function init() {
  cacheElements();
  showSplash();

  await checkFFmpeg();
  await loadPresets();
  await loadAutoEditStyles();
  await loadAppInfo();

  setupEventListeners();
  setupProgressListener();

  hideSplash();
}

/**
 * Cachear elementos del DOM
 */
function cacheElements() {
  elements.splashScreen = document.getElementById('splash-screen');
  elements.splashStatus = document.querySelector('.splash-status');
  elements.app = document.getElementById('app');
  elements.ffmpegStatus = document.getElementById('ffmpeg-status');
  elements.appVersion = document.getElementById('app-version');
  elements.dropZone = document.getElementById('drop-zone');
  elements.mediaLibrary = document.getElementById('media-library');
  elements.previewVideo = document.getElementById('preview-video');
  elements.previewTimecode = document.getElementById('preview-timecode');
  elements.currentTime = document.getElementById('current-time');
  elements.totalTime = document.getElementById('total-time');
  elements.timelineTracks = document.getElementById('timeline-tracks');
  elements.videoTrackContent = document.getElementById('video-track-content');
  elements.timelineDuration = document.getElementById('timeline-duration');
  elements.presetCards = document.getElementById('preset-cards');
  elements.btnExport = document.getElementById('btn-export');
  elements.progressModal = document.getElementById('progress-modal');
  elements.progressTitle = document.getElementById('progress-title');
  elements.progressStatus = document.getElementById('progress-status');
  elements.progressFill = document.getElementById('progress-fill');
  elements.renderPercent = document.getElementById('render-percent');
  elements.progressTime = document.getElementById('progress-time');
  elements.progressEta = document.getElementById('progress-eta');
  elements.successModal = document.getElementById('success-modal');
  elements.successPath = document.getElementById('success-path');
  elements.statusMessage = document.getElementById('status-message');
  elements.fileCount = document.getElementById('file-count');
  elements.clipProperties = document.getElementById('clip-properties');
  elements.qualityDisplay = document.getElementById('quality-display');
  
  // Elementos de Auto-Edit
  elements.styleCards = document.getElementById('style-cards');
  elements.btnAnalyze = document.getElementById('btn-analyze');
  elements.btnAutoEdit = document.getElementById('btn-auto-edit');
  elements.analysisResults = document.getElementById('analysis-results');
  elements.statMoments = document.getElementById('stat-moments');
  elements.statClips = document.getElementById('stat-clips');
  elements.statTimeSaved = document.getElementById('stat-time-saved');
  elements.minClipDuration = document.getElementById('min-clip-duration');
  elements.maxClipDuration = document.getElementById('max-clip-duration');
  elements.minClipDisplay = document.getElementById('min-clip-display');
  elements.maxClipDisplay = document.getElementById('max-clip-display');
  elements.targetDuration = document.getElementById('target-duration');
}

/**
 * Mostrar pantalla de inicio
 */
function showSplash() {
  elements.splashStatus.textContent = 'Initializing...';
}

/**
 * Ocultar pantalla de inicio con animación
 */
function hideSplash() {
  setTimeout(() => {
    elements.splashScreen.classList.add('hidden');
    elements.app.classList.remove('app-hidden');
  }, 2200);
}

/**
 * Actualizar estado de la pantalla de inicio
 */
function updateSplashStatus(text) {
  if (elements.splashStatus) {
    elements.splashStatus.textContent = text;
  }
}

/**
 * Verificar disponibilidad de FFmpeg
 */
async function checkFFmpeg() {
  updateSplashStatus('Checking FFmpeg...');
  const result = await videoEditorAPI.checkFFmpeg();
  const statusEl = elements.ffmpegStatus;

  if (result.available) {
    statusEl.classList.add('ready');
    statusEl.querySelector('.status-text').textContent = `FFmpeg ${result.version}`;
  } else {
    statusEl.classList.add('error');
    statusEl.querySelector('.status-text').textContent = 'FFmpeg not found';
    showNotification('FFmpeg is required. Please install FFmpeg to use this application.', 'error');
  }
}

/**
 * Cargar presets de exportación
 */
async function loadPresets() {
  updateSplashStatus('Loading presets...');
  const result = await videoEditorAPI.getPresets();
  if (result.success) {
    availablePresets = result.presets;
    renderPresetCards();
  }
}

/**
 * Cargar estilos de auto-edición
 */
async function loadAutoEditStyles() {
  updateSplashStatus('Loading auto-edit styles...');
  const result = await videoEditorAPI.getAutoEditStyles();
  if (result.success) {
    autoEditStyles = result.styles;
    renderStyleCards();
  }
}

/**
 * Cargar información de la aplicación
 */
async function loadAppInfo() {
  updateSplashStatus('Starting BlackMamba Studio...');
  const version = await videoEditorAPI.getAppVersion();
  elements.appVersion.textContent = `v${version}`;
}

/**
 * Configurar escuchadores de eventos
 */
function setupEventListeners() {
  // Navegación de barra de herramientas
  document.querySelectorAll('.tool-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  // Zona de soltar
  const dropZone = elements.dropZone;
  dropZone.addEventListener('click', () => importFiles());
  dropZone.addEventListener('dragover', handleDragOver);
  dropZone.addEventListener('dragleave', handleDragLeave);
  dropZone.addEventListener('drop', handleDrop);

  // Botón de importar
  document.getElementById('btn-import-media').addEventListener('click', () => importFiles(true));

  // Pestañas del panel
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => switchPanelTab(tab.dataset.tab));
  });

  // Controles de vista previa
  document.getElementById('btn-play').addEventListener('click', togglePlay);
  document.getElementById('btn-prev-frame').addEventListener('click', prevFrame);
  document.getElementById('btn-next-frame').addEventListener('click', nextFrame);

  // Zoom de línea de tiempo
  document.getElementById('btn-zoom-in').addEventListener('click', () => zoomTimeline(1));
  document.getElementById('btn-zoom-out').addEventListener('click', () => zoomTimeline(-1));
  document.getElementById('timeline-zoom').addEventListener('input', handleZoomSlider);

  // Exportación
  document.getElementById('btn-export').addEventListener('click', exportVideo);
  document.getElementById('export-quality').addEventListener('input', (e) => {
    elements.qualityDisplay.textContent = `${e.target.value}%`;
  });

  // Modal de éxito
  document.getElementById('btn-reveal').addEventListener('click', revealExportedFile);
  document.getElementById('btn-close-success').addEventListener('click', closeSuccessModal);

  // Deslizadores de propiedades
  document.querySelectorAll('.prop-slider').forEach(slider => {
    slider.addEventListener('input', handlePropertySlider);
  });

  // Botón de recorte
  document.getElementById('btn-apply-trim').addEventListener('click', applyTrim);

  // Controles de Auto-Edit
  elements.btnAnalyze.addEventListener('click', analyzeContent);
  elements.btnAutoEdit.addEventListener('click', runAutoEdit);
  elements.minClipDuration.addEventListener('input', (e) => {
    elements.minClipDisplay.textContent = `${e.target.value}s`;
  });
  elements.maxClipDuration.addEventListener('input', (e) => {
    elements.maxClipDisplay.textContent = `${e.target.value}s`;
  });
}

/**
 * Configurar escuchador de progreso
 */
function setupProgressListener() {
  videoEditorAPI.onProgress((data) => {
    updateProgress(data);
  });

  videoEditorAPI.onError((error) => {
    hideProgressModal();
    showNotification(`Error: ${error.message}`, 'error');
  });
}

/**
 * Cambiar sección de barra de herramientas
 */
function switchSection(section) {
  document.querySelectorAll('.tool-btn[data-section]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });
  currentSection = section;

  // Manejar actualizaciones de UI específicas de sección
  if (section === 'export') {
    switchPanelTab('export');
  }
  if (section === 'auto') {
    switchPanelTab('autoedit');
  }
}

/**
 * Cambiar pestaña del panel
 */
function switchPanelTab(tab) {
  document.querySelectorAll('.panel-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.panel-tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `tab-${tab}`);
  });
}

/**
 * Manejar arrastre sobre zona
 */
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('dragover');
}

/**
 * Manejar salida de arrastre
 */
function handleDragLeave(e) {
  e.currentTarget.classList.remove('dragover');
}

/**
 * Manejar soltar archivo
 */
async function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');

  const files = Array.from(e.dataTransfer.files);
  for (const file of files) {
    await addMediaFile(file.path);
  }
}

/**
 * Importar archivos usando diálogo
 */
async function importFiles(multiple = true) {
  const filePaths = await videoEditorAPI.openFileDialog({ multiple });
  if (filePaths) {
    for (const filePath of filePaths) {
      await addMediaFile(filePath);
    }
  }
}

/**
 * Agregar archivo multimedia a la biblioteca
 */
async function addMediaFile(filePath) {
  // Verificar si ya está importado
  if (mediaLibrary.find(f => f.path === filePath)) {
    showNotification('File already imported', 'warning');
    return;
  }

  setStatus('Analyzing media...');

  try {
    const result = await videoEditorAPI.getVideoInfo(filePath);

    if (result.success) {
      const mediaItem = {
        id: generateId(),
        path: filePath,
        name: filePath.split(/[\\/]/).pop(),
        info: result.info,
        thumbnail: null
      };

      mediaLibrary.push(mediaItem);
      renderMediaLibrary();
      updateFileCount();
      updateExportButton();
      setStatus(`Imported: ${mediaItem.name}`);

      // Agregar automáticamente a línea de tiempo
      addToTimeline(mediaItem);
    } else {
      showNotification(`Failed to import: ${result.error?.message || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    showNotification(`Import error: ${error.message}`, 'error');
  }
}

/**
 * Renderizar biblioteca de medios
 */
function renderMediaLibrary() {
  const container = elements.mediaLibrary;
  container.innerHTML = '';

  mediaLibrary.forEach(item => {
    const el = document.createElement('div');
    el.className = `media-item${selectedClip?.id === item.id ? ' selected' : ''}`;
    el.dataset.id = item.id;

    const duration = formatDuration(item.info.duration);
    const resolution = item.info.video ? item.info.video.resolution : 'Audio';

    el.innerHTML = `
      <div class="media-thumbnail">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
        </svg>
      </div>
      <div class="media-info">
        <div class="media-name">${item.name}</div>
        <div class="media-meta">
          <span>${duration}</span>
          <span>${resolution}</span>
        </div>
      </div>
      <div class="media-actions">
        <button class="media-action-btn" data-action="add" title="Add to Timeline">+</button>
        <button class="media-action-btn" data-action="remove" title="Remove">×</button>
      </div>
    `;

    el.addEventListener('click', (e) => {
      if (!e.target.closest('.media-action-btn')) {
        selectMedia(item);
      }
    });

    el.querySelector('[data-action="add"]').addEventListener('click', () => addToTimeline(item));
    el.querySelector('[data-action="remove"]').addEventListener('click', () => removeMedia(item.id));

    container.appendChild(el);
  });
}

/**
 * Seleccionar elemento multimedia
 */
function selectMedia(item) {
  selectedClip = item;
  renderMediaLibrary();
  updateClipProperties(item);
  loadPreview(item);
}

/**
 * Remover multimedia de biblioteca
 */
function removeMedia(id) {
  mediaLibrary = mediaLibrary.filter(m => m.id !== id);
  timelineClips = timelineClips.filter(c => c.id !== id);

  if (selectedClip?.id === id) {
    selectedClip = null;
    clearPreview();
    clearClipProperties();
  }

  renderMediaLibrary();
  renderTimeline();
  updateFileCount();
  updateExportButton();
}

/**
 * Agregar clip a línea de tiempo
 */
function addToTimeline(item) {
  // Evitar duplicados
  if (timelineClips.find(c => c.id === item.id)) {
    showNotification('Clip already in timeline', 'info');
    return;
  }

  timelineClips.push({
    ...item,
    order: timelineClips.length
  });

  renderTimeline();
  updateExportButton();
  showNotification('Added to timeline', 'success');
}

/**
 * Renderizar línea de tiempo
 */
function renderTimeline() {
  const container = elements.videoTrackContent;

  if (timelineClips.length === 0) {
    container.innerHTML = '<div class="empty-track-message">Drag clips here to start editing</div>';
    elements.timelineDuration.textContent = 'Duration: 00:00:00';
    return;
  }

  container.innerHTML = '';

  let totalDuration = 0;

  timelineClips.forEach((clip, index) => {
    const el = document.createElement('div');
    el.className = `timeline-clip${selectedClip?.id === clip.id ? ' selected' : ''}`;
    el.draggable = true;
    el.dataset.id = clip.id;
    el.dataset.index = index;

    const duration = clip.info.duration;
    totalDuration += duration;

    el.innerHTML = `
      <div class="clip-thumbnail">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
        </svg>
      </div>
      <div class="clip-info">
        <div class="clip-name">${clip.name}</div>
        <div class="clip-duration">${formatDuration(duration)}</div>
      </div>
    `;

    el.addEventListener('click', () => selectMedia(clip));
    el.addEventListener('dragstart', handleClipDragStart);
    el.addEventListener('dragover', handleClipDragOver);
    el.addEventListener('drop', handleClipDrop);

    container.appendChild(el);
  });

  elements.timelineDuration.textContent = `Duration: ${formatTimecode(totalDuration)}`;
}

/**
 * Manejar inicio de arrastre de clip
 */
function handleClipDragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.dataset.index);
}

/**
 * Manejar arrastre sobre clip
 */
function handleClipDragOver(e) {
  e.preventDefault();
}

/**
 * Manejar soltar clip (reordenar)
 */
function handleClipDrop(e) {
  e.preventDefault();
  const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
  const toIndex = parseInt(e.target.closest('.timeline-clip').dataset.index, 10);

  if (fromIndex !== toIndex) {
    const [moved] = timelineClips.splice(fromIndex, 1);
    timelineClips.splice(toIndex, 0, moved);
    timelineClips.forEach((clip, i) => clip.order = i);
    renderTimeline();
  }
}

/**
 * Cargar video de vista previa
 */
function loadPreview(item) {
  const video = elements.previewVideo;
  const placeholder = document.querySelector('.preview-placeholder');

  video.src = `file://${item.path}`;
  video.style.display = 'block';
  placeholder.style.display = 'none';

  video.addEventListener('loadedmetadata', () => {
    elements.totalTime.textContent = formatDuration(video.duration);
    updateTrimControls(item);
  });

  video.addEventListener('timeupdate', () => {
    elements.currentTime.textContent = formatDuration(video.currentTime);
    elements.previewTimecode.textContent = formatTimecode(video.currentTime);
  });
}

/**
 * Limpiar vista previa
 */
function clearPreview() {
  const video = elements.previewVideo;
  const placeholder = document.querySelector('.preview-placeholder');

  video.src = '';
  video.style.display = 'none';
  placeholder.style.display = 'flex';
  elements.currentTime.textContent = '00:00';
  elements.totalTime.textContent = '00:00';
}

/**
 * Alternar reproducir/pausar
 */
function togglePlay() {
  const video = elements.previewVideo;
  if (!video.src) return;

  if (video.paused) {
    video.play();
    isPlaying = true;
  } else {
    video.pause();
    isPlaying = false;
  }
}

/**
 * Fotograma anterior
 */
function prevFrame() {
  const video = elements.previewVideo;
  if (!video.src) return;
  video.currentTime = Math.max(0, video.currentTime - (1 / 30));
}

/**
 * Siguiente fotograma
 */
function nextFrame() {
  const video = elements.previewVideo;
  if (!video.src) return;
  video.currentTime = Math.min(video.duration, video.currentTime + (1 / 30));
}

/**
 * Zoom de línea de tiempo
 */
function zoomTimeline(direction) {
  const slider = document.getElementById('timeline-zoom');
  const newValue = parseInt(slider.value, 10) + direction;
  if (newValue >= 1 && newValue <= 10) {
    slider.value = newValue;
    // Aplicar efecto de zoom aquí
  }
}

/**
 * Manejar deslizador de zoom
 */
function handleZoomSlider(_e) {
  // Aplicar efecto de zoom basado en valor
}

/**
 * Actualizar panel de propiedades del clip
 */
function updateClipProperties(item) {
  const container = elements.clipProperties;

  container.innerHTML = `
    <div class="prop-item">
      <span class="prop-label">Name:</span>
      <span class="prop-data">${item.name}</span>
    </div>
    <div class="prop-item">
      <span class="prop-label">Duration:</span>
      <span class="prop-data">${formatTimecode(item.info.duration)}</span>
    </div>
    <div class="prop-item">
      <span class="prop-label">Resolution:</span>
      <span class="prop-data">${item.info.video?.resolution || 'N/A'}</span>
    </div>
    <div class="prop-item">
      <span class="prop-label">FPS:</span>
      <span class="prop-data">${item.info.video?.fps || 'N/A'}</span>
    </div>
    <div class="prop-item">
      <span class="prop-label">Codec:</span>
      <span class="prop-data">${item.info.video?.codec || 'N/A'}</span>
    </div>
    <div class="prop-item">
      <span class="prop-label">Audio:</span>
      <span class="prop-data">${item.info.audio?.codec || 'None'}</span>
    </div>
  `;
}

/**
 * Limpiar propiedades del clip
 */
function clearClipProperties() {
  elements.clipProperties.innerHTML = '<p class="no-selection">No clip selected</p>';
}

/**
 * Actualizar controles de recorte
 */
function updateTrimControls(item) {
  document.getElementById('trim-in').value = formatTimecode(0);
  document.getElementById('trim-out').value = formatTimecode(item.info.duration);
}

/**
 * Aplicar recorte
 */
async function applyTrim() {
  if (!selectedClip) {
    showNotification('Selecciona un clip primero', 'warning');
    return;
  }

  // Parsear códigos de tiempo
  const inTime = parseTimecode(document.getElementById('trim-in').value);
  const outTime = parseTimecode(document.getElementById('trim-out').value);

  if (outTime <= inTime) {
    showNotification('Out point must be after in point', 'error');
    return;
  }

  const baseName = selectedClip.name.replace(/\.[^.]+$/, '');
  const ext = selectedClip.name.split('.').pop();
  const outputPath = await videoEditorAPI.saveFileDialog({
    defaultName: `${baseName}_trimmed.${ext}`
  });

  if (!outputPath) return;

  showProgressModal('Trimming your clip...');

  const result = await videoEditorAPI.cutVideo({
    inputPath: selectedClip.path,
    startTime: inTime,
    endTime: outTime,
    outputPath
  });

  if (result.success) {
    showSuccessModal(result.outputPath);
  } else {
    hideProgressModal();
    showNotification(`Trim failed: ${result.error?.message}`, 'error');
  }
}

/**
 * Manejar deslizador de propiedades
 */
function handlePropertySlider(e) {
  const value = e.target.value;
  const propValue = e.target.parentElement.querySelector('.prop-value');
  if (propValue) {
    if (e.target.parentElement.querySelector('label').textContent.includes('Scale')) {
      propValue.textContent = `${value}%`;
    } else if (e.target.parentElement.querySelector('label').textContent.includes('Rotation')) {
      propValue.textContent = `${value}°`;
    }
  }
}

/**
 * Renderizar tarjetas de preset
 */
function renderPresetCards() {
  const container = elements.presetCards;
  container.innerHTML = '';

  const displayPresets = [
    { key: 'youtube1080p', badge: 'Popular' },
    { key: 'youtube4k', badge: '4K' },
    { key: 'instagram', badge: 'Social' },
    { key: 'tiktok', badge: 'Vertical' },
    { key: 'highQuality', badge: 'Pro' }
  ];

  displayPresets.forEach(({ key, badge }) => {
    const preset = availablePresets[key];
    if (!preset) return;

    const card = document.createElement('div');
    card.className = `preset-card${key === selectedPreset ? ' selected' : ''}`;
    card.dataset.key = key;

    card.innerHTML = `
      <div class="preset-card-header">
        <span class="preset-name">${preset.name}</span>
        <span class="preset-badge">${badge}</span>
      </div>
      <p class="preset-desc">${preset.description}</p>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPreset = key;
    });

    container.appendChild(card);
  });
}

/**
 * Actualizar estado del botón de exportación
 */
function updateExportButton() {
  elements.btnExport.disabled = timelineClips.length === 0;
  updateAutoEditButtons();
}

/**
 * Exportar video
 */
async function exportVideo() {
  if (timelineClips.length === 0) {
    showNotification('Agrega clips a la línea de tiempo primero', 'warning');
    return;
  }

  const preset = availablePresets[selectedPreset];
  const ext = preset?.format || 'mp4';

  const outputPath = await videoEditorAPI.saveFileDialog({
    defaultName: `blackmamba_export.${ext}`,
    extension: `.${ext}`
  });

  if (!outputPath) return;

  showProgressModal('Rendering your vision...');
  renderStartTime = Date.now();

  let result;

  if (timelineClips.length === 1) {
    // Exportación de un solo clip
    result = await videoEditorAPI.exportWithPreset({
      inputPath: timelineClips[0].path,
      outputPath,
      presetKey: selectedPreset
    });
  } else {
    // Múltiples clips - unir y luego exportar
    const clips = timelineClips.map((clip, index) => ({
      path: clip.path,
      order: index
    }));

    result = await videoEditorAPI.reorderJoin({
      clips,
      outputPath,
      options: { reencode: true }
    });
  }

  if (result.success) {
    showSuccessModal(result.outputPath);
  } else {
    hideProgressModal();
    showNotification(`Export failed: ${result.error?.message}`, 'error');
  }
}

/**
 * Mostrar modal de progreso
 */
function showProgressModal(title) {
  elements.progressTitle.textContent = title;
  elements.progressStatus.textContent = 'Preparing...';
  elements.progressFill.style.width = '0%';
  elements.renderPercent.textContent = '0%';
  elements.progressTime.textContent = 'Elapsed: 00:00';
  elements.progressEta.textContent = 'ETA: Calculating...';
  elements.progressModal.style.display = 'flex';
}

/**
 * Actualizar progreso
 */
function updateProgress(data) {
  const percent = Math.min(data.seconds ? Math.round(data.seconds * 2) : 0, 100);
  elements.progressFill.style.width = `${percent}%`;
  elements.renderPercent.textContent = `${percent}%`;
  elements.progressStatus.textContent = `Procesando... ${data.seconds || 0}s`;

  // Actualizar tiempo transcurrido
  if (renderStartTime) {
    const elapsed = Math.floor((Date.now() - renderStartTime) / 1000);
    elements.progressTime.textContent = `Elapsed: ${formatDuration(elapsed)}`;
  }

  // Actualizar anillo SVG
  const ring = document.querySelector('.ring-progress');
  if (ring) {
    const offset = 283 - (283 * percent / 100);
    ring.style.strokeDashoffset = offset;
  }
}

/**
 * Ocultar modal de progreso
 */
function hideProgressModal() {
  elements.progressModal.style.display = 'none';
}

/**
 * Mostrar modal de éxito
 */
function showSuccessModal(outputPath) {
  hideProgressModal();
  elements.successPath.textContent = outputPath;
  elements.successModal.style.display = 'flex';
  elements.successModal.dataset.path = outputPath;
}

/**
 * Cerrar modal de éxito
 */
function closeSuccessModal() {
  elements.successModal.style.display = 'none';
}

/**
 * Revelar archivo exportado
 */
async function revealExportedFile() {
  const path = elements.successModal.dataset.path;
  if (path) {
    await videoEditorAPI.showInFolder(path);
  }
  closeSuccessModal();
}

/**
 * Mostrar notificación
 */
function showNotification(message, type = 'info') {
  setStatus(message);
  console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Establecer mensaje de barra de estado
 */
function setStatus(message) {
  elements.statusMessage.textContent = message;
}

/**
 * Actualizar conteo de archivos
 */
function updateFileCount() {
  const count = mediaLibrary.length;
  elements.fileCount.textContent = `${count} clip${count !== 1 ? 's' : ''}`;
}

/**
 * Generar ID único
 */
function generateId() {
  return `clip_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Formatear duración (segundos a MM:SS)
 */
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formatear código de tiempo (HH:MM:SS:FF)
 */
function formatTimecode(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 30);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
}

/**
 * Parsear código de tiempo a segundos
 */
function parseTimecode(timecode) {
  const parts = timecode.split(':').map(p => parseInt(p, 10));
  if (parts.length === 4) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2] + parts[3] / 30;
  }
  return 0;
}

// ============================================
// Funciones de Característica Auto-Edit
// ============================================

/**
 * Renderizar tarjetas de estilo de auto-edición
 */
function renderStyleCards() {
  const container = elements.styleCards;
  if (!container) return;
  
  container.innerHTML = '';

  autoEditStyles.forEach(style => {
    const card = document.createElement('div');
    card.className = `style-card${style.key === selectedAutoEditStyle ? ' selected' : ''}`;
    card.dataset.key = style.key;

    card.innerHTML = `
      <div class="style-card-header">
        <span class="style-name">${style.name}</span>
        <span class="style-badge">${style.nameEn}</span>
      </div>
      <p class="style-desc">${style.description}</p>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.style-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedAutoEditStyle = style.key;
    });

    container.appendChild(card);
  });
}

/**
 * Actualizar estado de botones de auto-edición
 */
function updateAutoEditButtons() {
  const hasClips = mediaLibrary.length > 0;
  elements.btnAnalyze.disabled = !hasClips;
  elements.btnAutoEdit.disabled = !hasClips;
}

/**
 * Analizar contenido de video
 */
async function analyzeContent() {
  if (mediaLibrary.length === 0) {
    showNotification('Importa un video primero', 'warning');
    return;
  }

  const clip = selectedClip || mediaLibrary[0];
  setStatus('Analizando contenido del video...');
  showProgressModal('Analizando tu video...');

  try {
    const options = {
      minMomentDuration: parseInt(elements.minClipDuration.value, 10),
      maxMomentDuration: parseInt(elements.maxClipDuration.value, 10),
      targetDuration: elements.targetDuration.value 
        ? parseInt(elements.targetDuration.value, 10) 
        : null
    };

    const result = await videoEditorAPI.analyzeContent({
      inputPath: clip.path,
      options
    });

    hideProgressModal();

    if (result.success) {
      contentAnalysis = result.analysis;
      showAnalysisResults(result);
      showNotification('¡Análisis completado!', 'success');
    } else {
      showNotification(`Error en análisis: ${result.error?.message}`, 'error');
    }
  } catch (error) {
    hideProgressModal();
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Mostrar resultados del análisis
 */
function showAnalysisResults(result) {
  elements.analysisResults.style.display = 'block';
  elements.statMoments.textContent = result.momentsCount || 0;
  elements.statClips.textContent = result.clipsCount || 0;
  
  const timeSaved = result.summary?.timeSaved || 0;
  elements.statTimeSaved.textContent = formatDuration(timeSaved);
}

/**
 * Ejecutar edición automática de video
 */
async function runAutoEdit() {
  if (mediaLibrary.length === 0) {
    showNotification('Importa un video primero', 'warning');
    return;
  }

  const clip = selectedClip || mediaLibrary[0];
  
  const outputPath = await videoEditorAPI.saveFileDialog({
    defaultName: `${clip.name.replace(/\.[^.]+$/, '')}_auto_edit.mp4`,
    extension: '.mp4'
  });

  if (!outputPath) return;

  showProgressModal('Creando tu video automáticamente...');
  renderStartTime = Date.now();

  try {
    const options = {
      style: selectedAutoEditStyle,
      minClipDuration: parseInt(elements.minClipDuration.value, 10),
      maxClipDuration: parseInt(elements.maxClipDuration.value, 10),
      targetDuration: elements.targetDuration.value 
        ? parseInt(elements.targetDuration.value, 10) 
        : null
    };

    const result = await videoEditorAPI.autoEdit({
      inputPath: clip.path,
      outputPath,
      options
    });

    if (result.success) {
      showSuccessModal(result.outputPath);
      showAutoEditStats(result.statistics);
    } else {
      hideProgressModal();
      showNotification(`Error: ${result.error?.message}`, 'error');
    }
  } catch (error) {
    hideProgressModal();
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Mostrar estadísticas de auto-edición
 */
function showAutoEditStats(stats) {
  if (stats) {
    const msg = `¡Video creado! Original: ${formatDuration(stats.originalDuration)}, ` +
                `Nuevo: ${formatDuration(stats.newDuration)}, ` +
                `Ahorraste ${formatDuration(stats.timeSaved)} de edición`;
    setStatus(msg);
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
