/**
 * Format Detector Module Tests
 */

const FormatDetector = require('../formatDetector');

describe('FormatDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new FormatDetector();
  });

  describe('isSupportedExtension', () => {
    it('should return true for supported video extensions', () => {
      expect(detector.isSupportedExtension('video.mp4')).toBe(true);
      expect(detector.isSupportedExtension('video.mkv')).toBe(true);
      expect(detector.isSupportedExtension('video.avi')).toBe(true);
      expect(detector.isSupportedExtension('video.mov')).toBe(true);
      expect(detector.isSupportedExtension('video.webm')).toBe(true);
    });

    it('should return true for supported audio extensions', () => {
      expect(detector.isSupportedExtension('audio.mp3')).toBe(true);
      expect(detector.isSupportedExtension('audio.aac')).toBe(true);
      expect(detector.isSupportedExtension('audio.wav')).toBe(true);
      expect(detector.isSupportedExtension('audio.flac')).toBe(true);
    });

    it('should return false for unsupported extensions', () => {
      expect(detector.isSupportedExtension('file.xyz')).toBe(false);
      expect(detector.isSupportedExtension('file.pdf')).toBe(false);
      expect(detector.isSupportedExtension('file.doc')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(detector.isSupportedExtension('video.MP4')).toBe(true);
      expect(detector.isSupportedExtension('video.MKV')).toBe(true);
    });
  });

  describe('isVideoExtension', () => {
    it('should return true for video extensions', () => {
      expect(detector.isVideoExtension('video.mp4')).toBe(true);
      expect(detector.isVideoExtension('video.mov')).toBe(true);
    });

    it('should return false for audio extensions', () => {
      expect(detector.isVideoExtension('audio.mp3')).toBe(false);
      expect(detector.isVideoExtension('audio.wav')).toBe(false);
    });
  });

  describe('isAudioExtension', () => {
    it('should return true for audio extensions', () => {
      expect(detector.isAudioExtension('audio.mp3')).toBe(true);
      expect(detector.isAudioExtension('audio.aac')).toBe(true);
    });

    it('should return false for video extensions', () => {
      expect(detector.isAudioExtension('video.mp4')).toBe(false);
      expect(detector.isAudioExtension('video.mov')).toBe(false);
    });
  });

  describe('getResolutionCategory', () => {
    it('should return 8K for 8K resolution', () => {
      expect(detector.getResolutionCategory(7680, 4320)).toBe('8K');
    });

    it('should return 4K for 4K resolution', () => {
      expect(detector.getResolutionCategory(3840, 2160)).toBe('4K');
    });

    it('should return 1080p for Full HD', () => {
      expect(detector.getResolutionCategory(1920, 1080)).toBe('1080p');
    });

    it('should return 720p for HD', () => {
      expect(detector.getResolutionCategory(1280, 720)).toBe('720p');
    });

    it('should return 480p for SD', () => {
      expect(detector.getResolutionCategory(854, 480)).toBe('480p');
    });

    it('should return Low Resolution for small videos', () => {
      expect(detector.getResolutionCategory(320, 240)).toBe('Low Resolution');
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return object with video, audio, and all arrays', () => {
      const extensions = detector.getSupportedExtensions();
      expect(extensions.video).toBeDefined();
      expect(extensions.audio).toBeDefined();
      expect(extensions.all).toBeDefined();
      expect(Array.isArray(extensions.video)).toBe(true);
      expect(Array.isArray(extensions.audio)).toBe(true);
      expect(Array.isArray(extensions.all)).toBe(true);
    });

    it('should have video extensions starting with dot', () => {
      const extensions = detector.getSupportedExtensions();
      extensions.video.forEach(ext => {
        expect(ext.startsWith('.')).toBe(true);
      });
    });

    it('should include common formats', () => {
      const extensions = detector.getSupportedExtensions();
      expect(extensions.video).toContain('.mp4');
      expect(extensions.video).toContain('.mov');
      expect(extensions.audio).toContain('.mp3');
      expect(extensions.audio).toContain('.aac');
    });

    it('all should be combination of video and audio', () => {
      const extensions = detector.getSupportedExtensions();
      const combined = [...extensions.video, ...extensions.audio];
      expect(extensions.all.length).toBe(combined.length);
    });
  });

  describe('isSupported', () => {
    it('should return true for supported format with video', () => {
      const info = {
        video: { codec: 'h264' },
        audio: { codec: 'aac' }
      };
      expect(detector.isSupported('.mp4', info)).toBe(true);
    });

    it('should return false for unsupported extension', () => {
      const info = {
        video: { codec: 'h264' },
        audio: { codec: 'aac' }
      };
      expect(detector.isSupported('.xyz', info)).toBe(false);
    });

    it('should handle audio only files', () => {
      const info = {
        video: null,
        audio: { codec: 'mp3' }
      };
      expect(detector.isSupported('.mp3', info)).toBe(true);
    });
  });
});
