/**
 * BlackMamba Studio - Audio Effects
 * 
 * Efectos de audio: normalización, reducción de ruido básica y más.
 * 
 * Características:
 * - Normalización de volumen
 * - Reducción de ruido básica
 * - Compresor de audio
 * - Ecualizador básico
 * - Fade in/out de audio
 * - Amplificación/atenuación
 * 
 * @module AudioEffects
 */

const FFmpegWrapper = require('../../ffmpegWrapper');
const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

// Presets de ecualización
const EQ_PRESETS = {
  voice: {
    name: 'Voz',
    description: 'Optimizado para diálogos y podcasts',
    filters: 'highpass=f=80,lowpass=f=12000,equalizer=f=200:t=q:w=1:g=-3,equalizer=f=3000:t=q:w=2:g=3'
  },
  music: {
    name: 'Música',
    description: 'Balance para contenido musical',
    filters: 'equalizer=f=60:t=q:w=1:g=2,equalizer=f=10000:t=q:w=2:g=1'
  },
  bass: {
    name: 'Más Bajos',
    description: 'Realza frecuencias graves',
    filters: 'equalizer=f=100:t=q:w=2:g=5,equalizer=f=200:t=q:w=2:g=3'
  },
  treble: {
    name: 'Más Agudos',
    description: 'Realza frecuencias altas',
    filters: 'equalizer=f=8000:t=q:w=2:g=4,equalizer=f=12000:t=q:w=2:g=3'
  },
  telephone: {
    name: 'Teléfono',
    description: 'Simula audio de teléfono',
    filters: 'highpass=f=300,lowpass=f=3400'
  },
  radio: {
    name: 'Radio',
    description: 'Efecto de radio vintage',
    filters: 'highpass=f=200,lowpass=f=5000,equalizer=f=1000:t=q:w=2:g=3'
  }
};

// Niveles de reducción de ruido
const DENOISE_LEVELS = {
  light: { nf: -25, description: 'Reducción ligera' },
  medium: { nf: -35, description: 'Reducción media' },
  heavy: { nf: -45, description: 'Reducción fuerte' }
};

