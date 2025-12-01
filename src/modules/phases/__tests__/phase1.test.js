/**
 * Phase 1 Modules Tests
 * Tests for Phase 1.1, 1.2, and 1.3 modules
 */

// Phase 1.1 tests
const ProxyManager = require('../phase1/proxyManager');
const HardwareAccelerator = require('../phase1/hardwareAccelerator');
const MemoryManager = require('../phase1/memoryManager');
const BackgroundProcessor = require('../phase1/backgroundProcessor');

// Phase 1.2 tests
const MultiTrackManager = require('../phase1/multiTrackManager');
const AudioMixer = require('../phase1/audioMixer');
const KeyframeManager = require('../phase1/keyframeManager');

// Phase 1.3 tests
const TransitionsManager = require('../phase1/transitionsManager');
const ColorCorrection = require('../phase1/colorCorrection');
const SpeedController = require('../phase1/speedController');

describe('Phase 1.1 - Performance Improvements', () => {
  describe('ProxyManager', () => {
    let proxyManager;

    beforeEach(() => {
      proxyManager = new ProxyManager();
    });

    test('should create a ProxyManager instance', () => {
      expect(proxyManager).toBeDefined();
    });

    test('should have resolution presets', () => {
      const presets = proxyManager.getResolutionPresets();
      expect(presets).toHaveProperty('low');
      expect(presets).toHaveProperty('medium');
      expect(presets).toHaveProperty('high');
    });

    test('should return null for non-existent proxy', () => {
      const proxy = proxyManager.getProxy('/non/existent/path.mp4');
      expect(proxy).toBeNull();
    });

    test('should throw error for non-existent file', async () => {
      await expect(proxyManager.generateProxy('/non/existent.mp4'))
        .rejects.toThrow('Input file not found');
    });

    test('cleanup should not throw', () => {
      expect(() => proxyManager.cleanup()).not.toThrow();
    });
  });

  describe('HardwareAccelerator', () => {
    let accelerator;

    beforeEach(() => {
      accelerator = new HardwareAccelerator();
    });

    test('should create instance', () => {
      expect(accelerator).toBeDefined();
    });

    test('should return supported accelerators', () => {
      const supported = accelerator.getSupportedAccelerators();
      expect(supported).toHaveProperty('nvidia');
      expect(supported).toHaveProperty('amd');
      expect(supported).toHaveProperty('intel');
    });

    test('should not be enabled by default', () => {
      expect(accelerator.isEnabled()).toBe(false);
    });

    test('should disable correctly', () => {
      accelerator.disable();
      expect(accelerator.isEnabled()).toBe(false);
    });
  });

  describe('MemoryManager', () => {
    let memoryManager;

    beforeEach(() => {
      memoryManager = new MemoryManager();
    });

    test('should create instance', () => {
      expect(memoryManager).toBeDefined();
    });

    test('should get memory stats', () => {
      const stats = memoryManager.getMemoryStats();
      expect(stats).toHaveProperty('heapUsed');
      expect(stats).toHaveProperty('systemTotal');
      expect(stats).toHaveProperty('formatted');
    });

    test('should format bytes correctly', () => {
      expect(memoryManager.formatBytes(0)).toBe('0 B');
      expect(memoryManager.formatBytes(1024)).toBe('1 KB');
      expect(memoryManager.formatBytes(1024 * 1024)).toBe('1 MB');
    });

    test('should manage caches', () => {
      const cache = memoryManager.getCache('test');
      expect(cache).toBeDefined();
      
      memoryManager.cacheItem('test', 'key1', 'value1', 100);
      expect(memoryManager.getCachedItem('test', 'key1')).toBe('value1');
    });

    test('should clear caches', () => {
      memoryManager.cacheItem('test', 'key1', 'value1', 100);
      memoryManager.clearAllCaches();
      expect(memoryManager.getCachedItem('test', 'key1')).toBeUndefined();
    });
  });

  describe('BackgroundProcessor', () => {
    let processor;

    beforeEach(() => {
      processor = new BackgroundProcessor();
    });

    test('should create instance', () => {
      expect(processor).toBeDefined();
    });

    test('should add job to queue', () => {
      const jobId = processor.addJob({
        name: 'Test Job',
        task: async () => 'result'
      });
      expect(jobId).toBeDefined();
    });

    test('should get job by ID', () => {
      const jobId = processor.addJob({
        name: 'Test Job',
        task: async () => 'result'
      });
      const job = processor.getJob(jobId);
      expect(job).toBeDefined();
      expect(job.name).toBe('Test Job');
    });

    test('should get queue status', () => {
      const status = processor.getQueueStatus();
      expect(status).toHaveProperty('totalJobs');
      expect(status).toHaveProperty('pendingJobs');
    });

    test('should have status constants', () => {
      const statuses = BackgroundProcessor.getStatusConstants();
      expect(statuses).toHaveProperty('PENDING');
      expect(statuses).toHaveProperty('RUNNING');
      expect(statuses).toHaveProperty('COMPLETED');
    });
  });
});

