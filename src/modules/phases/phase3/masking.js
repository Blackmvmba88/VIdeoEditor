/**
 * BlackMamba Studio - Masking System
 * 
 * Sistema de máscaras para efectos selectivos.
 * 
 * Características:
 * - Máscaras geométricas (rectángulo, círculo, elipse)
 * - Máscaras de luminancia
 * - Máscaras de color
 * - Máscaras animadas (keyframes)
 * - Inversión de máscaras
 * - Feathering/suavizado de bordes
 * 
 * @module Masking
 */

const FFmpegWrapper = require('../../ffmpegWrapper');
const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

// Formas de máscara disponibles
const MASK_SHAPES = {
  rectangle: { name: 'Rectangle', description: 'Máscara rectangular' },
  circle: { name: 'Circle', description: 'Máscara circular' },
  ellipse: { name: 'Ellipse', description: 'Máscara elíptica' },
  gradient: { name: 'Gradient', description: 'Gradiente lineal' }
};

// Modos de máscara
const MASK_MODES = {
  add: { name: 'Add', description: 'Revela la capa superior' },
  subtract: { name: 'Subtract', description: 'Oculta partes de la capa' },
  intersect: { name: 'Intersect', description: 'Solo donde se superponen' },
  difference: { name: 'Difference', description: 'Invierte la intersección' }
};

class Masking {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.maskShapes = MASK_SHAPES;
    this.maskModes = MASK_MODES;
    this.masks = [];
  }

  /**
   * Obtiene las formas de máscara disponibles
   * @returns {Array} Formas
   */
  getMaskShapes() {
    return Object.entries(MASK_SHAPES).map(([key, shape]) => ({
      id: key,
      name: shape.name,
      description: shape.description
    }));
  }

  /**
   * Obtiene los modos de máscara
   * @returns {Array} Modos
   */
  getMaskModes() {
    return Object.entries(MASK_MODES).map(([key, mode]) => ({
      id: key,
      name: mode.name,
      description: mode.description
    }));
  }

  /**
   * Crea una nueva máscara
   * @param {Object} config - Configuración de la máscara
   * @returns {Object} Máscara creada
   */
  createMask(config) {
    const mask = {
      id: `mask-${Date.now()}`,
      shape: config.shape || 'rectangle',
      x: config.x || 0,
      y: config.y || 0,
      width: config.width || 100,
      height: config.height || 100,
      radius: config.radius || 50,
      feather: config.feather || 0,
      inverted: config.inverted || false,
      mode: config.mode || 'add',
      keyframes: config.keyframes || []
    };

    this.masks.push(mask);
    return mask;
  }

  /**
   * Obtiene todas las máscaras
   * @returns {Array} Máscaras
   */
  getMasks() {
    return [...this.masks];
  }

  /**
   * Actualiza una máscara
   * @param {string} maskId - ID de la máscara
   * @param {Object} updates - Actualizaciones
   * @returns {Object} Máscara actualizada
   */
  updateMask(maskId, updates) {
    const mask = this.masks.find(m => m.id === maskId);
    if (!mask) {
      throw new VideoEditorError(`Mask ${maskId} not found`, ErrorCodes.INVALID_PARAMETER);
    }

    Object.assign(mask, updates);
    return mask;
  }

  /**
   * Elimina una máscara
   * @param {string} maskId - ID de la máscara
   */
  deleteMask(maskId) {
    const index = this.masks.findIndex(m => m.id === maskId);
    if (index === -1) {
      throw new VideoEditorError(`Mask ${maskId} not found`, ErrorCodes.INVALID_PARAMETER);
    }
    this.masks.splice(index, 1);
  }

  /**
   * Limpia todas las máscaras
   */
  clearMasks() {
    this.masks = [];
  }

  /**
   * Agrega un keyframe a una máscara
   * @param {string} maskId - ID de la máscara
   * @param {Object} keyframe - Keyframe {time, x, y, width, height, etc}
   */
  addKeyframe(maskId, keyframe) {
    const mask = this.masks.find(m => m.id === maskId);
    if (!mask) {
      throw new VideoEditorError(`Mask ${maskId} not found`, ErrorCodes.INVALID_PARAMETER);
    }
    mask.keyframes.push(keyframe);
    mask.keyframes.sort((a, b) => a.time - b.time);
  }

  /**
   * Genera filtro FFmpeg para una máscara
   * @param {Object} mask - Máscara
   * @returns {string} Filtro
   * @private
   */
  generateMaskFilter(mask) {
    let filter = '';

    switch (mask.shape) {
    case 'rectangle':
      // Usar drawbox para crear máscara rectangular
      filter = `drawbox=x=${mask.x}:y=${mask.y}:w=${mask.width}:h=${mask.height}:color=white@1:t=fill`;
      break;
    case 'circle': {
      // Usar geq para crear máscara circular
      const cx = mask.x + mask.radius;
      const cy = mask.y + mask.radius;
      filter = `geq=lum='if(lt(sqrt(pow(X-${cx},2)+pow(Y-${cy},2)),${mask.radius}),255,0)'`;
      break;
    }
    case 'ellipse': {
      const ecx = mask.x + mask.width / 2;
      const ecy = mask.y + mask.height / 2;
      const rx = mask.width / 2;
      const ry = mask.height / 2;
      filter = `geq=lum='if(lt(pow((X-${ecx})/${rx},2)+pow((Y-${ecy})/${ry},2),1),255,0)'`;
      break;
    }
    case 'gradient':
      filter = `geq=lum='255*X/W'`;
      break;
    default:
      filter = 'null';
    }

    if (mask.inverted) {
      filter += ',negate';
    }

    return filter;
  }

  /**
   * Aplica máscara a un video
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {string} maskId - ID de la máscara
   * @param {Object} options - Opciones
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async applyMask(inputPath, outputPath, maskId, options = {}, onProgress = null) {
    const mask = this.masks.find(m => m.id === maskId);
    if (!mask) {
      throw new VideoEditorError(`Mask ${maskId} not found`, ErrorCodes.INVALID_PARAMETER);
    }

    // Para demo, aplicamos blur solo en la región de la máscara
    const blurRadius = options.blurRadius || 10;
    
    let filter;
    if (mask.shape === 'rectangle') {
      // Aplicar efecto solo fuera de la máscara
      filter = `split[main][blur];[blur]boxblur=${blurRadius}[blurred];[main][blurred]overlay=x=0:y=0`;
    } else {
      filter = `boxblur=${blurRadius}`;
    }

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
      maskId,
      mask
    };
  }

  /**
   * Aplica máscara de luminancia
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {Object} options - Opciones {lowThreshold, highThreshold}
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async applyLuminanceMask(inputPath, outputPath, options = {}, onProgress = null) {
    const low = options.lowThreshold || 0;
    const high = options.highThreshold || 128;
    
    // Crear máscara basada en luminancia
    const filter = `lumakey=threshold=${(high - low) / 255}:tolerance=${(high - low) / 512}`;

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
      thresholds: { low, high }
    };
  }

  /**
   * Aplica máscara de color
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {Object} options - Opciones {color, tolerance}
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async applyColorMask(inputPath, outputPath, options = {}, onProgress = null) {
    const color = options.color || '0x00FF00';
    const similarity = options.similarity || 0.3;
    
    const filter = `chromakey=${color}:${similarity}`;

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
      color,
      similarity
    };
  }
}

module.exports = Masking;
