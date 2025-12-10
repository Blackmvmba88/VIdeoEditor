/**
 * CodecManager - Detección y Soporte de Codecs de Video
 * Soporta todos los formatos profesionales y consumer
 */

const { spawn } = require('child_process');
const path = require('path');

class CodecManager {
  constructor(ffmpegWrapper) {
    this.ffmpeg = ffmpegWrapper;
    
    // Codecs de video soportados
    this.videoCodecs = {
      // Consumer/Web
      'h264': { name: 'H.264/AVC', encoder: 'libx264', quality: 'high' },
      'avc': { name: 'H.264/AVC', encoder: 'libx264', quality: 'high' },
      'h265': { name: 'H.265/HEVC', encoder: 'libx265', quality: 'excellent' },
      'hevc': { name: 'H.265/HEVC', encoder: 'libx265', quality: 'excellent' },
      'vp8': { name: 'VP8', encoder: 'libvpx', quality: 'good' },
      'vp9': { name: 'VP9', encoder: 'libvpx-vp9', quality: 'excellent' },
      'av1': { name: 'AV1', encoder: 'libaom-av1', quality: 'excellent' },
      
      // Profesionales
      'prores': { name: 'Apple ProRes', encoder: 'prores_ks', quality: 'professional' },
      'prores_ks': { name: 'Apple ProRes', encoder: 'prores_ks', quality: 'professional' },
      'prores_aw': { name: 'Apple ProRes', encoder: 'prores_aw', quality: 'professional' },
      'dnxhd': { name: 'Avid DNxHD', encoder: 'dnxhd', quality: 'professional' },
      'dnxhr': { name: 'Avid DNxHR', encoder: 'dnxhd', quality: 'professional' },
      'cineform': { name: 'GoPro CineForm', encoder: 'cfhd', quality: 'professional' },
      
      // RAW de cámaras
      'rawvideo': { name: 'RAW Video', encoder: 'rawvideo', quality: 'lossless' },
      'r210': { name: 'RED R3D', encoder: null, quality: 'professional' },
      'braw': { name: 'Blackmagic RAW', encoder: null, quality: 'professional' },
      
      // Legacy
      'mpeg4': { name: 'MPEG-4', encoder: 'mpeg4', quality: 'medium' },
      'mpeg2video': { name: 'MPEG-2', encoder: 'mpeg2video', quality: 'medium' },
      'mjpeg': { name: 'Motion JPEG', encoder: 'mjpeg', quality: 'medium' },
      'wmv3': { name: 'Windows Media', encoder: 'wmv2', quality: 'medium' },
      'theora': { name: 'Theora', encoder: 'libtheora', quality: 'medium' },
      'huffyuv': { name: 'HuffYUV', encoder: 'huffyuv', quality: 'lossless' },
      'ffv1': { name: 'FFV1', encoder: 'ffv1', quality: 'lossless' }
    };
    
    // Codecs de audio soportados
    this.audioCodecs = {
      'aac': { name: 'AAC', encoder: 'aac', quality: 'high' },
      'mp3': { name: 'MP3', encoder: 'libmp3lame', quality: 'good' },
      'opus': { name: 'Opus', encoder: 'libopus', quality: 'excellent' },
      'vorbis': { name: 'Vorbis', encoder: 'libvorbis', quality: 'good' },
      'flac': { name: 'FLAC', encoder: 'flac', quality: 'lossless' },
      'alac': { name: 'Apple Lossless', encoder: 'alac', quality: 'lossless' },
      'pcm_s16le': { name: 'PCM 16-bit', encoder: 'pcm_s16le', quality: 'lossless' },
      'pcm_s24le': { name: 'PCM 24-bit', encoder: 'pcm_s24le', quality: 'lossless' },
      'pcm_s32le': { name: 'PCM 32-bit', encoder: 'pcm_s32le', quality: 'lossless' },
      'ac3': { name: 'Dolby AC-3', encoder: 'ac3', quality: 'high' },
      'eac3': { name: 'Dolby E-AC-3', encoder: 'eac3', quality: 'high' },
      'dts': { name: 'DTS', encoder: 'dca', quality: 'high' }
    };
    
    // Contenedores soportados
    this.containers = {
      '.mp4': { name: 'MPEG-4', muxer: 'mp4', videoCodecs: ['h264', 'h265', 'av1'], audioCodecs: ['aac', 'mp3', 'ac3'] },
      '.mov': { name: 'QuickTime', muxer: 'mov', videoCodecs: ['h264', 'h265', 'prores', 'dnxhd'], audioCodecs: ['aac', 'pcm_s16le', 'alac'] },
      '.mkv': { name: 'Matroska', muxer: 'matroska', videoCodecs: ['*'], audioCodecs: ['*'] },
      '.avi': { name: 'AVI', muxer: 'avi', videoCodecs: ['h264', 'mpeg4', 'mjpeg'], audioCodecs: ['mp3', 'pcm_s16le'] },
      '.webm': { name: 'WebM', muxer: 'webm', videoCodecs: ['vp8', 'vp9', 'av1'], audioCodecs: ['opus', 'vorbis'] },
      '.mxf': { name: 'MXF', muxer: 'mxf', videoCodecs: ['dnxhd', 'prores', 'h264'], audioCodecs: ['pcm_s16le', 'pcm_s24le'] },
      '.ts': { name: 'MPEG-TS', muxer: 'mpegts', videoCodecs: ['h264', 'h265', 'mpeg2video'], audioCodecs: ['aac', 'ac3', 'mp3'] },
      '.m4v': { name: 'MPEG-4 Video', muxer: 'mp4', videoCodecs: ['h264', 'h265'], audioCodecs: ['aac'] },
      '.wmv': { name: 'Windows Media', muxer: 'asf', videoCodecs: ['wmv3'], audioCodecs: ['wmav2'] },
      '.flv': { name: 'Flash Video', muxer: 'flv', videoCodecs: ['h264', 'flv1'], audioCodecs: ['aac', 'mp3'] }
    };
  }

