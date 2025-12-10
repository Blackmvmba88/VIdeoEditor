/**
 * BlackMamba Studio - Script de Renderizado
 * Editor de Video Profesional con UI Cinematográfica
 */

// API expuesta por preload.js - usar directamente window.videoEditorAPI
// No redeclarar para evitar conflicto con contextBridge

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
  try {
    console.log('🐍 BlackMamba Studio - Iniciando...');
    cacheElements();
    showSplash();

    console.log('Verificando FFmpeg...');
    await checkFFmpeg();
    console.log('Cargando presets...');
    await loadPresets();
    console.log('Cargando estilos auto-edit...');
    await loadAutoEditStyles();
    console.log('Cargando info de app...');
    await loadAppInfo();

    console.log('Configurando event listeners...');
    setupEventListeners();
    setupProgressListener();

    console.log('✅ Inicialización completa!');
    hideSplash();
  } catch (error) {
    console.error('❌ Error en inicialización:', error);
    // Ocultar splash de todos modos para mostrar la app
    hideSplash();
  }
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
  const result = await window.videoEditorAPI.checkFFmpeg();
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
  const result = await window.videoEditorAPI.getPresets();
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
  const result = await window.videoEditorAPI.getAutoEditStyles();
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
  const version = await window.videoEditorAPI.getAppVersion();
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

  // Menú de Proyecto
  setupProjectMenu();
  
  // Botón de escanear carpeta
  const btnScanFolder = document.getElementById('btn-scan-folder');
  if (btnScanFolder) {
    btnScanFolder.addEventListener('click', scanFolderForMedia);
  }

  // Atajos de teclado para proyecto
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Configurar escuchador de progreso
 */