describe('Phase 1.2 - Essential Editing Tools', () => {
  describe('MultiTrackManager', () => {
    let trackManager;

    beforeEach(() => {
      trackManager = new MultiTrackManager();
    });

    test('should create instance', () => {
      expect(trackManager).toBeDefined();
    });

    test('should create a track', () => {
      const track = trackManager.createTrack({ name: 'Video Track 1' });
      expect(track).toBeDefined();
      expect(track.name).toBe('Video Track 1');
      expect(track.type).toBe('video');
    });

    test('should get track by ID', () => {
      const track = trackManager.createTrack({ name: 'Test Track' });
      const retrieved = trackManager.getTrack(track.id);
      expect(retrieved).toEqual(track);
    });

    test('should get all tracks', () => {
      trackManager.createTrack({ name: 'Track 1' });
      trackManager.createTrack({ name: 'Track 2' });
      const tracks = trackManager.getAllTracks();
      expect(tracks.length).toBe(2);
    });

    test('should add clip to track', () => {
      const track = trackManager.createTrack();
      const clip = trackManager.addClipToTrack(track.id, {
        source: '/path/to/video.mp4',
        duration: 10
      });
      expect(clip).toBeDefined();
      expect(clip.source).toBe('/path/to/video.mp4');
    });

    test('should delete track', () => {
      const track = trackManager.createTrack();
      expect(trackManager.deleteTrack(track.id)).toBe(true);
      expect(trackManager.getTrack(track.id)).toBeNull();
    });

    test('should have track type constants', () => {
      const types = MultiTrackManager.getTrackTypes();
      expect(types).toHaveProperty('VIDEO');
      expect(types).toHaveProperty('AUDIO');
    });
  });

  describe('AudioMixer', () => {
    let mixer;

    beforeEach(() => {
      mixer = new AudioMixer();
    });

    test('should create instance', () => {
      expect(mixer).toBeDefined();
    });

    test('should create audio channel', () => {
      const channel = mixer.createChannel({ name: 'Channel 1' });
      expect(channel).toBeDefined();
      expect(channel.name).toBe('Channel 1');
      expect(channel.volume).toBe(1.0);
    });

    test('should set channel volume', () => {
      const channel = mixer.createChannel();
      mixer.setChannelVolume(channel.id, 0.5);
      const updated = mixer.getChannel(channel.id);
      expect(updated.volume).toBe(0.5);
    });

    test('should set master volume', () => {
      mixer.setMasterVolume(0.8);
      const settings = mixer.getMasterSettings();
      expect(settings.volume).toBe(0.8);
    });

    test('should calculate effective volume', () => {
      const channel = mixer.createChannel();
      mixer.setChannelVolume(channel.id, 0.5);
      mixer.setMasterVolume(0.8);
      expect(mixer.getEffectiveVolume(channel.id)).toBe(0.4);
    });

    test('should reset mixer', () => {
      mixer.createChannel();
      mixer.reset();
      expect(mixer.getAllChannels().length).toBe(0);
    });
  });

  describe('KeyframeManager', () => {
    let keyframeManager;

    beforeEach(() => {
      keyframeManager = new KeyframeManager();
    });

    test('should create instance', () => {
      expect(keyframeManager).toBeDefined();
    });

    test('should add keyframe', () => {
      const kf = keyframeManager.addKeyframe('clip1', 'opacity', 0, 1);
      expect(kf).toBeDefined();
      expect(kf.value).toBe(1);
    });

    test('should get value at time', () => {
      keyframeManager.addKeyframe('clip1', 'opacity', 0, 0);
      keyframeManager.addKeyframe('clip1', 'opacity', 10, 1);
      
      const value = keyframeManager.getValueAtTime('clip1', 'opacity', 5);
      expect(value).toBe(0.5);
    });

    test('should get animated properties', () => {
      keyframeManager.addKeyframe('clip1', 'opacity', 0, 1);
      keyframeManager.addKeyframe('clip1', 'positionX', 0, 0);
      
      const props = keyframeManager.getAnimatedProperties('clip1');
      expect(props).toContain('opacity');
      expect(props).toContain('positionX');
    });

    test('should have easing types', () => {
      const easings = KeyframeManager.getEasingTypes();
      expect(easings).toHaveProperty('LINEAR');
      expect(easings).toHaveProperty('EASE_IN');
      expect(easings).toHaveProperty('EASE_OUT');
    });

    test('should clear all animations', () => {
      keyframeManager.addKeyframe('clip1', 'opacity', 0, 1);
      keyframeManager.clear();
      expect(keyframeManager.getKeyframes('clip1', 'opacity').length).toBe(0);
    });
  });
});

