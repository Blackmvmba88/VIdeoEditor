/**
 * Módulo Validador de Archivos (Agente Validator - Pre-proceso)
 * Valida TODO antes de correr FFmpeg o Auto-Edit
 * 
 * Funciones:
 * - Detecta errores en archivos: codecs, fps, resolución, bitrate, metadata
 * - Detecta archivos corruptos
 * - Analiza si el preset seleccionado es compatible
 * - Reescribe parámetros automáticamente si ve riesgos
 * - Advierte con mensajes de recomendación
 */

const fs = require('node:fs');
const path = require('node:path');
const FormatDetector = require('./formatDetector');
const FFmpegWrapper = require('./ffmpegWrapper');

// Configuraciones de compatibilidad por codec
const CODEC_COMPATIBILITY = {
  prores: {
    recommendedFor: ['professional', 'highQuality'],
    notRecommendedFor: ['web', 'social'],
    transcodeTo: 'h264',
    message: 'ProRes detectado; recomendación: mantener para calidad profesional o transcodificar a H.264 para web.'
  },
  hevc: {
    recommendedFor: ['highQuality', 'youtube4k'],
    notRecommendedFor: ['twitter', 'web720p'],
    transcodeTo: 'h264',
    message: 'HEVC/H.265 detectado; puede tener problemas de compatibilidad en algunas plataformas.'
  },
  vp9: {
    recommendedFor: ['webm', 'youtube'],
    notRecommendedFor: ['instagram', 'tiktok'],
    transcodeTo: 'h264',
    message: 'VP9 detectado; recomendación: transcodificar a H.264 para máxima compatibilidad.'
  },
  av1: {
    recommendedFor: ['youtube4k', 'highQuality'],
    notRecommendedFor: ['instagram', 'tiktok', 'twitter'],
    transcodeTo: 'h264',
    message: 'AV1 detectado; codec moderno pero soporte limitado en algunas plataformas.'
  }
};

// Configuraciones de bitrate recomendado por resolución
const RECOMMENDED_BITRATES = {
  '8K': { min: 40000000, max: 100000000, recommended: 60000000 },
  '4K': { min: 15000000, max: 50000000, recommended: 35000000 },
  '2K/1440p': { min: 8000000, max: 25000000, recommended: 16000000 },
  '1080p': { min: 4000000, max: 12000000, recommended: 8000000 },
  '720p': { min: 2000000, max: 6000000, recommended: 4000000 },
  '480p': { min: 1000000, max: 3000000, recommended: 2000000 },
  '360p': { min: 500000, max: 1500000, recommended: 1000000 },
  'Low Resolution': { min: 250000, max: 1000000, recommended: 500000 }
};

// Configuraciones de FPS válidos
const VALID_FPS = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60, 120];

class FileValidator {
  constructor() {
    this.formatDetector = new FormatDetector();
    this.ffmpeg = new FFmpegWrapper();

    this.maxFileSize = 10 * 1024 * 1024 * 1024;
    this.minFileSize = 1024;
  }

