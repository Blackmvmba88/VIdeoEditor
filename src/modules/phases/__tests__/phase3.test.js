/**
 * BlackMamba Studio - Phase 3 Tests
 * Motion Graphics, Lower Thirds, Audio AI y herramientas relacionadas
 */

const MotionGraphics = require('../phase3/motionGraphics');
const LowerThirds = require('../phase3/lowerThirds');
const AnimatedTitles = require('../phase3/animatedTitles');
const EmojisCallouts = require('../phase3/emojisCallouts');
const SocialBanners = require('../phase3/socialBanners');
const AudioAI = require('../phase3/audioAI');
const AudioDenoise = require('../phase3/audioDenoise');
const AutoEQ = require('../phase3/autoEQ');
const AudioMixing = require('../phase3/audioMixing');
const VolumeNormalizer = require('../phase3/volumeNormalizer');
const MusicSync = require('../phase3/musicSync');

describe('Phase 3 - Motion Graphics Pro', () => {
  
  describe('MotionGraphics', () => {
    let motionGraphics;

    beforeEach(() => {
      motionGraphics = new MotionGraphics();
    });

    it('should create a MotionGraphics instance', () => {
      expect(motionGraphics).toBeInstanceOf(MotionGraphics);
    });

    it('should have templates loaded', () => {
      expect(motionGraphics.templates).toBeDefined();
      expect(motionGraphics.templates.size).toBeGreaterThan(0);
    });

    it('should get all templates', () => {
      const templates = motionGraphics.getTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should get a specific template by ID', () => {
      const template = motionGraphics.getTemplate('fade-in');
      expect(template).toBeDefined();
      expect(template.name).toBe('Fade In');
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        motionGraphics.getTemplate('non-existent');
      }).toThrow();
    });

    it('should have default templates (fade-in, slide-in, zoom-in)', () => {
      expect(motionGraphics.templates.has('fade-in')).toBe(true);
      expect(motionGraphics.templates.has('slide-in')).toBe(true);
      expect(motionGraphics.templates.has('zoom-in')).toBe(true);
    });
  });

  describe('LowerThirds', () => {
    let lowerThirds;

    beforeEach(() => {
      lowerThirds = new LowerThirds();
    });

    it('should create a LowerThirds instance', () => {
      expect(lowerThirds).toBeInstanceOf(LowerThirds);
    });

    it('should have presets loaded', () => {
      expect(lowerThirds.presets).toBeDefined();
      expect(lowerThirds.presets.size).toBeGreaterThan(0);
    });

    it('should have modern-minimal preset', () => {
      expect(lowerThirds.presets.has('modern-minimal')).toBe(true);
      const preset = lowerThirds.presets.get('modern-minimal');
      expect(preset.name).toBe('Modern Minimal');
    });

    it('should have news-broadcast preset', () => {
      expect(lowerThirds.presets.has('news-broadcast')).toBe(true);
    });

    it('should have corporate preset', () => {
      expect(lowerThirds.presets.has('corporate')).toBe(true);
    });

    it('presets should have required properties', () => {
      const preset = lowerThirds.presets.get('modern-minimal');
      expect(preset.colors).toBeDefined();
      expect(preset.font).toBeDefined();
      expect(preset.animation).toBeDefined();
      expect(preset.position).toBeDefined();
    });
  });

  describe('AnimatedTitles', () => {
    let animatedTitles;

    beforeEach(() => {
      animatedTitles = new AnimatedTitles();
    });

    it('should create an AnimatedTitles instance', () => {
      expect(animatedTitles).toBeInstanceOf(AnimatedTitles);
    });

    it('should have animations defined', () => {
      expect(animatedTitles.animations).toBeDefined();
      expect(animatedTitles.animations.size).toBeGreaterThan(0);
    });

    it('should have typewriter animation', () => {
      expect(animatedTitles.animations.has('typewriter')).toBe(true);
    });

    it('should have glitch animation', () => {
      expect(animatedTitles.animations.has('glitch')).toBe(true);
    });
  });

  describe('EmojisCallouts', () => {
    let emojisCallouts;

    beforeEach(() => {
      emojisCallouts = new EmojisCallouts();
    });

    it('should create an EmojisCallouts instance', () => {
      expect(emojisCallouts).toBeInstanceOf(EmojisCallouts);
    });

    it('should have emojis and callouts collections', () => {
      expect(emojisCallouts.emojis).toBeDefined();
      expect(emojisCallouts.callouts).toBeDefined();
    });
  });

  describe('SocialBanners', () => {
    let socialBanners;

    beforeEach(() => {
      socialBanners = new SocialBanners();
    });

    it('should create a SocialBanners instance', () => {
      expect(socialBanners).toBeInstanceOf(SocialBanners);
    });

    it('should have platform configurations', () => {
      expect(socialBanners.platforms).toBeDefined();
    });
  });
});

