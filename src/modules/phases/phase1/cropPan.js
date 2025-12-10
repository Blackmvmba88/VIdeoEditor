/**
 * BlackMamba Studio - Crop and Pan
 * 
 * Sistema de recorte y panorámica animados para video.
 * 
 * Características:
 * - Recorte (crop) de video
 * - Panorámica animada (Ken Burns effect)
 * - Zoom animado
 * - Seguimiento de regiones de interés
 * - Presets para diferentes aspect ratios
 * - Keyframes para animación
 * 
 * @module CropPan
 */

const FFmpegWrapper = require('../../ffmpegWrapper');
const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

// Aspect ratios comunes
const ASPECT_RATIOS = {
  '16:9': { width: 16, height: 9, name: 'Widescreen (16:9)' },
  '9:16': { width: 9, height: 16, name: 'Vertical/Stories (9:16)' },
  '4:3': { width: 4, height: 3, name: 'Standard (4:3)' },
  '1:1': { width: 1, height: 1, name: 'Square (1:1)' },
  '21:9': { width: 21, height: 9, name: 'Ultrawide (21:9)' },
  '4:5': { width: 4, height: 5, name: 'Instagram Portrait (4:5)' }
};

// Presets de animación
const ANIMATION_PRESETS = {
  zoomIn: {
    name: 'Zoom In',
    startScale: 1.0,
    endScale: 1.3,
    startX: 0.5,
    startY: 0.5,
    endX: 0.5,
    endY: 0.5
  },
  zoomOut: {
    name: 'Zoom Out',
    startScale: 1.3,
    endScale: 1.0,
    startX: 0.5,
    startY: 0.5,
    endX: 0.5,
    endY: 0.5
  },
  panLeft: {
    name: 'Pan Left',
    startScale: 1.2,
    endScale: 1.2,
    startX: 0.7,
    startY: 0.5,
    endX: 0.3,
    endY: 0.5
  },
  panRight: {
    name: 'Pan Right',
    startScale: 1.2,
    endScale: 1.2,
    startX: 0.3,
    startY: 0.5,
    endX: 0.7,
    endY: 0.5
  },
  panUp: {
    name: 'Pan Up',
    startScale: 1.2,
    endScale: 1.2,
    startX: 0.5,
    startY: 0.7,
    endX: 0.5,
    endY: 0.3
  },
  panDown: {
    name: 'Pan Down',
    startScale: 1.2,
    endScale: 1.2,
    startX: 0.5,
    startY: 0.3,
    endX: 0.5,
    endY: 0.7
  },
  kenBurns: {
    name: 'Ken Burns',
    startScale: 1.0,
    endScale: 1.3,
    startX: 0.3,
    startY: 0.3,
    endX: 0.7,
    endY: 0.7
  }
};

