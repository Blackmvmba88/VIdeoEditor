/**
 * BlackMamba Studio - LUT Manager
 * 
 * Gestor de LUTs (Look-Up Tables) para color grading.
 * 
 * Características:
 * - Soporte para .cube y .3dl
 * - Biblioteca de LUTs predefinidos
 * - Importación de LUTs externos
 * - Intensidad/mezcla ajustable
 * - Preview de LUTs
 * 
 * @module LUTManager
 */

const FFmpegWrapper = require('../../ffmpegWrapper');
const { VideoEditorError, ErrorCodes } = require('../../errorHandler');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// LUTs predefinidos (emulados con filtros ya que no tenemos archivos .cube reales)
const BUILT_IN_LUTS = {
  cinematic_teal_orange: {
    name: 'Cinematic Teal & Orange',
    description: 'Look cinematográfico popular',
    filter: 'colorbalance=bs=.2:bm=.1:bh=-.1:rs=-.1:rm=.05:rh=.15'
  },
  vintage_film: {
    name: 'Vintage Film',
    description: 'Emula película vintage',
    filter: 'curves=vintage,eq=saturation=0.85'
  },
  cold_blue: {
    name: 'Cold Blue',
    description: 'Tonos fríos azulados',
    filter: 'colorbalance=bs=.3:bm=.15:bh=.1:rs=-.1:rm=-.05'
  },
  warm_sunset: {
    name: 'Warm Sunset',
    description: 'Tonos cálidos de atardecer',
    filter: 'colorbalance=rs=.2:rm=.1:rh=.1:bs=-.1:bm=-.05'
  },
  noir: {
    name: 'Film Noir',
    description: 'Alto contraste, casi blanco y negro',
    filter: 'eq=saturation=0.1:contrast=1.3,curves=m=0.1/0:0.5/0.5:0.9/1'
  },
  cross_process: {
    name: 'Cross Process',
    description: 'Efecto de revelado cruzado',
    filter: 'curves=cross_process'
  },
  bleached: {
    name: 'Bleached',
    description: 'Look descolorido y suave',
    filter: 'eq=saturation=0.5:contrast=0.9,curves=all=0/0.1:1/0.9'
  },
  vibrant: {
    name: 'Vibrant',
    description: 'Colores vivos y saturados',
    filter: 'eq=saturation=1.4:contrast=1.1'
  }
};

// Formatos soportados
const SUPPORTED_FORMATS = ['.cube', '.3dl'];

class LUTManager {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.builtInLuts = BUILT_IN_LUTS;
    this.customLuts = new Map();
    this.supportedFormats = SUPPORTED_FORMATS;
    this.lutsDirectory = path.join(os.homedir(), '.blackmamba', 'luts');
  }

  /**
   * Obtiene los LUTs predefinidos
   * @returns {Array} Lista de LUTs
   */
  getBuiltInLuts() {
    return Object.entries(BUILT_IN_LUTS).map(([key, lut]) => ({
      id: key,
      name: lut.name,
      description: lut.description,
      type: 'builtin'
    }));
  }

  /**
   * Obtiene los LUTs personalizados cargados
   * @returns {Array} Lista de LUTs
   */
  getCustomLuts() {
    return Array.from(this.customLuts.entries()).map(([key, lut]) => ({
      id: key,
      name: lut.name,
      path: lut.path,
      type: 'custom'
    }));
  }

  /**
   * Obtiene todos los LUTs disponibles
   * @returns {Array} Lista de todos los LUTs
   */
  getAllLuts() {
    return [...this.getBuiltInLuts(), ...this.getCustomLuts()];
  }

  /**
   * Obtiene los formatos soportados
   * @returns {Array} Formatos
   */
  getSupportedFormats() {
    return [...SUPPORTED_FORMATS];
  }

  /**
   * Importa un LUT externo
   * @param {string} lutPath - Ruta al archivo LUT
   * @param {string} name - Nombre para el LUT
   * @returns {Object} LUT importado
   */
  importLut(lutPath, name = null) {
    if (!fs.existsSync(lutPath)) {
      throw new VideoEditorError(`LUT file not found: ${lutPath}`, ErrorCodes.FILE_NOT_FOUND);
    }

    const ext = path.extname(lutPath).toLowerCase();
    if (!SUPPORTED_FORMATS.includes(ext)) {
      throw new VideoEditorError(
        `Unsupported LUT format: ${ext}. Supported: ${SUPPORTED_FORMATS.join(', ')}`,
        ErrorCodes.INVALID_FORMAT
      );
    }

    const lutName = name || path.basename(lutPath, ext);
    const lutId = `custom_${Date.now()}`;

    const lut = {
      id: lutId,
      name: lutName,
      path: lutPath,
      format: ext,
      type: 'custom'
    };

    this.customLuts.set(lutId, lut);
    return lut;
  }

  /**
   * Remueve un LUT personalizado
   * @param {string} lutId - ID del LUT
   */
  removeLut(lutId) {
    if (!this.customLuts.has(lutId)) {
      throw new VideoEditorError(`LUT ${lutId} not found`, ErrorCodes.INVALID_PARAMETER);
    }
    this.customLuts.delete(lutId);
  }

  /**
   * Aplica un LUT a un video
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {string} lutId - ID del LUT
   * @param {Object} options - Opciones
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async applyLut(inputPath, outputPath, lutId, options = {}, onProgress = null) {
    const intensity = options.intensity !== undefined ? options.intensity : 1;
    
    let filter;
    
    // Verificar si es LUT built-in
    if (BUILT_IN_LUTS[lutId]) {
      filter = BUILT_IN_LUTS[lutId].filter;
    } else if (this.customLuts.has(lutId)) {
      // LUT personalizado - usar lut3d
      const lut = this.customLuts.get(lutId);
      filter = `lut3d='${lut.path}'`;
    } else {
      throw new VideoEditorError(`LUT ${lutId} not found`, ErrorCodes.INVALID_PARAMETER);
    }

    // Aplicar intensidad si es menor a 1
    if (intensity < 1) {
      // Mezclar con original usando split y blend
      filter = `split[original][graded];[graded]${filter}[lutted];[original][lutted]blend=all_expr='A*(1-${intensity})+B*${intensity}'`;
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
      lutApplied: lutId,
      intensity
    };
  }

  /**
   * Genera preview de un LUT
   * @param {string} inputPath - Video de entrada
   * @param {string} lutId - ID del LUT
   * @param {number} timestamp - Tiempo para el preview
   * @returns {Promise<Object>} Resultado con ruta de imagen
   */
  async generatePreview(inputPath, lutId, timestamp = 0) {
    const outputPath = path.join(
      os.tmpdir(),
      'video-editor-pro',
      `lut-preview-${lutId}-${Date.now()}.jpg`
    );

    let filter;
    if (BUILT_IN_LUTS[lutId]) {
      filter = BUILT_IN_LUTS[lutId].filter;
    } else if (this.customLuts.has(lutId)) {
      const lut = this.customLuts.get(lutId);
      filter = `lut3d='${lut.path}'`;
    } else {
      throw new VideoEditorError(`LUT ${lutId} not found`, ErrorCodes.INVALID_PARAMETER);
    }

    const args = [
      '-ss', String(timestamp),
      '-i', inputPath,
      '-vframes', '1',
      '-vf', filter,
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args);

    return {
      success: true,
      lutId,
      previewPath: outputPath
    };
  }
}

module.exports = LUTManager;
