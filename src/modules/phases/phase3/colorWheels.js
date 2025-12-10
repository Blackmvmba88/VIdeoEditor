/**
 * BlackMamba Studio - Color Wheels
 * 
 * Sistema de ruedas de color profesional para corrección de color.
 * 
 * Características:
 * - Ruedas de Shadows, Midtones, Highlights
 * - Ajustes de Lift, Gamma, Gain
 * - Control de saturación por rango tonal
 * - Offset global de color
 * - Presets de color profesionales
 * 
 * @module ColorWheels
 */

const FFmpegWrapper = require('../../ffmpegWrapper');
const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

// Presets profesionales de color
const COLOR_PRESETS = {
  cinematic: {
    name: 'Cinematic',
    description: 'Look cinematográfico con sombras frías y highlights cálidos',
    shadows: { r: 0.9, g: 0.95, b: 1.1 },
    midtones: { r: 1.0, g: 1.0, b: 1.0 },
    highlights: { r: 1.1, g: 1.05, b: 0.95 }
  },
  teal_orange: {
    name: 'Teal & Orange',
    description: 'Look popular en cine blockbuster',
    shadows: { r: 0.85, g: 1.0, b: 1.15 },
    midtones: { r: 1.0, g: 0.98, b: 0.95 },
    highlights: { r: 1.15, g: 1.05, b: 0.9 }
  },
  vintage: {
    name: 'Vintage',
    description: 'Estilo retro con tonos desaturados',
    shadows: { r: 1.05, g: 1.0, b: 0.95 },
    midtones: { r: 1.0, g: 0.98, b: 0.95 },
    highlights: { r: 1.0, g: 0.95, b: 0.9 },
    saturation: 0.85
  },
  bleach_bypass: {
    name: 'Bleach Bypass',
    description: 'Alto contraste con colores desaturados',
    shadows: { r: 0.9, g: 0.9, b: 0.9 },
    midtones: { r: 1.0, g: 1.0, b: 1.0 },
    highlights: { r: 1.1, g: 1.1, b: 1.1 },
    saturation: 0.6,
    contrast: 1.2
  },
  cool: {
    name: 'Cool',
    description: 'Tonos fríos generales',
    shadows: { r: 0.9, g: 0.95, b: 1.1 },
    midtones: { r: 0.95, g: 1.0, b: 1.05 },
    highlights: { r: 0.95, g: 1.0, b: 1.05 }
  },
  warm: {
    name: 'Warm',
    description: 'Tonos cálidos generales',
    shadows: { r: 1.05, g: 1.0, b: 0.95 },
    midtones: { r: 1.05, g: 1.0, b: 0.95 },
    highlights: { r: 1.1, g: 1.0, b: 0.9 }
  }
};

