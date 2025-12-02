/**
 * Video Editor Pro - Proceso Principal de Electron
 * Editor de video de escritorio multiplataforma
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const {
  VideoProcessor,
  FormatDetector,
  FileValidator,
  ExportRenderer,
  FFmpegWrapper,
  ContentAnalyzer,
  AutoEditor,
  ErrorHandler
} = require('../modules');

let mainWindow;
let videoProcessor;
let formatDetector;
let fileValidator;
let exportRenderer;
let ffmpeg;
let contentAnalyzer;
let autoEditor;
let errorHandler;

/**
 * Inicializar módulos
 */
function initializeModules() {
  videoProcessor = new VideoProcessor();
  formatDetector = new FormatDetector();
  fileValidator = new FileValidator();
  exportRenderer = new ExportRenderer();
  ffmpeg = new FFmpegWrapper();
  contentAnalyzer = new ContentAnalyzer();
  autoEditor = new AutoEditor();
  errorHandler = new ErrorHandler();

  errorHandler.setErrorCallback((error) => {
    if (mainWindow) {
      mainWindow.webContents.send('error', error.toJSON());
    }
  });
}

/**
 * Crear ventana principal
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Video Editor Pro',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * Manejador de aplicación lista
 */
app.whenReady().then(() => {
  initializeModules();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Manejador de cierre de aplicación
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Verificar disponibilidad de FFmpeg
 */
ipcMain.handle('check-ffmpeg', async () => {
  try {
    const isAvailable = await ffmpeg.isAvailable();
    const version = isAvailable ? await ffmpeg.getVersion() : null;
    return { available: isAvailable, version };
  } catch (error) {
    return { available: false, version: null, error: error.message };
  }
});

/**
 * Abrir diálogo de archivo
 */
ipcMain.handle('open-file-dialog', async (event, options = {}) => {
  const extensions = formatDetector.getSupportedExtensions();
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', options.multiple ? 'multiSelections' : null].filter(Boolean),
    filters: [
      { name: 'Video Files', extensions: extensions.video.map(e => e.slice(1)) },
      { name: 'Audio Files', extensions: extensions.audio.map(e => e.slice(1)) },
      { name: 'All Supported', extensions: extensions.all.map(e => e.slice(1)) }
    ]
  });

  return result.canceled ? null : result.filePaths;
});

/**
 * Diálogo de guardar archivo
 */
ipcMain.handle('save-file-dialog', async (event, options = {}) => {
  const defaultExt = options.extension || '.mp4';
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultName || `output${defaultExt}`,
    filters: [
      { name: 'MP4 Video', extensions: ['mp4'] },
      { name: 'MOV Video', extensions: ['mov'] },
      { name: 'MKV Video', extensions: ['mkv'] },
      { name: 'AVI Video', extensions: ['avi'] },
      { name: 'WebM Video', extensions: ['webm'] }
    ]
  });

  return result.canceled ? null : result.filePath;
});

/**
 * Diálogo de selección de carpeta
 */
ipcMain.handle('select-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });

  return result.canceled ? null : result.filePaths[0];
});

/**
 * Obtener información del video
 */
