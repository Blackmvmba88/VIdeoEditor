/**
 * BMIC (BlackMamba Intelligence Core) Module Tests
 */

const BMIC = require('../bmic');

describe('BMIC', () => {
  let bmic;

  beforeEach(() => {
    bmic = new BMIC();
  });

  describe('constructor', () => {
    it('should create a BMIC instance', () => {
      expect(bmic).toBeInstanceOf(BMIC);
    });

    it('should have validator agent', () => {
      expect(bmic.validator).toBeDefined();
    });

    it('should have optimizer agent', () => {
      expect(bmic.optimizer).toBeDefined();
    });

    it('should have autoImprove agent', () => {
      expect(bmic.autoImprove).toBeDefined();
    });

    it('should have ffmpeg wrapper', () => {
      expect(bmic.ffmpeg).toBeDefined();
    });

    it('should have export presets', () => {
      expect(bmic.exportPresets).toBeDefined();
    });

    it('should have user profile', () => {
      expect(bmic.userProfile).toBeDefined();
      expect(bmic.userProfile.preferences).toBeDefined();
      expect(bmic.userProfile.history).toBeDefined();
    });
  });

  describe('getAvailableModes', () => {
    it('should return available processing modes', () => {
      const modes = bmic.getAvailableModes();
      expect(modes).toBeDefined();
      expect(Object.keys(modes).length).toBeGreaterThan(0);
    });

    it('should have fast mode', () => {
      const modes = bmic.getAvailableModes();
      expect(modes.fast).toBeDefined();
      expect(modes.fast.name).toBe('Modo Rápido');
      expect(modes.fast.settings.skipAutoImprove).toBe(true);
    });

    it('should have highQuality mode', () => {
      const modes = bmic.getAvailableModes();
      expect(modes.highQuality).toBeDefined();
      expect(modes.highQuality.name).toBe('Modo Calidad Máxima');
      expect(modes.highQuality.settings.twoPass).toBe(true);
    });

    it('should have socialMedia mode', () => {
      const modes = bmic.getAvailableModes();
      expect(modes.socialMedia).toBeDefined();
      expect(modes.socialMedia.name).toBe('Modo Redes Sociales');
    });

    it('should have movie mode', () => {
      const modes = bmic.getAvailableModes();
      expect(modes.movie).toBeDefined();
      expect(modes.movie.name).toBe('Modo Película');
      expect(modes.movie.settings.colorGrading).toBe(true);
    });

    it('should have balanced mode', () => {
      const modes = bmic.getAvailableModes();
      expect(modes.balanced).toBeDefined();
      expect(modes.balanced.name).toBe('Modo Balanceado');
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile', () => {
      const profile = bmic.getUserProfile();
      expect(profile).toBeDefined();
      expect(profile.preferences).toBeDefined();
      expect(profile.history).toBeDefined();
      expect(profile.learnings).toBeDefined();
    });

    it('should have default preferences', () => {
      const profile = bmic.getUserProfile();
      expect(profile.preferences.defaultMode).toBeDefined();
      expect(profile.preferences.preferGPU).toBeDefined();
      expect(profile.preferences.autoApplyImprovements).toBeDefined();
    });

    it('should have history tracking', () => {
      const profile = bmic.getUserProfile();
      expect(profile.history.totalProcessed).toBeDefined();
      expect(profile.history.averageQualityScore).toBeDefined();
      expect(profile.history.commonIssues).toBeDefined();
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences', () => {
      bmic.updatePreferences({ defaultMode: 'fast' });
      const profile = bmic.getUserProfile();
      expect(profile.preferences.defaultMode).toBe('fast');
    });

    it('should preserve other preferences', () => {
      const originalPreferGPU = bmic.getUserProfile().preferences.preferGPU;
      bmic.updatePreferences({ defaultMode: 'fast' });
      expect(bmic.getUserProfile().preferences.preferGPU).toBe(originalPreferGPU);
    });
  });

  describe('getRecommendedMode', () => {
    it('should recommend balanced for long videos', () => {
      const videoInfo = { duration: 700, video: { width: 1920, height: 1080 } };
      const recommendation = bmic.getRecommendedMode(videoInfo);
      expect(recommendation.mode).toBe('balanced');
      expect(recommendation.reason).toContain('largo');
    });

    it('should recommend highQuality for 4K videos', () => {
      const videoInfo = { duration: 60, video: { width: 3840, height: 2160 } };
      const recommendation = bmic.getRecommendedMode(videoInfo);
      expect(recommendation.mode).toBe('highQuality');
      expect(recommendation.reason).toContain('4K');
    });

    it('should use default mode for standard videos', () => {
      const videoInfo = { duration: 120, video: { width: 1920, height: 1080 } };
      const recommendation = bmic.getRecommendedMode(videoInfo);
      expect(recommendation.mode).toBeDefined();
      expect(recommendation.reason).toBeDefined();
    });
  });

  describe('getPlatformFromPreset', () => {
    it('should return youtube for youtube presets', () => {
      expect(bmic.getPlatformFromPreset('youtube1080p')).toBe('youtube');
      expect(bmic.getPlatformFromPreset('youtube4k')).toBe('youtube');
    });

    it('should return instagram for instagram presets', () => {
      expect(bmic.getPlatformFromPreset('instagram')).toBe('instagram');
      expect(bmic.getPlatformFromPreset('instagramStory')).toBe('instagramReels');
    });

    it('should return tiktok for tiktok preset', () => {
      expect(bmic.getPlatformFromPreset('tiktok')).toBe('tiktok');
    });

    it('should return null for unknown presets', () => {
      expect(bmic.getPlatformFromPreset('unknownPreset')).toBeNull();
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration in seconds', () => {
      const start = '2024-01-01T10:00:00.000Z';
      const end = '2024-01-01T10:00:30.000Z';
      const duration = bmic.calculateDuration(start, end);
      expect(duration).toBe('30s');
    });

    it('should format minutes and seconds', () => {
      const start = '2024-01-01T10:00:00.000Z';
      const end = '2024-01-01T10:02:30.000Z';
      const duration = bmic.calculateDuration(start, end);
      expect(duration).toBe('2m 30s');
    });
  });

  describe('exportDecisionJSON', () => {
    it('should export decision as JSON', () => {
      const decision = {
        mode: 'balanced',
        validator: { status: 'ok' },
        optimizer: {
          codec: 'libx264',
          profile: 'high',
          bitrate: '8M',
          passes: 1
        },
        autoImprove: {
          sharpnessBoost: true,
          audioNormalize: false,
          colorCorrection: false,
          qualityScore: { score: 85, grade: 'B' }
        },
        metadata: {
          processingDuration: '30s'
        }
      };

      const json = bmic.exportDecisionJSON(decision);

      expect(json.mode).toBe('balanced');
      expect(json.validator).toBe('ok');
      expect(json.optimizer.codec).toBe('libx264');
      expect(json.autoImprove.sharpnessBoost).toBe(true);
      expect(json.processingTime).toBe('30s');
    });
  });

  describe('generateSummary', () => {
    it('should generate summary string', () => {
      const decision = {
        mode: 'balanced',
        validator: { status: 'ok', recommendations: [] },
        optimizer: {
          status: 'ok',
          codec: 'libx264',
          profile: 'high',
          bitrate: '8M',
          passes: 1
        },
        autoImprove: {
          status: 'ok',
          qualityScore: { score: 85, grade: 'B' },
          sharpnessBoost: false,
          audioNormalize: false,
          colorCorrection: false
        },
        metadata: {
          processingDuration: '45s',
          logs: []
        }
      };

      const summary = bmic.generateSummary(decision);

      expect(summary).toContain('RESUMEN');
      expect(summary).toContain('BMIC');
      expect(summary).toContain('Balanceado');
      expect(summary).toContain('libx264');
      expect(summary).toContain('85/100');
    });

    it('should indicate applied improvements', () => {
      const decision = {
        mode: 'highQuality',
        validator: { status: 'ok', recommendations: [] },
        optimizer: {
          status: 'ok',
          codec: 'libx264',
          profile: 'high',
          bitrate: '12M',
          passes: 2
        },
        autoImprove: {
          status: 'ok',
          qualityScore: { score: 90, grade: 'A' },
          sharpnessBoost: true,
          audioNormalize: true,
          colorCorrection: false
        },
        metadata: {
          processingDuration: '2m 30s',
          logs: []
        }
      };

      const summary = bmic.generateSummary(decision);

      expect(summary).toContain('Nitidez mejorada');
      expect(summary).toContain('Audio normalizado');
    });

    it('should show skipped status for auto-improve', () => {
      const decision = {
        mode: 'fast',
        validator: { status: 'ok', recommendations: [] },
        optimizer: {
          status: 'ok',
          codec: 'libx264',
          profile: 'main',
          bitrate: '4M',
          passes: 1
        },
        autoImprove: {
          status: 'skipped',
          qualityScore: null,
          sharpnessBoost: false,
          audioNormalize: false,
          colorCorrection: false
        },
        metadata: {
          processingDuration: '15s',
          logs: []
        }
      };

      const summary = bmic.generateSummary(decision);

      expect(summary).toContain('Saltado');
    });
  });

  describe('log', () => {
    it('should add log entries to decision', () => {
      const decision = { metadata: { logs: [] } };
      bmic.log(decision, 'info', 'Test message');
      
      expect(decision.metadata.logs.length).toBe(1);
      expect(decision.metadata.logs[0].level).toBe('info');
      expect(decision.metadata.logs[0].message).toBe('Test message');
      expect(decision.metadata.logs[0].timestamp).toBeDefined();
    });

    it('should support different log levels', () => {
      const decision = { metadata: { logs: [] } };
      
      bmic.log(decision, 'info', 'Info message');
      bmic.log(decision, 'success', 'Success message');
      bmic.log(decision, 'warning', 'Warning message');
      bmic.log(decision, 'error', 'Error message');
      
      expect(decision.metadata.logs.length).toBe(4);
      expect(decision.metadata.logs[0].level).toBe('info');
      expect(decision.metadata.logs[1].level).toBe('success');
      expect(decision.metadata.logs[2].level).toBe('warning');
      expect(decision.metadata.logs[3].level).toBe('error');
    });
  });

  describe('cleanup', () => {
    it('should not throw when cleaning up', () => {
      expect(() => bmic.cleanup()).not.toThrow();
    });
  });
});