class CropPan {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.aspectRatios = ASPECT_RATIOS;
    this.animationPresets = ANIMATION_PRESETS;
  }

  /**
   * Obtiene los aspect ratios disponibles
   * @returns {Object} Aspect ratios
   */
  getAspectRatios() {
    return Object.entries(ASPECT_RATIOS).map(([key, value]) => ({
      id: key,
      ...value
    }));
  }

  /**
   * Obtiene los presets de animación disponibles
   * @returns {Object} Presets
   */
  getAnimationPresets() {
    return Object.entries(ANIMATION_PRESETS).map(([key, value]) => ({
      id: key,
      name: value.name
    }));
  }

  /**
   * Recorta un video a un aspect ratio específico
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {Object} options - Opciones de recorte
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async crop(inputPath, outputPath, options = {}, onProgress = null) {
    const { width, height, x, y, aspectRatio } = options;

    let cropFilter;
    
    if (aspectRatio && ASPECT_RATIOS[aspectRatio]) {
      // Calcular crop basado en aspect ratio
      const ar = ASPECT_RATIOS[aspectRatio];
      cropFilter = `crop='min(iw,ih*${ar.width}/${ar.height})':'min(ih,iw*${ar.height}/${ar.width})'`;
    } else if (width && height) {
      // Crop con dimensiones específicas
      const cropX = x !== undefined ? x : '(in_w-out_w)/2';
      const cropY = y !== undefined ? y : '(in_h-out_h)/2';
      cropFilter = `crop=${width}:${height}:${cropX}:${cropY}`;
    } else {
      throw new VideoEditorError('Either aspectRatio or width/height must be specified', ErrorCodes.INVALID_PARAMETER);
    }

    const args = [
      '-i', inputPath,
      '-vf', cropFilter,
      '-c:a', 'copy',
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      operation: 'crop',
      settings: options
    };
  }

  /**
   * Aplica panorámica animada (Ken Burns effect)
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {Object} options - Opciones de animación
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async animatePan(inputPath, outputPath, options = {}, onProgress = null) {
    const preset = options.preset ? ANIMATION_PRESETS[options.preset] : null;
    
    const startScale = options.startScale || preset?.startScale || 1.0;
    const endScale = options.endScale || preset?.endScale || 1.3;
    const startX = options.startX || preset?.startX || 0.5;
    const startY = options.startY || preset?.startY || 0.5;
    const endX = options.endX || preset?.endX || 0.5;
    const endY = options.endY || preset?.endY || 0.5;
    const outputWidth = options.outputWidth || 1920;
    const outputHeight = options.outputHeight || 1080;

    // Construir filtro zoompan
    // zoompan requiere: z=zoom, x=posX, y=posY, d=duration_frames
    const fps = options.fps || 30;
    const durationFrames = options.durationFrames || fps * 5; // 5 segundos default

    const zoomFilter = `zoompan=z='${startScale}+(${endScale}-${startScale})*on/${durationFrames}':x='iw*${startX}+(iw*${endX}-iw*${startX})*on/${durationFrames}-iw/2/${startScale}':y='ih*${startY}+(ih*${endY}-ih*${startY})*on/${durationFrames}-ih/2/${startScale}':d=${durationFrames}:s=${outputWidth}x${outputHeight}:fps=${fps}`;

    const args = [
      '-i', inputPath,
      '-vf', zoomFilter,
      '-c:a', 'copy',
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      operation: 'animatePan',
      settings: { startScale, endScale, startX, startY, endX, endY }
    };
  }

  /**
   * Aplica zoom estático a un video
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {Object} options - Opciones de zoom
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async zoom(inputPath, outputPath, options = {}, onProgress = null) {
    const scale = options.scale || 1.5;
    const centerX = options.centerX !== undefined ? options.centerX : 0.5;
    const centerY = options.centerY !== undefined ? options.centerY : 0.5;

    // Calcular el crop después del zoom
    const cropWidth = `iw/${scale}`;
    const cropHeight = `ih/${scale}`;
    const cropX = `(iw-${cropWidth})*${centerX}`;
    const cropY = `(ih-${cropHeight})*${centerY}`;

    const filter = `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY},scale=iw*${scale}:ih*${scale}`;

    const args = [
      '-i', inputPath,
      '-vf', filter,
      '-c:a', 'copy',
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      operation: 'zoom',
      settings: { scale, centerX, centerY }
    };
  }

  /**
   * Reencuadra video para diferente aspect ratio (smart reframe)
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {string} targetAspectRatio - Aspect ratio objetivo
   * @param {Object} options - Opciones
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async reframe(inputPath, outputPath, targetAspectRatio, options = {}, onProgress = null) {
    if (!ASPECT_RATIOS[targetAspectRatio]) {
      throw new VideoEditorError(`Aspect ratio ${targetAspectRatio} not supported`, ErrorCodes.INVALID_PARAMETER);
    }

    const ar = ASPECT_RATIOS[targetAspectRatio];
    const focusX = options.focusX !== undefined ? options.focusX : 0.5;
    const focusY = options.focusY !== undefined ? options.focusY : 0.5;
    const outputWidth = options.outputWidth || 1080;
    const outputHeight = Math.round(outputWidth * ar.height / ar.width);

    // Calcular crop centrado en el punto de foco
    const cropFilter = `crop='min(iw,ih*${ar.width}/${ar.height})':'min(ih,iw*${ar.height}/${ar.width})':'(iw-out_w)*${focusX}':'(ih-out_h)*${focusY}',scale=${outputWidth}:${outputHeight}`;

    const args = [
      '-i', inputPath,
      '-vf', cropFilter,
      '-c:a', 'copy',
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      operation: 'reframe',
      settings: { targetAspectRatio, focusX, focusY, outputWidth, outputHeight }
    };
  }

  /**
   * Aplica un preset de animación predefinido
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {string} presetId - ID del preset
   * @param {Object} options - Opciones adicionales
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async applyPreset(inputPath, outputPath, presetId, options = {}, onProgress = null) {
    if (!ANIMATION_PRESETS[presetId]) {
      throw new VideoEditorError(`Animation preset ${presetId} not found`, ErrorCodes.INVALID_PARAMETER);
    }

    return this.animatePan(inputPath, outputPath, { preset: presetId, ...options }, onProgress);
  }
}

module.exports = CropPan;
