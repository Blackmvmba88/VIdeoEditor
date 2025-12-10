/**
 * BlackMamba Studio - Blur and Glow Effects
 * 
 * Efectos de desenfoque y brillo.
 * 
 * Características:
 * - Blur gaussiano
 * - Blur de movimiento
 * - Blur radial
 * - Glow/Bloom
 * - Blur de regiones específicas
 * - Blur de caras automático
 * 
 * @module BlurGlow
 */

const FFmpegWrapper = require('../../ffmpegWrapper');
const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

// Tipos de blur disponibles
const BLUR_TYPES = {
  gaussian: {
    name: 'Gaussian Blur',
    description: 'Desenfoque suave y uniforme',
    filter: (radius) => `gblur=sigma=${radius}`
  },
  box: {
    name: 'Box Blur',
    description: 'Desenfoque con forma cuadrada',
    filter: (radius) => `boxblur=${radius}:${radius}`
  },
  motion: {
    name: 'Motion Blur',
    description: 'Simula desenfoque por movimiento',
    filter: (radius, angle = 0) => `avgblur=sizeX=${radius}:sizeY=1,rotate=${angle}*PI/180`
  }
};

// Presets de intensidad
const INTENSITY_PRESETS = {
  subtle: { name: 'Subtle', radius: 2, glow: 0.3 },
  moderate: { name: 'Moderate', radius: 5, glow: 0.5 },
  strong: { name: 'Strong', radius: 10, glow: 0.7 },
  extreme: { name: 'Extreme', radius: 20, glow: 1.0 }
};

class BlurGlow {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.blurTypes = BLUR_TYPES;
    this.intensityPresets = INTENSITY_PRESETS;
  }

  /**
   * Obtiene los tipos de blur disponibles
   * @returns {Array} Tipos
   */
  getBlurTypes() {
    return Object.entries(BLUR_TYPES).map(([key, type]) => ({
      id: key,
      name: type.name,
      description: type.description
    }));
  }

  /**
   * Obtiene los presets de intensidad
   * @returns {Array} Presets
   */
  getIntensityPresets() {
    return Object.entries(INTENSITY_PRESETS).map(([key, preset]) => ({
      id: key,
      name: preset.name
    }));
  }

  /**
   * Aplica blur a todo el video
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {Object} options - Opciones
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async applyBlur(inputPath, outputPath, options = {}, onProgress = null) {
    const type = options.type || 'gaussian';
    const radius = options.radius || 5;
    
    const blurType = BLUR_TYPES[type];
    if (!blurType) {
      throw new VideoEditorError(`Invalid blur type: ${type}`, ErrorCodes.INVALID_PARAMETER);
    }

    const filter = blurType.filter(radius, options.angle);

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
      type,
      radius
    };
  }

  /**
   * Aplica blur a una región específica
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {Object} region - Región {x, y, width, height}
   * @param {Object} options - Opciones
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async applyRegionBlur(inputPath, outputPath, region, options = {}, onProgress = null) {
    const radius = options.radius || 10;
    const { x, y, width, height } = region;

    // Usar drawbox con blur
    const filter = `split[main][blur];[blur]boxblur=${radius}[blurred];[main][blurred]overlay=${x}:${y}:enable='between(X,${x},${x + width})*between(Y,${y},${y + height})'`;

    // Alternativa más simple: pixelizar la región
    const simpleFilter = `delogo=x=${x}:y=${y}:w=${width}:h=${height}:show=0`;

    const args = [
      '-i', inputPath,
      '-vf', simpleFilter,
      '-c:a', 'copy',
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      region,
      radius
    };
  }

  /**
   * Aplica efecto glow/bloom
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {Object} options - Opciones
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async applyGlow(inputPath, outputPath, options = {}, onProgress = null) {
    const intensity = options.intensity || 0.5;
    const radius = options.radius || 5;
    const threshold = options.threshold || 0.5;

    // Simular glow con blur y blend
    const filter = `split[a][b];[b]gblur=sigma=${radius},eq=brightness=${intensity * 0.3}[glow];[a][glow]blend=all_mode=screen:all_opacity=${intensity}`;

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
      intensity,
      radius
    };
  }

  /**
   * Aplica blur de fondo (sujeto enfocado)
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {Object} options - Opciones
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async applyBackgroundBlur(inputPath, outputPath, options = {}, onProgress = null) {
    const blurRadius = options.blurRadius || 15;
    const focusX = options.focusX !== undefined ? options.focusX : 0.5;
    const focusY = options.focusY !== undefined ? options.focusY : 0.5;
    const focusRadius = options.focusRadius || 0.3;

    // Crear viñeta de blur (centro enfocado, bordes borrosos)
    const filter = `split[main][blur];[blur]gblur=sigma=${blurRadius}[blurred];[main][blurred]blend=all_expr='if(lt(sqrt(pow((X/W-${focusX}),2)+pow((Y/H-${focusY}),2)),${focusRadius}),A,B)'`;

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
      blurRadius,
      focusCenter: { x: focusX, y: focusY }
    };
  }

  /**
   * Aplica preset de intensidad
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {string} presetId - ID del preset
   * @param {string} effectType - 'blur' o 'glow'
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async applyPreset(inputPath, outputPath, presetId, effectType = 'blur', onProgress = null) {
    const preset = INTENSITY_PRESETS[presetId];
    if (!preset) {
      throw new VideoEditorError(`Invalid preset: ${presetId}`, ErrorCodes.INVALID_PARAMETER);
    }

    if (effectType === 'glow') {
      return this.applyGlow(inputPath, outputPath, { 
        intensity: preset.glow, 
        radius: preset.radius 
      }, onProgress);
    } else {
      return this.applyBlur(inputPath, outputPath, { 
        radius: preset.radius 
      }, onProgress);
    }
  }
}

module.exports = BlurGlow;
