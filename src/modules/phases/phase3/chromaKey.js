/**
 * BlackMamba Studio - Chroma Key
 * 
 * Sistema de clave cromática (pantalla verde/azul).
 * 
 * Características:
 * - Soporte para verde y azul
 * - Ajuste de tolerancia y suavizado
 * - Detección automática de color
 * - Spill suppression
 * - Preview de máscara
 * 
 * @module ChromaKey
 */

const FFmpegWrapper = require('../../ffmpegWrapper');
const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

// Colores predefinidos para chroma key
const CHROMA_COLORS = {
  green: { name: 'Green Screen', color: '0x00FF00', key: 'green' },
  blue: { name: 'Blue Screen', color: '0x0000FF', key: 'blue' },
  custom: { name: 'Custom Color', color: null, key: 'custom' }
};

// Presets de calidad
const QUALITY_PRESETS = {
  fast: {
    name: 'Fast',
    similarity: 0.3,
    blend: 0.1
  },
  balanced: {
    name: 'Balanced',
    similarity: 0.15,
    blend: 0.05
  },
  quality: {
    name: 'High Quality',
    similarity: 0.1,
    blend: 0.02
  }
};

class ChromaKey {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.chromaColors = CHROMA_COLORS;
    this.qualityPresets = QUALITY_PRESETS;
    this.currentSettings = {
      colorKey: 'green',
      customColor: null,
      similarity: 0.15,
      blend: 0.05,
      spillRemoval: true
    };
  }

  /**
   * Obtiene los colores de chroma disponibles
   * @returns {Array} Colores
   */
  getChromaColors() {
    return Object.entries(CHROMA_COLORS).map(([key, value]) => ({
      id: key,
      name: value.name
    }));
  }

  /**
   * Obtiene los presets de calidad
   * @returns {Array} Presets
   */
  getQualityPresets() {
    return Object.entries(QUALITY_PRESETS).map(([key, value]) => ({
      id: key,
      name: value.name
    }));
  }

  /**
   * Obtiene la configuración actual
   * @returns {Object} Configuración
   */
  getCurrentSettings() {
    return { ...this.currentSettings };
  }

  /**
   * Establece el color de chroma
   * @param {string} colorKey - 'green', 'blue' o 'custom'
   * @param {string} customHex - Color hex para custom (opcional)
   */
  setChromaColor(colorKey, customHex = null) {
    if (!CHROMA_COLORS[colorKey]) {
      throw new VideoEditorError(`Invalid chroma color: ${colorKey}`, ErrorCodes.INVALID_PARAMETER);
    }
    this.currentSettings.colorKey = colorKey;
    if (colorKey === 'custom' && customHex) {
      this.currentSettings.customColor = customHex;
    }
  }

  /**
   * Establece la similitud (tolerancia)
   * @param {number} value - Valor 0-1 (menor = más preciso)
   */
  setSimilarity(value) {
    this.currentSettings.similarity = Math.max(0, Math.min(1, value));
  }

  /**
   * Establece el blend (suavizado de bordes)
   * @param {number} value - Valor 0-1
   */
  setBlend(value) {
    this.currentSettings.blend = Math.max(0, Math.min(1, value));
  }

  /**
   * Activa/desactiva spill removal
   * @param {boolean} enabled - Estado
   */
  setSpillRemoval(enabled) {
    this.currentSettings.spillRemoval = enabled;
  }

  /**
   * Aplica un preset de calidad
   * @param {string} presetId - ID del preset
   */
  applyQualityPreset(presetId) {
    const preset = QUALITY_PRESETS[presetId];
    if (!preset) {
      throw new VideoEditorError(`Invalid preset: ${presetId}`, ErrorCodes.INVALID_PARAMETER);
    }
    this.currentSettings.similarity = preset.similarity;
    this.currentSettings.blend = preset.blend;
  }

  /**
   * Genera el filtro FFmpeg para chroma key
   * @returns {string} Filtro
   */
  generateFilter() {
    let color;
    if (this.currentSettings.colorKey === 'custom') {
      color = this.currentSettings.customColor || '0x00FF00';
    } else {
      color = CHROMA_COLORS[this.currentSettings.colorKey].color;
    }

    let filter = `chromakey=${color}:${this.currentSettings.similarity}:${this.currentSettings.blend}`;

    // Agregar despill si está habilitado
    if (this.currentSettings.spillRemoval && this.currentSettings.colorKey !== 'custom') {
      if (this.currentSettings.colorKey === 'green') {
        filter += ',despill=type=green';
      } else if (this.currentSettings.colorKey === 'blue') {
        filter += ',despill=type=blue';
      }
    }

    return filter;
  }

  /**
   * Aplica chroma key a un video
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {Object} options - Opciones
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

  /**
   * Compone video sobre un fondo
   * @param {string} foregroundPath - Video con chroma
   * @param {string} backgroundPath - Fondo (video o imagen)
   * @param {string} outputPath - Video de salida
   * @param {Object} options - Opciones
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async compose(foregroundPath, backgroundPath, outputPath, options = {}, onProgress = null) {
    const chromaFilter = this.generateFilter();
    
    // Usar overlay para componer
    const filter = `[0:v]${chromaFilter}[fg];[1:v][fg]overlay=format=auto`;

    const args = [
      '-i', foregroundPath,
      '-i', backgroundPath,
      '-filter_complex', filter,
      '-map', '0:a?',
      '-c:a', 'copy',
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      foreground: foregroundPath,
      background: backgroundPath
    };
  }
}

module.exports = ChromaKey;
