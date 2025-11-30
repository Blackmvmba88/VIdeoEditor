/**
 * Video Editor Pro - Preload Script
 * Exposes safe APIs to renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Safe API for renderer process
 */
contextBridge.exposeInMainWorld('videoEditorAPI', {
  // FFmpeg
  checkFFmpeg: () => ipcRenderer.invoke('check-ffmpeg'),

  // Dialogs
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  selectFolderDialog: () => ipcRenderer.invoke('select-folder-dialog'),

  // Video info
  getVideoInfo: (filePath) => ipcRenderer.invoke('get-video-info', filePath),
  validateFiles: (filePaths) => ipcRenderer.invoke('validate-files', filePaths),
  checkCompatibility: (filePaths) => ipcRenderer.invoke('check-compatibility', filePaths),
  getSupportedExtensions: () => ipcRenderer.invoke('get-supported-extensions'),

  // Video processing
  cutVideo: (params) => ipcRenderer.invoke('cut-video', params),
  joinVideos: (params) => ipcRenderer.invoke('join-videos', params),
  reorderJoin: (params) => ipcRenderer.invoke('reorder-join', params),
  splitVideo: (params) => ipcRenderer.invoke('split-video', params),

  // Export
  exportWithPreset: (params) => ipcRenderer.invoke('export-preset', params),
  exportCustom: (params) => ipcRenderer.invoke('export-custom', params),
  exportMultiplePlatforms: (params) => ipcRenderer.invoke('export-multiple', params),
  generateThumbnail: (params) => ipcRenderer.invoke('generate-thumbnail', params),
  estimateSize: (params) => ipcRenderer.invoke('estimate-size', params),

  // Presets
  getPresets: () => ipcRenderer.invoke('get-presets'),
  getPresetInfo: (presetKey) => ipcRenderer.invoke('get-preset-info', presetKey),

  // Auto-Edit - Automatic Video Editing
  analyzeContent: (params) => ipcRenderer.invoke('analyze-content', params),
  autoEdit: (params) => ipcRenderer.invoke('auto-edit', params),
  getAutoEditStyles: () => ipcRenderer.invoke('get-auto-edit-styles'),
  estimateAutoEditTime: (params) => ipcRenderer.invoke('estimate-auto-edit-time', params),
  getAnalysisSummary: (params) => ipcRenderer.invoke('get-analysis-summary', params),

  // Utilities
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),

  // Events
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
