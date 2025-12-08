/**
 * Optimizer Module Tests
 */

const Optimizer = require('../optimizer');

describe('Optimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new Optimizer();
  });

  describe('constructor', () => {
    it('should create an Optimizer instance', () => {
      expect(optimizer).toBeInstanceOf(Optimizer);
    });

    it('should have ffmpeg wrapper', () => {
      expect(optimizer.ffmpeg).toBeDefined();
    });

    it('should have hardware accelerator', () => {
      expect(optimizer.hardwareAccelerator).toBeDefined();
    });

    it('should detect CPU count', () => {
      expect(optimizer.cpuCount).toBeGreaterThan(0);
    });

    it('should detect platform', () => {
      expect(['win32', 'darwin', 'linux']).toContain(optimizer.platform);
    });
  });

  describe('getPlatformConfigs', () => {
    it('should return platform configurations', () => {
      const configs = optimizer.getPlatformConfigs();
      expect(configs).toBeDefined();
      expect(configs.youtube).toBeDefined();
      expect(configs.tiktok).toBeDefined();
      expect(configs.instagram).toBeDefined();
    });

    it('should have valid YouTube config', () => {
      const configs = optimizer.getPlatformConfigs();
      expect(configs.youtube.codec).toBe('libx264');
      expect(configs.youtube.container).toBe('mp4');
    });

    it('should have valid TikTok config', () => {
      const configs = optimizer.getPlatformConfigs();
      expect(configs.tiktok.aspectRatio).toBe('9:16');
      expect(configs.tiktok.maxDuration).toBe(180);
    });
  });

  describe('getScalingAlgorithms', () => {
    it('should return scaling algorithms', () => {
      const algorithms = optimizer.getScalingAlgorithms();
      expect(algorithms).toBeDefined();
      expect(algorithms.lanczos).toBeDefined();
      expect(algorithms.bicubic).toBeDefined();
      expect(algorithms.bilinear).toBeDefined();
    });

    it('should have quality ratings', () => {
      const algorithms = optimizer.getScalingAlgorithms();
      expect(algorithms.lanczos.quality).toBe('high');
      expect(algorithms.bilinear.quality).toBe('low');
    });
  });

  describe('calculateComplexityScore', () => {
    it('should return score between 0 and 1', () => {
      const videoInfo = {
        video: { width: 1920, height: 1080, codec: 'h264' },
        duration: 60
      };
      const score = optimizer.calculateComplexityScore(videoInfo);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should give higher score to 4K videos', () => {
      const hdVideo = {
        video: { width: 1920, height: 1080, codec: 'h264' },
        duration: 60
      };
      const uhd4kVideo = {
        video: { width: 3840, height: 2160, codec: 'h264' },
        duration: 60
      };
      const hdScore = optimizer.calculateComplexityScore(hdVideo);
      const uhdScore = optimizer.calculateComplexityScore(uhd4kVideo);
      expect(uhdScore).toBeGreaterThan(hdScore);
    });

    it('should give higher score to complex codecs', () => {
      const h264Video = {
        video: { width: 1920, height: 1080, codec: 'h264' },
        duration: 60
      };
      const hevcVideo = {
        video: { width: 1920, height: 1080, codec: 'hevc' },
        duration: 60
      };
      const h264Score = optimizer.calculateComplexityScore(h264Video);
      const hevcScore = optimizer.calculateComplexityScore(hevcVideo);
      expect(hevcScore).toBeGreaterThan(h264Score);
    });
  });

  describe('selectEncodingStrategy', () => {
    it('should return CRF for highQuality mode', () => {
      const strategy = optimizer.selectEncodingStrategy(60, 0.5, 'highQuality');
      expect(strategy.type).toBe('crf');
      expect(strategy.value).toBe(18);
    });

    it('should return CRF with higher value for fast mode', () => {
      const strategy = optimizer.selectEncodingStrategy(60, 0.5, 'fast');
      expect(strategy.type).toBe('crf');
      expect(strategy.value).toBe(23);
    });

    it('should return CBR for high motion content', () => {
      const strategy = optimizer.selectEncodingStrategy(60, 0.8, 'balanced');
      expect(strategy.type).toBe('cbr');
    });
  });

  describe('shouldUseTwoPass', () => {
    it('should return true for highQuality mode', () => {
      const result = optimizer.shouldUseTwoPass(60, 0.5, 'highQuality');
      expect(result).toBe(true);
    });

    it('should return false for fast mode', () => {
      const result = optimizer.shouldUseTwoPass(60, 0.5, 'fast');
      expect(result).toBe(false);
    });

    it('should return true for long videos with high complexity', () => {
      const result = optimizer.shouldUseTwoPass(600, 0.7, 'balanced');
      expect(result).toBe(true);
    });

    it('should return true for very long videos', () => {
      const result = optimizer.shouldUseTwoPass(2000, 0.3, 'balanced');
      expect(result).toBe(true);
    });
  });

  describe('selectScalingAlgorithm', () => {
    it('should return bilinear for fast mode', () => {
      const videoInfo = { video: { width: 1920, height: 1080 } };
      const target = { width: 1280, height: 720 };
      const algorithm = optimizer.selectScalingAlgorithm(videoInfo, target, 'fast');
      expect(algorithm.filter).toBe('bilinear');
    });

    it('should return lanczos for upscaling in highQuality mode', () => {
      const videoInfo = { video: { width: 1280, height: 720 } };
      const target = { width: 1920, height: 1080 };
      const algorithm = optimizer.selectScalingAlgorithm(videoInfo, target, 'highQuality');
      expect(algorithm.filter).toBe('lanczos');
    });

    it('should return spline for downscaling in highQuality mode', () => {
      const videoInfo = { video: { width: 1920, height: 1080 } };
      const target = { width: 1280, height: 720 };
      const algorithm = optimizer.selectScalingAlgorithm(videoInfo, target, 'highQuality');
      expect(algorithm.filter).toBe('spline');
    });
  });

  describe('parseBitrate', () => {
    it('should parse megabit notation', () => {
      expect(optimizer.parseBitrate('8M')).toBe(8000000);
      expect(optimizer.parseBitrate('12M')).toBe(12000000);
    });

    it('should parse kilobit notation', () => {
      expect(optimizer.parseBitrate('500k')).toBe(500000);
      expect(optimizer.parseBitrate('192K')).toBe(192000);
    });

    it('should handle raw numbers', () => {
      expect(optimizer.parseBitrate(5000000)).toBe(5000000);
    });

    it('should return 0 for invalid input', () => {
      expect(optimizer.parseBitrate('')).toBe(0);
      expect(optimizer.parseBitrate(null)).toBe(0);
      expect(optimizer.parseBitrate('invalid')).toBe(0);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(optimizer.formatBytes(1024)).toBe('1.00 KB');
      expect(optimizer.formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(optimizer.formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('should handle zero', () => {
      expect(optimizer.formatBytes(0)).toBe('0.00 B');
    });
  });

  describe('getRecommendedResolution', () => {
    it('should return YouTube resolution', () => {
      const videoInfo = { video: { width: 1920, height: 1080 } };
      const result = optimizer.getRecommendedResolution('youtube', videoInfo);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it('should return TikTok resolution', () => {
      const videoInfo = { video: { width: 1920, height: 1080 } };
      const result = optimizer.getRecommendedResolution('tiktok', videoInfo);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
    });

    it('should indicate when scaling is needed', () => {
      const videoInfo = { video: { width: 1920, height: 1080 } };
      const result = optimizer.getRecommendedResolution('tiktok', videoInfo);
      expect(result.needsScaling).toBe(true);
    });
  });

  describe('estimateQuality', () => {
    it('should return excellent for low CRF', () => {
      const optimized = { args: ['-crf', '18'], metadata: { encodingStrategy: 'crf' } };
      expect(optimizer.estimateQuality(optimized)).toBe('excellent');
    });

    it('should return good for medium CRF', () => {
      const optimized = { args: ['-crf', '23'], metadata: { encodingStrategy: 'crf' } };
      expect(optimizer.estimateQuality(optimized)).toBe('good');
    });

    it('should return acceptable for high CRF', () => {
      const optimized = { args: ['-crf', '28'], metadata: { encodingStrategy: 'crf' } };
      expect(optimizer.estimateQuality(optimized)).toBe('acceptable');
    });
  });

  describe('estimateSpeed', () => {
    it('should return very_fast for GPU encoding', () => {
      const optimized = { args: [], metadata: { useGPU: true, twoPass: false } };
      expect(optimizer.estimateSpeed(optimized)).toBe('very_fast');
    });

    it('should return slow for two-pass encoding', () => {
      const optimized = { args: [], metadata: { useGPU: false, twoPass: true } };
      expect(optimizer.estimateSpeed(optimized)).toBe('slow');
    });

    it('should return medium for default settings', () => {
      const optimized = { args: ['-preset', 'medium'], metadata: { useGPU: false, twoPass: false } };
      expect(optimizer.estimateSpeed(optimized)).toBe('medium');
    });
  });

  describe('calculateOptimalBitrate', () => {
    it('should return bitrate config object', () => {
      const videoInfo = { video: { width: 1920, height: 1080 } };
      const result = optimizer.calculateOptimalBitrate(videoInfo, 0.5, 0.5, '12M');
      
      expect(result.target).toBeDefined();
      expect(result.maxrate).toBeDefined();
      expect(result.bufsize).toBeDefined();
      expect(result.resolution).toBe('1080p');
    });

    it('should increase bitrate for high motion', () => {
      const videoInfo = { video: { width: 1920, height: 1080 } };
      const lowMotion = optimizer.calculateOptimalBitrate(videoInfo, 0.3, 0.5, '100M');
      const highMotion = optimizer.calculateOptimalBitrate(videoInfo, 0.8, 0.5, '100M');
      
      expect(optimizer.parseBitrate(highMotion.target))
        .toBeGreaterThan(optimizer.parseBitrate(lowMotion.target));
    });

    it('should respect platform max bitrate', () => {
      const videoInfo = { video: { width: 3840, height: 2160 } };
      const result = optimizer.calculateOptimalBitrate(videoInfo, 0.9, 0.9, '4M');
      
      expect(optimizer.parseBitrate(result.target)).toBeLessThanOrEqual(4000000);
    });
  });
});