ipcMain.handle('get-video-info', async (event, filePath) => {
  try {
    const format = await formatDetector.detectFormat(filePath);
    return { success: true, info: format };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Validar archivos
 */
ipcMain.handle('validate-files', async (event, filePaths) => {
  try {
    const result = await fileValidator.validateFiles(filePaths);
    return { success: true, ...result };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Cortar video
 */
ipcMain.handle('cut-video', async (event, { inputPath, startTime, endTime, outputPath }) => {
  try {
    const result = await videoProcessor.cutVideo(inputPath, startTime, endTime, outputPath, (seconds) => {
      mainWindow.webContents.send('progress', { type: 'cut', seconds });
    });
    return { success: true, ...result };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Unir videos
 */
ipcMain.handle('join-videos', async (event, { inputPaths, outputPath, options }) => {
  try {
    const result = await videoProcessor.joinVideos(inputPaths, outputPath, options, (seconds) => {
      mainWindow.webContents.send('progress', { type: 'join', seconds });
    });
    return { success: true, ...result };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Reordenar y unir clips
 */
ipcMain.handle('reorder-join', async (event, { clips, outputPath, options }) => {
  try {
    const result = await videoProcessor.reorderAndJoin(clips, outputPath, options, (seconds) => {
      mainWindow.webContents.send('progress', { type: 'reorder', seconds });
    });
    return { success: true, ...result };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Dividir video
 */
ipcMain.handle('split-video', async (event, { inputPath, segments, outputDir }) => {
  try {
    const result = await videoProcessor.splitVideo(inputPath, segments, outputDir, (seconds) => {
      mainWindow.webContents.send('progress', { type: 'split', seconds });
    });
    return { success: true, ...result };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Exportar con preset
 */
ipcMain.handle('export-preset', async (event, { inputPath, outputPath, presetKey, options }) => {
  try {
    const result = await exportRenderer.exportWithPreset(inputPath, outputPath, presetKey, options, (seconds) => {
      mainWindow.webContents.send('progress', { type: 'export', seconds });
    });
    return { success: true, ...result };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Exportar con configuración personalizada
 */
ipcMain.handle('export-custom', async (event, { inputPath, outputPath, settings }) => {
  try {
    const result = await exportRenderer.exportCustom(inputPath, outputPath, settings, (seconds) => {
      mainWindow.webContents.send('progress', { type: 'export', seconds });
    });
    return { success: true, ...result };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Exportar para múltiples plataformas
 */
ipcMain.handle('export-multiple', async (event, { inputPath, outputDir, presetKeys }) => {
  try {
    const result = await exportRenderer.exportMultiplePlatforms(inputPath, outputDir, presetKeys, (progress) => {
      mainWindow.webContents.send('progress', { type: 'export-multiple', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Generar miniatura
 */
ipcMain.handle('generate-thumbnail', async (event, { inputPath, outputPath, options }) => {
  try {
    const result = await exportRenderer.generateThumbnail(inputPath, outputPath, options);
    return { success: true, ...result };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Obtener presets disponibles
 */
ipcMain.handle('get-presets', async () => {
  try {
    const presets = exportRenderer.getAvailablePresets();
    return { success: true, presets };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Obtener información del preset
 */
ipcMain.handle('get-preset-info', async (event, presetKey) => {
  try {
    const preset = exportRenderer.getPresetInfo(presetKey);
    return { success: true, preset };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Estimar tamaño de salida
 */
ipcMain.handle('estimate-size', async (event, { inputPath, presetKey }) => {
  try {
    const result = await exportRenderer.estimateOutputSize(inputPath, presetKey);
    return { success: true, ...result };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Verificar compatibilidad de formatos
 */
ipcMain.handle('check-compatibility', async (event, filePaths) => {
  try {
    const result = await formatDetector.checkCompatibility(filePaths);
    return { success: true, ...result };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Obtener extensiones soportadas
 */
ipcMain.handle('get-supported-extensions', async () => {
  return formatDetector.getSupportedExtensions();
});

/**
 * Abrir enlace externo
 */
ipcMain.handle('open-external', async (event, url) => {
  if (url.startsWith('https://')) {
    await shell.openExternal(url);
    return { success: true };
  }
  return { success: false, error: 'Invalid URL' };
});

/**
 * Mostrar elemento en carpeta
 */
ipcMain.handle('show-in-folder', async (event, filePath) => {
  if (fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return { success: true };
  }
  return { success: false, error: 'File not found' };
});

/**
 * Obtener versión de la aplicación
 */
ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

/**
 * Obtener información de la plataforma
 */
ipcMain.handle('get-platform-info', async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.version
  };
});

// ============================================
// Función Auto-Edit - Edición Automática Inteligente
// ============================================

/**
 * Analizar contenido de video para auto-edición
 * Detecta momentos interesantes, cambios de escena y picos de audio
 */
ipcMain.handle('analyze-content', async (event, { inputPath, options }) => {
  try {
    mainWindow.webContents.send('progress', { 
      type: 'analyze', 
      stage: 'starting', 
      percent: 0, 
      message: 'Iniciando análisis de contenido...' 
    });

    const analysis = await contentAnalyzer.analyzeContent(inputPath, options);
    const summary = contentAnalyzer.getAnalysisSummary(analysis);

    return { 
      success: true, 
      analysis, 
      summary,
      momentsCount: analysis.interestingMoments.length,
      clipsCount: analysis.suggestedClips.length
    };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Realizar edición automática de video
 * Analiza contenido y crea una edición optimizada automáticamente
 */
ipcMain.handle('auto-edit', async (event, { inputPath, outputPath, options }) => {
  try {
    const result = await autoEditor.autoEdit(inputPath, outputPath, options, (progress) => {
      mainWindow.webContents.send('progress', { 
        type: 'auto-edit', 
        ...progress 
      });
    });

    return { 
      success: true, 
      outputPath: result.outputPath,
      statistics: result.statistics
    };
  } catch (error) {
    const handledError = errorHandler.handle(error);
    return { success: false, error: handledError.toJSON() };
  }
});

/**
 * Obtener estilos de auto-edición disponibles
 */
ipcMain.handle('get-auto-edit-styles', async () => {
  try {
    const styles = autoEditor.getAvailableStyles();
    return { success: true, styles };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Estimar tiempo de procesamiento de auto-edición
 */
ipcMain.handle('estimate-auto-edit-time', async (event, { duration }) => {
  try {
    const estimate = autoEditor.estimateProcessingTime(duration);
    return { success: true, estimate };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Obtener resumen del análisis
 */
ipcMain.handle('get-analysis-summary', async (event, { analysis }) => {
  try {
    const summary = contentAnalyzer.getAnalysisSummary(analysis);
    return { success: true, summary };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
