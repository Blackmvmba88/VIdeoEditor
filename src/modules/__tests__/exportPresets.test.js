/**
 * Export Presets Module Tests
 */

const ExportPresets = require('../exportPresets');

describe('ExportPresets', () => {
  let presets;

  beforeEach(() => {
    presets = new ExportPresets();
  });

  describe('getAllPresets', () => {
    it('should return all available presets', () => {
      const allPresets = presets.getAllPresets();
      expect(allPresets).toBeDefined();
      expect(typeof allPresets).toBe('object');
      expect(Object.keys(allPresets).length).toBeGreaterThan(0);
    });

    it('should include youtube1080p preset', () => {
      const allPresets = presets.getAllPresets();
      expect(allPresets.youtube1080p).toBeDefined();
      expect(allPresets.youtube1080p.name).toBe('YouTube 1080p');
    });
  });

  describe('getPreset', () => {
    it('should return preset by key', () => {
      const preset = presets.getPreset('youtube1080p');
      expect(preset).toBeDefined();
      expect(preset.name).toBe('YouTube 1080p');
      expect(preset.format).toBe('mp4');
    });

    it('should return null for non-existent preset', () => {
      const preset = presets.getPreset('nonexistent');
      expect(preset).toBeNull();
    });
  });

  describe('getPresetsByCategory', () => {
    it('should return social media presets', () => {
      const socialPresets = presets.getPresetsByCategory('social');
      expect(Object.keys(socialPresets).length).toBeGreaterThan(0);
      expect(socialPresets.youtube1080p).toBeDefined();
    });

    it('should return empty object for invalid category', () => {
      const invalidPresets = presets.getPresetsByCategory('invalid');
      expect(Object.keys(invalidPresets).length).toBe(0);
    });
  });

  describe('createCustomPreset', () => {
    it('should create a custom preset', () => {
      presets.createCustomPreset('myPreset', {
        name: 'My Custom Preset',
        format: 'mp4',
        video: { codec: 'libx264' }
      });

      const customPreset = presets.getPreset('myPreset');
      expect(customPreset).toBeDefined();
      expect(customPreset.name).toBe('My Custom Preset');
      expect(customPreset.isCustom).toBe(true);
    });

    it('should throw error if preset has no name', () => {
      expect(() => {
        presets.createCustomPreset('noName', { format: 'mp4' });
      }).toThrow('Preset must have a name');
    });
  });

  describe('deleteCustomPreset', () => {
    it('should delete a custom preset', () => {
      presets.createCustomPreset('toDelete', { name: 'To Delete' });
      expect(presets.getPreset('toDelete')).toBeDefined();

      presets.deleteCustomPreset('toDelete');
      expect(presets.getPreset('toDelete')).toBeNull();
    });
  });

  describe('generateFFmpegArgs', () => {
    it('should generate FFmpeg arguments for a preset', () => {
      const args = presets.generateFFmpegArgs('youtube1080p');
      expect(Array.isArray(args)).toBe(true);
      expect(args).toContain('-c:v');
      expect(args).toContain('libx264');
    });

    it('should throw error for non-existent preset', () => {
      expect(() => {
        presets.generateFFmpegArgs('nonexistent');
      }).toThrow('Preset not found: nonexistent');
    });

    it('should handle audio-only presets', () => {
      const args = presets.generateFFmpegArgs('audioOnly');
      expect(args).toContain('-vn');
    });
  });

  describe('getOutputExtension', () => {
    it('should return correct extension for mp4 preset', () => {
      const ext = presets.getOutputExtension('youtube1080p');
      expect(ext).toBe('.mp4');
    });

    it('should return correct extension for mov preset', () => {
      const ext = presets.getOutputExtension('proresProxy');
      expect(ext).toBe('.mov');
    });

    it('should return .mp4 for unknown preset', () => {
      const ext = presets.getOutputExtension('nonexistent');
      expect(ext).toBe('.mp4');
    });
  });
});
