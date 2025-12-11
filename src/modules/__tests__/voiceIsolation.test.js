/**
 * Tests para VoiceIsolation - Separación de voz
 */

const VoiceIsolation = require('../phases/phase2/voiceIsolation');

// Mock FFmpegWrapper
jest.mock('../ffmpegWrapper', () => {
  return jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      success: true,
      stderr: 'silence_start: 0.5\nsilence_end: 1.2\nsilence_start: 3.0\nsilence_end: 3.5'
    })
  }));
});

// Mock fs
jest.mock('node:fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
  unlinkSync: jest.fn()
}));

describe('VoiceIsolation', () => {
  let voiceIsolation;

  beforeEach(() => {
    voiceIsolation = new VoiceIsolation();
  });

  afterEach(() => {
    voiceIsolation.cleanup();
  });

  describe('constructor', () => {
    it('debe inicializar con valores por defecto', () => {
      expect(voiceIsolation.voiceFrequency).toBeDefined();
      expect(voiceIsolation.voiceFrequency.low).toBe(80);
      expect(voiceIsolation.voiceFrequency.high).toBe(3400);
      expect(voiceIsolation.presets).toBeDefined();
    });

    it('debe tener todos los presets definidos', () => {
      expect(voiceIsolation.presets.basic).toBeDefined();
      expect(voiceIsolation.presets.standard).toBeDefined();
      expect(voiceIsolation.presets.aggressive).toBeDefined();
      expect(voiceIsolation.presets.podcast).toBeDefined();
      expect(voiceIsolation.presets.interview).toBeDefined();
    });
  });

  describe('getPresets', () => {
    it('debe retornar presets con nombre y descripción', () => {
      const presets = voiceIsolation.getPresets();

      expect(presets.basic).toBeDefined();
      expect(presets.basic.name).toBe('Básico');
      expect(presets.basic.description).toBeDefined();
      expect(presets.standard).toBeDefined();
      expect(presets.podcast).toBeDefined();
    });

    it('no debe incluir configuración interna de filtros', () => {
      const presets = voiceIsolation.getPresets();

      expect(presets.basic.filters).toBeUndefined();
    });
  });

  describe('_buildFilterChain', () => {
    it('debe construir cadena con highpass y lowpass', () => {
      const chain = voiceIsolation._buildFilterChain({
        highpass: 100,
        lowpass: 4000
      });

      expect(chain).toContain('highpass=f=100');
      expect(chain).toContain('lowpass=f=4000');
    });

    it('debe incluir noise gate cuando está habilitado', () => {
      const chain = voiceIsolation._buildFilterChain({
        noiseGate: true,
        gateThreshold: -35
      });

      expect(chain).toContain('agate');
      expect(chain).toContain('-35dB');
    });

    it('debe incluir compresor cuando está habilitado', () => {
      const chain = voiceIsolation._buildFilterChain({
        compression: true,
        compRatio: 4
      });

      expect(chain).toContain('acompressor');
      expect(chain).toContain('ratio=4');
    });

    it('debe incluir center extract para audio estéreo', () => {
      const chain = voiceIsolation._buildFilterChain({
        centerExtract: true
      });

      expect(chain).toContain('pan=stereo');
    });

    it('debe incluir de-esser cuando está habilitado', () => {
      const chain = voiceIsolation._buildFilterChain({
        deEsser: true
      });

      expect(chain).toContain('highshelf');
    });

    it('debe incluir normalización cuando está habilitada', () => {
      const chain = voiceIsolation._buildFilterChain({
        normalize: true
      });

      expect(chain).toContain('loudnorm');
    });

    it('debe construir cadena completa para preset podcast', () => {
      const settings = voiceIsolation.presets.podcast.filters;
      const chain = voiceIsolation._buildFilterChain(settings);

      expect(chain).toContain('highpass');
      expect(chain).toContain('lowpass');
      expect(chain).toContain('acompressor');
      expect(chain).toContain('agate');
      expect(chain).toContain('loudnorm');
    });
  });

  describe('isolateVoice', () => {
    it('debe aislar voz con preset por defecto', async () => {
      const result = await voiceIsolation.isolateVoice('/test/input.mp4');

      expect(result.success).toBe(true);
      expect(result.preset).toBe('standard');
      expect(result.filterChain).toBeDefined();
      expect(result.outputPath).toBeDefined();
    });

    it('debe usar preset especificado', async () => {
      const result = await voiceIsolation.isolateVoice('/test/input.mp4', null, {
        preset: 'podcast'
      });

      expect(result.preset).toBe('podcast');
    });

    it('debe usar filtros personalizados', async () => {
      const customFilters = {
        highpass: 150,
        lowpass: 3000
      };

      const result = await voiceIsolation.isolateVoice('/test/input.mp4', null, {
        customFilters
      });

      expect(result.preset).toBe('custom');
      expect(result.filterChain).toContain('highpass=f=150');
    });

    it('debe llamar callback de progreso', async () => {
      const progressCallback = jest.fn();

      await voiceIsolation.isolateVoice('/test/input.mp4', null, {
        onProgress: progressCallback
      });

      expect(progressCallback).toHaveBeenCalled();
    });

    it('debe rechazar preset inválido', async () => {
      await expect(
        voiceIsolation.isolateVoice('/test/input.mp4', null, { preset: 'invalid' })
      ).rejects.toThrow('Preset no válido');
    });
  });

  describe('extractBackground', () => {
    it('debe extraer fondo del audio', async () => {
      const result = await voiceIsolation.extractBackground('/test/input.mp4');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBeDefined();
    });
  });

  describe('createStems', () => {
    it('debe crear stems de voz y fondo', async () => {
      const result = await voiceIsolation.createStems('/test/input.mp4');

      expect(result.success).toBe(true);
      expect(result.stems).toBeDefined();
      expect(result.stems.voice).toBeDefined();
      expect(result.stems.background).toBeDefined();
    });

    it('debe llamar callback de progreso', async () => {
      const progressCallback = jest.fn();

      await voiceIsolation.createStems('/test/input.mp4', null, {
        onProgress: progressCallback
      });

      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('analyzeVoicePresence', () => {
    it('debe analizar presencia de voz', async () => {
      const result = await voiceIsolation.analyzeVoicePresence('/test/input.mp4');

      expect(result.success).toBe(true);
      expect(result.silenceSegments).toBeDefined();
      expect(Array.isArray(result.silenceSegments)).toBe(true);
    });

    it('debe detectar segmentos de silencio', async () => {
      const result = await voiceIsolation.analyzeVoicePresence('/test/input.mp4');

      expect(result.silenceSegments.length).toBeGreaterThan(0);
      expect(result.silenceSegments[0].start).toBeDefined();
      expect(result.silenceSegments[0].end).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('debe limpiar archivos temporales sin errores', () => {
      expect(() => voiceIsolation.cleanup()).not.toThrow();
    });
  });
});
