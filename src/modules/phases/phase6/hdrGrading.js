/**
 * HDR Grading - Herramientas de gradación HDR
 * 
 * Soporte para:
 * - HDR10 (PQ, BT.2020)
 * - HDR10+ (con metadatos dinámicos)
 * - Dolby Vision (perfiles básicos)
 * - HLG (Hybrid Log-Gamma)
 * 
 * Conversiones:
 * - SDR → HDR
 * - HDR → SDR (tone mapping)
 * - HDR10 → HLG
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { v4: uuidv4 } = require('uuid');
const FFmpegWrapper = require('../../ffmpegWrapper');

class HdrGrading {
  constructor(ffmpegWrapper = null) {
    this.ffmpeg = ffmpegWrapper || new FFmpegWrapper();
    this.tempDir = path.join(os.tmpdir(), 'video-editor-hdr');
    
    // Estándares HDR
    this.hdrFormats = {
      hdr10: {
        name: 'HDR10',
        description: 'Estándar HDR básico, compatible con la mayoría de displays',
        transfer: 'smpte2084', // PQ
        colorSpace: 'bt2020nc',
        primaries: 'bt2020',
        maxLuminance: 1000 // nits típicos
      },
      hdr10plus: {
        name: 'HDR10+',
        description: 'HDR10 con metadatos dinámicos',
        transfer: 'smpte2084',
        colorSpace: 'bt2020nc',
        primaries: 'bt2020',
        maxLuminance: 4000,
        dynamicMetadata: true
      },
      dolbyVision: {
        name: 'Dolby Vision',
        description: 'HDR premium con metadatos por escena',
        transfer: 'smpte2084',
        colorSpace: 'bt2020nc',
        primaries: 'bt2020',
        maxLuminance: 10000,
        dolbyProfile: true
      },
      hlg: {
        name: 'HLG',
        description: 'Hybrid Log-Gamma, compatible con SDR',
        transfer: 'arib-std-b67',
        colorSpace: 'bt2020nc',
        primaries: 'bt2020',
        maxLuminance: 1000,
        backwardsCompatible: true
      }
    };
    
    // Presets de tone mapping HDR→SDR
    this.toneMappingPresets = {
      hable: {
        name: 'Hable (Filmic)',
        description: 'Curva cinematográfica, preserva highlights',
        algorithm: 'hable'
      },
      reinhard: {
        name: 'Reinhard',
        description: 'Simple y efectivo, buen balance',
        algorithm: 'reinhard'
      },
      mobius: {
        name: 'Mobius',
        description: 'Transiciones suaves, natural',
        algorithm: 'mobius'
      },
      linear: {
        name: 'Linear',
        description: 'Mapeo lineal básico',
        algorithm: 'linear'
      }
    };
    
    // Presets de color grading HDR
    this.gradingPresets = {
      natural: {
        name: 'Natural',
        description: 'Colores realistas, highlights preservados',
        adjustments: {
          maxLuminance: 1000,
          saturation: 1.0,
          contrast: 1.0
        }
      },
      vivid: {
        name: 'Vívido',
        description: 'Colores saturados, impactante',
        adjustments: {
          maxLuminance: 1500,
          saturation: 1.2,
          contrast: 1.1
        }
      },
      cinema: {
        name: 'Cinema',
        description: 'Look cinematográfico HDR',
        adjustments: {
          maxLuminance: 800,
          saturation: 0.95,
          contrast: 1.15,
          liftGamma: { shadows: -0.02, highlights: 0.05 }
        }
      },
      broadcast: {
        name: 'Broadcast',
        description: 'Optimizado para TV',
        adjustments: {
          maxLuminance: 1000,
          saturation: 1.0,
          contrast: 1.0,
          legalize: true
        }
      }
    };
    
    this._ensureTempDir();
  }

  /**
   * Crear directorio temporal
   */
  _ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Obtener formatos HDR disponibles
   */
  getHdrFormats() {
    const result = {};
    for (const [key, value] of Object.entries(this.hdrFormats)) {
      result[key] = {
        name: value.name,
        description: value.description,
        maxLuminance: value.maxLuminance
      };
    }
    return result;
  }

  /**
   * Obtener presets de tone mapping
   */
  getToneMappingPresets() {
    return { ...this.toneMappingPresets };
  }

  /**
   * Obtener presets de grading
   */
  getGradingPresets() {
    return { ...this.gradingPresets };
  }

  /**
   * Detectar si un video es HDR
   * @param {string} inputPath - Ruta del video
   * @returns {Promise<Object>} Información HDR
   */
  async detectHdr(inputPath) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const info = await this.ffmpeg.getVideoInfo(inputPath);
    
    // Extraer información de color
    const colorTransfer = info.color_transfer || info.streams?.[0]?.color_transfer || '';
    const colorPrimaries = info.color_primaries || info.streams?.[0]?.color_primaries || '';
    const colorSpace = info.color_space || info.streams?.[0]?.color_space || '';
    
    // Determinar tipo de HDR
    let hdrType = null;
    let isHdr = false;
    
    if (colorTransfer === 'smpte2084' || colorTransfer === 'pq') {
      isHdr = true;
      hdrType = 'hdr10';
      // HDR10+ y Dolby Vision requieren análisis de metadatos adicional
    } else if (colorTransfer === 'arib-std-b67' || colorTransfer === 'hlg') {
      isHdr = true;
      hdrType = 'hlg';
    }
    
    // Verificar BT.2020
    const isBt2020 = colorPrimaries === 'bt2020' || colorSpace?.includes('2020');
    
    return {
      isHdr,
      hdrType,
      colorTransfer,
      colorPrimaries,
      colorSpace,
      isBt2020,
      bitDepth: info.bits_per_raw_sample || 8,
      format: isHdr ? this.hdrFormats[hdrType] : null
    };
  }

  /**
   * Convertir HDR a SDR (tone mapping)
   * @param {string} inputPath - Video HDR
   * @param {string} outputPath - Video SDR de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async hdrToSdr(inputPath, outputPath = null, options = {}) {
    const {
      algorithm = 'hable',
      targetPeak = 100, // nits SDR
      desat = 0, // desaturación de highlights
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    // Verificar que es HDR
    const hdrInfo = await this.detectHdr(inputPath);
    if (!hdrInfo.isHdr) {
      return {
        success: false,
        message: 'El video no es HDR, no requiere tone mapping'
      };
    }

    if (!outputPath) {
      const ext = path.extname(inputPath);
      outputPath = path.join(this.tempDir, `sdr-${uuidv4()}${ext}`);
    }

    // Construir filtro de tone mapping
    const filter = [
      'zscale=t=linear:npl=100',
      `tonemap=${algorithm}:desat=${desat}:peak=${targetPeak}`,
      'zscale=t=bt709:m=bt709:r=tv',
      'format=yuv420p'
    ].join(',');

    const args = [
      '-i', inputPath,
      '-vf', filter,
      '-c:v', 'libx264',
      '-crf', '18',
      '-preset', 'medium',
      '-c:a', 'copy',
      '-y', outputPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Tone Mapping', percent: 0, message: 'Convirtiendo HDR a SDR...' });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        onProgress({
          stage: 'Tone Mapping',
          percent: Math.min(progress.percent || 0, 99),
          message: `Procesando... ${progress.percent?.toFixed(0) || 0}%`
        });
      }
    });

    if (onProgress) {
      onProgress({ stage: 'Tone Mapping', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath,
      originalFormat: hdrInfo.hdrType,
      algorithm,
      processingTime: duration,
      message: `Convertido de ${hdrInfo.format?.name || 'HDR'} a SDR en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Convertir SDR a HDR
   * @param {string} inputPath - Video SDR
   * @param {string} outputPath - Video HDR de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async sdrToHdr(inputPath, outputPath = null, options = {}) {
    const {
      targetFormat = 'hlg', // HLG es más compatible
      maxLuminance = 1000,
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const hdrInfo = await this.detectHdr(inputPath);
    if (hdrInfo.isHdr) {
      return {
        success: false,
        message: 'El video ya es HDR'
      };
    }

    if (!outputPath) {
      outputPath = path.join(this.tempDir, `hdr-${uuidv4()}.mp4`);
    }

    const format = this.hdrFormats[targetFormat];
    if (!format) {
      throw new Error(`Formato HDR no soportado: ${targetFormat}`);
    }

    // Construir filtro de conversión a HDR
    let filter;
    if (targetFormat === 'hlg') {
      filter = [
        'zscale=t=linear:npl=100',
        'tonemap=linear', // Expandir rango
        `zscale=t=${format.transfer}:m=${format.colorSpace}:p=${format.primaries}:r=tv`,
        'format=yuv420p10le'
      ].join(',');
    } else {
      // HDR10/PQ
      filter = [
        'zscale=t=linear:npl=100',
        `zscale=t=${format.transfer}:m=${format.colorSpace}:p=${format.primaries}:r=tv`,
        'format=yuv420p10le'
      ].join(',');
    }

    const args = [
      '-i', inputPath,
      '-vf', filter,
      '-c:v', 'libx265',
      '-crf', '18',
      '-preset', 'medium',
      '-tag:v', 'hvc1',
      '-x265-params', `colorprim=${format.primaries}:transfer=${format.transfer}:colormatrix=${format.colorSpace}`,
      '-c:a', 'copy',
      '-y', outputPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Conversión HDR', percent: 0, message: `Convirtiendo a ${format.name}...` });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Conversión HDR', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath,
      targetFormat: format.name,
      maxLuminance,
      processingTime: duration,
      message: `Convertido a ${format.name} en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Aplicar grading HDR
   * @param {string} inputPath - Video HDR
   * @param {string} outputPath - Video de salida
   * @param {Object} options - Opciones de grading
   * @returns {Promise<Object>} Resultado
   */
  async applyHdrGrading(inputPath, outputPath = null, options = {}) {
    const {
      preset = 'natural',
      customAdjustments = null,
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const hdrInfo = await this.detectHdr(inputPath);
    if (!hdrInfo.isHdr) {
      return {
        success: false,
        message: 'El video no es HDR, use colorCorrection para SDR'
      };
    }

    const adjustments = customAdjustments || this.gradingPresets[preset]?.adjustments;
    if (!adjustments) {
      throw new Error(`Preset no encontrado: ${preset}`);
    }

    if (!outputPath) {
      const ext = path.extname(inputPath);
      outputPath = path.join(this.tempDir, `graded-${uuidv4()}${ext}`);
    }

    // Construir filtros de grading HDR
    const filters = [];
    
    // Ajuste de saturación
    if (adjustments.saturation && adjustments.saturation !== 1.0) {
      filters.push(`eq=saturation=${adjustments.saturation}`);
    }
    
    // Ajuste de contraste
    if (adjustments.contrast && adjustments.contrast !== 1.0) {
      filters.push(`eq=contrast=${adjustments.contrast}`);
    }
    
    // Si no hay filtros, solo copiar
    if (filters.length === 0) {
      filters.push('copy');
    }

    const args = [
      '-i', inputPath,
      '-vf', filters.join(','),
      '-c:v', 'libx265',
      '-crf', '18',
      '-preset', 'medium',
      '-tag:v', 'hvc1',
      '-c:a', 'copy',
      '-y', outputPath
    ];

    if (onProgress) {
      onProgress({ stage: 'HDR Grading', percent: 0, message: 'Aplicando grading...' });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'HDR Grading', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath,
      preset: customAdjustments ? 'custom' : preset,
      adjustments,
      processingTime: duration,
      message: `Grading HDR aplicado en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Convertir entre formatos HDR
   * @param {string} inputPath - Video HDR
   * @param {string} targetFormat - Formato destino (hdr10, hlg, etc)
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async convertHdrFormat(inputPath, targetFormat, options = {}) {
    const { outputPath = null, onProgress = null } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const hdrInfo = await this.detectHdr(inputPath);
    if (!hdrInfo.isHdr) {
      throw new Error('El video no es HDR');
    }

    const format = this.hdrFormats[targetFormat];
    if (!format) {
      throw new Error(`Formato HDR no soportado: ${targetFormat}`);
    }

    const finalPath = outputPath || path.join(
      this.tempDir, 
      `${targetFormat}-${uuidv4()}.mp4`
    );

    // Construir filtro de conversión
    const filter = [
      'zscale=t=linear:npl=100',
      `zscale=t=${format.transfer}:m=${format.colorSpace}:p=${format.primaries}:r=tv`,
      'format=yuv420p10le'
    ].join(',');

    const args = [
      '-i', inputPath,
      '-vf', filter,
      '-c:v', 'libx265',
      '-crf', '18',
      '-preset', 'medium',
      '-tag:v', 'hvc1',
      '-c:a', 'copy',
      '-y', finalPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Conversión HDR', percent: 0, message: `Convirtiendo a ${format.name}...` });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Conversión HDR', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath: finalPath,
      sourceFormat: hdrInfo.format?.name || 'HDR',
      targetFormat: format.name,
      processingTime: duration,
      message: `Convertido de ${hdrInfo.format?.name || 'HDR'} a ${format.name}`
    };
  }

  /**
   * Limpiar archivos temporales
   */
  cleanup() {
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(this.tempDir, file));
        } catch {
          // Ignorar errores
        }
      }
    }
  }
}

module.exports = HdrGrading;
