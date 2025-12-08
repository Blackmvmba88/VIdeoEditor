/**
 * BlackMamba Studio - Web UI Client Script
 */

// API Configuration
const API_URL = window.location.origin;

// State
let currentVideo = null;
let timelineClips = [];
let resultVideo = null;

// Elements
const elements = {
  statusIndicator: document.getElementById('status-indicator'),
  statusText: document.getElementById('status-text'),
  uploadArea: document.getElementById('upload-area'),
  fileInput: document.getElementById('file-input'),
  btnBrowse: document.getElementById('btn-browse'),
  uploadProgress: document.getElementById('upload-progress'),
  progressFill: document.getElementById('progress-fill'),
  progressText: document.getElementById('progress-text'),
  
  videoSection: document.getElementById('video-section'),
  videoPlayer: document.getElementById('video-player'),
  videoFilename: document.getElementById('video-filename'),
  videoDuration: document.getElementById('video-duration'),
  videoFormat: document.getElementById('video-format'),
  
  startTime: document.getElementById('start-time'),
  endTime: document.getElementById('end-time'),
  btnSetCurrentStart: document.getElementById('btn-set-current-start'),
  btnSetCurrentEnd: document.getElementById('btn-set-current-end'),
  btnTrim: document.getElementById('btn-trim'),
  
  clipsContainer: document.getElementById('clips-container'),
  btnAddToTimeline: document.getElementById('btn-add-to-timeline'),
  btnJoin: document.getElementById('btn-join'),
  
  resultsSection: document.getElementById('results-section'),
  resultPlayer: document.getElementById('result-player'),
  btnDownload: document.getElementById('btn-download'),
  btnNew: document.getElementById('btn-new'),
  
  processingModal: document.getElementById('processing-modal'),
  processingTitle: document.getElementById('processing-title'),
  processingMessage: document.getElementById('processing-message')
};

/**
 * Initialize application
 */
async function init() {
  await checkHealth();
  setupEventListeners();
}

/**
 * Check server health
 */
async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    const data = await response.json();
    
    if (data.status === 'ok' && data.ffmpeg) {
      elements.statusIndicator.classList.add('active');
      elements.statusText.textContent = 'Conectado - FFmpeg OK';
    } else {
      elements.statusText.textContent = 'FFmpeg no disponible';
    }
  } catch (error) {
    console.error('Health check error:', error);
    elements.statusText.textContent = 'Error de conexión';
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Upload area
  elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
  elements.btnBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.fileInput.click();
  });
  elements.fileInput.addEventListener('change', handleFileSelect);
  
  // Drag and drop
  elements.uploadArea.addEventListener('dragover', handleDragOver);
  elements.uploadArea.addEventListener('dragleave', handleDragLeave);
  elements.uploadArea.addEventListener('drop', handleDrop);
  
  // Video controls
  elements.btnSetCurrentStart.addEventListener('click', setCurrentTimeAsStart);
  elements.btnSetCurrentEnd.addEventListener('click', setCurrentTimeAsEnd);
  elements.btnTrim.addEventListener('click', trimVideo);
  
  // Timeline
  elements.btnAddToTimeline.addEventListener('click', addToTimeline);
  elements.btnJoin.addEventListener('click', joinClips);
  
  // Results
  elements.btnDownload.addEventListener('click', downloadVideo);
  elements.btnNew.addEventListener('click', newProject);
  
  // Video player events
  elements.videoPlayer.addEventListener('loadedmetadata', updateVideoInfo);
}

/**
 * Handle file selection
 */
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    await uploadVideo(file);
  }
}

/**
 * Handle drag over
 */
function handleDragOver(event) {
  event.preventDefault();
  elements.uploadArea.classList.add('drag-over');
}

/**
 * Handle drag leave
 */
function handleDragLeave(event) {
  event.preventDefault();
  elements.uploadArea.classList.remove('drag-over');
}

/**
 * Handle drop
 */
function handleDrop(event) {
  event.preventDefault();
  elements.uploadArea.classList.remove('drag-over');
  
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('video/')) {
    uploadVideo(file);
  } else {
    alert('Por favor, arrastra un archivo de video válido');
  }
}