  /**
   * Obtener información detallada de un archivo de video
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<Object>} Información del codec
   */
  async getMediaInfo(filePath) {
    return new Promise((resolve, reject) => {
      const ffprobePath = this.ffmpeg.ffprobePath || 'ffprobe';
      
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];
      
      const process = spawn(ffprobePath, args);
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFprobe error: ${errorOutput}`));
          return;
        }
        
        try {
          const info = JSON.parse(output);
          const result = this.parseMediaInfo(info, filePath);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Parsear información de FFprobe
   * @param {Object} info - Salida de FFprobe
   * @param {string} filePath - Ruta del archivo
   * @returns {Object} Información parseada
   */
  parseMediaInfo(info, filePath) {
    const videoStream = info.streams?.find(s => s.codec_type === 'video');
    const audioStream = info.streams?.find(s => s.codec_type === 'audio');
    const format = info.format || {};
    
    const ext = path.extname(filePath).toLowerCase();
    const container = this.containers[ext] || { name: ext.toUpperCase().slice(1) };
    
    // Detectar codec de video
    let videoCodecInfo = null;
    if (videoStream) {
      const codecName = videoStream.codec_name?.toLowerCase();
      videoCodecInfo = this.videoCodecs[codecName] || { 
        name: videoStream.codec_long_name || codecName?.toUpperCase(),
        encoder: codecName,
        quality: 'unknown'
      };
    }
    
    // Detectar codec de audio
    let audioCodecInfo = null;
    if (audioStream) {
      const codecName = audioStream.codec_name?.toLowerCase();
      audioCodecInfo = this.audioCodecs[codecName] || {
        name: audioStream.codec_long_name || codecName?.toUpperCase(),
        encoder: codecName,
        quality: 'unknown'
      };
    }
    
    // Calcular bitrate
    const bitrate = format.bit_rate ? parseInt(format.bit_rate) : null;
    const videoBitrate = videoStream?.bit_rate ? parseInt(videoStream.bit_rate) : null;
    const audioBitrate = audioStream?.bit_rate ? parseInt(audioStream.bit_rate) : null;
    
    return {
      // Info general
      path: filePath,
      filename: path.basename(filePath),
      container: container.name,
      duration: parseFloat(format.duration) || 0,
      durationFormatted: this.formatDuration(parseFloat(format.duration) || 0),
      size: parseInt(format.size) || 0,
      sizeFormatted: this.formatFileSize(parseInt(format.size) || 0),
      bitrate: bitrate,
      bitrateFormatted: bitrate ? this.formatBitrate(bitrate) : 'N/A',
      
      // Video
      video: videoStream ? {
        codec: videoCodecInfo?.name || 'Unknown',
        codecRaw: videoStream.codec_name,
        profile: videoStream.profile,
        width: videoStream.width,
        height: videoStream.height,
        resolution: `${videoStream.width}x${videoStream.height}`,
        aspectRatio: this.calculateAspectRatio(videoStream.width, videoStream.height),
        frameRate: this.parseFrameRate(videoStream.r_frame_rate),
        frameRateRaw: videoStream.r_frame_rate,
        bitrate: videoBitrate,
        bitrateFormatted: videoBitrate ? this.formatBitrate(videoBitrate) : 'N/A',
        pixelFormat: videoStream.pix_fmt,
        colorSpace: videoStream.color_space || 'unknown',
        colorRange: videoStream.color_range || 'unknown',
        hdr: this.isHDR(videoStream),
        quality: videoCodecInfo?.quality || 'unknown'
      } : null,
      
      // Audio
      audio: audioStream ? {
        codec: audioCodecInfo?.name || 'Unknown',
        codecRaw: audioStream.codec_name,
        channels: audioStream.channels,
        channelLayout: audioStream.channel_layout,
        sampleRate: parseInt(audioStream.sample_rate),
        sampleRateFormatted: `${(parseInt(audioStream.sample_rate) / 1000).toFixed(1)} kHz`,
        bitrate: audioBitrate,
        bitrateFormatted: audioBitrate ? this.formatBitrate(audioBitrate) : 'N/A',
        bitDepth: audioStream.bits_per_sample || audioStream.bits_per_raw_sample,
        quality: audioCodecInfo?.quality || 'unknown'
      } : null,
      
      // Streams adicionales
      subtitles: info.streams?.filter(s => s.codec_type === 'subtitle').length || 0,
      
      // Metadatos
      metadata: format.tags || {},
      
      // Compatibilidad
      compatibility: this.checkCompatibility(videoStream, audioStream, ext)
    };
  }

  /**
   * Verificar si el video es HDR
   * @param {Object} videoStream - Stream de video
   * @returns {boolean}
   */
  isHDR(videoStream) {
    if (!videoStream) return false;
    
    const hdrIndicators = [
      videoStream.color_transfer === 'smpte2084', // HDR10
      videoStream.color_transfer === 'arib-std-b67', // HLG
      videoStream.color_primaries === 'bt2020',
      videoStream.pix_fmt?.includes('10le') || videoStream.pix_fmt?.includes('10be'),
      videoStream.side_data_list?.some(sd => sd.side_data_type === 'Mastering display metadata')
    ];
    
    return hdrIndicators.some(Boolean);
  }

  /**
   * Verificar compatibilidad para edición
   * @param {Object} videoStream - Stream de video
   * @param {Object} audioStream - Stream de audio  
   * @param {string} _ext - Extensión del archivo (reservado para uso futuro)
   * @returns {Object} Información de compatibilidad
   */
  checkCompatibility(videoStream, audioStream, _ext) {
    const issues = [];
    let canEdit = true;
    let needsTranscode = false;
    
    // Verificar codecs problemáticos
    if (videoStream) {
      const codec = videoStream.codec_name?.toLowerCase();
      
      // RAW necesita transcodificación
      if (['r210', 'braw', 'rawvideo'].includes(codec)) {
        issues.push('RAW video - se transcodificará a ProRes para edición');
        needsTranscode = true;
      }
      
      // Verificar resolución muy alta
      if (videoStream.width > 7680 || videoStream.height > 4320) {
        issues.push('Resolución muy alta - se recomienda usar proxy');
      }
      
      // VFR (Variable Frame Rate)
      if (videoStream.r_frame_rate !== videoStream.avg_frame_rate) {
        issues.push('Frame rate variable detectado - puede causar problemas de sync');
      }
    }
    
    // Verificar audio
    if (audioStream) {
      const channels = audioStream.channels;
      if (channels > 8) {
        issues.push(`Audio ${channels} canales - se mezclará a estéreo para preview`);
      }
    }
    
    return {
      canEdit,
      needsTranscode,
      issues,
      recommended: issues.length === 0 ? 'Listo para editar' : 'Editable con consideraciones'
    };
  }

  /**
   * Parsear frame rate
   * @param {string} frameRateStr - Frame rate como string (ej: "30000/1001")
   * @returns {number}
   */
  parseFrameRate(frameRateStr) {
    if (!frameRateStr) return 0;
    
    if (frameRateStr.includes('/')) {
      const [num, den] = frameRateStr.split('/').map(Number);
      return den !== 0 ? Math.round((num / den) * 100) / 100 : 0;
    }
    
    return parseFloat(frameRateStr) || 0;
  }

  /**
   * Calcular aspect ratio
   * @param {number} width 
   * @param {number} height 
   * @returns {string}
   */
  calculateAspectRatio(width, height) {
    if (!width || !height) return 'N/A';
    
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    const w = width / divisor;
    const h = height / divisor;
    
    // Simplificar a ratios comunes
    const ratio = width / height;
    if (Math.abs(ratio - 16/9) < 0.01) return '16:9';
    if (Math.abs(ratio - 4/3) < 0.01) return '4:3';
    if (Math.abs(ratio - 21/9) < 0.01) return '21:9';
    if (Math.abs(ratio - 1) < 0.01) return '1:1';
    if (Math.abs(ratio - 9/16) < 0.01) return '9:16';
    
    return `${w}:${h}`;
  }

  /**
   * Formatear duración
   * @param {number} seconds 
   * @returns {string}
   */
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00:00';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Formatear tamaño de archivo
   * @param {number} bytes 
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Formatear bitrate
   * @param {number} bps - Bits por segundo
   * @returns {string}
   */
  formatBitrate(bps) {
    if (!bps || bps === 0) return 'N/A';
    
    if (bps >= 1000000) {
      return `${(bps / 1000000).toFixed(1)} Mbps`;
    } else if (bps >= 1000) {
      return `${(bps / 1000).toFixed(0)} Kbps`;
    }
    
    return `${bps} bps`;
  }

  /**
   * Obtener encoder recomendado para un codec
   * @param {string} codecName 
   * @returns {string|null}
   */
  getEncoderForCodec(codecName) {
    const codec = this.videoCodecs[codecName?.toLowerCase()];
    return codec?.encoder || null;
  }

  /**
   * Listar codecs disponibles en el sistema
   * @returns {Promise<Object>}
   */
  async getAvailableCodecs() {
    return new Promise((resolve) => {
      const ffmpegPath = this.ffmpeg.ffmpegPath || 'ffmpeg';
      
      const process = spawn(ffmpegPath, ['-codecs']);
      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', () => {
        const encoders = [];
        const decoders = [];
        
        const lines = output.split('\n');
        for (const line of lines) {
          const match = line.match(/^\s*([D.])([E.])([VAS])([I.])([L.])([S.])\s+(\S+)\s+(.*)$/);
          if (match) {
            const [, canDecode, canEncode, type, , , , name, description] = match;
            
            if (canDecode === 'D') {
              decoders.push({ name, type, description: description.trim() });
            }
            if (canEncode === 'E') {
              encoders.push({ name, type, description: description.trim() });
            }
          }
        }
        
        resolve({ encoders, decoders });
      });
    });
  }
}

module.exports = CodecManager;