function setupProgressListener() {
  window.videoEditorAPI.onProgress((data) => {
    updateProgress(data);
  });

  window.videoEditorAPI.onError((error) => {
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
  const filePaths = await window.videoEditorAPI.openFileDialog({ multiple });
  if (filePaths) {
    for (const filePath of filePaths) {
      await addMediaFile(filePath);
    }
  }
}

/**
 * Función unificada para agregar archivos a la biblioteca
 * @param {string} filePath - Ruta del archivo
 * @param {Object} preloadedInfo - Info precargada (opcional, del escaneo de carpeta)
 * @returns {boolean} - true si se agregó exitosamente
 */
async function addMediaFileUnified(filePath, preloadedInfo = null) {
  // Verificar duplicados
  if (mediaLibrary.some(f => f.path === filePath)) {
    return false;
  }

  setStatus('Analyzing media...');

  try {
    // Usar info precargada o solicitar nueva
    let info = preloadedInfo?.info;
    if (!info) {
      const result = await window.videoEditorAPI.getVideoInfo(filePath);
      if (!result.success) {
        showNotification(`Error: ${result.error?.message || 'Unknown'}`, 'error');
        return false;
      }
      info = result.info;
    }

    const mediaItem = {
      id: generateId(),
      path: filePath,
      name: preloadedInfo?.name || filePath.split(/[\\/]/).pop(),
      info,
      duration: info.duration || preloadedInfo?.duration || 0,
      thumbnail: null
    };

    mediaLibrary.push(mediaItem);
    renderMediaLibrary();
    updateFileCount();
    updateExportButton();
    setStatus(`Imported: ${mediaItem.name}`);
    addToTimeline(mediaItem);
    
    return true;
  } catch (error) {
    console.error('Import error:', error);
    return false;
  }
}

/**
 * Agregar archivo multimedia (wrapper para compatibilidad)
 */
async function addMediaFile(filePath) {
  const success = await addMediaFileUnified(filePath);
  if (!success && mediaLibrary.some(f => f.path === filePath)) {
    showNotification('File already imported', 'warning');
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
  video.classList.remove('hidden');
  placeholder.classList.add('hidden');

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
  video.classList.add('hidden');
  placeholder.classList.remove('hidden');
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
    showNotification('Seleccione un clip primero', 'warning');
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
  const outputPath = await window.videoEditorAPI.saveFileDialog({
    defaultName: `${baseName}_trimmed.${ext}`
  });

  if (!outputPath) return;

  showProgressModal('Trimming your clip...');

  const result = await window.videoEditorAPI.cutVideo({
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
    showNotification('Agregue clips a la línea de tiempo primero', 'warning');
    return;
  }

  const preset = availablePresets[selectedPreset];
  const ext = preset?.format || 'mp4';

  const outputPath = await window.videoEditorAPI.saveFileDialog({
    defaultName: `blackmamba_export.${ext}`,
    extension: `.${ext}`
  });

  if (!outputPath) return;

  showProgressModal('Rendering your vision...');
  renderStartTime = Date.now();

  let result;

  if (timelineClips.length === 1) {
    // Exportación de un solo clip
    result = await window.videoEditorAPI.exportWithPreset({
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

    result = await window.videoEditorAPI.reorderJoin({
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
  elements.progressModal.classList.remove('hidden');
  elements.progressModal.classList.add('modal-visible');
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
  elements.progressModal.classList.add('hidden');
  elements.progressModal.classList.remove('modal-visible');
}

/**
 * Mostrar modal de éxito
 */
function showSuccessModal(outputPath) {
  hideProgressModal();
  elements.successPath.textContent = outputPath;
  elements.successModal.classList.remove('hidden');
  elements.successModal.classList.add('modal-visible');
  elements.successModal.dataset.path = outputPath;
}

/**
 * Cerrar modal de éxito
 */
function closeSuccessModal() {
  elements.successModal.classList.add('hidden');
  elements.successModal.classList.remove('modal-visible');
}

/**
 * Revelar archivo exportado
 */
async function revealExportedFile() {
  const path = elements.successModal.dataset.path;
  if (path) {
    await window.videoEditorAPI.showInFolder(path);
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

    const result = await window.videoEditorAPI.analyzeContent({
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
  elements.analysisResults.classList.remove('hidden');
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
  
  const outputPath = await window.videoEditorAPI.saveFileDialog({
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

    const result = await window.videoEditorAPI.autoEdit({
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

// ===== GESTIÓN DE PROYECTOS =====

// Estado de proyecto actual
let currentProject = null;
let recentProjects = [];

/**
 * Configurar menú de proyecto (dropdown)
 */
function setupProjectMenu() {
  const dropdown = document.getElementById('project-dropdown');
  const dropdownBtn = document.getElementById('project-dropdown-btn');
  
  if (!dropdown || !dropdownBtn) return;
  
  // Toggle dropdown
  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
    if (dropdown.classList.contains('open')) {
      loadRecentProjects();
    }
  });
  
  // Cerrar al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
  
  // Acciones del menú
  document.getElementById('menu-new-project')?.addEventListener('click', createNewProject);
  document.getElementById('menu-open-project')?.addEventListener('click', openProject);
  document.getElementById('menu-save-project')?.addEventListener('click', saveCurrentProject);
}

/**
 * Cargar proyectos recientes en el menú
 */
async function loadRecentProjects() {
  const container = document.getElementById('recent-projects-list');
  if (!container) return;
  
  try {
    const result = await window.videoEditorAPI.projectGetAll();
    if (result.success && result.projects.length > 0) {
      recentProjects = result.projects.slice(0, 5); // Últimos 5
      
      container.innerHTML = recentProjects.map(project => `
        <div class="recent-project-item" data-project-id="${project.id}">
          <span>📁</span>
          <span class="project-name">${project.name}</span>
        </div>
      `).join('');
      
      // Event listeners para cada proyecto
      container.querySelectorAll('.recent-project-item').forEach(item => {
        item.addEventListener('click', () => loadProject(item.dataset.projectId));
      });
    } else {
      container.innerHTML = '<div class="no-recent-projects">No hay proyectos recientes</div>';
    }
  } catch (error) {
    console.error('Error cargando proyectos recientes:', error);
    container.innerHTML = '<div class="no-recent-projects">Error al cargar proyectos</div>';
  }
}

/**
 * Crear nuevo proyecto
 */
async function createNewProject() {
  closeProjectDropdown();
  
  const projectName = prompt('Nombre del proyecto:', 'Mi Proyecto');
  if (!projectName) return;
  
  try {
    const result = await window.videoEditorAPI.projectCreate({ name: projectName });
    if (result.success) {
      currentProject = result.project;
      updateProjectName(projectName);
      clearMediaLibrary();
      showNotification(`Proyecto "${projectName}" creado`, 'success');
      setStatus(`Nuevo proyecto: ${projectName}`);
    } else {
      showNotification('Error al crear proyecto', 'error');
    }
  } catch (error) {
    console.error('Error creando proyecto:', error);
    showNotification('Error al crear proyecto', 'error');
  }
}

/**
 * Abrir proyecto existente
 */
async function openProject() {
  closeProjectDropdown();
  
  try {
    const result = await window.videoEditorAPI.projectGetAll();
    if (!result.success || result.projects.length === 0) {
      showNotification('No hay proyectos guardados', 'info');
      return;
    }
    
    // Por ahora usar el primer proyecto, luego implementar selector
    const projectId = result.projects[0].id;
    await loadProject(projectId);
  } catch (error) {
    console.error('Error abriendo proyecto:', error);
    showNotification('Error al abrir proyecto', 'error');
  }
}

/**
 * Cargar un proyecto por ID
 */
async function loadProject(projectId) {
  closeProjectDropdown();
  
  try {
    const result = await window.videoEditorAPI.projectLoad(projectId);
    if (result.success) {
      currentProject = result.project;
      updateProjectName(result.project.name);
      
      // Cargar archivos del proyecto usando función unificada
      if (result.project.files?.length > 0) {
        clearMediaLibrary();
        for (const file of result.project.files) {
          if (file.path) {
            await addMediaFileUnified(file.path, file);
          }
        }
      }
      
      showNotification(`Proyecto "${result.project.name}" cargado`, 'success');
      setStatus(`Proyecto abierto: ${result.project.name}`);
    }
  } catch (error) {
    console.error('Error cargando proyecto:', error);
    showNotification('Error al cargar proyecto', 'error');
  }
}

/**
 * Guardar proyecto actual
 */
async function saveCurrentProject() {
  closeProjectDropdown();
  
  if (!currentProject) {
    // Si no hay proyecto, crear uno nuevo
    await createNewProject();
    return;
  }
  
  try {
    // Preparar datos del proyecto
    const projectData = {
      ...currentProject,
      files: mediaLibrary.map(clip => ({
        path: clip.path,
        name: clip.name,
        duration: clip.duration
      })),
      timeline: timelineClips
    };
    
    const result = await window.videoEditorAPI.projectSave(projectData);
    if (result.success) {
      currentProject = result.project;
      showNotification('Proyecto guardado', 'success');
      setStatus(`Proyecto guardado: ${currentProject.name}`);
    }
  } catch (error) {
    console.error('Error guardando proyecto:', error);
    showNotification('Error al guardar proyecto', 'error');
  }
}

/**
 * Cerrar dropdown de proyecto
 */
function closeProjectDropdown() {
  const dropdown = document.getElementById('project-dropdown');
  if (dropdown) {
    dropdown.classList.remove('open');
  }
}

/**
 * Actualizar nombre del proyecto en la UI
 */
function updateProjectName(name) {
  const projectNameEl = document.querySelector('.project-name span');
  if (projectNameEl) {
    projectNameEl.textContent = name || 'Untitled Project';
  }
}

/**
 * Limpiar biblioteca de medios
 */
function clearMediaLibrary() {
  mediaLibrary = [];
  timelineClips = [];
  selectedClip = null;
  renderMediaLibrary();
  renderTimeline();
  updateFileCount();
}

// ===== ESCANEO DE CARPETAS =====

/**
 * Escanear carpeta para encontrar archivos de video
 */
async function scanFolderForMedia() {
  try {
    const folderPath = await window.videoEditorAPI.selectFolder();
    if (!folderPath) return;
    
    setStatus(`Escaneando carpeta: ${folderPath}...`);
    showNotification('Escaneando carpeta...', 'info');
    
    const result = await window.videoEditorAPI.scanFolder({ folderPath, recursive: true });
    
    if (!result.success) {
      showNotification('Error al escanear carpeta', 'error');
      return;
    }
    
    if (result.files.length === 0) {
      showNotification('No se encontraron archivos de video', 'info');
      return;
    }
    
    // Importar archivos encontrados usando función unificada
    let imported = 0;
    for (const file of result.files) {
      const success = await addMediaFileUnified(file.path, file);
      if (success) imported++;
    }
    
    showNotification(`${imported} archivos importados`, 'success');
    setStatus(`${imported} archivos de ${folderPath}`);
  } catch (error) {
    console.error('Error escaneando carpeta:', error);
    showNotification('Error al escanear carpeta', 'error');
  }
}

// ===== ATAJOS DE TECLADO =====

/**
 * Manejar atajos de teclado
 */
function handleKeyboardShortcuts(e) {
  // Cmd/Ctrl + N: Nuevo proyecto
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault();
    createNewProject();
  }
  
  // Cmd/Ctrl + O: Abrir proyecto
  if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
    e.preventDefault();
    openProject();
  }
  
  // Cmd/Ctrl + S: Guardar proyecto
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    saveCurrentProject();
  }
  
  // Cmd/Ctrl + I: Importar archivos
  if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
    e.preventDefault();
    importFiles();
  }
  
  // Cmd/Ctrl + Shift + I: Escanear carpeta
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'I') {
    e.preventDefault();
    scanFolderForMedia();
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);

