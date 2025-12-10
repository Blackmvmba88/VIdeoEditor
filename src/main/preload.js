/**
 * Video Editor Pro - Script de Precarga
 * Expone APIs seguras al proceso de renderizado
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * API segura para proceso de renderizado
 */
contextBridge.exposeInMainWorld('videoEditorAPI', {
  // FFmpeg
  checkFFmpeg: () => ipcRenderer.invoke('check-ffmpeg'),

  // Diálogos
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  selectFolderDialog: () => ipcRenderer.invoke('select-folder-dialog'),
  selectFolder: () => ipcRenderer.invoke('select-folder-dialog'), // Alias para compatibilidad

  // Información del video
  getVideoInfo: (filePath) => ipcRenderer.invoke('get-video-info', filePath),
  validateFiles: (filePaths) => ipcRenderer.invoke('validate-files', filePaths),
  checkCompatibility: (filePaths) => ipcRenderer.invoke('check-compatibility', filePaths),
  getSupportedExtensions: () => ipcRenderer.invoke('get-supported-extensions'),

  // Procesamiento de video
  cutVideo: (params) => ipcRenderer.invoke('cut-video', params),
  joinVideos: (params) => ipcRenderer.invoke('join-videos', params),
  reorderJoin: (params) => ipcRenderer.invoke('reorder-join', params),
  splitVideo: (params) => ipcRenderer.invoke('split-video', params),

  // Exportación
  exportWithPreset: (params) => ipcRenderer.invoke('export-preset', params),
  exportCustom: (params) => ipcRenderer.invoke('export-custom', params),
  exportMultiplePlatforms: (params) => ipcRenderer.invoke('export-multiple', params),
  generateThumbnail: (params) => ipcRenderer.invoke('generate-thumbnail', params),
  estimateSize: (params) => ipcRenderer.invoke('estimate-size', params),

  // Presets
  getPresets: () => ipcRenderer.invoke('get-presets'),
  getPresetInfo: (presetKey) => ipcRenderer.invoke('get-preset-info', presetKey),

  // Auto-Edit - Edición Automática de Video
  analyzeContent: (params) => ipcRenderer.invoke('analyze-content', params),
  autoEdit: (params) => ipcRenderer.invoke('auto-edit', params),
  getAutoEditStyles: () => ipcRenderer.invoke('get-auto-edit-styles'),
  estimateAutoEditTime: (params) => ipcRenderer.invoke('estimate-auto-edit-time', params),
  getAnalysisSummary: (params) => ipcRenderer.invoke('get-analysis-summary', params),

  // =========================================================================
  // Phase 1.2 - Edición Esencial (Capas, Títulos, Audio FX, Crop)
  // =========================================================================
  
  // Layers Manager
  layersAdd: (config) => ipcRenderer.invoke('layers-add', config),
  layersGetAll: () => ipcRenderer.invoke('layers-get-all'),
  layersUpdate: (params) => ipcRenderer.invoke('layers-update', params),
  layersCompose: (params) => ipcRenderer.invoke('layers-compose', params),
  
  // Basic Titles
  titlesGetStyles: () => ipcRenderer.invoke('titles-get-styles'),
  titlesAdd: (config) => ipcRenderer.invoke('titles-add', config),
  titlesRender: (params) => ipcRenderer.invoke('titles-render', params),
  
  // Audio Effects
  audioFXGetEQPresets: () => ipcRenderer.invoke('audio-fx-get-eq-presets'),
  audioFXNormalize: (params) => ipcRenderer.invoke('audio-fx-normalize', params),
  audioFXDenoise: (params) => ipcRenderer.invoke('audio-fx-denoise', params),
  
  // Crop & Pan
  cropGetAspectRatios: () => ipcRenderer.invoke('crop-get-aspect-ratios'),
  cropVideo: (params) => ipcRenderer.invoke('crop-video', params),
  cropAnimatePan: (params) => ipcRenderer.invoke('crop-animate-pan', params),

  // =========================================================================
  // Phase 3.2 - Color Grading
  // =========================================================================
  
  // Color Wheels
  colorWheelsGetPresets: () => ipcRenderer.invoke('color-wheels-get-presets'),
  colorWheelsApplyPreset: (params) => ipcRenderer.invoke('color-wheels-apply-preset', params),
  colorWheelsApply: (params) => ipcRenderer.invoke('color-wheels-apply', params),
  
  // LUT Manager
  lutGetAll: () => ipcRenderer.invoke('lut-get-all'),
  lutApply: (params) => ipcRenderer.invoke('lut-apply', params),
  
  // Video Scopes
  scopesGetTypes: () => ipcRenderer.invoke('scopes-get-types'),

  // =========================================================================
  // Phase 3.3 - VFX Básicos
  // =========================================================================
  
  // Chroma Key
  chromaApply: (params) => ipcRenderer.invoke('chroma-apply', params),
  chromaCompose: (params) => ipcRenderer.invoke('chroma-compose', params),
  
  // Motion Tracking
  trackingStabilize: (params) => ipcRenderer.invoke('tracking-stabilize', params),
  
  // Blur & Glow
  blurApply: (params) => ipcRenderer.invoke('blur-apply', params),
  glowApply: (params) => ipcRenderer.invoke('glow-apply', params),
  
  // Masking
  maskCreate: (config) => ipcRenderer.invoke('mask-create', config),
  maskGetAll: () => ipcRenderer.invoke('mask-get-all'),

  // =========================================================================
  // Project Manager - Gestión de Proyectos y Escaneo de Carpetas
  // =========================================================================
  
  // Escaneo de carpetas
  scanFolder: (params) => ipcRenderer.invoke('scan-folder', params),
  
  // Proyectos
  projectCreate: (params) => ipcRenderer.invoke('project-create', params),
  projectGetCurrent: () => ipcRenderer.invoke('project-get-current'),
  projectSave: (params) => ipcRenderer.invoke('project-save', params),
  projectLoad: (params) => ipcRenderer.invoke('project-load', params),
  projectGetAll: () => ipcRenderer.invoke('project-get-all'),
  projectDelete: (params) => ipcRenderer.invoke('project-delete', params),
  projectAddMedia: (params) => ipcRenderer.invoke('project-add-media', params),
  projectAddToTimeline: (params) => ipcRenderer.invoke('project-add-to-timeline', params),
  projectExport: (params) => ipcRenderer.invoke('project-export', params),
  projectSetAutosave: (params) => ipcRenderer.invoke('project-set-autosave', params),

  // =========================================================================
  // Codec Manager - Detección y Soporte de Codecs
  // =========================================================================
  
  codecGetInfo: (params) => ipcRenderer.invoke('codec-get-info', params),
  codecGetAvailable: () => ipcRenderer.invoke('codec-get-available'),
  codecGetEncoder: (params) => ipcRenderer.invoke('codec-get-encoder', params),
  codecListVideo: () => ipcRenderer.invoke('codec-list-video'),
  codecListAudio: () => ipcRenderer.invoke('codec-list-audio'),
  codecListContainers: () => ipcRenderer.invoke('codec-list-containers'),

  // Utilidades
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),

  // Eventos
  onProgress: (callback) => {
    ipcRenderer.on('progress', (event, data) => callback(data));
  },
  onError: (callback) => {
    ipcRenderer.on('error', (event, data) => callback(data));
  },
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('progress');
  },
  removeErrorListener: () => {
    ipcRenderer.removeAllListeners('error');
  }
});
