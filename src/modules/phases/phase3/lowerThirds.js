/**
 * BlackMamba Studio - Lower Thirds
 * 
 * Sistema de tercios inferiores profesionales para nombres, títulos,
 * etiquetas, precios y eventos.
 * 
 * Características:
 * - Plantillas prediseñadas de lower thirds
 * - Personalización de colores, fuentes y estilos
 * - Animaciones de entrada y salida
 * - Soporte para múltiples líneas de texto
 * - Presets para diferentes contextos (noticias, entrevistas, eventos)
 * 
 * @module LowerThirds
 */

const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

class LowerThirds {
  constructor() {
    this.presets = new Map();
    this.loadDefaultPresets();
  }

  /**
   * Carga los presets predeterminados de lower thirds
   * @private
   */
  loadDefaultPresets() {
    this.presets.set('modern-minimal', {
      name: 'Modern Minimal',
      style: 'minimal',
      colors: {
        background: '#000000',
        primary: '#00d4ff',
        text: '#ffffff'
      },
      font: {
        family: 'Arial',
        size: {
          primary: 32,
          secondary: 24
        }
      },
      animation: {
        in: 'slide-left',
        out: 'fade-out',
        duration: 0.5
      },
      position: {
        x: 50,
        y: 720,
        width: 600,
        height: 120
      }
    });

    this.presets.set('news-broadcast', {
      name: 'News Broadcast',
      style: 'broadcast',
      colors: {
        background: '#1a1a2e',
        primary: '#ff4757',
        text: '#ffffff'
      },
      font: {
        family: 'Roboto',
        size: {
          primary: 36,
          secondary: 26
        }
      },
      animation: {
        in: 'expand',
        out: 'collapse',
        duration: 0.7
      },
      position: {
        x: 50,
        y: 700,
        width: 700,
        height: 150
      }
    });

    this.presets.set('corporate', {
      name: 'Corporate',
      style: 'professional',
      colors: {
        background: '#2c3e50',
        primary: '#3498db',
        text: '#ecf0f1'
      },
      font: {
        family: 'Helvetica',
        size: {
          primary: 30,
          secondary: 22
        }
      },
      animation: {
        in: 'fade-slide',
        out: 'fade-out',
        duration: 0.6
      },
      position: {
        x: 50,
        y: 750,
        width: 650,
        height: 130
      }
    });

    this.presets.set('creative', {
      name: 'Creative',
      style: 'creative',
      colors: {
        background: '#9b59b6',
        primary: '#f39c12',
        text: '#ffffff'
      },
      font: {
        family: 'Montserrat',
        size: {
          primary: 34,
          secondary: 24
        }
      },
      animation: {
        in: 'bounce',
        out: 'slide-down',
        duration: 0.8
      },
      position: {
        x: 50,
        y: 730,
        width: 680,
        height: 140
      }
    });
  }

  /**
   * Obtiene todos los presets de lower thirds disponibles
   * @returns {Array} Array de presets
   */
  getPresets() {
    return Array.from(this.presets.entries()).map(([id, preset]) => ({
      id,
      ...preset
    }));
  }

  /**
   * Obtiene un preset específico
   * @param {string} presetId - ID del preset
   * @returns {Object} Preset solicitado
   */
  getPreset(presetId) {
    if (!this.presets.has(presetId)) {
      throw new VideoEditorError(
        `Lower thirds preset ${presetId} not found`,
        ErrorCodes.INVALID_INPUT
      );
    }
    return this.presets.get(presetId);
  }

  /**
   * Crea un lower third con el preset especificado
   * @param {Object} config - Configuración del lower third
   * @returns {Promise<Object>} Lower third configurado
   */
  async createLowerThird(config) {
    const {
      presetId = 'modern-minimal',
      primaryText,
      secondaryText = '',
      startTime = 0,
      duration = 5.0,
      customColors = {}
    } = config;

    if (!primaryText) {
      throw new VideoEditorError(
        'Primary text is required for lower third',
        ErrorCodes.INVALID_INPUT
      );
    }

    const preset = this.getPreset(presetId);
    
    // Merge custom colors with preset colors
    const colors = { ...preset.colors, ...customColors };

    return {
      success: true,
      lowerThird: {
        preset: presetId,
        texts: {
          primary: primaryText,
          secondary: secondaryText
        },
        colors,
        font: preset.font,
        animation: preset.animation,
        position: preset.position,
        timing: {
          start: startTime,
          duration: duration
        }
      },
      message: 'Lower third created successfully'
    };
  }

  /**
   * Aplica un lower third a un video
   * @param {string} inputPath - Ruta del video de entrada
   * @param {string} outputPath - Ruta del video de salida
   * @param {Object} lowerThirdConfig - Configuración del lower third
   * @returns {Promise<Object>} Resultado de la operación
   */
  async applyToVideo(inputPath, outputPath, lowerThirdConfig) {
    const lowerThird = await this.createLowerThird(lowerThirdConfig);

    // Aquí se implementaría la integración con FFmpeg
    // para overlay del lower third en el video
    return {
      success: true,
      input: inputPath,
      output: outputPath,
      lowerThird: lowerThird.lowerThird,
      message: 'Lower third ready to apply (FFmpeg integration pending)'
    };
  }

  /**
   * Crea múltiples lower thirds para diferentes momentos del video
   * @param {Array} configurations - Array de configuraciones
   * @returns {Promise<Array>} Array de lower thirds creados
   */
  async createBatch(configurations) {
    const results = [];
    
    for (const config of configurations) {
      try {
        const lowerThird = await this.createLowerThird(config);
        results.push(lowerThird);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          config
        });
      }
    }

    return results;
  }

  /**
   * Registra un nuevo preset personalizado
   * @param {string} presetId - ID del preset
   * @param {Object} preset - Definición del preset
   */
  registerPreset(presetId, preset) {
    if (this.presets.has(presetId)) {
      throw new VideoEditorError(
        `Preset ${presetId} already exists`,
        ErrorCodes.INVALID_INPUT
      );
    }

    // Validar estructura del preset
    if (!preset.name || !preset.colors || !preset.font) {
      throw new VideoEditorError(
        'Preset must have name, colors, and font',
        ErrorCodes.INVALID_INPUT
      );
    }

    this.presets.set(presetId, preset);
  }
}

module.exports = LowerThirds;
