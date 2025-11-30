/**
 * Content Analyzer Module Tests
 */

const ContentAnalyzer = require('../contentAnalyzer');

describe('ContentAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  afterEach(() => {
    analyzer.cleanup();
  });

  describe('constructor', () => {
    it('should create a ContentAnalyzer instance', () => {
      expect(analyzer).toBeInstanceOf(ContentAnalyzer);
    });

    it('should have ffmpeg wrapper', () => {
      expect(analyzer.ffmpeg).toBeDefined();
    });
  });

  describe('analyzeContent', () => {
    it('should throw error for non-existent file', async () => {
      await expect(analyzer.analyzeContent('/nonexistent/file.mp4'))
        .rejects.toThrow('Input file not found');
    });
  });

  describe('identifyInterestingMoments', () => {
    it('should combine scene changes and audio peaks', () => {
      const sceneChanges = [
        { time: 5, type: 'scene_change', score: 0.5 },
        { time: 15, type: 'scene_change', score: 0.6 }
      ];
      const audioPeaks = [
        { time: 5.5, type: 'audio_activity', score: 0.8 },
        { time: 30, type: 'audio_activity', score: 0.7 }
      ];
      const config = { minMomentDuration: 2 };

      const moments = analyzer.identifyInterestingMoments(
        sceneChanges, 
        audioPeaks, 
        60, 
        config
      );

      expect(moments.length).toBeGreaterThan(0);
      expect(moments[0].score).toBeGreaterThanOrEqual(0);
    });

    it('should boost score when visual and audio align', () => {
      const sceneChanges = [
        { time: 10, type: 'scene_change', score: 0.5 }
      ];
      const audioPeaks = [
        { time: 10.5, type: 'audio_activity', score: 0.4 }
      ];
      const config = { minMomentDuration: 2 };

      const moments = analyzer.identifyInterestingMoments(
        sceneChanges, 
        audioPeaks, 
        60, 
        config
      );

      // The combined moment should have boosted score
      const combinedMoment = moments.find(m => m.source === 'combined');
      expect(combinedMoment).toBeDefined();
      expect(combinedMoment.score).toBeGreaterThan(0.5);
    });

    it('should sort moments by score descending', () => {
      const sceneChanges = [
        { time: 5, type: 'scene_change', score: 0.3 },
        { time: 15, type: 'scene_change', score: 0.9 }
      ];
      const audioPeaks = [];
      const config = { minMomentDuration: 2 };

      const moments = analyzer.identifyInterestingMoments(
        sceneChanges, 
        audioPeaks, 
        60, 
        config
      );

      expect(moments[0].score).toBeGreaterThanOrEqual(moments[1].score);
    });
  });

  describe('generateSuggestedClips', () => {
    it('should generate clips from interesting moments', () => {
      const moments = [
        { time: 10, type: 'scene_change', score: 0.8, source: 'visual' },
        { time: 30, type: 'audio_activity', score: 0.6, source: 'audio' }
      ];
      const config = {
        minMomentDuration: 2,
        maxMomentDuration: 30,
        targetDuration: 20
      };

      const clips = analyzer.generateSuggestedClips(moments, 60, config);

      expect(clips.length).toBeGreaterThan(0);
      clips.forEach(clip => {
        expect(clip.start).toBeDefined();
        expect(clip.end).toBeDefined();
        expect(clip.duration).toBeGreaterThanOrEqual(config.minMomentDuration);
        expect(clip.end).toBeGreaterThan(clip.start);
      });
    });

    it('should avoid overlapping clips', () => {
      const moments = [
        { time: 10, type: 'scene_change', score: 0.9, source: 'visual' },
        { time: 11, type: 'scene_change', score: 0.8, source: 'visual' },
        { time: 12, type: 'scene_change', score: 0.7, source: 'visual' }
      ];
      const config = {
        minMomentDuration: 5,
        maxMomentDuration: 10,
        targetDuration: 30
      };

      const clips = analyzer.generateSuggestedClips(moments, 60, config);

      // Check for no overlaps
      for (let i = 0; i < clips.length - 1; i++) {
        expect(clips[i].end).toBeLessThanOrEqual(clips[i + 1].start);
      }
    });

    it('should respect target duration', () => {
      const moments = [
        { time: 10, type: 'scene_change', score: 0.8, source: 'visual' },
        { time: 25, type: 'scene_change', score: 0.7, source: 'visual' },
        { time: 40, type: 'scene_change', score: 0.6, source: 'visual' },
        { time: 55, type: 'scene_change', score: 0.5, source: 'visual' }
      ];
      const targetDuration = 15;
      const config = {
        minMomentDuration: 3,
        maxMomentDuration: 10,
        targetDuration
      };

      const clips = analyzer.generateSuggestedClips(moments, 60, config);
      const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);

      // Total duration should be around target (may vary due to minimum clip durations)
      expect(totalDuration).toBeLessThanOrEqual(targetDuration + 10);
    });

    it('should sort clips by start time', () => {
      const moments = [
        { time: 40, type: 'scene_change', score: 0.9, source: 'visual' },
        { time: 10, type: 'scene_change', score: 0.8, source: 'visual' },
        { time: 25, type: 'scene_change', score: 0.7, source: 'visual' }
      ];
      const config = {
        minMomentDuration: 2,
        maxMomentDuration: 10
      };

      const clips = analyzer.generateSuggestedClips(moments, 60, config);

      for (let i = 0; i < clips.length - 1; i++) {
        expect(clips[i].start).toBeLessThanOrEqual(clips[i + 1].start);
      }
    });
  });

  describe('getAnalysisSummary', () => {
    it('should return summary statistics', () => {
      const analysis = {
        duration: 60,
        interestingMoments: [
          { time: 10, score: 0.8 },
          { time: 30, score: 0.6 }
        ],
        suggestedClips: [
          { start: 8, end: 12, duration: 4, score: 0.8 },
          { start: 28, end: 32, duration: 4, score: 0.6 }
        ]
      };

      const summary = analyzer.getAnalysisSummary(analysis);

      expect(summary.originalDuration).toBe(60);
      expect(summary.totalMomentsDetected).toBe(2);
      expect(summary.suggestedClipsCount).toBe(2);
      expect(summary.suggestedDuration).toBe(8);
      expect(summary.timeSaved).toBe(52);
      expect(summary.compressionRatio).toBe('13.3%');
      expect(summary.averageClipScore).toBe('0.70');
    });

    it('should handle empty analysis', () => {
      const analysis = {
        duration: 60,
        interestingMoments: [],
        suggestedClips: []
      };

      const summary = analyzer.getAnalysisSummary(analysis);

      expect(summary.totalMomentsDetected).toBe(0);
      expect(summary.suggestedClipsCount).toBe(0);
      expect(summary.suggestedDuration).toBe(0);
      expect(summary.averageClipScore).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should not throw when cleaning up', () => {
      expect(() => analyzer.cleanup()).not.toThrow();
    });
  });
});