describe('Phase 3 - Audio AI', () => {
  
  describe('AudioAI', () => {
    let audioAI;

    beforeEach(() => {
      audioAI = new AudioAI();
    });

    it('should create an AudioAI instance', () => {
      expect(audioAI).toBeInstanceOf(AudioAI);
    });

    it('should have profiles loaded', () => {
      expect(audioAI.profiles).toBeDefined();
      expect(audioAI.profiles.size).toBeGreaterThan(0);
    });

    it('should have podcast profile', () => {
      expect(audioAI.profiles.has('podcast')).toBe(true);
      const profile = audioAI.profiles.get('podcast');
      expect(profile.name).toBe('Podcast');
      expect(profile.settings.denoise.enabled).toBe(true);
    });

    it('should have vlog profile', () => {
      expect(audioAI.profiles.has('vlog')).toBe(true);
    });

    it('should have interview profile', () => {
      expect(audioAI.profiles.has('interview')).toBe(true);
    });

    it('should have cinematic profile', () => {
      expect(audioAI.profiles.has('cinematic')).toBe(true);
    });

    it('should have music-video profile', () => {
      expect(audioAI.profiles.has('music-video')).toBe(true);
    });
  });

  describe('AudioDenoise', () => {
    let audioDenoise;

    beforeEach(() => {
      audioDenoise = new AudioDenoise();
    });

    it('should create an AudioDenoise instance', () => {
      expect(audioDenoise).toBeInstanceOf(AudioDenoise);
    });
  });

  describe('AutoEQ', () => {
    let autoEQ;

    beforeEach(() => {
      autoEQ = new AutoEQ();
    });

    it('should create an AutoEQ instance', () => {
      expect(autoEQ).toBeInstanceOf(AutoEQ);
    });
  });

  describe('AudioMixing', () => {
    let audioMixing;

    beforeEach(() => {
      audioMixing = new AudioMixing();
    });

    it('should create an AudioMixing instance', () => {
      expect(audioMixing).toBeInstanceOf(AudioMixing);
    });
  });

  describe('VolumeNormalizer', () => {
    let volumeNormalizer;

    beforeEach(() => {
      volumeNormalizer = new VolumeNormalizer();
    });

    it('should create a VolumeNormalizer instance', () => {
      expect(volumeNormalizer).toBeInstanceOf(VolumeNormalizer);
    });
  });

  describe('MusicSync', () => {
    let musicSync;

    beforeEach(() => {
      musicSync = new MusicSync();
    });

    it('should create a MusicSync instance', () => {
      expect(musicSync).toBeInstanceOf(MusicSync);
    });
  });
});

// Phase 3.2 - Color Grading
const ColorWheels = require('../phase3/colorWheels');
const VideoScopes = require('../phase3/videoScopes');
const LUTManager = require('../phase3/lutManager');
const ColorMatch = require('../phase3/colorMatch');