  /**
   * Validar un solo archivo
   * @param {string} filePath - Ruta al archivo
   * @returns {Promise<{valid: boolean, errors: string[], warnings: string[]}>}
   */
  async validateFile(filePath) {
    const errors = [];
    const warnings = [];

    if (!filePath || typeof filePath !== 'string') {
      errors.push('Invalid file path provided');
      return { valid: false, errors, warnings };
    }

    if (!fs.existsSync(filePath)) {
      errors.push(`File not found: ${filePath}`);
      return { valid: false, errors, warnings };
    }

    const stats = fs.statSync(filePath);

    if (!stats.isFile()) {
      errors.push('Path is not a file');
      return { valid: false, errors, warnings };
    }

    if (stats.size < this.minFileSize) {
      errors.push('File is too small to be a valid video');
      return { valid: false, errors, warnings };
    }

    if (stats.size > this.maxFileSize) {
      errors.push(`File exceeds maximum size of ${this.formatBytes(this.maxFileSize)}`);
      return { valid: false, errors, warnings };
    }

    if (!this.formatDetector.isSupportedExtension(filePath)) {
      errors.push(`Unsupported file extension: ${path.extname(filePath)}`);
      return { valid: false, errors, warnings };
    }

    try {
      const format = await this.formatDetector.detectFormat(filePath);

      if (!format.isSupported) {
        errors.push('File format or codec is not supported');
        return { valid: false, errors, warnings };
      }

      if (!format.hasVideo && !format.hasAudio) {
        errors.push('File contains no video or audio streams');
        return { valid: false, errors, warnings };
      }

      if (format.duration <= 0) {
        warnings.push('Could not detect file duration');
      }

      if (format.hasVideo && format.video) {
        if (format.video.width <= 0 || format.video.height <= 0) {
          errors.push('Invalid video dimensions');
          return { valid: false, errors, warnings };
        }

        if (format.video.width > 7680 || format.video.height > 4320) {
          warnings.push('Video resolution exceeds 8K, processing may be slow');
        }
      }

      return { valid: true, errors, warnings, format };
    } catch (error) {
      errors.push(`Failed to analyze file: ${error.message}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Validar múltiples archivos
   * @param {string[]} filePaths - Array de rutas de archivos
   * @returns {Promise<{allValid: boolean, results: Object[]}>}
   */
  async validateFiles(filePaths) {
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      return {
        allValid: false,
        results: [{
          path: null,
          valid: false,
          errors: ['No files provided for validation']
        }]
      };
    }

    const results = [];
    let allValid = true;

    for (const filePath of filePaths) {
      const result = await this.validateFile(filePath);
      results.push({
        path: filePath,
        ...result
      });

      if (!result.valid) {
        allValid = false;
      }
    }

    return { allValid, results };
  }

  /**
   * Validar ruta de salida
   * @param {string} outputPath - Ruta del archivo de salida
   * @returns {{valid: boolean, errors: string[]}}
   */
  validateOutputPath(outputPath) {
    const errors = [];

    if (!outputPath || typeof outputPath !== 'string') {
      errors.push('Invalid output path provided');
      return { valid: false, errors };
    }

    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        errors.push(`Cannot create output directory: ${dir}`);
        return { valid: false, errors };
      }
    }

    const ext = path.extname(outputPath).toLowerCase();
    if (!this.formatDetector.isSupportedExtension(outputPath)) {
      errors.push(`Unsupported output format: ${ext}`);
      return { valid: false, errors };
    }

    if (fs.existsSync(outputPath)) {
      try {
        fs.accessSync(outputPath, fs.constants.W_OK);
      } catch {
        errors.push('Output file exists and is not writable');
        return { valid: false, errors };
      }
    } else {
      try {
        fs.accessSync(dir, fs.constants.W_OK);
      } catch {
        errors.push('Output directory is not writable');
        return { valid: false, errors };
      }
    }

    return { valid: true, errors };
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
   * Establecer tamaño máximo de archivo
   * @param {number} sizeInBytes - Tamaño máximo en bytes
   */
  setMaxFileSize(sizeInBytes) {
    if (sizeInBytes > 0) {
      this.maxFileSize = sizeInBytes;
    }
  }

  /**
   * Verificar si la ruta es segura (sin traversal de ruta)
   * @param {string} filePath - Ruta del archivo
   * @param {string} basePath - Directorio base
   * @returns {boolean}
   */
  isSafePath(filePath, basePath) {
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(basePath);
    return resolvedPath.startsWith(resolvedBase);
  }

  // ==========================================
  // MÉTODOS AVANZADOS DEL AGENTE VALIDATOR
  // ==========================================

  /**
   * Validación profunda de archivo con análisis de compatibilidad
   * @param {string} filePath - Ruta al archivo
   * @param {string} presetKey - Clave del preset de exportación (opcional)
   * @returns {Promise<Object>} Resultado de validación extendida
   */
  async validateDeep(filePath, presetKey = null) {
    const errors = [];
    const warnings = [];
    const recommendations = [];
    let suggestedParameters = null;

    // Primero hacer la validación básica
    const basicValidation = await this.validateFile(filePath);
    if (!basicValidation.valid) {
      return {
        ...basicValidation,
        recommendations,
        suggestedParameters,
        isCorrupt: false
      };
    }

    const format = basicValidation.format;

    // Verificar si el archivo está corrupto
    const corruptCheck = await this.checkCorruption(filePath);
    if (corruptCheck.isCorrupt) {
      errors.push(`Archivo corrupto detectado: ${corruptCheck.reason}`);
      return {
        valid: false,
        errors,
        warnings: basicValidation.warnings,
        recommendations,
        suggestedParameters,
        format,
        isCorrupt: true,
        corruptionDetails: corruptCheck
      };
    }

    // Analizar codec
    if (format.hasVideo && format.video) {
      const codecAnalysis = this.analyzeCodec(format.video.codec, presetKey);
      if (codecAnalysis.warning) {
        warnings.push(codecAnalysis.warning);
      }
      if (codecAnalysis.recommendation) {
        recommendations.push(codecAnalysis.recommendation);
      }

      // Analizar FPS
      const fpsAnalysis = this.analyzeFPS(format.video.fps);
      if (fpsAnalysis.warning) {
        warnings.push(fpsAnalysis.warning);
      }
      if (fpsAnalysis.recommendation) {
        recommendations.push(fpsAnalysis.recommendation);
      }

      // Analizar resolución
      const resolutionAnalysis = this.analyzeResolution(
        format.video.width,
        format.video.height,
        presetKey
      );
      if (resolutionAnalysis.warning) {
        warnings.push(resolutionAnalysis.warning);
      }
      if (resolutionAnalysis.recommendation) {
        recommendations.push(resolutionAnalysis.recommendation);
      }

      // Analizar bitrate
      const bitrateAnalysis = this.analyzeBitrate(
        format.video.bitrate,
        format.video.width,
        format.video.height
      );
      if (bitrateAnalysis.warning) {
        warnings.push(bitrateAnalysis.warning);
      }
      if (bitrateAnalysis.recommendation) {
        recommendations.push(bitrateAnalysis.recommendation);
      }
    }

    // Analizar compatibilidad con preset
    if (presetKey) {
      const presetCompatibility = this.checkPresetCompatibility(format, presetKey);
      if (!presetCompatibility.compatible) {
        warnings.push(...presetCompatibility.warnings);
        recommendations.push(...presetCompatibility.recommendations);
        suggestedParameters = presetCompatibility.suggestedParameters;
      }
    }

    // Detectar formato 10-bit que puede causar problemas
    const bitDepthWarning = this.checkBitDepth(format);
    if (bitDepthWarning) {
      warnings.push(bitDepthWarning.warning);
      if (bitDepthWarning.recommendation) {
        recommendations.push(bitDepthWarning.recommendation);
      }
    }

    return {
      valid: true,
      errors,
      warnings: [...basicValidation.warnings, ...warnings],
      recommendations,
      suggestedParameters,
      format,
      isCorrupt: false,
      analysisDetails: {
        codecInfo: format.video ? format.video.codec : null,
        fpsInfo: format.video ? format.video.fps : null,
        resolutionInfo: format.video ? `${format.video.width}x${format.video.height}` : null,
        bitrateInfo: format.bitrate,
        durationInfo: format.duration
      }
    };
  }

  /**
   * Verificar si un archivo está corrupto
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<{isCorrupt: boolean, reason: string|null}>}
   */
  async checkCorruption(filePath) {
    try {
      // Usar FFmpeg para verificar integridad del archivo
      const args = [
        '-v', 'error',
        '-i', filePath,
        '-f', 'null',
        '-t', '10', // Solo verificar los primeros 10 segundos
        '-'
      ];

      await this.ffmpeg.execute(args);
      return { isCorrupt: false, reason: null };
    } catch (error) {
      const errorMsg = error.message.toLowerCase();
      
      // Detectar errores específicos de corrupción
      if (errorMsg.includes('invalid data') ||
          errorMsg.includes('corrupt') ||
          errorMsg.includes('error decoding') ||
          errorMsg.includes('invalid nal') ||
          errorMsg.includes('broken')) {
        return {
          isCorrupt: true,
          reason: 'Datos inválidos o corrompidos detectados en el stream de video'
        };
      }
      
      if (errorMsg.includes('moov atom not found')) {
        return {
          isCorrupt: true,
          reason: 'Archivo incompleto: falta el moov atom (metadata del video)'
        };
      }

      // Otros errores de FFmpeg no necesariamente significan corrupción
      return { isCorrupt: false, reason: null };
    }
  }

  /**
   * Analizar codec del video
   * @param {string} codec - Nombre del codec
   * @param {string} presetKey - Preset de destino
   * @returns {Object} Resultado del análisis
   */
  analyzeCodec(codec, presetKey) {
    if (!codec) return { warning: null, recommendation: null };

    const codecLower = codec.toLowerCase();
    const compatibility = CODEC_COMPATIBILITY[codecLower];

    if (!compatibility) return { warning: null, recommendation: null };

    const result = { warning: null, recommendation: null };

    if (presetKey && compatibility.notRecommendedFor.includes(presetKey)) {
      result.warning = `Codec ${codec.toUpperCase()} no es óptimo para el preset "${presetKey}"`;
      result.recommendation = {
        type: 'transcode',
        message: compatibility.message,
        suggestedCodec: compatibility.transcodeTo
      };
    }

    return result;
  }

  /**
   * Analizar FPS del video
   * @param {number} fps - Frames por segundo
   * @returns {Object} Resultado del análisis
   */
  analyzeFPS(fps) {
    if (!fps || fps <= 0) {
      return {
        warning: 'No se pudo detectar el FPS del video',
        recommendation: null
      };
    }

    const result = { warning: null, recommendation: null };

    // Verificar si el FPS es estándar
    const isStandardFPS = VALID_FPS.some(validFps => 
      Math.abs(fps - validFps) < 0.1
    );

    if (!isStandardFPS) {
      result.warning = `FPS no estándar detectado: ${fps}`;
      
      // Encontrar el FPS estándar más cercano
      const closestFPS = VALID_FPS.reduce((prev, curr) => 
        Math.abs(curr - fps) < Math.abs(prev - fps) ? curr : prev
      );
      
      result.recommendation = {
        type: 'fps_adjustment',
        message: `Considerar convertir a ${closestFPS} FPS para mejor compatibilidad`,
        suggestedFPS: closestFPS
      };
    }

    if (fps > 60) {
      result.warning = result.warning || `FPS alto detectado: ${fps}`;
      result.recommendation = {
        type: 'fps_reduction',
        message: 'FPS mayor a 60 puede causar problemas de reproducción en algunas plataformas',
        suggestedFPS: 60
      };
    }

    return result;
  }

  /**
   * Analizar resolución del video
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @param {string} presetKey - Preset de destino
   * @returns {Object} Resultado del análisis
   */
  analyzeResolution(width, height, presetKey) {
    if (!width || !height) {
      return {
        warning: 'No se pudieron detectar las dimensiones del video',
        recommendation: null
      };
    }

    const result = { warning: null, recommendation: null };

    // Verificar proporción de aspecto
    const aspectRatio = width / height;
    const commonRatios = {
      '16:9': 16/9,
      '9:16': 9/16,
      '4:3': 4/3,
      '1:1': 1,
      '21:9': 21/9
    };

    const matchedRatio = Object.entries(commonRatios).find(
      ([, ratio]) => Math.abs(aspectRatio - ratio) < 0.05
    );

    if (!matchedRatio) {
      result.warning = `Relación de aspecto inusual detectada: ${(aspectRatio).toFixed(2)}:1`;
    }

    // Verificar compatibilidad con preset
    if (presetKey) {
      const presetTargets = {
        instagram: { width: 1080, height: 1080 },
        instagramStory: { width: 1080, height: 1920 },
        tiktok: { width: 1080, height: 1920 },
        youtube1080p: { width: 1920, height: 1080 },
        youtube4k: { width: 3840, height: 2160 }
      };

      const target = presetTargets[presetKey];
      if (target) {
        if (width < target.width || height < target.height) {
          result.warning = `Resolución de origen (${width}x${height}) menor que destino (${target.width}x${target.height})`;
          result.recommendation = {
            type: 'resolution_warning',
            message: 'Se perderá calidad al escalar hacia arriba. Considerar un preset de menor resolución.',
            suggestedAction: 'downscale_preset'
          };
        }
      }
    }

    return result;
  }

  /**
   * Analizar bitrate del video
   * @param {number} bitrate - Bitrate en bps
   * @param {number} width - Ancho del video
   * @param {number} height - Alto del video
   * @returns {Object} Resultado del análisis
   */
  analyzeBitrate(bitrate, width, height) {
    if (!bitrate || bitrate <= 0) {
      return {
        warning: 'No se pudo detectar el bitrate del video',
        recommendation: null
      };
    }

    const result = { warning: null, recommendation: null };
    const resCategory = this.formatDetector.getResolutionCategory(width, height);
    const recommended = RECOMMENDED_BITRATES[resCategory];

    if (recommended) {
      if (bitrate < recommended.min) {
        result.warning = `Bitrate muy bajo para ${resCategory}: ${this.formatBitrate(bitrate)}`;
        result.recommendation = {
          type: 'bitrate_low',
          message: `Bitrate recomendado para ${resCategory}: ${this.formatBitrate(recommended.recommended)}`,
          suggestedBitrate: recommended.recommended
        };
      } else if (bitrate > recommended.max) {
        result.warning = `Bitrate muy alto para ${resCategory}: ${this.formatBitrate(bitrate)}`;
        result.recommendation = {
          type: 'bitrate_high',
          message: `Considerar reducir a ${this.formatBitrate(recommended.recommended)} para optimizar tamaño`,
          suggestedBitrate: recommended.recommended
        };
      }
    }

    return result;
  }

  /**
   * Verificar profundidad de bit del video
   * @param {Object} format - Información de formato
   * @returns {Object|null} Advertencia si aplica
   */
  checkBitDepth(format) {
    if (!format.video || !format.video.codec) return null;

    const codec = format.video.codec.toLowerCase();
    
    // Detectar codecs que típicamente son 10-bit
    const is10Bit = codec.includes('10') ||
                    codec.includes('10bit') ||
                    codec.includes('main10') ||
                    codec === 'prores' ||
                    format.container === 'mov';

    if (is10Bit) {
      return {
        warning: 'Video 10-bit detectado; puede requerir transcodificación para compatibilidad',
        recommendation: {
          type: 'bit_depth',
          message: 'Importado un MOV/ProRes 10-bit; recomendación: transcode a ProRes 422 o H.264 para estabilidad.',
          suggestedAction: 'transcode_8bit'
        }
      };
    }

    return null;
  }

  /**
   * Verificar compatibilidad con un preset específico
   * @param {Object} format - Información del formato del video
   * @param {string} presetKey - Clave del preset
   * @returns {Object} Resultado de compatibilidad
   */
  checkPresetCompatibility(format, presetKey) {
    const warnings = [];
    const recommendations = [];
    let suggestedParameters = null;

    // Mapeo de presets a configuraciones esperadas
    const presetConfigs = {
      youtube1080p: { maxWidth: 1920, maxHeight: 1080, codec: 'h264', maxBitrate: 12000000 },
      youtube4k: { maxWidth: 3840, maxHeight: 2160, codec: 'h264', maxBitrate: 50000000 },
      instagram: { maxWidth: 1080, maxHeight: 1080, codec: 'h264', maxBitrate: 5000000 },
      instagramStory: { maxWidth: 1080, maxHeight: 1920, codec: 'h264', maxBitrate: 5000000 },
      tiktok: { maxWidth: 1080, maxHeight: 1920, codec: 'h264', maxBitrate: 5000000 },
      twitter: { maxWidth: 1280, maxHeight: 720, codec: 'h264', maxBitrate: 6000000 },
      highQuality: { maxWidth: 7680, maxHeight: 4320, codec: 'any', maxBitrate: 100000000 }
    };

    const config = presetConfigs[presetKey];
    if (!config) {
      return { compatible: true, warnings, recommendations, suggestedParameters };
    }

    // Verificar codec
    if (config.codec !== 'any' && format.video) {
      const sourceCodec = format.video.codec.toLowerCase();
      if (!sourceCodec.includes(config.codec) && !sourceCodec.includes('h264') && !sourceCodec.includes('avc')) {
        warnings.push(`Codec ${format.video.codec} puede no ser compatible con ${presetKey}`);
        recommendations.push({
          type: 'codec_transcode',
          message: `Se recomienda transcodificar a H.264 para ${presetKey}`,
          suggestedCodec: 'libx264'
        });
      }
    }

    // Verificar resolución
    if (format.video) {
      if (format.video.width > config.maxWidth || format.video.height > config.maxHeight) {
        warnings.push(`Resolución ${format.video.width}x${format.video.height} excede el máximo para ${presetKey}`);
        suggestedParameters = {
          width: Math.min(format.video.width, config.maxWidth),
          height: Math.min(format.video.height, config.maxHeight),
          needsReencode: true
        };
      }
    }

    // Verificar bitrate
    if (format.bitrate > config.maxBitrate) {
      warnings.push(`Bitrate ${this.formatBitrate(format.bitrate)} excede el recomendado para ${presetKey}`);
      if (!suggestedParameters) suggestedParameters = {};
      suggestedParameters.bitrate = config.maxBitrate;
      suggestedParameters.needsReencode = true;
    }

    return {
      compatible: warnings.length === 0,
      warnings,
      recommendations,
      suggestedParameters
    };
  }

  /**
   * Generar parámetros sugeridos automáticamente basados en el análisis
   * @param {Object} format - Información del formato
   * @param {string} presetKey - Preset de destino
   * @param {Object} userPreferences - Preferencias del usuario
   * @returns {Object} Parámetros sugeridos
   */
  generateSuggestedParameters(format, presetKey, userPreferences = {}) {
    const params = {
      needsTranscode: false,
      videoParams: {},
      audioParams: {},
      reasons: []
    };

    if (!format.video) return params;

    const resCategory = this.formatDetector.getResolutionCategory(
      format.video.width,
      format.video.height
    );

    // Determinar codec de salida
    const sourceCodec = format.video.codec.toLowerCase();
    if (sourceCodec.includes('prores') || 
        sourceCodec.includes('hevc') || 
        sourceCodec.includes('vp9') ||
        sourceCodec.includes('av1')) {
      params.needsTranscode = true;
      params.videoParams.codec = 'libx264';
      params.reasons.push(`Transcodificación de ${format.video.codec} a H.264 para compatibilidad`);
    }

    // Optimizar bitrate
    const recommendedBitrate = RECOMMENDED_BITRATES[resCategory];
    if (recommendedBitrate && (format.video.bitrate < recommendedBitrate.min || 
                               format.video.bitrate > recommendedBitrate.max)) {
      params.needsTranscode = true;
      params.videoParams.bitrate = recommendedBitrate.recommended;
      params.reasons.push(`Ajuste de bitrate a ${this.formatBitrate(recommendedBitrate.recommended)}`);
    }

    // Optimizar FPS si es no estándar
    if (format.video.fps && !VALID_FPS.some(fps => Math.abs(fps - format.video.fps) < 0.1)) {
      const closestFPS = VALID_FPS.reduce((prev, curr) => 
        Math.abs(curr - format.video.fps) < Math.abs(prev - format.video.fps) ? curr : prev
      );
      params.needsTranscode = true;
      params.videoParams.fps = closestFPS;
      params.reasons.push(`Conversión de FPS de ${format.video.fps} a ${closestFPS}`);
    }

    // Preferencias del usuario
    if (userPreferences.preferQuality) {
      params.videoParams.crf = 18;
      params.videoParams.preset = 'slow';
    } else if (userPreferences.preferSpeed) {
      params.videoParams.crf = 23;
      params.videoParams.preset = 'fast';
    }

    return params;
  }

  /**
   * Formatear bitrate a formato legible
   * @param {number} bitrate - Bitrate en bps
   * @returns {string}
   */
  formatBitrate(bitrate) {
    if (bitrate >= 1000000) {
      return `${(bitrate / 1000000).toFixed(1)}Mbps`;
    } else if (bitrate >= 1000) {
      return `${(bitrate / 1000).toFixed(0)}Kbps`;
    }
    return `${bitrate}bps`;
  }

  /**
   * Obtener reporte completo de validación para UI
   * @param {string} filePath - Ruta del archivo
   * @param {string} presetKey - Preset de destino
   * @returns {Promise<Object>} Reporte estructurado para UI
   */
  async getValidationReport(filePath, presetKey = null) {
    const validation = await this.validateDeep(filePath, presetKey);
    
    return {
      status: validation.valid ? 'ok' : 'error',
      isCorrupt: validation.isCorrupt,
      summary: {
        errors: validation.errors.length,
        warnings: validation.warnings.length,
        recommendations: validation.recommendations.length
      },
      details: {
        errors: validation.errors,
        warnings: validation.warnings,
        recommendations: validation.recommendations.map(r => ({
          type: r.type,
          message: r.message
        }))
      },
      format: validation.format,
      analysis: validation.analysisDetails,
      suggestedParameters: validation.suggestedParameters,
      readyForProcessing: validation.valid && !validation.isCorrupt
    };
  }
}

module.exports = FileValidator;
