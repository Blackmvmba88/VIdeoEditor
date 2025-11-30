/**
 * BlackMamba Studio - Renderer Script
 * Professional Video Editor with Cinematic UI
 */

const { videoEditorAPI } = window;

// State
let mediaLibrary = [];
let timelineClips = [];
let selectedClip = null;
let selectedPreset = 'youtube1080p';
let availablePresets = {};
let isPlaying = false;
let currentSection = 'edit';
let renderStartTime = null;

// DOM Elements
const elements = {};

/**
 * Initialize application
 */
async function init() {
  cacheElements();
  showSplash();

  await checkFFmpeg();
  await loadPresets();
  await loadAppInfo();

  setupEventListeners();
  setupProgressListener();

  hideSplash();
}

/**
 * Cache DOM elements
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
}

/**
 * Show splash screen
 */
function showSplash() {
  elements.splashStatus.textContent = 'Initializing...';
}

/**
 * Hide splash screen with animation
 */
function hideSplash() {
  setTimeout(() => {
    elements.splashScreen.classList.add('hidden');
    elements.app.classList.remove('app-hidden');
  }, 2200);
}

/**
 * Update splash status
 */
function updateSplashStatus(text) {
  if (elements.splashStatus) {
    elements.splashStatus.textContent = text;
  }
}

/**
 * Check FFmpeg availability
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
 * Load export presets
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
 * Load app info
 */
async function loadAppInfo() {
  updateSplashStatus('Starting BlackMamba Studio...');
  const version = await videoEditorAPI.getAppVersion();
  elements.appVersion.textContent = `v${version}`;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Toolbar navigation
  document.querySelectorAll('.tool-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  // Drop zone
  const dropZone = elements.dropZone;
  dropZone.addEventListener('click', () => importFiles());
  dropZone.addEventListener('dragover', handleDragOver);
  dropZone.addEventListener('dragleave', handleDragLeave);
  dropZone.addEventListener('drop', handleDrop);

  // Import button
  document.getElementById('btn-import-media').addEventListener('click', () => importFiles(true));

  // Panel tabs
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => switchPanelTab(tab.dataset.tab));
  });

  // Preview controls
  document.getElementById('btn-play').addEventListener('click', togglePlay);
  document.getElementById('btn-prev-frame').addEventListener('click', prevFrame);
  document.getElementById('btn-next-frame').addEventListener('click', nextFrame);

  // Timeline zoom
  document.getElementById('btn-zoom-in').addEventListener('click', () => zoomTimeline(1));
  document.getElementById('btn-zoom-out').addEventListener('click', () => zoomTimeline(-1));
  document.getElementById('timeline-zoom').addEventListener('input', handleZoomSlider);

  // Export
  document.getElementById('btn-export').addEventListener('click', exportVideo);
  document.getElementById('export-quality').addEventListener('input', (e) => {
    elements.qualityDisplay.textContent = `${e.target.value}%`;
  });

  // Success modal
  document.getElementById('btn-reveal').addEventListener('click', revealExportedFile);
  document.getElementById('btn-close-success').addEventListener('click', closeSuccessModal);

  // Properties sliders
  document.querySelectorAll('.prop-slider').forEach(slider => {
    slider.addEventListener('input', handlePropertySlider);
  });

  // Trim button
  document.getElementById('btn-apply-trim').addEventListener('click', applyTrim);
}

/**
 * Setup progress listener
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
 * Switch toolbar section
 */
function switchSection(section) {
  document.querySelectorAll('.tool-btn[data-section]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });
  currentSection = section;

  // Handle section-specific UI updates
  if (section === 'export') {
    switchPanelTab('export');
  }
}

/**
 * Switch panel tab
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
 * Handle drag over
 */
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('dragover');
}

/**
 * Handle drag leave
 */
function handleDragLeave(e) {
  e.currentTarget.classList.remove('dragover');
}

/**
 * Handle file drop
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
 * Import files using dialog
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
 * Add media file to library
 */
