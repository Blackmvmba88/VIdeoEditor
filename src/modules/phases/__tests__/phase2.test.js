/**
 * Phase 2 Modules Tests
 * Tests for Phase 2.0 and 2.1 modules
 */

const SmartChapters = require('../phase2/smartChapters');
const BeatSync = require('../phase2/beatSync');
const SpeechToText = require('../phase2/speechToText');

describe('Phase 2.0 - Auto-Edit 2.0', () => {
  describe('SmartChapters', () => {
    let smartChapters;

    beforeEach(() => {
      smartChapters = new SmartChapters();
    });

    test('should create instance', () => {
      expect(smartChapters).toBeDefined();
    });

    test('should detect chapters from analysis data', () => {
      const analysisData = {
        duration: 300,
        sceneChanges: [
          { time: 60, score: 0.8 },
          { time: 120, score: 0.7 },
          { time: 180, score: 0.9 },
          { time: 240, score: 0.6 }
        ]
      };
      
      const chapters = smartChapters.detectChapters(analysisData, {
        minChapterDuration: 30
      });
      
      expect(chapters.length).toBeGreaterThan(0);
      expect(chapters[0]).toHaveProperty('start');
      expect(chapters[0]).toHaveProperty('end');
      expect(chapters[0]).toHaveProperty('title');
    });

    test('should create single chapter when no scene changes', () => {
      const analysisData = {
        duration: 300,
        sceneChanges: []
      };
      
      const chapters = smartChapters.detectChapters(analysisData);
      expect(chapters.length).toBe(1);
      expect(chapters[0].start).toBe(0);
      expect(chapters[0].end).toBe(300);
    });

    test('should update chapter title', () => {
      const analysisData = {
        duration: 300,
        sceneChanges: [{ time: 60, score: 0.8 }]
      };
      
      smartChapters.detectChapters(analysisData);
      const chapters = smartChapters.getChapters();
      
      const updated = smartChapters.updateChapterTitle(chapters[0].id, 'New Title');
      expect(updated.title).toBe('New Title');
    });

    test('should export YouTube format', () => {
      const analysisData = {
        duration: 300,
        sceneChanges: [{ time: 60, score: 0.8 }, { time: 180, score: 0.9 }]
      };
      
      smartChapters.detectChapters(analysisData);
      const ytFormat = smartChapters.exportYouTubeFormat();
      
      expect(ytFormat).toContain('0:00');
    });

    test('should format time correctly', () => {
      expect(smartChapters.formatTime(0)).toBe('0:00');
      expect(smartChapters.formatTime(65)).toBe('1:05');
      expect(smartChapters.formatTime(3661)).toBe('1:01:01');
    });

    test('should have detection method constants', () => {
      const methods = SmartChapters.getDetectionMethods();
      expect(methods).toHaveProperty('SCENE_BASED');
      expect(methods).toHaveProperty('AUDIO_BASED');
      expect(methods).toHaveProperty('COMBINED');
    });

    test('should clear chapters', () => {
      smartChapters.detectChapters({ duration: 300, sceneChanges: [] });
      smartChapters.clear();
      expect(smartChapters.getChapters().length).toBe(0);
    });
  });

  describe('BeatSync', () => {
    let beatSync;

    beforeEach(() => {
      beatSync = new BeatSync();
    });

    test('should create instance', () => {
      expect(beatSync).toBeDefined();
    });

    test('should add manual beat', () => {
      const beat = beatSync.addManualBeat(1.0, 1);
      expect(beat).toBeDefined();
      expect(beat.time).toBe(1.0);
      expect(beat.strength).toBe(1);
      expect(beat.type).toBe('manual');
    });

    test('should remove beat', () => {
      const beat = beatSync.addManualBeat(1.0);
      expect(beatSync.removeBeat(beat.id)).toBe(true);
      expect(beatSync.getBeats().length).toBe(0);
    });

    test('should set BPM', () => {
      beatSync.setBPM(120, 60); // 120 BPM for 60 seconds
      const beats = beatSync.getBeats();
      expect(beats.length).toBeGreaterThan(0);
      expect(beats[0].type).toBe('bpm');
    });

    test('should generate sync points', () => {
      beatSync.setBPM(120, 30);
      
      const clips = [
        { id: 'clip1', duration: 5 },
        { id: 'clip2', duration: 5 },
        { id: 'clip3', duration: 5 }
      ];
      
      const syncPoints = beatSync.generateSyncPoints(clips);
      expect(syncPoints.length).toBeGreaterThan(0);
      expect(syncPoints[0]).toHaveProperty('clipId');
      expect(syncPoints[0]).toHaveProperty('beatTime');
    });

    test('should export and import data', () => {
      beatSync.addManualBeat(1.0);
      beatSync.addManualBeat(2.0);
      
      const data = beatSync.exportData();
      expect(data.beats.length).toBe(2);
      
      beatSync.clear();
      expect(beatSync.getBeats().length).toBe(0);
      
      beatSync.importData(data);
      expect(beatSync.getBeats().length).toBe(2);
    });

    test('should clear data', () => {
      beatSync.addManualBeat(1.0);
      beatSync.clear();
      expect(beatSync.getBeats().length).toBe(0);
      expect(beatSync.getSyncPoints().length).toBe(0);
    });
  });
});

