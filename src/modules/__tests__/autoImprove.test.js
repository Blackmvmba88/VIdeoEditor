/**
 * AutoImprove Module Tests
 */

const AutoImprove = require('../autoImprove');

describe('AutoImprove', () => {
  let autoImprove;

  beforeEach(() => {
    autoImprove = new AutoImprove();
  });

  describe('constructor', () => {
    it('should create an AutoImprove instance', () => {
      expect(autoImprove).toBeInstanceOf(AutoImprove);
    });

    it('should have ffmpeg wrapper', () => {
      expect(autoImprove.ffmpeg).toBeDefined();
    });

    it('should have temp directory', () => {
      expect(autoImprove.tempDir).toBeDefined();
      expect(autoImprove.tempDir).toContain('video-editor-improve');
    });
  });

  describe('getImprovementOptions', () => {
    it('should return improvement options', () => {
      const options = autoImprove.getImprovementOptions();
      expect(options).toBeDefined();
      expect(Object.keys(options).length).toBeGreaterThan(0);
    });

    it('should have sharpness boost option', () => {
      const options = autoImprove.getImprovementOptions();
      expect(options.sharpnessBoost).toBeDefined();
      expect(options.sharpnessBoost.name).toBeDefined();
      expect(options.sharpnessBoost.filter).toBeDefined();
    });

    it('should have audio normalize option', () => {
      const options = autoImprove.getImprovementOptions();
      expect(options.audioNormalize).toBeDefined();
      expect(options.audioNormalize.filter).toContain('loudnorm');
    });

    it('should have contrast enhance option', () => {
      const options = autoImprove.getImprovementOptions();
      expect(options.contrastEnhance).toBeDefined();
      expect(options.contrastEnhance.filter).toContain('eq=');
    });

    it('should have color correction option', () => {
      const options = autoImprove.getImprovementOptions();
      expect(options.colorCorrection).toBeDefined();
      expect(options.colorCorrection.filter).toContain('colorbalance');
    });

    it('should have deinterlace option', () => {
      const options = autoImprove.getImprovementOptions();
      expect(options.deinterlace).toBeDefined();
      expect(options.deinterlace.filter).toContain('yadif');
    });
  });

  describe('isAutoApplicable', () => {
    it('should return true for safe improvements', () => {
      expect(autoImprove.isAutoApplicable('sharpnessBoost')).toBe(true);
      expect(autoImprove.isAutoApplicable('contrastEnhance')).toBe(true);
      expect(autoImprove.isAutoApplicable('colorCorrection')).toBe(true);
      expect(autoImprove.isAutoApplicable('audioNormalize')).toBe(true);
    });

    it('should return false for complex improvements', () => {
      expect(autoImprove.isAutoApplicable('stabilization')).toBe(false);
      expect(autoImprove.isAutoApplicable('deinterlace')).toBe(false);
    });
  });

  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      expect(autoImprove.formatTime(45)).toBe('0:45');
      expect(autoImprove.formatTime(0)).toBe('0:00');
    });

    it('should format minutes correctly', () => {
      expect(autoImprove.formatTime(60)).toBe('1:00');
      expect(autoImprove.formatTime(90)).toBe('1:30');
      expect(autoImprove.formatTime(125)).toBe('2:05');
    });

    it('should format hours correctly', () => {
      expect(autoImprove.formatTime(3600)).toBe('1:00:00');
      expect(autoImprove.formatTime(3661)).toBe('1:01:01');
      expect(autoImprove.formatTime(7200)).toBe('2:00:00');
    });

    it('should handle invalid input', () => {
      expect(autoImprove.formatTime(null)).toBe('0:00');
      expect(autoImprove.formatTime(-5)).toBe('0:00');
    });
  });

  describe('calculateOverallQuality', () => {
    it('should return score between 0 and 100', () => {
      const metrics = { sharpness: { score: 0.8 } };
      const issues = [];
      const result = autoImprove.calculateOverallQuality(metrics, issues);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should deduct points for high severity issues', () => {
      const metrics = { sharpness: { score: 0.8 } };
      const noIssues = [];
      const withIssues = [{ severity: 'high', message: 'test' }];
      
      const scoreNoIssues = autoImprove.calculateOverallQuality(metrics, noIssues);
      const scoreWithIssues = autoImprove.calculateOverallQuality(metrics, withIssues);
      
      expect(scoreWithIssues.score).toBeLessThan(scoreNoIssues.score);
    });

    it('should assign correct grades', () => {
      const metrics = { sharpness: { score: 0.9 } };
      
      // Excellent (A)
      const excellent = autoImprove.calculateOverallQuality(metrics, []);
      expect(excellent.grade).toBe('A');
      
      // With some issues (lower grade)
      const issues = [
        { severity: 'high' },
        { severity: 'high' }
      ];
      const lower = autoImprove.calculateOverallQuality(metrics, issues);
      expect(['B', 'C', 'D', 'F']).toContain(lower.grade);
    });

    it('should add bonus for high sharpness', () => {
      // With some issues to keep score below 100, high sharpness should get bonus
      const issues = [{ severity: 'low' }];
      const highSharpness = { sharpness: { score: 0.85 } };
      const lowSharpness = { sharpness: { score: 0.5 } };
      
      const highScore = autoImprove.calculateOverallQuality(highSharpness, issues);
      const lowScore = autoImprove.calculateOverallQuality(lowSharpness, issues);
      
      expect(highScore.score).toBeGreaterThan(lowScore.score);
    });
  });

  describe('getQualityDescription', () => {
    it('should return description for grade A', () => {
      const desc = autoImprove.getQualityDescription('A');
      expect(desc).toContain('Excelente');
    });

    it('should return description for grade F', () => {
      const desc = autoImprove.getQualityDescription('F');
      expect(desc).toContain('trabajo');
    });

    it('should handle unknown grade', () => {
      const desc = autoImprove.getQualityDescription('X');
      expect(desc).toBe('Desconocido');
    });
  });

  describe('generateReport', () => {
    it('should generate a formatted report', () => {
      const metrics = {
        sharpness: { score: 0.8 },
        luminance: { average: 0.5 },
        audioRMS: -18,
        motionConsistency: { score: 0.9 },
        duration: 120,
        analyzedAt: new Date().toISOString()
      };
      const issues = [];
      const suggestions = [];
      const qualityScore = { score: 90, grade: 'A', description: 'Excelente' };

      const report = autoImprove.generateReport(metrics, issues, suggestions, qualityScore);

      expect(report).toContain('REPORTE');
      expect(report).toContain('90/100');
      expect(report).toContain('Nitidez');
    });

    it('should include issues in report', () => {
      const metrics = {
        sharpness: { score: 0.5 },
        duration: 60,
        analyzedAt: new Date().toISOString()
      };
      const issues = [{ severity: 'high', message: 'Test issue' }];
      const suggestions = [];
      const qualityScore = { score: 70, grade: 'C', description: 'Acceptable' };

      const report = autoImprove.generateReport(metrics, issues, suggestions, qualityScore);

      expect(report).toContain('PROBLEMAS');
      expect(report).toContain('Test issue');
    });

    it('should include suggestions in report', () => {
      const metrics = {
        sharpness: { score: 0.5 },
        duration: 60,
        analyzedAt: new Date().toISOString()
      };
      const issues = [];
      const suggestions = [{ improvement: 'sharpnessBoost', reason: 'Improve clarity' }];
      const qualityScore = { score: 80, grade: 'B', description: 'Good' };

      const report = autoImprove.generateReport(metrics, issues, suggestions, qualityScore);

      expect(report).toContain('MEJORAS');
      expect(report).toContain('Nitidez');
    });
  });

  describe('analyzeVideo error handling', () => {
    it('should throw error for non-existent file', async () => {
      await expect(autoImprove.analyzeVideo('/non/existent/file.mp4'))
        .rejects.toThrow('Video not found');
    });
  });

  describe('applyImprovements error handling', () => {
    it('should throw error for non-existent input file', async () => {
      await expect(autoImprove.applyImprovements(
        '/non/existent/input.mp4',
        '/tmp/output.mp4',
        ['sharpnessBoost']
      )).rejects.toThrow('Input video not found');
    });

    it('should throw error for empty improvements list', async () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const tempFile = path.join(require('node:os').tmpdir(), 'test_empty.mp4');
      
      // Create a mock file
      fs.writeFileSync(tempFile, Buffer.alloc(2048, 'x'));

      try {
        await expect(autoImprove.applyImprovements(
          tempFile,
          '/tmp/output.mp4',
          []
        )).rejects.toThrow('No improvements specified');
      } finally {
        fs.unlinkSync(tempFile);
      }
    });
  });

  describe('applyCustomImprovement error handling', () => {
    it('should throw error for unknown improvement type', async () => {
      await expect(autoImprove.applyCustomImprovement(
        '/some/path.mp4',
        '/tmp/output.mp4',
        'unknownImprovement'
      )).rejects.toThrow('Unknown improvement type');
    });
  });

  describe('cleanup', () => {
    it('should not throw when cleaning up', () => {
      expect(() => autoImprove.cleanup()).not.toThrow();
    });
  });
});