async function addMediaFile(filePath) {
  // Check if already imported
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

      // Auto-add to timeline
      addToTimeline(mediaItem);
    } else {
      showNotification(`Failed to import: ${result.error?.message || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    showNotification(`Import error: ${error.message}`, 'error');
  }
}

/**
 * Render media library
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
 * Select media item
 */
function selectMedia(item) {
  selectedClip = item;
  renderMediaLibrary();
  updateClipProperties(item);
  loadPreview(item);
}

/**
 * Remove media from library
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
 * Add clip to timeline
 */
function addToTimeline(item) {
  // Avoid duplicates
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
 * Render timeline
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
 * Handle clip drag start
 */
function handleClipDragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.dataset.index);
}

/**
 * Handle clip drag over
 */
function handleClipDragOver(e) {
  e.preventDefault();
}

/**
 * Handle clip drop (reorder)
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
 * Load preview video
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
 * Clear preview
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
 * Toggle play/pause
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
 * Previous frame
 */
function prevFrame() {
  const video = elements.previewVideo;
  if (!video.src) return;
  video.currentTime = Math.max(0, video.currentTime - (1 / 30));
}

/**
 * Next frame
 */
function nextFrame() {
  const video = elements.previewVideo;
  if (!video.src) return;
  video.currentTime = Math.min(video.duration, video.currentTime + (1 / 30));
}

/**
 * Zoom timeline
 */
function zoomTimeline(direction) {
  const slider = document.getElementById('timeline-zoom');
  const newValue = parseInt(slider.value, 10) + direction;
  if (newValue >= 1 && newValue <= 10) {
    slider.value = newValue;
    // Apply zoom effect here
  }
}

/**
 * Handle zoom slider
 */
function handleZoomSlider(e) {
  // Apply zoom effect based on value
}

/**
 * Update clip properties panel
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
 * Clear clip properties
 */
function clearClipProperties() {
  elements.clipProperties.innerHTML = '<p class="no-selection">No clip selected</p>';
}

/**
 * Update trim controls
 */
function updateTrimControls(item) {
  document.getElementById('trim-in').value = formatTimecode(0);
  document.getElementById('trim-out').value = formatTimecode(item.info.duration);
}

/**
 * Apply trim
 */
async function applyTrim() {
  if (!selectedClip) {
    showNotification('Select a clip first', 'warning');
    return;
  }

  // Parse timecodes
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
 * Handle property slider
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
 * Render preset cards
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
 * Update export button state
 */
function updateExportButton() {
  elements.btnExport.disabled = timelineClips.length === 0;
}

/**
 * Export video
 */
async function exportVideo() {
  if (timelineClips.length === 0) {
    showNotification('Add clips to timeline first', 'warning');
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
    // Single clip export
    result = await videoEditorAPI.exportWithPreset({
      inputPath: timelineClips[0].path,
      outputPath,
      presetKey: selectedPreset
    });
  } else {
    // Multiple clips - join then export
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
 * Show progress modal
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
 * Update progress
 */
function updateProgress(data) {
  const percent = Math.min(data.seconds ? Math.round(data.seconds * 2) : 0, 100);
  elements.progressFill.style.width = `${percent}%`;
  elements.renderPercent.textContent = `${percent}%`;
  elements.progressStatus.textContent = `Processing... ${data.seconds || 0}s`;

  // Update elapsed time
  if (renderStartTime) {
    const elapsed = Math.floor((Date.now() - renderStartTime) / 1000);
    elements.progressTime.textContent = `Elapsed: ${formatDuration(elapsed)}`;
  }

  // Update SVG ring
  const ring = document.querySelector('.ring-progress');
  if (ring) {
    const offset = 283 - (283 * percent / 100);
    ring.style.strokeDashoffset = offset;
  }
}

/**
 * Hide progress modal
 */
function hideProgressModal() {
  elements.progressModal.style.display = 'none';
}

/**
 * Show success modal
 */
function showSuccessModal(outputPath) {
  hideProgressModal();
  elements.successPath.textContent = outputPath;
  elements.successModal.style.display = 'flex';
  elements.successModal.dataset.path = outputPath;
}

/**
 * Close success modal
 */
function closeSuccessModal() {
  elements.successModal.style.display = 'none';
}

/**
 * Reveal exported file
 */
async function revealExportedFile() {
  const path = elements.successModal.dataset.path;
  if (path) {
    await videoEditorAPI.showInFolder(path);
  }
  closeSuccessModal();
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  setStatus(message);
  console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Set status bar message
 */
function setStatus(message) {
  elements.statusMessage.textContent = message;
}

/**
 * Update file count
 */
function updateFileCount() {
  const count = mediaLibrary.length;
  elements.fileCount.textContent = `${count} clip${count !== 1 ? 's' : ''}`;
}

/**
 * Generate unique ID
 */
function generateId() {
  return `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format duration (seconds to MM:SS)
 */
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format timecode (HH:MM:SS:FF)
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
 * Parse timecode to seconds
 */
function parseTimecode(timecode) {
  const parts = timecode.split(':').map(p => parseInt(p, 10));
  if (parts.length === 4) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2] + parts[3] / 30;
  }
  return 0;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
