/**
 * Módulo Optimizer (Pipeline Inteligente)
 * Agente que optimiza comandos FFmpeg de forma inteligente
 * 
 * Tareas:
 * - Ajusta automáticamente comandos FFmpeg según hardware (CPU/GPU)
 * - Selecciona codecs óptimos según plataforma destino (YT, TikTok, IG)
 * - Optimiza bitrate con fórmula adaptativa según duración y motion analysis
 * - Auto-detecta si conviene: 2-pass encoding, CRF vs CBR, escalado
 * - Reescribe comandos usando heurísticas y análisis del clip
 */

const os = require('node:os');
const FFmpegWrapper = require('./ffmpegWrapper');
const HardwareAccelerator = require('./phases/phase1/hardwareAccelerator');

// Configuraciones de plataformas
const PLATFORM_CONFIGS = {
  youtube: {
    name: 'YouTube',
    codec: 'libx264',
    profile: 'high',
    level: '4.1',
    audioBitrate: '192k',
    maxBitrate: '50M',
    audioCodec: 'aac',
    fastStart: true,
    container: 'mp4'
  },
  tiktok: {
    name: 'TikTok',
    codec: 'libx264',
    profile: 'main',
    level: '3.1',
    audioBitrate: '128k',
    maxBitrate: '4M',
    audioCodec: 'aac',
    fastStart: true,
    container: 'mp4',
    aspectRatio: '9:16',
    maxDuration: 180
  },
  instagram: {
    name: 'Instagram',
    codec: 'libx264',
    profile: 'main',
    level: '3.1',
    audioBitrate: '128k',
    maxBitrate: '3.5M',
    audioCodec: 'aac',
    fastStart: true,
    container: 'mp4'
  },
  instagramReels: {
    name: 'Instagram Reels',
    codec: 'libx264',
    profile: 'main',
    level: '3.1',
    audioBitrate: '128k',
    maxBitrate: '4M',
    audioCodec: 'aac',
    fastStart: true,
    container: 'mp4',
    aspectRatio: '9:16',
    maxDuration: 90
  },
  twitter: {
    name: 'Twitter/X',
    codec: 'libx264',
    profile: 'main',
    level: '3.1',
    audioBitrate: '128k',
    maxBitrate: '5M',
    audioCodec: 'aac',
    fastStart: true,
    container: 'mp4',
    maxDuration: 140
  },
  web: {
    name: 'Web',
    codec: 'libx264',
    profile: 'main',
    level: '3.1',
    audioBitrate: '128k',
    maxBitrate: '4M',
    audioCodec: 'aac',
    fastStart: true,
    container: 'mp4'
  },
  professional: {
    name: 'Professional',
    codec: 'libx264',
    profile: 'high',
    level: '5.1',
    audioBitrate: '320k',
    maxBitrate: '100M',
    audioCodec: 'aac',
    container: 'mp4'
  }
};

// Fórmulas de bitrate por resolución (base en Mbps)
const BITRATE_FORMULAS = {
  '8K': { base: 60, min: 40, max: 100 },
  '4K': { base: 35, min: 15, max: 50 },
  '2K/1440p': { base: 16, min: 8, max: 25 },
  '1080p': { base: 8, min: 4, max: 12 },
  '720p': { base: 4, min: 2, max: 6 },
  '480p': { base: 2, min: 1, max: 3 },
  '360p': { base: 1, min: 0.5, max: 1.5 }
};

// Algoritmos de escalado
const SCALING_ALGORITHMS = {
  lanczos: {
    filter: 'lanczos',
    quality: 'high',
    speed: 'slow',
    useCases: ['upscale', 'highQuality']
  },
  bicubic: {
    filter: 'bicubic',
    quality: 'medium',
    speed: 'medium',
    useCases: ['general', 'balanced']
  },
  bilinear: {
    filter: 'bilinear',
    quality: 'low',
    speed: 'fast',
    useCases: ['preview', 'fast']
  },
  spline: {
    filter: 'spline',
    quality: 'high',
    speed: 'slow',
    useCases: ['downscale', 'antialiasing']
  }
};

