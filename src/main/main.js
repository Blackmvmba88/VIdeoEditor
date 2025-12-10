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

const ProjectManager = require('../modules/projectManager');
const CodecManager = require('../modules/codecManager');

let mainWindow;
let videoProcessor;
let formatDetector;
let fileValidator;
let exportRenderer;
let ffmpeg;
let contentAnalyzer;
let autoEditor;
let errorHandler;
let projectManager;
let codecManager;

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
  projectManager = new ProjectManager(ffmpeg);
  codecManager = new CodecManager(ffmpeg);

  errorHandler.setErrorCallback((error) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('error', error.toJSON());
    }
  });
}

/**
 * Enviar progreso de forma segura (verificando que mainWindow existe)
 */
function sendProgress(data) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('progress', data);
  }
}

/**
 * Helper para crear handlers IPC con manejo de errores uniforme
 * @param {Function} handler - Funci?n async que procesa la solicitud
 * @returns {Function} - Handler envuelto con manejo de errores
 */
function createIpcHandler(handler) {
  return async (event, ...args) => {
    try {
      const result = await handler(event, ...args);
      return { success: true, ...result };
    } catch (error) {
      const handledError = errorHandler.handle(error);
      return { success: false, error: handledError.toJSON() };
    }
  };
}

/**
 * Helper simplificado para handlers sin resultado complejo
 */