describe('Phase 3.2 - Color Grading', () => {
  
  describe('ColorWheels', () => {
    let colorWheels;

    beforeEach(() => {
      colorWheels = new ColorWheels();
    });

    it('should create a ColorWheels instance', () => {
      expect(colorWheels).toBeInstanceOf(ColorWheels);
    });

    it('should have default settings', () => {
      const settings = colorWheels.getCurrentSettings();
      expect(settings.shadows).toEqual({ r: 1.0, g: 1.0, b: 1.0 });
      expect(settings.midtones).toEqual({ r: 1.0, g: 1.0, b: 1.0 });
      expect(settings.highlights).toEqual({ r: 1.0, g: 1.0, b: 1.0 });
      expect(settings.saturation).toBe(1.0);
    });

    it('should get available presets', () => {
      const presets = colorWheels.getPresets();
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.find(p => p.id === 'cinematic')).toBeDefined();
      expect(presets.find(p => p.id === 'teal_orange')).toBeDefined();
    });

    it('should set shadows', () => {
      colorWheels.setShadows({ r: 0.9, b: 1.1 });
      const settings = colorWheels.getCurrentSettings();
      expect(settings.shadows.r).toBe(0.9);
      expect(settings.shadows.b).toBe(1.1);
    });

    it('should set midtones', () => {
      colorWheels.setMidtones({ g: 1.1 });
      const settings = colorWheels.getCurrentSettings();
      expect(settings.midtones.g).toBe(1.1);
    });

    it('should set highlights', () => {
      colorWheels.setHighlights({ r: 1.2 });
      const settings = colorWheels.getCurrentSettings();
      expect(settings.highlights.r).toBe(1.2);
    });

    it('should set saturation with clamping', () => {
      colorWheels.setSaturation(2.5);
      expect(colorWheels.getCurrentSettings().saturation).toBe(2);
      colorWheels.setSaturation(-0.5);
      expect(colorWheels.getCurrentSettings().saturation).toBe(0);
    });

    it('should apply preset', () => {
      colorWheels.applyPreset('cinematic');
      const settings = colorWheels.getCurrentSettings();
      expect(settings.shadows.b).toBe(1.1);
      expect(settings.highlights.r).toBe(1.1);
    });

    it('should throw error for invalid preset', () => {
      expect(() => colorWheels.applyPreset('invalid')).toThrow();
    });

    it('should reset to defaults', () => {
      colorWheels.setSaturation(0.5);
      colorWheels.reset();
      expect(colorWheels.getCurrentSettings().saturation).toBe(1.0);
    });

    it('should generate FFmpeg filter', () => {
      colorWheels.setShadows({ r: 0.9 });
      const filter = colorWheels.generateFilter();
      expect(filter).toContain('colorbalance');
    });
  });

  describe('VideoScopes', () => {
    let videoScopes;

    beforeEach(() => {
      videoScopes = new VideoScopes();
    });

    it('should create a VideoScopes instance', () => {
      expect(videoScopes).toBeInstanceOf(VideoScopes);
    });

    it('should have default active scope', () => {
      expect(videoScopes.getActiveScope()).toBe('vectorscope');
    });

    it('should get available scope types', () => {
      const types = videoScopes.getScopeTypes();
      expect(types.length).toBeGreaterThan(0);
      expect(types.find(t => t.id === 'vectorscope')).toBeDefined();
      expect(types.find(t => t.id === 'waveform')).toBeDefined();
      expect(types.find(t => t.id === 'histogram')).toBeDefined();
    });

    it('should set active scope', () => {
      videoScopes.setActiveScope('histogram');
      expect(videoScopes.getActiveScope()).toBe('histogram');
    });

    it('should throw error for invalid scope type', () => {
      expect(() => videoScopes.setActiveScope('invalid')).toThrow();
    });

    it('should have scopeTypes property', () => {
      expect(videoScopes.scopeTypes).toBeDefined();
      expect(videoScopes.scopeTypes.vectorscope.filter).toBeDefined();
    });
  });

  describe('LUTManager', () => {
    let lutManager;

    beforeEach(() => {
      lutManager = new LUTManager();
    });

    it('should create a LUTManager instance', () => {
      expect(lutManager).toBeInstanceOf(LUTManager);
    });

    it('should get built-in LUTs', () => {
      const luts = lutManager.getBuiltInLuts();
      expect(luts.length).toBeGreaterThan(0);
      expect(luts.find(l => l.id === 'cinematic_teal_orange')).toBeDefined();
      expect(luts.find(l => l.id === 'vintage_film')).toBeDefined();
    });

    it('should get supported formats', () => {
      const formats = lutManager.getSupportedFormats();
      expect(formats).toContain('.cube');
      expect(formats).toContain('.3dl');
    });

    it('should get all LUTs', () => {
      const allLuts = lutManager.getAllLuts();
      expect(allLuts.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent LUT file', () => {
      expect(() => lutManager.importLut('/nonexistent.cube')).toThrow();
    });

    it('should throw error for invalid LUT format', () => {
      // Create a mock file check scenario
      const fs = require('fs');
      const originalExistsSync = fs.existsSync;
      fs.existsSync = jest.fn().mockReturnValue(true);
      
      expect(() => lutManager.importLut('/test.invalid', 'Test')).toThrow();
      
      fs.existsSync = originalExistsSync;
    });

    it('should throw error for invalid LUT id on apply', async () => {
      await expect(lutManager.applyLut('/input.mp4', '/output.mp4', 'invalid'))
        .rejects.toThrow();
    });

    it('should have builtInLuts property', () => {
      expect(lutManager.builtInLuts).toBeDefined();
      expect(lutManager.builtInLuts.noir).toBeDefined();
    });
  });

  describe('ColorMatch', () => {
    let colorMatch;

    beforeEach(() => {
      colorMatch = new ColorMatch();
    });

    it('should create a ColorMatch instance', () => {
      expect(colorMatch).toBeInstanceOf(ColorMatch);
    });

    it('should get match methods', () => {
      const methods = colorMatch.getMatchMethods();
      expect(methods.length).toBeGreaterThan(0);
      expect(methods.find(m => m.id === 'histogram')).toBeDefined();
    });

    it('should not have reference by default', () => {
      expect(colorMatch.getReference()).toBeNull();
    });

    it('should clear reference', () => {
      colorMatch.referenceFrame = { path: '/test' };
      colorMatch.clearReference();
      expect(colorMatch.getReference()).toBeNull();
    });

    it('should throw error when matching without reference', async () => {
      await expect(colorMatch.matchToReference('/input.mp4', '/output.mp4'))
        .rejects.toThrow();
    });

    it('should have matchMethods property', () => {
      expect(colorMatch.matchMethods).toBeDefined();
      expect(colorMatch.matchMethods.histogram).toBeDefined();
    });
  });
});