class AudioEffects {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.eqPresets = EQ_PRESETS;
    this.denoiseLevels = DENOISE_LEVELS;
  }

  /**
   * Obtiene los presets de ecualización disponibles
   * @returns {Object} Presets
   */
  getEQPresets() {
    return Object.entries(EQ_PRESETS).map(([key, preset]) => ({
      id: key,
      name: preset.name,
      description: preset.description
    }));
  }

  /**
   * Obtiene los niveles de reducción de ruido
   * @returns {Object} Niveles
   */
  getDenoiseLevels() {
    return Object.entries(DENOISE_LEVELS).map(([key, level]) => ({
      id: key,
      description: level.description
    }));
  }

  /**
   * Normaliza el volumen del audio
   * @param {string} inputPath - Archivo de entrada
   * @param {string} outputPath - Archivo de salida
   * @param {Object} options - Opciones
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async normalize(inputPath, outputPath, options = {}, onProgress = null) {
    const targetLoudness = options.targetLoudness || -16; // LUFS
    const targetPeak = options.targetPeak || -1.5; // dB

    const args = [
      '-i', inputPath,
      '-af', `loudnorm=I=${targetLoudness}:TP=${targetPeak}:LRA=11`,
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      effect: 'normalize',
      settings: { targetLoudness, targetPeak }
    };
  }

  /**
   * Aplica reducción de ruido básica
   * @param {string} inputPath - Archivo de entrada
   * @param {string} outputPath - Archivo de salida
   * @param {Object} options - Opciones
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async denoise(inputPath, outputPath, options = {}, onProgress = null) {
    const level = options.level || 'medium';
    const noiseLevel = DENOISE_LEVELS[level]?.nf || -35;

    // Usar afftdn (FFT Denoise) que está incluido en FFmpeg
    const args = [
      '-i', inputPath,
      '-af', `afftdn=nf=${noiseLevel}`,
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      effect: 'denoise',
      settings: { level, noiseLevel }
    };
  }

  /**
   * Aplica compresión de audio
   * @param {string} inputPath - Archivo de entrada
   * @param {string} outputPath - Archivo de salida
   * @param {Object} options - Opciones
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async compress(inputPath, outputPath, options = {}, onProgress = null) {
    const threshold = options.threshold || -20; // dB
    const ratio = options.ratio || 4;
    const attack = options.attack || 5; // ms
    const release = options.release || 50; // ms

    const args = [
      '-i', inputPath,
      '-af', `acompressor=threshold=${threshold}dB:ratio=${ratio}:attack=${attack}:release=${release}`,
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      effect: 'compress',
      settings: { threshold, ratio, attack, release }
    };
  }

  /**
   * Aplica ecualización con preset
   * @param {string} inputPath - Archivo de entrada
   * @param {string} outputPath - Archivo de salida
   * @param {string} presetId - ID del preset
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async equalize(inputPath, outputPath, presetId, onProgress = null) {
    const preset = EQ_PRESETS[presetId];
    if (!preset) {
      throw new VideoEditorError(`EQ preset ${presetId} not found`, ErrorCodes.INVALID_PARAMETER);
    }

    const args = [
      '-i', inputPath,
      '-af', preset.filters,
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      effect: 'equalize',
      settings: { preset: presetId, name: preset.name }
    };
  }

  /**
   * Aplica fade in/out al audio
   * @param {string} inputPath - Archivo de entrada
   * @param {string} outputPath - Archivo de salida
   * @param {Object} options - Opciones
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async fade(inputPath, outputPath, options = {}, onProgress = null) {
    const fadeInDuration = options.fadeIn || 0;
    const fadeOutDuration = options.fadeOut || 0;

    if (fadeInDuration === 0 && fadeOutDuration === 0) {
      throw new VideoEditorError('At least fadeIn or fadeOut must be specified', ErrorCodes.INVALID_PARAMETER);
    }

    const filters = [];
    if (fadeInDuration > 0) {
      filters.push(`afade=t=in:st=0:d=${fadeInDuration}`);
    }
    if (fadeOutDuration > 0) {
      // Necesitamos saber la duración total para el fade out
      // Por ahora usamos un placeholder que se reemplaza
      filters.push(`afade=t=out:st=0:d=${fadeOutDuration}`);
    }

    const args = [
      '-i', inputPath,
      '-af', filters.join(','),
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      effect: 'fade',
      settings: { fadeIn: fadeInDuration, fadeOut: fadeOutDuration }
    };
  }

  /**
   * Ajusta el volumen del audio
   * @param {string} inputPath - Archivo de entrada
   * @param {string} outputPath - Archivo de salida
   * @param {number} volumeChange - Cambio en dB (positivo=más fuerte, negativo=más suave)
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async adjustVolume(inputPath, outputPath, volumeChange, onProgress = null) {
    const args = [
      '-i', inputPath,
      '-af', `volume=${volumeChange}dB`,
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      effect: 'volume',
      settings: { change: volumeChange }
    };
  }

  /**
   * Aplica múltiples efectos en cadena
   * @param {string} inputPath - Archivo de entrada
   * @param {string} outputPath - Archivo de salida
   * @param {Array} effects - Lista de efectos a aplicar
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async applyChain(inputPath, outputPath, effects, onProgress = null) {
    const filterParts = [];

    for (const effect of effects) {
      switch (effect.type) {
      case 'normalize':
        filterParts.push(`loudnorm=I=${effect.targetLoudness || -16}:TP=${effect.targetPeak || -1.5}:LRA=11`);
        break;
      case 'denoise':
        filterParts.push(`afftdn=nf=${DENOISE_LEVELS[effect.level]?.nf || -35}`);
        break;
      case 'compress':
        filterParts.push(`acompressor=threshold=${effect.threshold || -20}dB:ratio=${effect.ratio || 4}`);
        break;
      case 'eq':
        if (EQ_PRESETS[effect.preset]) {
          filterParts.push(EQ_PRESETS[effect.preset].filters);
        }
        break;
      case 'volume':
        filterParts.push(`volume=${effect.change || 0}dB`);
        break;
      }
    }

    if (filterParts.length === 0) {
      throw new VideoEditorError('No valid effects specified', ErrorCodes.INVALID_PARAMETER);
    }

    const args = [
      '-i', inputPath,
      '-af', filterParts.join(','),
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      effectsApplied: effects.length
    };
  }
}

module.exports = AudioEffects;