class ColorWheels {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.presets = COLOR_PRESETS;
    this.currentSettings = this.getDefaultSettings();
  }

  /**
   * Obtiene la configuración por defecto
   * @returns {Object} Configuración
   */
  getDefaultSettings() {
    return {
      shadows: { r: 1.0, g: 1.0, b: 1.0 },
      midtones: { r: 1.0, g: 1.0, b: 1.0 },
      highlights: { r: 1.0, g: 1.0, b: 1.0 },
      lift: { r: 0.0, g: 0.0, b: 0.0 },
      gamma: { r: 1.0, g: 1.0, b: 1.0 },
      gain: { r: 1.0, g: 1.0, b: 1.0 },
      offset: { r: 0.0, g: 0.0, b: 0.0 },
      saturation: 1.0,
      contrast: 1.0
    };
  }

  /**
   * Obtiene los presets disponibles
   * @returns {Array} Lista de presets
   */
  getPresets() {
    return Object.entries(COLOR_PRESETS).map(([key, preset]) => ({
      id: key,
      name: preset.name,
      description: preset.description
    }));
  }

  /**
   * Obtiene la configuración actual
   * @returns {Object} Configuración actual
   */
  getCurrentSettings() {
    return { ...this.currentSettings };
  }

  /**
   * Ajusta las sombras
   * @param {Object} rgb - Valores RGB (0-2 donde 1 es neutral)
   */
  setShadows(rgb) {
    this.currentSettings.shadows = { ...this.currentSettings.shadows, ...rgb };
  }

  /**
   * Ajusta los medios tonos
   * @param {Object} rgb - Valores RGB
   */
  setMidtones(rgb) {
    this.currentSettings.midtones = { ...this.currentSettings.midtones, ...rgb };
  }

  /**
   * Ajusta los highlights
   * @param {Object} rgb - Valores RGB
   */
  setHighlights(rgb) {
    this.currentSettings.highlights = { ...this.currentSettings.highlights, ...rgb };
  }

  /**
   * Ajusta Lift (sombras offset)
   * @param {Object} rgb - Valores RGB (-1 a 1)
   */
  setLift(rgb) {
    this.currentSettings.lift = { ...this.currentSettings.lift, ...rgb };
  }

  /**
   * Ajusta Gamma (medios tonos)
   * @param {Object} rgb - Valores RGB
   */
  setGamma(rgb) {
    this.currentSettings.gamma = { ...this.currentSettings.gamma, ...rgb };
  }

  /**
   * Ajusta Gain (highlights multiplicador)
   * @param {Object} rgb - Valores RGB
   */
  setGain(rgb) {
    this.currentSettings.gain = { ...this.currentSettings.gain, ...rgb };
  }

  /**
   * Ajusta el offset global
   * @param {Object} rgb - Valores RGB
   */
  setOffset(rgb) {
    this.currentSettings.offset = { ...this.currentSettings.offset, ...rgb };
  }

  /**
   * Ajusta saturación
   * @param {number} value - Valor de saturación (0-2)
   */
  setSaturation(value) {
    this.currentSettings.saturation = Math.max(0, Math.min(2, value));
  }

  /**
   * Ajusta contraste
   * @param {number} value - Valor de contraste (0-2)
   */
  setContrast(value) {
    this.currentSettings.contrast = Math.max(0, Math.min(2, value));
  }

  /**
   * Aplica un preset
   * @param {string} presetId - ID del preset
   */
  applyPreset(presetId) {
    const preset = COLOR_PRESETS[presetId];
    if (!preset) {
      throw new VideoEditorError(`Preset ${presetId} not found`, ErrorCodes.INVALID_PARAMETER);
    }

    this.currentSettings = this.getDefaultSettings();
    if (preset.shadows) this.currentSettings.shadows = { ...preset.shadows };
    if (preset.midtones) this.currentSettings.midtones = { ...preset.midtones };
    if (preset.highlights) this.currentSettings.highlights = { ...preset.highlights };
    if (preset.saturation !== undefined) this.currentSettings.saturation = preset.saturation;
    if (preset.contrast !== undefined) this.currentSettings.contrast = preset.contrast;

    return this.currentSettings;
  }

  /**
   * Resetea a valores por defecto
   */
  reset() {
    this.currentSettings = this.getDefaultSettings();
  }

  /**
   * Genera el filtro FFmpeg para la corrección
   * @returns {string} Filtro FFmpeg
   */
  generateFilter() {
    const s = this.currentSettings;
    const filters = [];

    // Aplicar colorbalance para shadows/midtones/highlights
    const colorBalance = `colorbalance=rs=${s.shadows.r - 1}:gs=${s.shadows.g - 1}:bs=${s.shadows.b - 1}:rm=${s.midtones.r - 1}:gm=${s.midtones.g - 1}:bm=${s.midtones.b - 1}:rh=${s.highlights.r - 1}:gh=${s.highlights.g - 1}:bh=${s.highlights.b - 1}`;
    filters.push(colorBalance);

    // Aplicar saturación y contraste
    if (s.saturation !== 1.0 || s.contrast !== 1.0) {
      filters.push(`eq=saturation=${s.saturation}:contrast=${s.contrast}`);
    }

    return filters.join(',');
  }

  /**
   * Aplica la corrección de color a un video
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {Object} options - Opciones adicionales
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async apply(inputPath, outputPath, options = {}, onProgress = null) {
    const filter = this.generateFilter();

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
      settings: this.getCurrentSettings()
    };
  }
}

module.exports = ColorWheels;
