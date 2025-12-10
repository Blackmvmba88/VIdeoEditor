/**
 * Tests para CodecManager
 * Detección y soporte de codecs de video/audio
 */

const CodecManager = require('../codecManager');

describe('CodecManager', () => {
  let codecManager;
  let mockFFmpeg;

  beforeEach(() => {
    mockFFmpeg = {
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe'
    };
    
    codecManager = new CodecManager(mockFFmpeg);
  });

  describe('Constructor', () => {
    it('debe inicializar con codecs de video definidos', () => {
      expect(codecManager.videoCodecs).toBeDefined();
      expect(codecManager.videoCodecs.h264).toBeDefined();
      expect(codecManager.videoCodecs.h265).toBeDefined();
      expect(codecManager.videoCodecs.prores).toBeDefined();
    });

    it('debe inicializar con codecs de audio definidos', () => {
      expect(codecManager.audioCodecs).toBeDefined();
      expect(codecManager.audioCodecs.aac).toBeDefined();
      expect(codecManager.audioCodecs.mp3).toBeDefined();
      expect(codecManager.audioCodecs.opus).toBeDefined();
    });

    it('debe inicializar con contenedores definidos', () => {
      expect(codecManager.containers).toBeDefined();
      expect(codecManager.containers['.mp4']).toBeDefined();
      expect(codecManager.containers['.mov']).toBeDefined();
      expect(codecManager.containers['.mkv']).toBeDefined();
    });
  });

  describe('Video Codecs', () => {
    it('debe tener codecs consumer/web', () => {
      const codecs = codecManager.videoCodecs;
      
      expect(codecs.h264.name).toBe('H.264/AVC');
      expect(codecs.h264.encoder).toBe('libx264');
      
      expect(codecs.h265.name).toBe('H.265/HEVC');
      expect(codecs.vp9.encoder).toBe('libvpx-vp9');
      expect(codecs.av1.encoder).toBe('libaom-av1');
    });

    it('debe tener codecs profesionales', () => {
      const codecs = codecManager.videoCodecs;
      
      expect(codecs.prores.quality).toBe('professional');
      expect(codecs.dnxhd.name).toBe('Avid DNxHD');
      expect(codecs.cineform.name).toBe('GoPro CineForm');
    });

    it('debe tener codecs lossless', () => {
      const codecs = codecManager.videoCodecs;
      
      expect(codecs.huffyuv.quality).toBe('lossless');
      expect(codecs.ffv1.quality).toBe('lossless');
    });
  });

  describe('Audio Codecs', () => {
    it('debe tener codecs consumer', () => {
      const codecs = codecManager.audioCodecs;
      
      expect(codecs.aac.encoder).toBe('aac');
      expect(codecs.mp3.encoder).toBe('libmp3lame');
      expect(codecs.opus.quality).toBe('excellent');
    });

    it('debe tener codecs lossless', () => {
      const codecs = codecManager.audioCodecs;
      
      expect(codecs.flac.quality).toBe('lossless');
      expect(codecs.alac.name).toBe('Apple Lossless');
      expect(codecs.pcm_s24le.quality).toBe('lossless');
    });

    it('debe tener codecs surround', () => {
      const codecs = codecManager.audioCodecs;
      
      expect(codecs.ac3.name).toBe('Dolby AC-3');
      expect(codecs.dts.name).toBe('DTS');
    });
  });

  describe('Containers', () => {
    it('debe tener info de contenedor MP4', () => {
      const mp4 = codecManager.containers['.mp4'];
      
      expect(mp4.name).toBe('MPEG-4');
      expect(mp4.muxer).toBe('mp4');
      expect(mp4.videoCodecs).toContain('h264');
      expect(mp4.audioCodecs).toContain('aac');
    });

    it('debe tener info de contenedor MOV', () => {
      const mov = codecManager.containers['.mov'];
      
      expect(mov.name).toBe('QuickTime');
      expect(mov.videoCodecs).toContain('prores');
    });

    it('debe tener MKV con soporte universal', () => {
      const mkv = codecManager.containers['.mkv'];
      
      expect(mkv.videoCodecs).toContain('*');
      expect(mkv.audioCodecs).toContain('*');
    });

    it('debe tener contenedores profesionales', () => {
      expect(codecManager.containers['.mxf']).toBeDefined();
      expect(codecManager.containers['.mxf'].videoCodecs).toContain('dnxhd');
    });
  });

  describe('getEncoderForCodec', () => {
    it('debe retornar encoder para codec conocido', () => {
      expect(codecManager.getEncoderForCodec('h264')).toBe('libx264');
      expect(codecManager.getEncoderForCodec('h265')).toBe('libx265');
      expect(codecManager.getEncoderForCodec('prores')).toBe('prores_ks');
    });

    it('debe retornar null para codec desconocido', () => {
      expect(codecManager.getEncoderForCodec('unknown')).toBeNull();
    });

    it('debe ser case-insensitive', () => {
      expect(codecManager.getEncoderForCodec('H264')).toBe('libx264');
      expect(codecManager.getEncoderForCodec('PRORES')).toBe('prores_ks');
    });
  });

  describe('formatDuration', () => {
    it('debe formatear duración en HH:MM:SS', () => {
      expect(codecManager.formatDuration(0)).toBe('00:00:00');
      expect(codecManager.formatDuration(61)).toBe('00:01:01');
      expect(codecManager.formatDuration(3661)).toBe('01:01:01');
      expect(codecManager.formatDuration(7322)).toBe('02:02:02');
    });

    it('debe manejar valores inválidos', () => {
      expect(codecManager.formatDuration(null)).toBe('00:00:00');
      expect(codecManager.formatDuration(NaN)).toBe('00:00:00');
    });
  });

  describe('formatFileSize', () => {
    it('debe formatear tamaños pequeños', () => {
      expect(codecManager.formatFileSize(0)).toBe('0 B');
      expect(codecManager.formatFileSize(512)).toBe('512 B');
    });

    it('debe formatear KB', () => {
      expect(codecManager.formatFileSize(1024)).toBe('1 KB');
      expect(codecManager.formatFileSize(2048)).toBe('2 KB');
    });

    it('debe formatear MB', () => {
      expect(codecManager.formatFileSize(1048576)).toBe('1 MB');
      expect(codecManager.formatFileSize(104857600)).toBe('100 MB');
    });

    it('debe formatear GB', () => {
      expect(codecManager.formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('formatBitrate', () => {
    it('debe formatear bitrate en Kbps', () => {
      expect(codecManager.formatBitrate(128000)).toBe('128 Kbps');
      expect(codecManager.formatBitrate(320000)).toBe('320 Kbps');
    });

    it('debe formatear bitrate en Mbps', () => {
      expect(codecManager.formatBitrate(5000000)).toBe('5.0 Mbps');
      expect(codecManager.formatBitrate(50000000)).toBe('50.0 Mbps');
    });

    it('debe manejar valores nulos', () => {
      expect(codecManager.formatBitrate(0)).toBe('N/A');
      expect(codecManager.formatBitrate(null)).toBe('N/A');
    });
  });

  describe('parseFrameRate', () => {
    it('debe parsear frame rate como fracción', () => {
      expect(codecManager.parseFrameRate('30000/1001')).toBeCloseTo(29.97, 1);
      expect(codecManager.parseFrameRate('24000/1001')).toBeCloseTo(23.98, 1);
      expect(codecManager.parseFrameRate('30/1')).toBe(30);
    });

    it('debe parsear frame rate como número', () => {
      expect(codecManager.parseFrameRate('30')).toBe(30);
      expect(codecManager.parseFrameRate('60')).toBe(60);
    });

    it('debe manejar valores inválidos', () => {
      expect(codecManager.parseFrameRate(null)).toBe(0);
      expect(codecManager.parseFrameRate('')).toBe(0);
    });
  });

  describe('calculateAspectRatio', () => {
    it('debe detectar 16:9', () => {
      expect(codecManager.calculateAspectRatio(1920, 1080)).toBe('16:9');
      expect(codecManager.calculateAspectRatio(1280, 720)).toBe('16:9');
      expect(codecManager.calculateAspectRatio(3840, 2160)).toBe('16:9');
    });

    it('debe detectar 4:3', () => {
      expect(codecManager.calculateAspectRatio(640, 480)).toBe('4:3');
      expect(codecManager.calculateAspectRatio(1440, 1080)).toBe('4:3');
    });

    it('debe detectar 1:1', () => {
      expect(codecManager.calculateAspectRatio(1080, 1080)).toBe('1:1');
    });

    it('debe detectar 9:16 (vertical)', () => {
      expect(codecManager.calculateAspectRatio(1080, 1920)).toBe('9:16');
    });

    it('debe retornar ratio personalizado', () => {
      // 2.35:1 cinemascope
      const ratio = codecManager.calculateAspectRatio(2350, 1000);
      expect(ratio).toBeDefined();
    });

    it('debe manejar valores inválidos', () => {
      expect(codecManager.calculateAspectRatio(0, 0)).toBe('N/A');
      expect(codecManager.calculateAspectRatio(null, null)).toBe('N/A');
    });
  });

  describe('isHDR', () => {
    it('debe detectar HDR10', () => {
      const stream = { color_transfer: 'smpte2084' };
      expect(codecManager.isHDR(stream)).toBe(true);
    });

    it('debe detectar HLG', () => {
      const stream = { color_transfer: 'arib-std-b67' };
      expect(codecManager.isHDR(stream)).toBe(true);
    });

    it('debe detectar BT.2020', () => {
      const stream = { color_primaries: 'bt2020' };
      expect(codecManager.isHDR(stream)).toBe(true);
    });

    it('debe detectar 10-bit', () => {
      const stream = { pix_fmt: 'yuv420p10le' };
      expect(codecManager.isHDR(stream)).toBe(true);
    });

    it('debe retornar false para SDR', () => {
      const stream = { pix_fmt: 'yuv420p', color_transfer: 'bt709' };
      expect(codecManager.isHDR(stream)).toBe(false);
    });

    it('debe manejar stream nulo', () => {
      expect(codecManager.isHDR(null)).toBe(false);
      expect(codecManager.isHDR(undefined)).toBe(false);
    });
  });

  describe('checkCompatibility', () => {
    it('debe indicar listo para editar con video estándar', () => {
      const videoStream = { codec_name: 'h264', width: 1920, height: 1080 };
      const audioStream = { codec_name: 'aac', channels: 2 };
      
      const result = codecManager.checkCompatibility(videoStream, audioStream, '.mp4');
      
      expect(result.canEdit).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('debe indicar transcodificación para RAW', () => {
      const videoStream = { codec_name: 'rawvideo', width: 1920, height: 1080 };
      
      const result = codecManager.checkCompatibility(videoStream, null, '.mov');
      
      expect(result.needsTranscode).toBe(true);
      expect(result.issues.some(i => i.includes('RAW'))).toBe(true);
    });

    it('debe advertir sobre resolución muy alta', () => {
      const videoStream = { codec_name: 'h264', width: 8000, height: 4500 };
      
      const result = codecManager.checkCompatibility(videoStream, null, '.mp4');
      
      expect(result.issues.some(i => i.includes('proxy'))).toBe(true);
    });

    it('debe advertir sobre audio multicanal', () => {
      const audioStream = { channels: 12, codec_name: 'pcm_s24le' };
      
      const result = codecManager.checkCompatibility(null, audioStream, '.wav');
      
      expect(result.issues.some(i => i.includes('canales'))).toBe(true);
    });
  });

  describe('parseMediaInfo', () => {
    it('debe parsear información completa', () => {
      const ffprobeOutput = {
        format: {
          filename: '/path/to/video.mp4',
          duration: '120.5',
          size: '104857600',
          bit_rate: '5000000',
          tags: { title: 'Test Video' }
        },
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
            codec_long_name: 'H.264 / AVC',
            width: 1920,
            height: 1080,
            r_frame_rate: '30/1',
            pix_fmt: 'yuv420p',
            bit_rate: '4500000'
          },
          {
            codec_type: 'audio',
            codec_name: 'aac',
            channels: 2,
            channel_layout: 'stereo',
            sample_rate: '48000',
            bit_rate: '128000'
          }
        ]
      };

      const result = codecManager.parseMediaInfo(ffprobeOutput, '/path/to/video.mp4');

      expect(result.filename).toBe('video.mp4');
      expect(result.duration).toBeCloseTo(120.5, 1);
      expect(result.durationFormatted).toBe('00:02:00');
      
      expect(result.video).toBeDefined();
      expect(result.video.codec).toBe('H.264/AVC');
      expect(result.video.width).toBe(1920);
      expect(result.video.height).toBe(1080);
      expect(result.video.resolution).toBe('1920x1080');
      expect(result.video.aspectRatio).toBe('16:9');
      expect(result.video.frameRate).toBe(30);
      
      expect(result.audio).toBeDefined();
      expect(result.audio.codec).toBe('AAC');
      expect(result.audio.channels).toBe(2);
      expect(result.audio.sampleRate).toBe(48000);
    });

    it('debe manejar video sin audio', () => {
      const ffprobeOutput = {
        format: { duration: '60', size: '10000000' },
        streams: [
          { codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080 }
        ]
      };

      const result = codecManager.parseMediaInfo(ffprobeOutput, '/video.mp4');

      expect(result.video).toBeDefined();
      expect(result.audio).toBeNull();
    });

    it('debe manejar audio sin video', () => {
      const ffprobeOutput = {
        format: { duration: '180', size: '5000000' },
        streams: [
          { codec_type: 'audio', codec_name: 'mp3', channels: 2, sample_rate: '44100' }
        ]
      };

      const result = codecManager.parseMediaInfo(ffprobeOutput, '/audio.mp3');

      expect(result.video).toBeNull();
      expect(result.audio).toBeDefined();
    });

    it('debe contar subtítulos', () => {
      const ffprobeOutput = {
        format: { duration: '120' },
        streams: [
          { codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080 },
          { codec_type: 'subtitle', codec_name: 'subrip' },
          { codec_type: 'subtitle', codec_name: 'ass' }
        ]
      };

      const result = codecManager.parseMediaInfo(ffprobeOutput, '/video.mkv');

      expect(result.subtitles).toBe(2);
    });
  });
});