describe('Phase 1.3 - Transitions and Effects', () => {
  describe('TransitionsManager', () => {
    let transitionsManager;

    beforeEach(() => {
      transitionsManager = new TransitionsManager();
    });

    test('should create instance', () => {
      expect(transitionsManager).toBeDefined();
    });

    test('should get presets', () => {
      const presets = transitionsManager.getPresets();
      expect(presets).toHaveProperty('fadeIn');
      expect(presets).toHaveProperty('crossDissolve');
      expect(presets).toHaveProperty('wipeLeft');
    });

    test('should add transition', () => {
      const transition = transitionsManager.addTransition({
        presetKey: 'crossDissolve',
        clipAId: 'clip1',
        clipBId: 'clip2',
        duration: 1.0
      });
      expect(transition).toBeDefined();
      expect(transition.presetKey).toBe('crossDissolve');
    });

    test('should get transition by ID', () => {
      const transition = transitionsManager.addTransition({
        presetKey: 'fadeIn',
        clipAId: 'clip1',
        clipBId: 'clip2'
      });
      const retrieved = transitionsManager.getTransition(transition.id);
      expect(retrieved).toEqual(transition);
    });

    test('should remove transition', () => {
      const transition = transitionsManager.addTransition({
        presetKey: 'fadeIn',
        clipAId: 'clip1',
        clipBId: 'clip2'
      });
      expect(transitionsManager.removeTransition(transition.id)).toBe(true);
      expect(transitionsManager.getTransition(transition.id)).toBeNull();
    });

    test('should have transition type constants', () => {
      const types = TransitionsManager.getTransitionTypes();
      expect(types).toHaveProperty('FADE');
      expect(types).toHaveProperty('DISSOLVE');
      expect(types).toHaveProperty('WIPE');
    });
  });

  describe('ColorCorrection', () => {
    let colorCorrection;

    beforeEach(() => {
      colorCorrection = new ColorCorrection();
    });

    test('should create instance', () => {
      expect(colorCorrection).toBeDefined();
    });

    test('should create correction', () => {
      const correction = colorCorrection.createCorrection('clip1', { brightness: 0.1 });
      expect(correction).toBeDefined();
      expect(correction.values.brightness).toBe(0.1);
    });

    test('should apply preset', () => {
      const correction = colorCorrection.applyPreset('clip1', 'cinematic');
      expect(correction).toBeDefined();
      expect(correction.values.contrast).toBeGreaterThan(1);
    });

    test('should reset correction', () => {
      colorCorrection.createCorrection('clip1', { brightness: 0.5 });
      const reset = colorCorrection.resetCorrection('clip1');
      expect(reset.values.brightness).toBe(0);
    });

    test('should get presets', () => {
      const presets = colorCorrection.getPresets();
      expect(presets).toHaveProperty('cinematic');
      expect(presets).toHaveProperty('warm');
      expect(presets).toHaveProperty('cool');
    });

    test('should generate FFmpeg filter', () => {
      colorCorrection.createCorrection('clip1', { brightness: 0.2, contrast: 1.2 });
      const filter = colorCorrection.generateFilter('clip1');
      expect(filter).toContain('eq=');
    });
  });

  describe('SpeedController', () => {
    let speedController;

    beforeEach(() => {
      speedController = new SpeedController();
    });

    test('should create instance', () => {
      expect(speedController).toBeDefined();
    });

    test('should set constant speed', () => {
      const speedChange = speedController.setConstantSpeed('clip1', 2);
      expect(speedChange).toBeDefined();
      expect(speedChange.speed).toBe(2);
    });

    test('should apply speed preset', () => {
      const speedChange = speedController.applyPreset('clip1', 'slowmo2x');
      expect(speedChange.speed).toBe(0.5);
    });

    test('should set reverse', () => {
      const speedChange = speedController.setReverse('clip1');
      expect(speedChange.speed).toBe(-1);
      expect(speedChange.type).toBe('reverse');
    });

    test('should create freeze frame', () => {
      const freeze = speedController.createFreezeFrame('clip1', 5, 3);
      expect(freeze.freezeTime).toBe(5);
      expect(freeze.duration).toBe(3);
    });

    test('should calculate new duration', () => {
      speedController.setConstantSpeed('clip1', 2);
      const newDuration = speedController.calculateNewDuration('clip1', 10);
      expect(newDuration).toBe(5);
    });

    test('should get presets', () => {
      const presets = speedController.getPresets();
      expect(presets).toHaveProperty('slowmo2x');
      expect(presets).toHaveProperty('fast2x');
      expect(presets).toHaveProperty('reverse');
    });

    test('should generate FFmpeg filter', () => {
      speedController.setConstantSpeed('clip1', 2);
      const filters = speedController.generateFilter('clip1');
      expect(filters.video).toContain('setpts');
    });
  });
});