// Phase 3.3 - VFX Básicos
const ChromaKey = require('../phase3/chromaKey');
const MotionTracking = require('../phase3/motionTracking');
const BlurGlow = require('../phase3/blurGlow');
const Masking = require('../phase3/masking');

describe('Phase 3.3 - VFX Básicos', () => {
  
  describe('ChromaKey', () => {
    let chromaKey;

    beforeEach(() => {
      chromaKey = new ChromaKey();
    });

    it('should create a ChromaKey instance', () => {
      expect(chromaKey).toBeInstanceOf(ChromaKey);
    });

    it('should get chroma colors', () => {
      const colors = chromaKey.getChromaColors();
      expect(colors.length).toBe(3);
      expect(colors.find(c => c.id === 'green')).toBeDefined();
      expect(colors.find(c => c.id === 'blue')).toBeDefined();
    });

    it('should get quality presets', () => {
      const presets = chromaKey.getQualityPresets();
      expect(presets.length).toBe(3);
      expect(presets.find(p => p.id === 'fast')).toBeDefined();
      expect(presets.find(p => p.id === 'quality')).toBeDefined();
    });

    it('should have default settings', () => {
      const settings = chromaKey.getCurrentSettings();
      expect(settings.colorKey).toBe('green');
      expect(settings.similarity).toBe(0.15);
    });

    it('should set chroma color', () => {
      chromaKey.setChromaColor('blue');
      expect(chromaKey.getCurrentSettings().colorKey).toBe('blue');
    });

    it('should throw error for invalid chroma color', () => {
      expect(() => chromaKey.setChromaColor('invalid')).toThrow();
    });

    it('should set similarity with clamping', () => {
      chromaKey.setSimilarity(1.5);
      expect(chromaKey.getCurrentSettings().similarity).toBe(1);
      chromaKey.setSimilarity(-0.5);
      expect(chromaKey.getCurrentSettings().similarity).toBe(0);
    });

    it('should apply quality preset', () => {
      chromaKey.applyQualityPreset('quality');
      expect(chromaKey.getCurrentSettings().similarity).toBe(0.1);
    });

    it('should throw error for invalid preset', () => {
      expect(() => chromaKey.applyQualityPreset('invalid')).toThrow();
    });

    it('should generate filter', () => {
      const filter = chromaKey.generateFilter();
      expect(filter).toContain('chromakey');
    });

    it('should include despill for green', () => {
      chromaKey.setSpillRemoval(true);
      const filter = chromaKey.generateFilter();
      expect(filter).toContain('despill');
    });
  });

  describe('MotionTracking', () => {
    let motionTracking;

    beforeEach(() => {
      motionTracking = new MotionTracking();
    });

    it('should create a MotionTracking instance', () => {
      expect(motionTracking).toBeInstanceOf(MotionTracking);
    });

    it('should get stabilization modes', () => {
      const modes = motionTracking.getStabilizationModes();
      expect(modes.length).toBe(3);
      expect(modes.find(m => m.id === 'light')).toBeDefined();
      expect(modes.find(m => m.id === 'heavy')).toBeDefined();
    });

    it('should get tracking types', () => {
      const types = motionTracking.getTrackingTypes();
      expect(types.length).toBe(3);
      expect(types.find(t => t.id === 'point')).toBeDefined();
      expect(types.find(t => t.id === 'face')).toBeDefined();
    });

    it('should have empty tracking data initially', () => {
      expect(motionTracking.getTrackingData()).toEqual([]);
    });

    it('should clear tracking data', () => {
      motionTracking.trackingData = [{ x: 0, y: 0 }];
      motionTracking.clearTrackingData();
      expect(motionTracking.getTrackingData()).toEqual([]);
    });

    it('should apply tracking to element', () => {
      const data = [{ x: 10, y: 20 }, { x: 15, y: 25 }];
      const element = { offsetX: 5, offsetY: 5 };
      const result = motionTracking.applyTrackingToElement(data, element);
      
      expect(result.keyframes).toHaveLength(2);
      expect(result.keyframes[0].x).toBe(15); // 10 + 5
    });

    it('should throw error for invalid stabilization mode', async () => {
      await expect(motionTracking.stabilize('/input.mp4', '/output.mp4', { mode: 'invalid' }))
        .rejects.toThrow();
    });
  });

  describe('BlurGlow', () => {
    let blurGlow;

    beforeEach(() => {
      blurGlow = new BlurGlow();
    });

    it('should create a BlurGlow instance', () => {
      expect(blurGlow).toBeInstanceOf(BlurGlow);
    });

    it('should get blur types', () => {
      const types = blurGlow.getBlurTypes();
      expect(types.length).toBe(3);
      expect(types.find(t => t.id === 'gaussian')).toBeDefined();
      expect(types.find(t => t.id === 'motion')).toBeDefined();
    });

    it('should get intensity presets', () => {
      const presets = blurGlow.getIntensityPresets();
      expect(presets.length).toBe(4);
      expect(presets.find(p => p.id === 'subtle')).toBeDefined();
      expect(presets.find(p => p.id === 'extreme')).toBeDefined();
    });

    it('should have blurTypes property', () => {
      expect(blurGlow.blurTypes).toBeDefined();
      expect(blurGlow.blurTypes.gaussian.filter).toBeDefined();
    });

    it('should have intensityPresets property', () => {
      expect(blurGlow.intensityPresets).toBeDefined();
      expect(blurGlow.intensityPresets.moderate.radius).toBe(5);
    });

    it('should throw error for invalid blur type', async () => {
      await expect(blurGlow.applyBlur('/input.mp4', '/output.mp4', { type: 'invalid' }))
        .rejects.toThrow();
    });

    it('should throw error for invalid preset', async () => {
      await expect(blurGlow.applyPreset('/input.mp4', '/output.mp4', 'invalid'))
        .rejects.toThrow();
    });
  });

  describe('Masking', () => {
    let masking;

    beforeEach(() => {
      masking = new Masking();
    });

    it('should create a Masking instance', () => {
      expect(masking).toBeInstanceOf(Masking);
    });

    it('should get mask shapes', () => {
      const shapes = masking.getMaskShapes();
      expect(shapes.length).toBe(4);
      expect(shapes.find(s => s.id === 'rectangle')).toBeDefined();
      expect(shapes.find(s => s.id === 'circle')).toBeDefined();
    });

    it('should get mask modes', () => {
      const modes = masking.getMaskModes();
      expect(modes.length).toBe(4);
      expect(modes.find(m => m.id === 'add')).toBeDefined();
      expect(modes.find(m => m.id === 'subtract')).toBeDefined();
    });

    it('should create a mask', () => {
      const mask = masking.createMask({
        shape: 'circle',
        x: 100,
        y: 100,
        radius: 50
      });
      
      expect(mask).toHaveProperty('id');
      expect(mask.shape).toBe('circle');
      expect(mask.radius).toBe(50);
    });

    it('should get all masks', () => {
      masking.createMask({ shape: 'rectangle' });
      masking.createMask({ shape: 'circle' });
      
      expect(masking.getMasks()).toHaveLength(2);
    });

    it('should update a mask', () => {
      const mask = masking.createMask({ shape: 'rectangle' });
      masking.updateMask(mask.id, { width: 200 });
      
      const updated = masking.getMasks().find(m => m.id === mask.id);
      expect(updated.width).toBe(200);
    });

    it('should delete a mask', () => {
      const mask = masking.createMask({ shape: 'rectangle' });
      masking.deleteMask(mask.id);
      
      expect(masking.getMasks()).toHaveLength(0);
    });

    it('should throw error for invalid mask id on update', () => {
      expect(() => masking.updateMask('invalid', {})).toThrow();
    });

    it('should throw error for invalid mask id on delete', () => {
      expect(() => masking.deleteMask('invalid')).toThrow();
    });

    it('should add keyframe to mask', () => {
      const mask = masking.createMask({ shape: 'rectangle' });
      masking.addKeyframe(mask.id, { time: 1, x: 100 });
      
      const updated = masking.getMasks().find(m => m.id === mask.id);
      expect(updated.keyframes).toHaveLength(1);
    });

    it('should clear all masks', () => {
      masking.createMask({ shape: 'rectangle' });
      masking.createMask({ shape: 'circle' });
      masking.clearMasks();
      
      expect(masking.getMasks()).toHaveLength(0);
    });

    it('should throw error for invalid mask id on apply', async () => {
      await expect(masking.applyMask('/input.mp4', '/output.mp4', 'invalid'))
        .rejects.toThrow();
    });
  });
});
