/**
 * Módulo Detector de Formatos
 * Detecta y valida formatos de video/audio
 */

const path = require('node:path');
const fs = require('node:fs');
const FFmpegWrapper = require('./ffmpegWrapper');

class FormatDetector {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();

    this.supportedVideoExtensions = [
      '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv',
      '.webm', '.m4v', '.mpeg', '.mpg', '.3gp', '.ts',
      '.mts', '.m2ts', '.vob', '.ogv'
    ];

    this.supportedAudioExtensions = [
      '.mp3', '.aac', '.wav', '.flac', '.ogg', '.m4a',
      '.wma', '.opus', '.aiff', '.ape'
    ];

    this.supportedVideoCodecs = [
      'h264', 'hevc', 'h265', 'vp8', 'vp9', 'av1',
      'mpeg4', 'mpeg2video', 'mpeg1video', 'theora',
      'wmv2', 'wmv3', 'prores', 'dnxhd'
    ];

    this.supportedAudioCodecs = [
      'aac', 'mp3', 'vorbis', 'opus', 'flac', 'pcm_s16le',
      'pcm_s24le', 'pcm_s32le', 'ac3', 'eac3', 'dts',
      'alac', 'wmav2'
    ];
  }

  /**
   * Detectar formato desde archivo
   * @param {string} filePath - Ruta al archivo multimedia
   * @returns {Promise<Object>} Información de formato detectada
   */
  async detectFormat(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const info = await this.ffmpeg.getVideoInfo(filePath);

    return {
      extension: ext,
      container: info.format,
      duration: info.duration,
      size: info.size,
      bitrate: info.bitrate,
      hasVideo: info.video !== null,
      hasAudio: info.audio !== null,
      video: info.video ? {
        codec: info.video.codec,
        width: info.video.width,
        height: info.video.height,
        resolution: `${info.video.width}x${info.video.height}`,
        fps: info.video.fps,
        bitrate: info.video.bitrate,
        // HDR metadata
        colorPrimaries: info.video.colorPrimaries,
        colorTransfer: info.video.colorTransfer,
        colorSpace: info.video.colorSpace,
        profile: info.video.profile,
        pixelFormat: info.video.pixelFormat,
        isHdr: this.detectHdr(info.video)
      } : null,
      audio: info.audio ? {
        codec: info.audio.codec,
        sampleRate: info.audio.sampleRate,
        channels: info.audio.channels,
        bitrate: info.audio.bitrate
      } : null,
      isSupported: this.isSupported(ext, info)
    };
  }

  /**
   * Detectar si el video es HDR basado en metadatos de color
   * @param {Object} video - Información del stream de video
   * @returns {boolean}
   */
  detectHdr(video) {
    if (!video) return false;
    
    // HDR transfer functions
    const hdrTransfers = ['smpte2084', 'arib-std-b67', 'smpte428', 'bt2020-10', 'bt2020-12'];
    // HDR color primaries
    const hdrPrimaries = ['bt2020'];
    // HDR pixel formats (10-bit or higher)
    const hdrPixelFormats = ['yuv420p10le', 'yuv420p10be', 'yuv422p10le', 'yuv444p10le', 'p010le', 'p010be'];
    
    const transfer = video.colorTransfer?.toLowerCase() || '';
    const primaries = video.colorPrimaries?.toLowerCase() || '';
    const pixFmt = video.pixelFormat?.toLowerCase() || '';
    
    // HDR10, HDR10+, HLG detection
    if (hdrTransfers.some(t => transfer.includes(t))) return true;
    if (hdrPrimaries.some(p => primaries.includes(p))) return true;
    if (hdrPixelFormats.some(f => pixFmt === f)) return true;
    
    // Dolby Vision detection (profile in codec name)
    if (video.profile?.toLowerCase().includes('dolby')) return true;
    
    return false;
  }

  /**
   * Verificar si el formato es compatible
   * @param {string} ext - Extensión del archivo
   * @param {Object} info - Información de formato desde FFprobe
   * @returns {boolean}
   */
  isSupported(ext, info) {
    const extLower = ext.toLowerCase();

    if (!this.supportedVideoExtensions.includes(extLower) &&
      !this.supportedAudioExtensions.includes(extLower)) {
      return false;
    }

    if (info.video && info.video.codec) {
      const codecLower = info.video.codec.toLowerCase();
      if (!this.supportedVideoCodecs.some(c => codecLower.includes(c))) {
        return false;
      }
    }

    if (info.audio && info.audio.codec) {
      const codecLower = info.audio.codec.toLowerCase();
      if (!this.supportedAudioCodecs.some(c => codecLower.includes(c))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Verificar si la extensión del archivo es compatible
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean}
   */
  isSupportedExtension(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedVideoExtensions.includes(ext) ||
      this.supportedAudioExtensions.includes(ext);
  }

  /**
   * Verificar si el archivo es un video
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean}
   */
  isVideoExtension(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedVideoExtensions.includes(ext);
  }

  /**
   * Verificar si el archivo es solo audio
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean}
   */
  isAudioExtension(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedAudioExtensions.includes(ext);
  }

  /**
   * Obtener categoría de resolución de video
   * @param {number} width - Ancho del video
   * @param {number} height - Alto del video
   * @returns {string} Categoría de resolución
   */
  getResolutionCategory(width, height) {
    const pixels = width * height;

    if (pixels >= 7680 * 4320) return '8K';
    if (pixels >= 3840 * 2160) return '4K';
    if (pixels >= 2560 * 1440) return '2K/1440p';
    if (pixels >= 1920 * 1080) return '1080p';
    if (pixels >= 1280 * 720) return '720p';
    if (pixels >= 854 * 480) return '480p';
    if (pixels >= 640 * 360) return '360p';
    return 'Low Resolution';
  }

  /**
   * Obtener reporte de compatibilidad de formato
   * @param {string[]} filePaths - Array de rutas de archivos
   * @returns {Promise<Object>} Reporte de compatibilidad
   */
  async checkCompatibility(filePaths) {
    const formats = [];
    const issues = [];

    for (const filePath of filePaths) {
      try {
        const format = await this.detectFormat(filePath);
        formats.push({ path: filePath, format });

        if (!format.isSupported) {
          issues.push({
            path: filePath,
            issue: 'Unsupported format',
            severity: 'error'
          });
        }
      } catch (error) {
        issues.push({
          path: filePath,
          issue: error.message,
          severity: 'error'
        });
      }
    }

    const videoFormats = formats.filter(f => f.format.hasVideo);

    if (videoFormats.length > 1) {
      const resolutions = new Set(videoFormats.map(f =>
        f.format.video ? `${f.format.video.width}x${f.format.video.height}` : 'unknown'
      ));

      if (resolutions.size > 1) {
        issues.push({
          path: null,
          issue: 'Videos have different resolutions. Re-encoding may be required.',
          severity: 'warning'
        });
      }

      const codecs = new Set(videoFormats.map(f =>
        f.format.video ? f.format.video.codec : 'unknown'
      ));

      if (codecs.size > 1) {
        issues.push({
          path: null,
          issue: 'Videos have different codecs. Re-encoding may be required.',
          severity: 'warning'
        });
      }
    }

    return {
      formats,
      issues,
      isCompatible: issues.filter(i => i.severity === 'error').length === 0,
      requiresReencode: issues.filter(i => i.severity === 'warning').length > 0
    };
  }

  /**
   * Obtener lista de extensiones compatibles
   * @returns {Object}
   */
  getSupportedExtensions() {
    return {
      video: [...this.supportedVideoExtensions],
      audio: [...this.supportedAudioExtensions],
      all: [...this.supportedVideoExtensions, ...this.supportedAudioExtensions]
    };
  }
}

module.exports = FormatDetector;