function createSimpleHandler(handler) {
  return async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
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

  // Siempre abrir DevTools para debugging
  mainWindow.webContents.openDevTools();
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
      sendProgress( { type: 'cut', seconds });
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
      sendProgress( { type: 'join', seconds });
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
      sendProgress( { type: 'reorder', seconds });
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
      sendProgress( { type: 'split', seconds });
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
      sendProgress( { type: 'export', seconds });
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
      sendProgress( { type: 'export', seconds });
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
      sendProgress( { type: 'export-multiple', ...progress });
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
    sendProgress( { 
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
      sendProgress( { 
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

// =============================================================================
// Phase 1.2 - Nuevos m?dulos de edici?n esencial
// =============================================================================

const {
  LayersManager,
  BasicTitles,
  AudioEffects,
  CropPan
} = require('../modules/phases/phase1');

let layersManager;
let basicTitles;
let audioEffects;
let cropPan;

/**
 * Inicializar m?dulos de Phase 1.2
 */
function initPhase1Modules() {
  layersManager = new LayersManager();
  basicTitles = new BasicTitles();
  audioEffects = new AudioEffects();
  cropPan = new CropPan();
}

// Llamar despu?s de initializeModules
app.whenReady().then(() => {
  initPhase1Modules();
});

/**
 * Layers Manager - Agregar capa
 */
ipcMain.handle('layers-add', async (event, config) => {
  try {
    const layer = layersManager.addLayer(config);
    return { success: true, layer };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Layers Manager - Obtener capas
 */
ipcMain.handle('layers-get-all', async () => {
  return { success: true, layers: layersManager.getLayers() };
});

/**
 * Layers Manager - Actualizar capa
 */
ipcMain.handle('layers-update', async (event, { layerId, updates }) => {
  try {
    const layer = layersManager.updateLayer(layerId, updates);
    return { success: true, layer };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Layers Manager - Componer capas
 */
ipcMain.handle('layers-compose', async (event, { baseVideo, outputPath }) => {
  try {
    const result = await layersManager.composeLayers(baseVideo, outputPath, {}, (progress) => {
      sendProgress( { type: 'layers-compose', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Basic Titles - Obtener estilos
 */
ipcMain.handle('titles-get-styles', async () => {
  return { success: true, styles: basicTitles.getStyles() };
});

/**
 * Basic Titles - Agregar t?tulo
 */
ipcMain.handle('titles-add', async (event, config) => {
  try {
    const title = basicTitles.addTitle(config);
    return { success: true, title };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Basic Titles - Renderizar t?tulos
 */
ipcMain.handle('titles-render', async (event, { inputPath, outputPath }) => {
  try {
    const result = await basicTitles.renderTitles(inputPath, outputPath, null, (progress) => {
      sendProgress( { type: 'titles-render', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Audio Effects - Obtener presets EQ
 */
ipcMain.handle('audio-fx-get-eq-presets', async () => {
  return { success: true, presets: audioEffects.getEQPresets() };
});

/**
 * Audio Effects - Normalizar audio
 */
ipcMain.handle('audio-fx-normalize', async (event, { inputPath, outputPath, options }) => {
  try {
    const result = await audioEffects.normalize(inputPath, outputPath, options, (progress) => {
      sendProgress( { type: 'audio-normalize', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Audio Effects - Reducci?n de ruido
 */
ipcMain.handle('audio-fx-denoise', async (event, { inputPath, outputPath, options }) => {
  try {
    const result = await audioEffects.denoise(inputPath, outputPath, options, (progress) => {
      sendProgress( { type: 'audio-denoise', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Crop Pan - Obtener aspect ratios
 */
ipcMain.handle('crop-get-aspect-ratios', async () => {
  return { success: true, ratios: cropPan.getAspectRatios() };
});

/**
 * Crop Pan - Recortar video
 */
ipcMain.handle('crop-video', async (event, { inputPath, outputPath, options }) => {
  try {
    const result = await cropPan.crop(inputPath, outputPath, options, (progress) => {
      sendProgress( { type: 'crop', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Crop Pan - Aplicar Ken Burns
 */
ipcMain.handle('crop-animate-pan', async (event, { inputPath, outputPath, options }) => {
  try {
    const result = await cropPan.animatePan(inputPath, outputPath, options, (progress) => {
      sendProgress( { type: 'pan-animate', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// =============================================================================
// Phase 3.2 - Color Grading
// =============================================================================

const {
  ColorWheels,
  VideoScopes,
  LUTManager,
  ColorMatch
} = require('../modules/phases/phase3');

let colorWheels;
let videoScopes;
let lutManager;
let colorMatch;

/**
 * Inicializar m?dulos de Color Grading
 */
function initColorGradingModules() {
  colorWheels = new ColorWheels();
  videoScopes = new VideoScopes();
  lutManager = new LUTManager();
  colorMatch = new ColorMatch();
}

app.whenReady().then(() => {
  initColorGradingModules();
});

/**
 * Color Wheels - Obtener presets
 */
ipcMain.handle('color-wheels-get-presets', async () => {
  return { success: true, presets: colorWheels.getPresets() };
});

/**
 * Color Wheels - Aplicar preset
 */
ipcMain.handle('color-wheels-apply-preset', async (event, { presetId }) => {
  try {
    const settings = colorWheels.applyPreset(presetId);
    return { success: true, settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Color Wheels - Aplicar correcci?n
 */
ipcMain.handle('color-wheels-apply', async (event, { inputPath, outputPath }) => {
  try {
    const result = await colorWheels.apply(inputPath, outputPath, {}, (progress) => {
      sendProgress( { type: 'color-correction', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * LUT Manager - Obtener LUTs
 */
ipcMain.handle('lut-get-all', async () => {
  return { success: true, luts: lutManager.getAllLuts() };
});

/**
 * LUT Manager - Aplicar LUT
 */
ipcMain.handle('lut-apply', async (event, { inputPath, outputPath, lutId, options }) => {
  try {
    const result = await lutManager.applyLut(inputPath, outputPath, lutId, options, (progress) => {
      sendProgress( { type: 'lut-apply', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Video Scopes - Obtener tipos
 */
ipcMain.handle('scopes-get-types', async () => {
  return { success: true, types: videoScopes.getScopeTypes() };
});

// =============================================================================
// Phase 3.3 - VFX B?sicos
// =============================================================================

const {
  ChromaKey,
  MotionTracking,
  BlurGlow,
  Masking
} = require('../modules/phases/phase3');

let chromaKey;
let motionTracking;
let blurGlow;
let masking;

/**
 * Inicializar m?dulos VFX
 */
function initVFXModules() {
  chromaKey = new ChromaKey();
  motionTracking = new MotionTracking();
  blurGlow = new BlurGlow();
  masking = new Masking();
}

app.whenReady().then(() => {
  initVFXModules();
});

/**
 * Chroma Key - Aplicar
 */
ipcMain.handle('chroma-apply', async (event, { inputPath, outputPath, options }) => {
  try {
    if (options.color) chromaKey.setChromaColor(options.color);
    if (options.similarity) chromaKey.setSimilarity(options.similarity);
    const result = await chromaKey.apply(inputPath, outputPath, options, (progress) => {
      sendProgress( { type: 'chroma-key', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Chroma Key - Componer con fondo
 */
ipcMain.handle('chroma-compose', async (event, { foreground, background, outputPath }) => {
  try {
    const result = await chromaKey.compose(foreground, background, outputPath, {}, (progress) => {
      sendProgress( { type: 'chroma-compose', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Motion Tracking - Estabilizar
 */
ipcMain.handle('tracking-stabilize', async (event, { inputPath, outputPath, options }) => {
  try {
    const result = await motionTracking.stabilize(inputPath, outputPath, options, (progress) => {
      sendProgress( { type: 'stabilize', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Blur Glow - Aplicar blur
 */
ipcMain.handle('blur-apply', async (event, { inputPath, outputPath, options }) => {
  try {
    const result = await blurGlow.applyBlur(inputPath, outputPath, options, (progress) => {
      sendProgress( { type: 'blur', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Blur Glow - Aplicar glow
 */
ipcMain.handle('glow-apply', async (event, { inputPath, outputPath, options }) => {
  try {
    const result = await blurGlow.applyGlow(inputPath, outputPath, options, (progress) => {
      sendProgress( { type: 'glow', ...progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Masking - Crear m?scara
 */
ipcMain.handle('mask-create', async (event, config) => {
  try {
    const mask = masking.createMask(config);
    return { success: true, mask };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Masking - Obtener m?scaras
 */
ipcMain.handle('mask-get-all', async () => {
  return { success: true, masks: masking.getMasks() };
});

// ============================================================
// PROJECT MANAGER - Gesti?n de Proyectos y Escaneo de Carpetas
// ============================================================

/**
 * Escanear carpeta para encontrar videos
 */
ipcMain.handle('scan-folder', async (event, { folderPath, recursive }) => {
  try {
    const videos = await projectManager.scanFolder(folderPath, recursive);
    return { success: true, videos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Crear nuevo proyecto
 */
ipcMain.handle('project-create', async (event, { name }) => {
  try {
    const project = projectManager.createProject(name);
    return { success: true, project };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Obtener proyecto actual
 */
ipcMain.handle('project-get-current', async () => {
  try {
    const project = projectManager.getCurrentProject();
    return { success: true, project };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Guardar proyecto
 */
ipcMain.handle('project-save', async (event, { projectPath }) => {
  try {
    const result = await projectManager.saveProject(projectPath);
    return { success: true, path: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Cargar proyecto
 */
ipcMain.handle('project-load', async (event, { projectPath }) => {
  try {
    const project = await projectManager.loadProject(projectPath);
    return { success: true, project };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Obtener lista de proyectos recientes
 */
ipcMain.handle('project-get-all', async () => {
  try {
    const projects = projectManager.getProjects();
    return { success: true, projects };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Eliminar proyecto
 */
ipcMain.handle('project-delete', async (event, { projectId }) => {
  try {
    const result = projectManager.deleteProject(projectId);
    return { success: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Agregar media al proyecto
 */
ipcMain.handle('project-add-media', async (event, { mediaItem }) => {
  try {
    projectManager.addMedia(mediaItem);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Agregar clip al timeline
 */
ipcMain.handle('project-add-to-timeline', async (event, { clip }) => {
  try {
    projectManager.addToTimeline(clip);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Exportar proyecto
 */
ipcMain.handle('project-export', async (event, { projectId, options }) => {
  try {
    const result = await projectManager.exportProject(projectId, options);
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Configurar auto-guardado
 */
ipcMain.handle('project-set-autosave', async (event, { enabled, interval }) => {
  try {
    if (enabled) {
      projectManager.startAutoSave(interval);
    } else {
      projectManager.stopAutoSave();
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================================
// CODEC MANAGER - Detecci?n y Soporte de Codecs
// ============================================================

/**
 * Obtener informaci?n detallada de codec de un archivo
 */
ipcMain.handle('codec-get-info', async (event, { filePath }) => {
  try {
    const info = await codecManager.getMediaInfo(filePath);
    return { success: true, info };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Obtener codecs disponibles en el sistema
 */
ipcMain.handle('codec-get-available', async () => {
  try {
    const codecs = await codecManager.getAvailableCodecs();
    return { success: true, codecs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Obtener encoder recomendado para un codec
 */
ipcMain.handle('codec-get-encoder', async (event, { codecName }) => {
  try {
    const encoder = codecManager.getEncoderForCodec(codecName);
    return { success: true, encoder };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Obtener lista de codecs de video soportados
 */
ipcMain.handle('codec-list-video', async () => {
  return { success: true, codecs: codecManager.videoCodecs };
});

/**
 * Obtener lista de codecs de audio soportados
 */
ipcMain.handle('codec-list-audio', async () => {
  return { success: true, codecs: codecManager.audioCodecs };
});

/**
 * Obtener contenedores soportados
 */
ipcMain.handle('codec-list-containers', async () => {
  return { success: true, containers: codecManager.containers };
});