class Optimizer {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.hardwareAccelerator = new HardwareAccelerator();
    this.cpuCount = os.cpus().length;
    this.platform = os.platform();
    this.totalMemory = os.totalmem();
    this.hardwareDetected = false;
  }

  /**
   * Inicializar el optimizador detectando hardware disponible
   * @returns {Promise<Object>} Información del hardware detectado
   */
  async initialize() {
    const accelerators = await this.hardwareAccelerator.detectAccelerators();
    this.hardwareDetected = true;

    return {
      cpuCount: this.cpuCount,
      platform: this.platform,
      totalMemory: this.formatBytes(this.totalMemory),
      gpuAccelerators: accelerators.map(a => a.name),
      activeAccelerator: this.hardwareAccelerator.getActiveAccelerator()?.name || 'None (CPU)'
    };
  }

  /**
   * Optimizar parámetros FFmpeg para un video específico
   * @param {Object} videoInfo - Información del video de entrada
   * @param {Object} options - Opciones de optimización
   * @returns {Object} Parámetros FFmpeg optimizados
   */
  async optimizeParameters(videoInfo, options = {}) {
    if (!this.hardwareDetected) {
      await this.initialize();
    }

    const platform = options.platform || 'web';
    const mode = options.mode || 'balanced';
    
    const platformConfig = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.web;
    
    // Analizar el video para determinar parámetros óptimos
    const motionIntensity = await this.estimateMotionIntensity(videoInfo);
    const complexityScore = this.calculateComplexityScore(videoInfo);
    
    // Determinar bitrate óptimo
    const bitrateConfig = this.calculateOptimalBitrate(
      videoInfo,
      motionIntensity,
      complexityScore,
      platformConfig.maxBitrate
    );
    
    // Determinar si usar CRF o CBR
    const encodingStrategy = this.selectEncodingStrategy(
      videoInfo.duration,
      motionIntensity,
      mode
    );
    
    // Determinar si conviene 2-pass
    const useTwoPass = this.shouldUseTwoPass(
      videoInfo.duration,
      complexityScore,
      mode
    );
    
    // Seleccionar algoritmo de escalado
    const scalingAlgorithm = this.selectScalingAlgorithm(
      videoInfo,
      options.targetResolution,
      mode
    );
    
    // Optimizar para hardware disponible
    const hardwareArgs = this.optimizeForHardware(
      platformConfig.codec,
      options.useGPU !== false
    );
    
    // Construir argumentos FFmpeg
    const ffmpegArgs = this.buildOptimizedArgs({
      videoInfo,
      platformConfig,
      bitrateConfig,
      encodingStrategy,
      useTwoPass,
      scalingAlgorithm,
      hardwareArgs,
      options
    });

    return {
      args: ffmpegArgs,
      metadata: {
        platform: platformConfig.name,
        motionIntensity,
        complexityScore,
        encodingStrategy: encodingStrategy.type,
        twoPass: useTwoPass,
        scalingAlgorithm: scalingAlgorithm.filter,
        estimatedBitrate: bitrateConfig.target,
        useGPU: hardwareArgs.useGPU,
        gpuEncoder: hardwareArgs.encoder
      }
    };
  }

  /**
   * Estimar la intensidad de movimiento del video
   * @param {Object} videoInfo - Información del video
   * @returns {Promise<number>} Intensidad de movimiento (0-1)
   */
  async estimateMotionIntensity(videoInfo) {
    // Heurística basada en características del video
    // En una implementación real, se analizaría el video frame por frame
    
    let intensity = 0.5; // Valor base
    
    // FPS alto sugiere contenido con más movimiento
    if (videoInfo.video && videoInfo.video.fps) {
      if (videoInfo.video.fps >= 60) intensity += 0.2;
      else if (videoInfo.video.fps >= 30) intensity += 0.1;
    }
    
    // Bitrate alto puede indicar contenido complejo/con movimiento
    if (videoInfo.bitrate) {
      const mbps = videoInfo.bitrate / 1000000;
      if (mbps > 20) intensity += 0.15;
      else if (mbps > 10) intensity += 0.1;
    }
    
    // Duración corta típicamente significa más acción
    if (videoInfo.duration && videoInfo.duration < 60) {
      intensity += 0.1;
    }

    return Math.min(1, Math.max(0, intensity));
  }

  /**
   * Calcular puntuación de complejidad del video
   * @param {Object} videoInfo - Información del video
   * @returns {number} Puntuación de complejidad (0-1)
   */
  calculateComplexityScore(videoInfo) {
    let score = 0.5;

    if (videoInfo.video) {
      // Resolución alta = más complejidad
      const pixels = (videoInfo.video.width || 0) * (videoInfo.video.height || 0);
      if (pixels >= 3840 * 2160) score += 0.2; // 4K+
      else if (pixels >= 1920 * 1080) score += 0.1; // 1080p

      // Codec complejo
      const codec = (videoInfo.video.codec || '').toLowerCase();
      if (codec.includes('hevc') || codec.includes('h265') || codec.includes('av1')) {
        score += 0.1;
      }
    }

    // Duración larga
    if (videoInfo.duration && videoInfo.duration > 600) { // > 10 min
      score += 0.1;
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Calcular bitrate óptimo basado en análisis
   * @param {Object} videoInfo - Información del video
   * @param {number} motionIntensity - Intensidad de movimiento
   * @param {number} complexityScore - Puntuación de complejidad
   * @param {string} maxBitrate - Bitrate máximo permitido
   * @returns {Object} Configuración de bitrate
   */
  calculateOptimalBitrate(videoInfo, motionIntensity, complexityScore, maxBitrate) {
    // Determinar categoría de resolución
    let resCategory = '1080p';
    if (videoInfo.video) {
      const pixels = videoInfo.video.width * videoInfo.video.height;
      if (pixels >= 7680 * 4320) resCategory = '8K';
      else if (pixels >= 3840 * 2160) resCategory = '4K';
      else if (pixels >= 2560 * 1440) resCategory = '2K/1440p';
      else if (pixels >= 1920 * 1080) resCategory = '1080p';
      else if (pixels >= 1280 * 720) resCategory = '720p';
      else if (pixels >= 854 * 480) resCategory = '480p';
      else resCategory = '360p';
    }

    const formula = BITRATE_FORMULAS[resCategory] || BITRATE_FORMULAS['1080p'];
    
    // Fórmula adaptativa: base * (1 + motionFactor + complexityFactor)
    let targetMbps = formula.base;
    
    // Ajustar por intensidad de movimiento
    if (motionIntensity > 0.75) {
      targetMbps *= 1.5; // Alto movimiento: +50%
    } else if (motionIntensity > 0.5) {
      targetMbps *= 1.25; // Movimiento medio: +25%
    }
    
    // Ajustar por complejidad
    targetMbps *= (1 + complexityScore * 0.3);
    
    // Limitar a rango válido
    targetMbps = Math.max(formula.min, Math.min(formula.max, targetMbps));
    
    // Limitar al máximo de la plataforma
    const maxMbps = this.parseBitrate(maxBitrate) / 1000000;
    targetMbps = Math.min(targetMbps, maxMbps);

    return {
      target: `${targetMbps.toFixed(1)}M`,
      targetBps: Math.round(targetMbps * 1000000),
      maxrate: `${(targetMbps * 1.5).toFixed(1)}M`,
      bufsize: `${(targetMbps * 2).toFixed(1)}M`,
      resolution: resCategory
    };
  }

  /**
   * Seleccionar estrategia de encoding (CRF vs CBR)
   * @param {number} duration - Duración del video
   * @param {number} motionIntensity - Intensidad de movimiento
   * @param {string} mode - Modo de optimización
   * @returns {Object} Estrategia de encoding
   */
  selectEncodingStrategy(duration, motionIntensity, mode) {
    // CRF es mejor para:
    // - Videos cortos
    // - Contenido con variación de complejidad
    // - Cuando el tamaño del archivo no es crítico
    
    // CBR es mejor para:
    // - Streaming en vivo
    // - Tamaño de archivo predecible
    // - Plataformas con límites estrictos de bitrate
    
    if (mode === 'highQuality') {
      return {
        type: 'crf',
        value: 18,
        reason: 'Modo calidad máxima: CRF bajo para mejor calidad'
      };
    }
    
    if (mode === 'fast') {
      return {
        type: 'crf',
        value: 23,
        reason: 'Modo rápido: CRF más alto para velocidad'
      };
    }
    
    // Para videos con alto movimiento, CBR puede ser mejor
    if (motionIntensity > 0.75) {
      return {
        type: 'cbr',
        reason: 'Alto movimiento detectado: CBR para bitrate consistente'
      };
    }
    
    // Por defecto, CRF con valor adaptativo
    const crfValue = Math.round(21 - (motionIntensity * 3));
    return {
      type: 'crf',
      value: Math.max(18, Math.min(28, crfValue)),
      reason: 'Contenido estándar: CRF adaptativo'
    };
  }

  /**
   * Determinar si conviene usar encoding de 2 pasos
   * @param {number} duration - Duración del video
   * @param {number} complexityScore - Puntuación de complejidad
   * @param {string} mode - Modo de optimización
   * @returns {boolean}
   */
  shouldUseTwoPass(duration, complexityScore, mode) {
    // 2-pass es mejor para:
    // - Videos largos (mejor distribución de bitrate)
    // - Contenido complejo
    // - Modo de alta calidad
    
    if (mode === 'fast') return false;
    if (mode === 'highQuality') return true;
    
    // Para videos > 5 min con alta complejidad
    if (duration > 300 && complexityScore > 0.6) {
      return true;
    }
    
    // Para videos muy largos (> 30 min)
    if (duration > 1800) {
      return true;
    }
    
    return false;
  }

  /**
   * Seleccionar algoritmo de escalado óptimo
   * @param {Object} videoInfo - Información del video
   * @param {Object} targetResolution - Resolución de destino
   * @param {string} mode - Modo de optimización
   * @returns {Object} Configuración de escalado
   */
  selectScalingAlgorithm(videoInfo, targetResolution, mode) {
    if (!targetResolution || !videoInfo.video) {
      return SCALING_ALGORITHMS.bicubic;
    }

    const sourcePixels = videoInfo.video.width * videoInfo.video.height;
    const targetPixels = (targetResolution.width || videoInfo.video.width) * 
                         (targetResolution.height || videoInfo.video.height);

    const isUpscaling = targetPixels > sourcePixels;
    const isDownscaling = targetPixels < sourcePixels;

    if (mode === 'fast') {
      return SCALING_ALGORITHMS.bilinear;
    }

    if (mode === 'highQuality') {
      return isUpscaling ? SCALING_ALGORITHMS.lanczos : SCALING_ALGORITHMS.spline;
    }

    // Modo balanced
    if (isUpscaling) {
      return SCALING_ALGORITHMS.lanczos;
    } else if (isDownscaling) {
      return SCALING_ALGORITHMS.bicubic;
    }

    return SCALING_ALGORITHMS.bicubic;
  }

  /**
   * Optimizar parámetros para el hardware disponible
   * @param {string} codec - Codec de destino
   * @param {boolean} useGPU - Si se debe intentar usar GPU
   * @returns {Object} Configuración de hardware
   */
  optimizeForHardware(codec, useGPU) {
    const result = {
      useGPU: false,
      encoder: codec,
      decoderArgs: [],
      encoderArgs: [],
      threads: Math.max(1, this.cpuCount - 1)
    };

    if (!useGPU || !this.hardwareAccelerator.isEnabled()) {
      // CPU encoding
      result.encoderArgs = ['-threads', result.threads.toString()];
      return result;
    }

    const activeAccel = this.hardwareAccelerator.getActiveAccelerator();
    if (activeAccel) {
      result.useGPU = true;
      result.encoder = activeAccel.encoder;
      result.decoderArgs = this.hardwareAccelerator.getFFmpegArgs({ encode: false });
      result.encoderArgs = this.hardwareAccelerator.getFFmpegArgs({ encode: true });
    }

    return result;
  }

  /**
   * Construir argumentos FFmpeg optimizados
   * @param {Object} config - Configuración completa
   * @returns {Array} Argumentos de FFmpeg
   */
  buildOptimizedArgs(config) {
    const {
      platformConfig,
      bitrateConfig,
      encodingStrategy,
      scalingAlgorithm,
      hardwareArgs,
      options
    } = config;

    const args = [];

    // Agregar argumentos de decodificador de hardware si aplica
    if (hardwareArgs.decoderArgs.length > 0) {
      args.push(...hardwareArgs.decoderArgs);
    }

    // Encoder
    args.push('-c:v', hardwareArgs.encoder);

    // Perfil y nivel
    if (platformConfig.profile) {
      args.push('-profile:v', platformConfig.profile);
    }
    if (platformConfig.level) {
      args.push('-level', platformConfig.level);
    }

    // Estrategia de bitrate
    if (encodingStrategy.type === 'crf') {
      args.push('-crf', encodingStrategy.value.toString());
      // Añadir maxrate para limitar picos
      args.push('-maxrate', bitrateConfig.maxrate);
      args.push('-bufsize', bitrateConfig.bufsize);
    } else {
      // CBR
      args.push('-b:v', bitrateConfig.target);
      args.push('-maxrate', bitrateConfig.target);
      args.push('-bufsize', bitrateConfig.bufsize);
    }

    // Preset de velocidad
    if (options.mode === 'fast') {
      args.push('-preset', 'fast');
    } else if (options.mode === 'highQuality') {
      args.push('-preset', 'slow');
    } else {
      args.push('-preset', 'medium');
    }

    // Escalado si es necesario
    if (options.targetResolution) {
      const { width, height } = options.targetResolution;
      const filterStr = `scale=${width}:${height}:flags=${scalingAlgorithm.filter}`;
      args.push('-vf', filterStr);
    }

    // Audio
    args.push('-c:a', platformConfig.audioCodec);
    args.push('-b:a', platformConfig.audioBitrate);

    // Fast start para streaming
    if (platformConfig.fastStart) {
      args.push('-movflags', '+faststart');
    }

    // Threads para CPU
    if (hardwareArgs.threads && !hardwareArgs.useGPU) {
      args.push('-threads', hardwareArgs.threads.toString());
    }

    return args;
  }

  /**
   * Generar comando FFmpeg para 2-pass encoding
   * @param {string} inputPath - Ruta de entrada
   * @param {string} outputPath - Ruta de salida
   * @param {Object} optimizedParams - Parámetros optimizados
   * @returns {Object} Comandos para ambos pasos
   */
  generateTwoPassCommand(inputPath, outputPath, optimizedParams) {
    const baseArgs = optimizedParams.args.filter(
      arg => !arg.includes('-crf') // Remover CRF para 2-pass
    );

    const pass1Args = [
      '-i', inputPath,
      ...baseArgs,
      '-pass', '1',
      '-an', // Sin audio en primera pasada
      '-f', 'null',
      '-'
    ];

    const pass2Args = [
      '-i', inputPath,
      ...baseArgs,
      '-pass', '2',
      '-y',
      outputPath
    ];

    return { pass1Args, pass2Args };
  }

  /**
   * Obtener recomendaciones de optimización para un video
   * @param {Object} videoInfo - Información del video
   * @param {string} platform - Plataforma de destino
   * @returns {Promise<Object>} Recomendaciones
   */
  async getRecommendations(videoInfo, platform = 'web') {
    const optimized = await this.optimizeParameters(videoInfo, { platform });
    const recommendations = [];

    // Recomendar sobre GPU
    if (this.hardwareAccelerator.isEnabled()) {
      recommendations.push({
        type: 'hardware',
        priority: 'high',
        message: `Aceleración GPU disponible: ${this.hardwareAccelerator.getActiveAccelerator()?.name}. Se utilizará para encoding más rápido.`
      });
    } else {
      recommendations.push({
        type: 'hardware',
        priority: 'info',
        message: 'Encoding por CPU. Considerar habilitar aceleración GPU si está disponible.'
      });
    }

    // Recomendar sobre 2-pass
    if (optimized.metadata.twoPass) {
      recommendations.push({
        type: 'encoding',
        priority: 'medium',
        message: 'Se recomienda encoding de 2 pasos para mejor distribución de bitrate.'
      });
    }

    // Recomendar sobre bitrate
    if (optimized.metadata.motionIntensity > 0.75) {
      recommendations.push({
        type: 'bitrate',
        priority: 'high',
        message: 'Alto movimiento detectado. Bitrate incrementado automáticamente para mantener calidad.'
      });
    }

    // Recomendar sobre escalado
    if (videoInfo.video) {
      const targetRes = this.getRecommendedResolution(platform, videoInfo);
      if (targetRes.needsScaling) {
        recommendations.push({
          type: 'resolution',
          priority: 'medium',
          message: `Resolución recomendada para ${platform}: ${targetRes.width}x${targetRes.height}`
        });
      }
    }

    return {
      optimizedParams: optimized,
      recommendations,
      summary: {
        estimatedQuality: this.estimateQuality(optimized),
        estimatedSpeed: this.estimateSpeed(optimized),
        estimatedFileSize: this.estimateFileSize(videoInfo, optimized)
      }
    };
  }

  /**
   * Obtener resolución recomendada para una plataforma
   * @param {string} platform - Plataforma
   * @param {Object} videoInfo - Información del video
   * @returns {Object} Resolución recomendada
   */
  getRecommendedResolution(platform, videoInfo) {
    const platformResolutions = {
      youtube: { width: 1920, height: 1080 },
      youtube4k: { width: 3840, height: 2160 },
      tiktok: { width: 1080, height: 1920 },
      instagram: { width: 1080, height: 1080 },
      instagramReels: { width: 1080, height: 1920 },
      twitter: { width: 1280, height: 720 },
      web: { width: 1920, height: 1080 }
    };

    const target = platformResolutions[platform] || platformResolutions.web;
    
    return {
      ...target,
      needsScaling: videoInfo.video &&
        (videoInfo.video.width !== target.width || videoInfo.video.height !== target.height)
    };
  }

  /**
   * Estimar calidad resultante
   * @param {Object} optimized - Parámetros optimizados
   * @returns {string} Nivel de calidad estimado
   */
  estimateQuality(optimized) {
    if (optimized.metadata.encodingStrategy === 'crf') {
      const crf = optimized.args.find((arg, i, arr) => 
        arr[i-1] === '-crf'
      );
      if (crf) {
        const crfVal = Number.parseInt(crf);
        if (crfVal <= 18) return 'excellent';
        if (crfVal <= 21) return 'very_good';
        if (crfVal <= 24) return 'good';
        return 'acceptable';
      }
    }
    return 'good';
  }

  /**
   * Estimar velocidad de encoding
   * @param {Object} optimized - Parámetros optimizados
   * @returns {string} Velocidad estimada
   */
  estimateSpeed(optimized) {
    if (optimized.metadata.useGPU) return 'very_fast';
    if (optimized.metadata.twoPass) return 'slow';
    
    const preset = optimized.args.find((arg, i, arr) => 
      arr[i-1] === '-preset'
    );
    
    if (preset === 'slow' || preset === 'slower') return 'slow';
    if (preset === 'fast' || preset === 'faster') return 'fast';
    return 'medium';
  }

  /**
   * Estimar tamaño de archivo resultante
   * @param {Object} videoInfo - Información del video
   * @param {Object} optimized - Parámetros optimizados
   * @returns {string} Tamaño estimado
   */
  estimateFileSize(videoInfo, optimized) {
    const durationSec = videoInfo.duration || 0;
    const bitrateBps = this.parseBitrate(optimized.metadata.estimatedBitrate);
    
    // Tamaño = bitrate * duración / 8 (convertir bits a bytes)
    const estimatedBytes = (bitrateBps * durationSec) / 8;
    
    return this.formatBytes(estimatedBytes);
  }

  /**
   * Parsear string de bitrate a número
   * @param {string} bitrateStr - Bitrate como string (ej: "8M", "500k")
   * @returns {number} Bitrate en bps
   */
  parseBitrate(bitrateStr) {
    if (typeof bitrateStr === 'number') return bitrateStr;
    if (!bitrateStr) return 0;
    
    const match = bitrateStr.match(/^([\d.]+)([kKmMgG])?$/);
    if (!match) return 0;
    
    let value = Number.parseFloat(match[1]);
    const unit = (match[2] || '').toLowerCase();
    
    switch (unit) {
    case 'k': value *= 1000; break;
    case 'm': value *= 1000000; break;
    case 'g': value *= 1000000000; break;
    default: break; // No unit, value is already in bps
    }
    
    return Math.round(value);
  }

  /**
   * Formatear bytes a formato legible
   * @param {number} bytes - Bytes
   * @returns {string}
   */
  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Obtener configuraciones de plataforma disponibles
   * @returns {Object}
   */
  getPlatformConfigs() {
    return { ...PLATFORM_CONFIGS };
  }

  /**
   * Obtener algoritmos de escalado disponibles
   * @returns {Object}
   */
  getScalingAlgorithms() {
    return { ...SCALING_ALGORITHMS };
  }
}

module.exports = Optimizer;