/**
 * Upload video to server
 */
async function uploadVideo(file) {
  const formData = new FormData();
  formData.append('video', file);
  
  elements.uploadProgress.style.display = 'block';
  elements.progressFill.style.width = '0%';
  elements.progressText.textContent = 'Subiendo video...';
  
  try {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        elements.progressFill.style.width = percent + '%';
        elements.progressText.textContent = `Subiendo... ${Math.round(percent)}%`;
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        currentVideo = data.file;
        loadVideo(data.file);
        elements.uploadProgress.style.display = 'none';
      } else {
        throw new Error('Error al subir el video');
      }
    });
    
    xhr.addEventListener('error', () => {
      throw new Error('Error de red al subir el video');
    });
    
    xhr.open('POST', `${API_URL}/api/upload`);
    xhr.send(formData);
  } catch (error) {
    console.error('Upload error:', error);
    alert('Error al subir el video: ' + error.message);
    elements.uploadProgress.style.display = 'none';
  }
}

/**
 * Load video in player
 */
function loadVideo(file) {
  elements.videoSection.style.display = 'block';
  elements.videoPlayer.src = `${API_URL}/api/download/${file.path}`;
  elements.videoFilename.textContent = file.filename;
  elements.videoDuration.textContent = formatDuration(file.duration);
  elements.videoFormat.textContent = file.format;
  
  // Set end time to video duration
  elements.endTime.value = Math.floor(file.duration);
  
  // Scroll to video section
  elements.videoSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Update video info when loaded
 */
function updateVideoInfo() {
  const duration = elements.videoPlayer.duration;
  if (currentVideo) {
    currentVideo.duration = duration;
    elements.videoDuration.textContent = formatDuration(duration);
    elements.endTime.value = Math.floor(duration);
  }
}

/**
 * Set current time as start
 */
function setCurrentTimeAsStart() {
  const currentTime = elements.videoPlayer.currentTime;
  elements.startTime.value = currentTime.toFixed(1);
}

/**
 * Set current time as end
 */
function setCurrentTimeAsEnd() {
  const currentTime = elements.videoPlayer.currentTime;
  elements.endTime.value = currentTime.toFixed(1);
}

/**
 * Trim video
 */
async function trimVideo() {
  if (!currentVideo) {
    alert('Por favor, sube un video primero');
    return;
  }
  
  const startTime = parseFloat(elements.startTime.value);
  const endTime = parseFloat(elements.endTime.value);
  
  if (startTime >= endTime) {
    alert('El tiempo de inicio debe ser menor que el tiempo de fin');
    return;
  }
  
  if (endTime > currentVideo.duration) {
    alert('El tiempo de fin no puede ser mayor que la duración del video');
    return;
  }
  
  showProcessing('Recortando video...', 'Por favor espera mientras recortamos tu video');
  
  try {
    const response = await fetch(`${API_URL}/api/trim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: currentVideo.path,
        startTime,
        endTime
      })
    });
    
    if (!response.ok) throw new Error('Error al recortar el video');
    
    const data = await response.json();
    
    // Update current video to trimmed version
    currentVideo = {
      ...currentVideo,
      path: data.file.path,
      filename: 'video_recortado.mp4',
      duration: endTime - startTime
    };
    
    loadVideo(currentVideo);
    hideProcessing();
    
    alert('¡Video recortado exitosamente!');
  } catch (error) {
    console.error('Trim error:', error);
    hideProcessing();
    alert('Error al recortar el video: ' + error.message);
  }
}

/**
 * Add current video to timeline
 */
function addToTimeline() {
  if (!currentVideo) {
    alert('Por favor, sube un video primero');
    return;
  }
  
  const clip = { ...currentVideo };
  timelineClips.push(clip);
  renderTimeline();
  
  elements.btnJoin.disabled = timelineClips.length < 2;
}

/**
 * Render timeline clips
 */
function renderTimeline() {
  if (timelineClips.length === 0) {
    elements.clipsContainer.innerHTML = '<p class="empty-message">No hay clips agregados aún</p>';
    return;
  }
  
  elements.clipsContainer.innerHTML = timelineClips.map((clip, index) => `
    <div class="clip-item">
      <div class="clip-info">
        <div class="clip-name">Clip ${index + 1}: ${clip.filename}</div>
        <div class="clip-duration">Duración: ${formatDuration(clip.duration)}</div>
      </div>
      <div class="clip-actions">
        <button class="clip-btn clip-up" data-index="${index}" ${index === 0 ? 'disabled' : ''}>
          ↑
        </button>
        <button class="clip-btn clip-down" data-index="${index}" ${index === timelineClips.length - 1 ? 'disabled' : ''}>
          ↓
        </button>
        <button class="clip-btn clip-remove" data-index="${index}">
          🗑️
        </button>
      </div>
    </div>
  `).join('');
}

/**
 * Handle clip actions via event delegation
 */
elements.clipsContainer.addEventListener('click', (e) => {
  const target = e.target;
  const index = parseInt(target.dataset.index);
  
  if (isNaN(index)) return;
  
  if (target.classList.contains('clip-up')) {
    moveClipUp(index);
  } else if (target.classList.contains('clip-down')) {
    moveClipDown(index);
  } else if (target.classList.contains('clip-remove')) {
    removeClip(index);
  }
});

/**
 * Move clip up in timeline
 */
function moveClipUp(index) {
  if (index > 0) {
    [timelineClips[index], timelineClips[index - 1]] = [timelineClips[index - 1], timelineClips[index]];
    renderTimeline();
  }
}

/**
 * Move clip down in timeline
 */
function moveClipDown(index) {
  if (index < timelineClips.length - 1) {
    [timelineClips[index], timelineClips[index + 1]] = [timelineClips[index + 1], timelineClips[index]];
    renderTimeline();
  }
}

/**
 * Remove clip from timeline
 */
function removeClip(index) {
  timelineClips.splice(index, 1);
  renderTimeline();
  elements.btnJoin.disabled = timelineClips.length < 2;
}

/**
 * Join clips
 */
async function joinClips() {
  if (timelineClips.length < 2) {
    alert('Agrega al menos 2 clips a la línea de tiempo');
    return;
  }
  
  showProcessing('Uniendo clips...', 'Por favor espera mientras unimos tus clips');
  
  try {
    const response = await fetch(`${API_URL}/api/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clips: timelineClips
      })
    });
    
    if (!response.ok) throw new Error('Error al unir los clips');
    
    const data = await response.json();
    resultVideo = data.file;
    
    showResult(resultVideo);
    hideProcessing();
  } catch (error) {
    console.error('Join error:', error);
    hideProcessing();
    alert('Error al unir los clips: ' + error.message);
  }
}

/**
 * Show result
 */
function showResult(video) {
  elements.resultsSection.style.display = 'block';
  elements.resultPlayer.src = `${API_URL}/api/download/${video.path}`;
  elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Download video
 */
function downloadVideo() {
  if (resultVideo) {
    window.location.href = `${API_URL}/api/download/${resultVideo.path}`;
  }
}

/**
 * New project
 */
function newProject() {
  if (confirm('¿Estás seguro de que quieres iniciar un nuevo proyecto? Se perderán los cambios no guardados.')) {
    currentVideo = null;
    timelineClips = [];
    resultVideo = null;
    
    elements.videoSection.style.display = 'none';
    elements.resultsSection.style.display = 'none';
    elements.videoPlayer.src = '';
    elements.resultPlayer.src = '';
    elements.fileInput.value = '';
    
    renderTimeline();
    elements.btnJoin.disabled = true;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Show processing modal
 */
function showProcessing(title, message) {
  elements.processingTitle.textContent = title;
  elements.processingMessage.textContent = message;
  elements.processingModal.style.display = 'flex';
}

/**
 * Hide processing modal
 */
function hideProcessing() {
  elements.processingModal.style.display = 'none';
}

/**
 * Format duration in seconds to readable format
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
