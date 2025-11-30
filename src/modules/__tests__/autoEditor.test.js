/**
 * Auto Editor Module Tests
 */

const AutoEditor = require('../autoEditor');

describe('AutoEditor', () => {
  let autoEditor;

  beforeEach(() => {
    autoEditor = new AutoEditor();
  });

  afterEach(() => {
    autoEditor.cleanup();
  });

  describe('constructor', () => {
    it('should create an AutoEditor instance', () => {
      expect(autoEditor).toBeInstanceOf(AutoEditor);
    });

    it('should have video processor', () => {
      expect(autoEditor.videoProcessor).toBeDefined();
    });

    it('should have content analyzer', () => {
      expect(autoEditor.contentAnalyzer).toBeDefined();
    });

    it('should have export presets', () => {
      expect(autoEditor.exportPresets).toBeDefined();
    });
  });

  describe('autoEdit', () => {
    it('should throw error for non-existent file', async () => {
      await expect(autoEditor.autoEdit('/nonexistent/file.mp4', '/output.mp4'))
        .rejects.toThrow('Input file not found');
    });
  });

  describe('selectHighlights', () => {
    it('should select clips sorted by score', () => {
      const clips = [
        { start: 0, end: 5, duration: 5, score: 0.5 },
        { start: 10, end: 15, duration: 5, score: 0.9 },
        { start: 20, end: 25, duration: 5, score: 0.7 }
      ];
      const config = { targetDuration: 10 };

      const selected = autoEditor.selectHighlights(clips, config);

      // Should select the two highest scoring clips
      expect(selected.length).toBe(2);
      // Should be sorted by start time
      expect(selected[0].start).toBeLessThan(selected[1].start);
    });

    it('should respect target duration', () => {
      const clips = [
        { start: 0, end: 10, duration: 10, score: 0.9 },
        { start: 15, end: 25, duration: 10, score: 0.8 },
        { start: 30, end: 40, duration: 10, score: 0.7 }
      ];
      const config = { targetDuration: 15 };

      const selected = autoEditor.selectHighlights(clips, config);

      const totalDuration = selected.reduce((sum, c) => sum + c.duration, 0);
      expect(totalDuration).toBeLessThanOrEqual(20);
    });

    it('should select all clips when no target duration', () => {
      const clips = [
        { start: 0, end: 5, duration: 5, score: 0.5 },
        { start: 10, end: 15, duration: 5, score: 0.9 }
      ];
      const config = {};

      const selected = autoEditor.selectHighlights(clips, config);

      expect(selected.length).toBe(2);
    });
  });

  describe('createSummary', () => {
    it('should select clips from different segments', () => {
      const clips = [
        { start: 5, end: 10, duration: 5, score: 0.8 },
        { start: 25, end: 30, duration: 5, score: 0.7 },
        { start: 45, end: 50, duration: 5, score: 0.6 },
        { start: 55, end: 58, duration: 3, score: 0.9 }
      ];
      const config = { 
        targetDuration: 15,
        maxClipDuration: 10
      };

      const selected = autoEditor.createSummary(clips, 60, config);

      // Should select clips distributed across the video
      expect(selected.length).toBeGreaterThan(0);
    });

    it('should sort clips by start time', () => {
      const clips = [
        { start: 50, end: 55, duration: 5, score: 0.9 },
        { start: 10, end: 15, duration: 5, score: 0.7 },
        { start: 30, end: 35, duration: 5, score: 0.8 }
      ];
      const config = { 
        targetDuration: 15,
        maxClipDuration: 10
      };

      const selected = autoEditor.createSummary(clips, 60, config);

      for (let i = 0; i < selected.length - 1; i++) {
        expect(selected[i].start).toBeLessThanOrEqual(selected[i + 1].start);
      }
    });
  });

  describe('selectActionMoments', () => {
    it('should prioritize combined source clips', () => {
      const clips = [
        { start: 0, end: 5, duration: 5, score: 0.6, source: 'visual' },
        { start: 10, end: 15, duration: 5, score: 0.7, source: 'combined' },
        { start: 20, end: 25, duration: 5, score: 0.5, source: 'audio' }
      ];
      const config = {};

      const selected = autoEditor.selectActionMoments(clips, config);

      expect(selected.length).toBeGreaterThan(0);
      // Combined source clip should be included
      expect(selected.some(c => c.source === 'combined')).toBe(true);
    });

    it('should include high-score clips if not enough combined clips', () => {
      const clips = [
        { start: 0, end: 5, duration: 5, score: 0.9, source: 'visual' },
        { start: 10, end: 15, duration: 5, score: 0.8, source: 'audio' }
      ];
      const config = {};

      const selected = autoEditor.selectActionMoments(clips, config);

      expect(selected.length).toBeGreaterThan(0);
    });

    it('should respect target duration', () => {
      const clips = [
        { start: 0, end: 10, duration: 10, score: 0.9, source: 'combined' },
        { start: 15, end: 25, duration: 10, score: 0.8, source: 'combined' },
        { start: 30, end: 40, duration: 10, score: 0.7, source: 'combined' }
      ];
      const config = { targetDuration: 15 };

      const selected = autoEditor.selectActionMoments(clips, config);

      const totalDuration = selected.reduce((sum, c) => sum + c.duration, 0);
      expect(totalDuration).toBeLessThanOrEqual(20);
    });
  });

  describe('getAvailableStyles', () => {
    it('should return array of styles', () => {
      const styles = autoEditor.getAvailableStyles();

      expect(Array.isArray(styles)).toBe(true);
      expect(styles.length).toBeGreaterThan(0);
    });

    it('should include highlights style', () => {
      const styles = autoEditor.getAvailableStyles();
      const highlights = styles.find(s => s.key === 'highlights');

      expect(highlights).toBeDefined();
      expect(highlights.name).toBe('Mejores Momentos');
      expect(highlights.nameEn).toBe('Highlights');
    });

    it('should include summary style', () => {
      const styles = autoEditor.getAvailableStyles();
      const summary = styles.find(s => s.key === 'summary');

      expect(summary).toBeDefined();
      expect(summary.name).toBe('Resumen');
      expect(summary.nameEn).toBe('Summary');
    });

    it('should include action style', () => {
      const styles = autoEditor.getAvailableStyles();
      const action = styles.find(s => s.key === 'action');

      expect(action).toBeDefined();
      expect(action.name).toBe('Acción');
      expect(action.nameEn).toBe('Action');
    });

    it('each style should have required properties', () => {
      const styles = autoEditor.getAvailableStyles();

      styles.forEach(style => {
        expect(style.key).toBeDefined();
        expect(style.name).toBeDefined();
        expect(style.nameEn).toBeDefined();
        expect(style.description).toBeDefined();
        expect(style.descriptionEn).toBeDefined();
      });
    });
  });

  describe('estimateProcessingTime', () => {
    it('should return estimate object', () => {
      const estimate = autoEditor.estimateProcessingTime(60);

      expect(estimate.analysis).toBeDefined();
      expect(estimate.cutting).toBeDefined();
      expect(estimate.joining).toBeDefined();
      expect(estimate.total).toBeDefined();
      expect(estimate.formatted).toBeDefined();
    });

    it('should scale with video duration', () => {
      const estimate30s = autoEditor.estimateProcessingTime(30);
      const estimate60s = autoEditor.estimateProcessingTime(60);

      expect(estimate60s.total).toBeGreaterThan(estimate30s.total);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds less than a minute', () => {
      const formatted = autoEditor.formatDuration(45);
      expect(formatted).toBe('45 segundos');
    });

    it('should format exactly one minute', () => {
      const formatted = autoEditor.formatDuration(60);
      expect(formatted).toBe('1 minuto');
    });

    it('should format multiple minutes', () => {
      const formatted = autoEditor.formatDuration(120);
      expect(formatted).toBe('2 minutos');
    });

    it('should format minutes and seconds', () => {
      const formatted = autoEditor.formatDuration(90);
      expect(formatted).toBe('1:30 minutos');
    });
  });

  describe('cleanup', () => {
    it('should not throw when cleaning up', () => {
      expect(() => autoEditor.cleanup()).not.toThrow();
    });
  });
});