describe('Phase 2.1 - Transcription & Subtitles', () => {
  describe('SpeechToText', () => {
    let stt;

    beforeEach(() => {
      stt = new SpeechToText();
    });

    test('should create instance', () => {
      expect(stt).toBeDefined();
    });

    test('should get supported languages', () => {
      const languages = stt.getSupportedLanguages();
      expect(languages).toHaveProperty('en');
      expect(languages).toHaveProperty('es');
      expect(languages).toHaveProperty('fr');
    });

    test('should format SRT time correctly', () => {
      expect(stt.formatSRTTime(0)).toBe('00:00:00,000');
      expect(stt.formatSRTTime(65.5)).toBe('00:01:05,500');
      expect(stt.formatSRTTime(3661.123)).toBe('01:01:01,123');
    });

    test('should format VTT time correctly', () => {
      expect(stt.formatVTTTime(0)).toBe('00:00:00.000');
      expect(stt.formatVTTTime(65.5)).toBe('00:01:05.500');
    });

    test('should have status constants', () => {
      const statuses = SpeechToText.getStatusConstants();
      expect(statuses).toHaveProperty('PENDING');
      expect(statuses).toHaveProperty('PROCESSING');
      expect(statuses).toHaveProperty('COMPLETED');
      expect(statuses).toHaveProperty('FAILED');
    });

    test('should start transcription', async () => {
      const job = await stt.startTranscription('/fake/path.mp4', {
        language: 'en',
        duration: 10
      });
      
      expect(job).toBeDefined();
      expect(job.language).toBe('en');
      expect(job.segments).toBeDefined();
    });

    test('should export SRT format', async () => {
      const job = await stt.startTranscription('/fake/path.mp4', {
        duration: 10
      });
      
      const srt = stt.exportSRT(job.id);
      expect(srt).toContain('-->');
    });

    test('should export VTT format', async () => {
      const job = await stt.startTranscription('/fake/path.mp4', {
        duration: 10
      });
      
      const vtt = stt.exportVTT(job.id);
      expect(vtt).toContain('WEBVTT');
    });

    test('should get transcription by ID', async () => {
      const job = await stt.startTranscription('/fake/path.mp4', {
        duration: 5
      });
      
      const retrieved = stt.getTranscription(job.id);
      expect(retrieved).toEqual(job);
    });

    test('should clear transcriptions', async () => {
      await stt.startTranscription('/fake/path.mp4', { duration: 5 });
      stt.clear();
      
      // Try to get a non-existent transcription
      expect(stt.getTranscription('any-id')).toBeNull();
    });
  });
});
