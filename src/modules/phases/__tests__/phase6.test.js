/**
 * Tests para Phase 6 - Next Generation Features
 * 
 * Pruebas para: LutCreator, HdrGrading, SpatialAudio, PodcastMode, ADRTools, SoundDesign, VFXTools, NodeCompositor
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// Mocks
jest.mock('../../ffmpegWrapper');

// Mock de uuid con IDs incrementales para NodeCompositor
let mockUuidCounter = 0;
jest.mock('uuid', () => ({ 
  v4: () => `test-uuid-${++mockUuidCounter}` 
}));

const FFmpegWrapper = require('../../ffmpegWrapper');
const LutCreator = require('../phase6/lutCreator');
const HdrGrading = require('../phase6/hdrGrading');
const SpatialAudio = require('../phase6/spatialAudio');
const PodcastMode = require('../phase6/podcastMode');
const ADRTools = require('../phase6/adrTools');
const SoundDesign = require('../phase6/soundDesign');
const VFXTools = require('../phase6/vfxTools');
const NodeCompositor = require('../phase6/nodeCompositor');

describe('Phase 6 - Next Generation Features', () => {
  let mockFFmpeg;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFFmpeg = {
      execute: jest.fn().mockResolvedValue({ success: true }),
      getVideoInfo: jest.fn().mockResolvedValue({
        duration: 120,
        streams: [
          { codec_type: 'video', width: 1920, height: 1080 },
          { codec_type: 'audio', channels: 2, sample_rate: 48000 }
        ]
      }),
      getMediaInfo: jest.fn().mockResolvedValue({
        duration: 60,
        width: 1920,
        height: 1080,
        fps: 30
      })
    };
    FFmpegWrapper.mockImplementation(() => mockFFmpeg);
  });

  // ==================== LutCreator Tests ====================
  describe('LutCreator', () => {
    let lutCreator;

    beforeEach(() => {
      lutCreator = new LutCreator(mockFFmpeg);
    });

    afterEach(() => {
      lutCreator.cleanup();
    });

    describe('constructor', () => {
      it('debería inicializar con valores por defecto', () => {
        expect(lutCreator).toBeDefined();
        expect(lutCreator.ffmpeg).toBe(mockFFmpeg);
        expect(lutCreator.lutSizes).toBeDefined();
        expect(lutCreator.colorPresets).toBeDefined();
      });

      it('debería tener tamaños de LUT estándar', () => {
        expect(lutCreator.lutSizes.small).toBe(17);
        expect(lutCreator.lutSizes.medium).toBe(33);
        expect(lutCreator.lutSizes.large).toBe(65);
      });
    });

    describe('getLutSizes', () => {
      it('debería retornar tamaños disponibles', () => {
        const sizes = lutCreator.getLutSizes();
        expect(sizes).toHaveProperty('small');
        expect(sizes).toHaveProperty('medium');
        expect(sizes).toHaveProperty('large');
      });
    });

    describe('getColorPresets', () => {
      it('debería retornar presets de color', () => {
        const presets = lutCreator.getColorPresets();
        expect(presets).toHaveProperty('neutral');
        expect(presets).toHaveProperty('warm');
        expect(presets).toHaveProperty('cool');
        expect(presets).toHaveProperty('cinematic');
      });
    });

    describe('createIdentityLut', () => {
      it('debería crear LUT de identidad', () => {
        const result = lutCreator.createIdentityLut();
        expect(result.success).toBe(true);
        expect(result.outputPath).toContain('.cube');
        expect(result.size).toBe(33);
      });

      it('debería crear LUT con tamaño específico', () => {
        const result = lutCreator.createIdentityLut({ size: 'large' });
        expect(result.size).toBe(65);
      });
    });

    describe('createGradientLut', () => {
      it('debería crear LUT con gradiente', () => {
        const result = lutCreator.createGradientLut({
          startColor: { r: 0, g: 0, b: 0 },
          endColor: { r: 255, g: 255, b: 255 }
        });
        expect(result.success).toBe(true);
        expect(result.outputPath).toContain('.cube');
      });

      it('debería crear LUT con colores personalizados', () => {
        const result = lutCreator.createGradientLut({
          startColor: { r: 255, g: 0, b: 0 },
          endColor: { r: 0, g: 0, b: 255 }
        });
        expect(result.success).toBe(true);
      });
    });

    describe('createFromPreset', () => {
      it('debería crear LUT desde preset', async () => {
        const result = await lutCreator.createFromPreset('warm');
        expect(result.success).toBe(true);
        expect(result.preset).toBe('warm');
      });

      it('debería crear LUT cinematográfico', async () => {
        const result = await lutCreator.createFromPreset('cinematic');
        expect(result.success).toBe(true);
        expect(result.preset).toBe('cinematic');
      });

      it('debería fallar con preset inexistente', async () => {
        await expect(lutCreator.createFromPreset('invalid')).rejects.toThrow('Preset no encontrado');
      });
    });

    describe('adjustLut', () => {
      it('debería ajustar un LUT existente', () => {
        // Crear LUT primero
        const lut = lutCreator.createIdentityLut();
        const result = lutCreator.adjustLut(lut.outputPath, {
          saturation: 1.2,
          contrast: 1.1
        });
        expect(result.success).toBe(true);
      });
    });

    describe('parseCubeFile', () => {
      it('debería leer y parsear archivo .cube', () => {
        const tempPath = path.join(os.tmpdir(), 'test-lut.cube');
        const cubeContent = `TITLE "Test LUT"
LUT_3D_SIZE 3
0.0 0.0 0.0
0.5 0.5 0.5
1.0 1.0 1.0`;
        fs.writeFileSync(tempPath, cubeContent);
        
        const result = lutCreator.parseCubeFile(tempPath);
        expect(result.title).toBe('Test LUT');
        expect(result.size).toBe(3);
        
        fs.unlinkSync(tempPath);
      });
    });

    describe('cleanup', () => {
      it('debería limpiar archivos temporales', () => {
        lutCreator.createIdentityLut();
        lutCreator.cleanup();
        // No debería lanzar error
        expect(true).toBe(true);
      });
    });
  });

  // ==================== HdrGrading Tests ====================
  describe('HdrGrading', () => {
    let hdrGrading;
    const testVideoPath = '/tmp/test-video.mp4';

    beforeEach(() => {
      hdrGrading = new HdrGrading(mockFFmpeg);
      // Mock file exists
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    });

    afterEach(() => {
      hdrGrading.cleanup();
      jest.restoreAllMocks();
    });

    describe('constructor', () => {
      it('debería inicializar correctamente', () => {
        expect(hdrGrading).toBeDefined();
        expect(hdrGrading.hdrFormats).toBeDefined();
        expect(hdrGrading.toneMappingPresets).toBeDefined();
      });

      it('debería tener formatos HDR', () => {
        expect(hdrGrading.hdrFormats.hdr10).toBeDefined();
        expect(hdrGrading.hdrFormats.hlg).toBeDefined();
        expect(hdrGrading.hdrFormats.dolbyVision).toBeDefined();
      });
    });

    describe('getHdrFormats', () => {
      it('debería retornar formatos disponibles', () => {
        const formats = hdrGrading.getHdrFormats();
        expect(formats).toHaveProperty('hdr10');
        expect(formats.hdr10).toHaveProperty('name');
        expect(formats.hdr10).toHaveProperty('maxLuminance');
      });
    });

    describe('getToneMappingPresets', () => {
      it('debería retornar presets de tone mapping', () => {
        const presets = hdrGrading.getToneMappingPresets();
        expect(presets).toHaveProperty('hable');
        expect(presets).toHaveProperty('reinhard');
      });
    });

    describe('detectHdr', () => {
      it('debería detectar video SDR', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          color_transfer: 'bt709',
          streams: [{ codec_type: 'video' }]
        });

        const result = await hdrGrading.detectHdr(testVideoPath);
        expect(result.isHdr).toBe(false);
      });

      it('debería detectar video HDR10', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          color_transfer: 'smpte2084',
          color_primaries: 'bt2020',
          streams: [{ codec_type: 'video' }]
        });

        const result = await hdrGrading.detectHdr(testVideoPath);
        expect(result.isHdr).toBe(true);
        expect(result.hdrType).toBe('hdr10');
      });

      it('debería detectar video HLG', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          color_transfer: 'arib-std-b67',
          streams: [{ codec_type: 'video' }]
        });

        const result = await hdrGrading.detectHdr(testVideoPath);
        expect(result.isHdr).toBe(true);
        expect(result.hdrType).toBe('hlg');
      });
    });

    describe('hdrToSdr', () => {
      it('debería convertir HDR a SDR', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          color_transfer: 'smpte2084',
          color_primaries: 'bt2020',
          streams: [{ codec_type: 'video' }]
        });

        const result = await hdrGrading.hdrToSdr(testVideoPath);
        expect(result.success).toBe(true);
        expect(result.algorithm).toBe('hable');
        expect(mockFFmpeg.execute).toHaveBeenCalled();
      });

      it('debería retornar error si no es HDR', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          color_transfer: 'bt709',
          streams: [{ codec_type: 'video' }]
        });

        const result = await hdrGrading.hdrToSdr(testVideoPath);
        expect(result.success).toBe(false);
      });
    });

    describe('sdrToHdr', () => {
      it('debería convertir SDR a HDR', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          color_transfer: 'bt709',
          streams: [{ codec_type: 'video' }]
        });

        const result = await hdrGrading.sdrToHdr(testVideoPath);
        expect(result.success).toBe(true);
        expect(result.targetFormat).toBe('HLG');
      });

      it('debería retornar error si ya es HDR', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          color_transfer: 'smpte2084',
          streams: [{ codec_type: 'video' }]
        });

        const result = await hdrGrading.sdrToHdr(testVideoPath);
        expect(result.success).toBe(false);
      });
    });

    describe('applyHdrGrading', () => {
      it('debería aplicar grading HDR', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          color_transfer: 'smpte2084',
          streams: [{ codec_type: 'video' }]
        });

        const result = await hdrGrading.applyHdrGrading(testVideoPath, null, {
          preset: 'vivid'
        });
        expect(result.success).toBe(true);
        expect(result.preset).toBe('vivid');
      });
    });
  });

  // ==================== SpatialAudio Tests ====================
  describe('SpatialAudio', () => {
    let spatialAudio;
    const testAudioPath = '/tmp/test-audio.mp3';

    beforeEach(() => {
      spatialAudio = new SpatialAudio(mockFFmpeg);
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    });

    afterEach(() => {
      spatialAudio.cleanup();
      jest.restoreAllMocks();
    });

    describe('constructor', () => {
      it('debería inicializar correctamente', () => {
        expect(spatialAudio).toBeDefined();
        expect(spatialAudio.channelLayouts).toBeDefined();
        expect(spatialAudio.spatialPresets).toBeDefined();
      });
    });

    describe('getChannelLayouts', () => {
      it('debería retornar layouts de canales', () => {
        const layouts = spatialAudio.getChannelLayouts();
        expect(layouts).toHaveProperty('stereo');
        expect(layouts).toHaveProperty('surround51');
        expect(layouts).toHaveProperty('surround71');
      });
    });

    describe('getSpatialPresets', () => {
      it('debería retornar presets espaciales', () => {
        const presets = spatialAudio.getSpatialPresets();
        expect(presets).toHaveProperty('cinema');
        expect(presets).toHaveProperty('music');
        expect(presets).toHaveProperty('gaming');
      });
    });

    describe('detectAudioLayout', () => {
      it('debería detectar audio estéreo', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          streams: [{ codec_type: 'audio', channels: 2, channel_layout: 'stereo' }]
        });

        const result = await spatialAudio.detectAudioLayout(testAudioPath);
        expect(result.channels).toBe(2);
        expect(result.spatialType).toBe('stereo');
        expect(result.isSurround).toBe(false);
      });

      it('debería detectar audio 5.1', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          streams: [{ codec_type: 'audio', channels: 6, channel_layout: '5.1' }]
        });

        const result = await spatialAudio.detectAudioLayout(testAudioPath);
        expect(result.channels).toBe(6);
        expect(result.spatialType).toBe('5.1');
        expect(result.isSurround).toBe(true);
      });
    });

    describe('stereoToSurround', () => {
      it('debería convertir estéreo a surround', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          streams: [{ codec_type: 'audio', channels: 2 }]
        });

        const result = await spatialAudio.stereoToSurround(testAudioPath);
        expect(result.success).toBe(true);
        expect(result.targetLayout).toBe('5.1');
      });

      it('debería retornar error si ya es surround', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          streams: [{ codec_type: 'audio', channels: 6 }]
        });

        const result = await spatialAudio.stereoToSurround(testAudioPath);
        expect(result.success).toBe(false);
      });
    });

    describe('surroundToStereo', () => {
      it('debería convertir surround a estéreo', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          streams: [{ codec_type: 'audio', channels: 6, channel_layout: '5.1' }]
        });

        const result = await spatialAudio.surroundToStereo(testAudioPath);
        expect(result.success).toBe(true);
      });

      it('debería retornar error si ya es estéreo', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          streams: [{ codec_type: 'audio', channels: 2 }]
        });

        const result = await spatialAudio.surroundToStereo(testAudioPath);
        expect(result.success).toBe(false);
      });
    });

    describe('toBinaural', () => {
      it('debería convertir a binaural', async () => {
        mockFFmpeg.getVideoInfo.mockResolvedValue({
          streams: [{ codec_type: 'audio', channels: 2 }]
        });

        const result = await spatialAudio.toBinaural(testAudioPath);
        expect(result.success).toBe(true);
        expect(result.binauralPreset).toBe('hrtf_default');
      });
    });

    describe('positionInSpace', () => {
      it('debería posicionar audio en espacio 3D', async () => {
        const result = await spatialAudio.positionInSpace(testAudioPath, {
          azimuth: 45,
          elevation: 0,
          distance: 2
        });
        expect(result.success).toBe(true);
        expect(result.position.azimuth).toBe(45);
      });
    });

    describe('applySpatialReverb', () => {
      it('debería aplicar reverb espacial', async () => {
        const result = await spatialAudio.applySpatialReverb(testAudioPath, {
          roomSize: 'large',
          wetDry: 0.4
        });
        expect(result.success).toBe(true);
        expect(result.roomSize).toBe('large');
      });
    });
  });

  // ==================== PodcastMode Tests ====================
  describe('PodcastMode', () => {
    let podcastMode;
    const testAudioPath = '/tmp/test-podcast.mp3';

    beforeEach(() => {
      podcastMode = new PodcastMode(mockFFmpeg);
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'statSync').mockReturnValue({ size: 10485760 });
    });

    afterEach(() => {
      podcastMode.cleanup();
      jest.restoreAllMocks();
    });

    describe('constructor', () => {
      it('debería inicializar correctamente', () => {
        expect(podcastMode).toBeDefined();
        expect(podcastMode.podcastFormats).toBeDefined();
        expect(podcastMode.voicePresets).toBeDefined();
        expect(podcastMode.podcastTemplates).toBeDefined();
      });
    });

    describe('getPodcastFormats', () => {
      it('debería retornar formatos de podcast', () => {
        const formats = podcastMode.getPodcastFormats();
        expect(formats).toHaveProperty('spotify');
        expect(formats).toHaveProperty('apple');
        expect(formats).toHaveProperty('youtube');
        expect(formats.spotify).toHaveProperty('loudness');
      });
    });

    describe('getVoicePresets', () => {
      it('debería retornar presets de voz', () => {
        const presets = podcastMode.getVoicePresets();
        expect(presets).toHaveProperty('natural');
        expect(presets).toHaveProperty('broadcast');
        expect(presets).toHaveProperty('clear');
      });
    });

    describe('getPodcastTemplates', () => {
      it('debería retornar plantillas de podcast', () => {
        const templates = podcastMode.getPodcastTemplates();
        expect(templates).toHaveProperty('interview');
        expect(templates).toHaveProperty('solo');
        expect(templates.interview.tracks).toContain('host');
      });
    });

    describe('mixTracks', () => {
      it('debería mezclar múltiples pistas', async () => {
        const tracks = [
          { path: '/tmp/host.mp3', label: 'Host', volume: 1 },
          { path: '/tmp/guest.mp3', label: 'Guest', volume: 0.9 }
        ];

        const result = await podcastMode.mixTracks(tracks);
        expect(result.success).toBe(true);
        expect(result.tracksCount).toBe(2);
        expect(mockFFmpeg.execute).toHaveBeenCalled();
      });

      it('debería fallar sin pistas', async () => {
        await expect(podcastMode.mixTracks([])).rejects.toThrow();
      });
    });

    describe('applyDucking', () => {
      it('debería aplicar ducking automático', async () => {
        const result = await podcastMode.applyDucking(
          '/tmp/voice.mp3',
          '/tmp/music.mp3'
        );
        expect(result.success).toBe(true);
        expect(result.duckLevel).toBeDefined();
      });
    });

    describe('processVoice', () => {
      it('debería procesar voz para podcast', async () => {
        const result = await podcastMode.processVoice(testAudioPath, {
          preset: 'broadcast'
        });
        expect(result.success).toBe(true);
        expect(result.preset).toBe('Broadcast');
      });

      it('debería aplicar reducción de ruido', async () => {
        const result = await podcastMode.processVoice(testAudioPath, {
          noiseReduction: true
        });
        expect(result.success).toBe(true);
        expect(result.noiseReduction).toBe(true);
      });
    });

    describe('exportForPlatform', () => {
      it('debería exportar para Spotify', async () => {
        const result = await podcastMode.exportForPlatform(testAudioPath, 'spotify');
        expect(result.success).toBe(true);
        expect(result.platform).toBe('Spotify');
        expect(result.format.loudness).toBe(-14);
      });

      it('debería exportar para Apple Podcasts', async () => {
        const result = await podcastMode.exportForPlatform(testAudioPath, 'apple');
        expect(result.success).toBe(true);
        expect(result.platform).toBe('Apple Podcasts');
      });

      it('debería incluir metadatos', async () => {
        const result = await podcastMode.exportForPlatform(testAudioPath, 'spotify', {
          metadata: { title: 'Mi Podcast', artist: 'Host' }
        });
        expect(result.success).toBe(true);
      });

      it('debería fallar con plataforma inválida', async () => {
        await expect(
          podcastMode.exportForPlatform(testAudioPath, 'invalid')
        ).rejects.toThrow();
      });
    });

    describe('addIntroOutro', () => {
      it('debería agregar intro', async () => {
        const result = await podcastMode.addIntroOutro(testAudioPath, {
          introPath: '/tmp/intro.mp3'
        });
        expect(result.success).toBe(true);
        expect(result.hasIntro).toBe(true);
      });

      it('debería agregar intro y outro', async () => {
        const result = await podcastMode.addIntroOutro(testAudioPath, {
          introPath: '/tmp/intro.mp3',
          outroPath: '/tmp/outro.mp3'
        });
        expect(result.success).toBe(true);
        expect(result.hasIntro).toBe(true);
        expect(result.hasOutro).toBe(true);
      });

      it('debería fallar sin intro ni outro', async () => {
        await expect(podcastMode.addIntroOutro(testAudioPath, {})).rejects.toThrow();
      });
    });

    describe('detectChapters', () => {
      it('debería detectar capítulos', async () => {
        const result = await podcastMode.detectChapters(testAudioPath);
        expect(result.success).toBe(true);
        expect(result.chapters).toBeDefined();
        expect(Array.isArray(result.chapters)).toBe(true);
      });
    });
  });

  // ==================== ADRTools Tests ====================
  describe('ADRTools', () => {
    let adrTools;
    const testFile = '/tmp/test-video.mp4';
    const testDialogue = '/tmp/new-dialogue.wav';

    beforeEach(() => {
      adrTools = new ADRTools();
      // Mock fs.existsSync
      jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
        return p === testFile || p === testDialogue || p.includes('temp') || p.includes('adr');
      });
      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
      jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    });

    afterEach(() => {
      adrTools.cleanup();
      jest.restoreAllMocks();
    });

    describe('constructor', () => {
      it('debería inicializar correctamente', () => {
        expect(adrTools).toBeDefined();
        expect(adrTools.ffmpeg).toBeDefined();
        expect(adrTools.config).toBeDefined();
        expect(adrTools.modes).toBeDefined();
        expect(adrTools.mixPresets).toBeDefined();
      });

      it('debería tener configuración por defecto', () => {
        expect(adrTools.config.speechThreshold).toBe(-30);
        expect(adrTools.config.silenceThreshold).toBe(-50);
        expect(adrTools.config.crossfadeDuration).toBe(0.05);
      });
    });

    describe('getModes', () => {
      it('debería retornar modos de ADR disponibles', () => {
        const modes = adrTools.getModes();
        expect(modes.replace).toBeDefined();
        expect(modes.blend).toBeDefined();
        expect(modes.layer).toBeDefined();
        expect(modes.ducking).toBeDefined();
      });

      it('cada modo debería tener nombre y descripción', () => {
        const modes = adrTools.getModes();
        for (const [key, mode] of Object.entries(modes)) {
          expect(mode.name).toBeDefined();
          expect(mode.description).toBeDefined();
        }
      });
    });

    describe('getMixPresets', () => {
      it('debería retornar presets de mezcla', () => {
        const presets = adrTools.getMixPresets();
        expect(presets.film).toBeDefined();
        expect(presets.tv).toBeDefined();
        expect(presets.documentary).toBeDefined();
        expect(presets.podcast).toBeDefined();
        expect(presets.clean).toBeDefined();
      });

      it('cada preset debería tener niveles configurados', () => {
        const presets = adrTools.getMixPresets();
        for (const [key, preset] of Object.entries(presets)) {
          expect(preset.name).toBeDefined();
          expect(typeof preset.dialogueLevel).toBe('number');
          expect(typeof preset.ambienceLevel).toBe('number');
          expect(typeof preset.crossfade).toBe('number');
        }
      });
    });

    describe('detectDialogueSegments', () => {
      it('debería detectar segmentos de diálogo', async () => {
        mockFFmpeg.execute.mockImplementation((args, progress, stderr) => {
          if (stderr) {
            stderr('[silencedetect @ 0x] silence_start: 0\n[silencedetect @ 0x] silence_end: 2\n[silencedetect @ 0x] silence_start: 5\n[silencedetect @ 0x] silence_end: 7\n');
          }
          return Promise.resolve({ success: true });
        });

        const result = await adrTools.detectDialogueSegments(testFile);
        
        expect(result.success).toBe(true);
        expect(result.segments).toBeDefined();
        expect(Array.isArray(result.segments)).toBe(true);
        expect(result.totalSegments).toBeDefined();
        expect(result.fileDuration).toBe(120);
      });

      it('debería rechazar si el archivo no existe', async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);
        
        await expect(adrTools.detectDialogueSegments('/fake/path.mp4'))
          .rejects.toThrow('Archivo no encontrado');
      });

      it('debería aceptar opciones personalizadas', async () => {
        const result = await adrTools.detectDialogueSegments(testFile, {
          speechThreshold: -25,
          minSpeechDuration: 0.5
        });
        
        expect(result.success).toBe(true);
        expect(result.settings.speechThreshold).toBe(-25);
        expect(result.settings.minSpeechDuration).toBe(0.5);
      });
    });

    describe('extractRoomTone', () => {
      it('debería extraer room tone', async () => {
        const result = await adrTools.extractRoomTone(testFile);
        
        expect(result.success).toBe(true);
        expect(result.roomTonePath).toBeDefined();
        expect(result.duration).toBe(2);
        expect(result.analysis).toBeDefined();
      });

      it('debería aceptar duración personalizada', async () => {
        const result = await adrTools.extractRoomTone(testFile, { duration: 5 });
        
        expect(result.success).toBe(true);
        expect(result.duration).toBe(5);
      });
    });

    describe('replaceDialogue', () => {
      const segment = { start: 10, end: 15 };

      it('debería reemplazar diálogo en modo replace', async () => {
        const result = await adrTools.replaceDialogue(
          testFile,
          testDialogue,
          '/tmp/output.mp4',
          segment,
          { mode: 'replace' }
        );
        
        expect(result.success).toBe(true);
        expect(result.segment.start).toBe(10);
        expect(result.segment.end).toBe(15);
        expect(result.mode).toBe('replace');
      });

      it('debería reemplazar diálogo en modo blend', async () => {
        const result = await adrTools.replaceDialogue(
          testFile,
          testDialogue,
          '/tmp/output.mp4',
          segment,
          { mode: 'blend', mixPreset: 'film' }
        );
        
        expect(result.success).toBe(true);
        expect(result.mode).toBe('blend');
        expect(result.mixPreset).toBe('film');
      });

      it('debería usar modo ducking', async () => {
        const result = await adrTools.replaceDialogue(
          testFile,
          testDialogue,
          '/tmp/output.mp4',
          segment,
          { mode: 'ducking' }
        );
        
        expect(result.success).toBe(true);
        expect(result.mode).toBe('ducking');
      });

      it('debería llamar callback de progreso', async () => {
        const onProgress = jest.fn();
        
        await adrTools.replaceDialogue(
          testFile,
          testDialogue,
          '/tmp/output.mp4',
          segment,
          { onProgress }
        );
        
        expect(onProgress).toHaveBeenCalled();
      });
    });

    describe('createCueSheet', () => {
      it('debería crear cue sheet', async () => {
        const result = await adrTools.createCueSheet(testFile, {
          characterName: 'John',
          actorName: 'Actor Name',
          scene: 'Scene 1'
        });
        
        expect(result.success).toBe(true);
        expect(result.cueSheet).toBeDefined();
        expect(result.cueSheet.characterName).toBe('John');
        expect(result.cueSheet.actorName).toBe('Actor Name');
        expect(result.cueSheet.cues).toBeDefined();
      });

      it('debería incluir resumen de cues', async () => {
        const result = await adrTools.createCueSheet(testFile);
        
        expect(result.cueSheet.summary).toBeDefined();
        expect(result.cueSheet.summary.totalCues).toBeDefined();
        expect(result.cueSheet.summary.pendingCues).toBeDefined();
      });
    });

    describe('exportCueSheetEDL', () => {
      it('debería exportar cue sheet a EDL', async () => {
        const cueSheet = {
          project: 'TestProject',
          cues: [
            { cueNumber: 1, id: 'seg_1', timecodeIn: '00:00:10:00', timecodeOut: '00:00:15:00' },
            { cueNumber: 2, id: 'seg_2', timecodeIn: '00:00:20:00', timecodeOut: '00:00:25:00' }
          ]
        };
        
        const result = await adrTools.exportCueSheetEDL(cueSheet, '/tmp/cuesheet.edl');
        
        expect(result.success).toBe(true);
        expect(result.format).toBe('EDL');
        expect(result.cueCount).toBe(2);
        expect(fs.writeFileSync).toHaveBeenCalled();
      });
    });

    describe('batchReplace', () => {
      it('debería procesar múltiples reemplazos', async () => {
        const replacements = [
          { segment: { start: 10, end: 15 }, dialoguePath: testDialogue },
          { segment: { start: 30, end: 35 }, dialoguePath: testDialogue }
        ];
        
        const result = await adrTools.batchReplace(
          testFile,
          replacements,
          '/tmp/output.mp4'
        );
        
        expect(result.success).toBe(true);
        expect(result.replacementsCount).toBe(2);
      });

      it('debería llamar callback de progreso en batch', async () => {
        const onProgress = jest.fn();
        const replacements = [
          { segment: { start: 10, end: 15 }, dialoguePath: testDialogue }
        ];
        
        await adrTools.batchReplace(testFile, replacements, '/tmp/output.mp4', { onProgress });
        
        expect(onProgress).toHaveBeenCalled();
      });
    });

    describe('createRecordingGuide', () => {
      it('debería crear guía de grabación', async () => {
        const segment = { start: 10, end: 15 };
        
        const result = await adrTools.createRecordingGuide(
          testFile,
          segment,
          '/tmp/guide.mp4'
        );
        
        expect(result.success).toBe(true);
        expect(result.segment).toBeDefined();
        expect(result.preRoll).toBe(3);
        expect(result.postRoll).toBe(2);
        expect(result.beepCount).toBe(3);
      });

      it('debería aceptar opciones personalizadas', async () => {
        const result = await adrTools.createRecordingGuide(
          testFile,
          { start: 10, end: 15 },
          '/tmp/guide.mp4',
          { preRoll: 5, postRoll: 3, beepCount: 4 }
        );
        
        expect(result.preRoll).toBe(5);
        expect(result.postRoll).toBe(3);
        expect(result.beepCount).toBe(4);
      });
    });

    describe('cleanup', () => {
      it('debería limpiar sin errores', () => {
        expect(() => adrTools.cleanup()).not.toThrow();
      });
    });
  });

  // ==================== SoundDesign Tests ====================
  describe('SoundDesign', () => {
    let soundDesign;
    const testVideo = '/tmp/test-video.mp4';
    const testSound = '/tmp/test-sound.wav';

    beforeEach(() => {
      soundDesign = new SoundDesign();
      jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
        return p === testVideo || p === testSound || p.includes('temp') || p.includes('sounddesign');
      });
      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
      jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    });

    afterEach(() => {
      soundDesign.cleanup();
      jest.restoreAllMocks();
    });

    describe('constructor', () => {
      it('debería inicializar correctamente', () => {
        expect(soundDesign).toBeDefined();
        expect(soundDesign.ffmpeg).toBeDefined();
        expect(soundDesign.categories).toBeDefined();
        expect(soundDesign.foleyGenerators).toBeDefined();
        expect(soundDesign.ambiencePresets).toBeDefined();
      });

      it('debería tener configuración por defecto', () => {
        expect(soundDesign.config.defaultSampleRate).toBe(48000);
        expect(soundDesign.config.defaultChannels).toBe(2);
        expect(soundDesign.config.maxLayers).toBe(16);
      });
    });

    describe('getCategories', () => {
      it('debería retornar todas las categorías', () => {
        const categories = soundDesign.getCategories();
        expect(categories.footsteps).toBeDefined();
        expect(categories.impacts).toBeDefined();
        expect(categories.whooshes).toBeDefined();
        expect(categories.nature).toBeDefined();
        expect(categories.urban).toBeDefined();
        expect(categories.mechanical).toBeDefined();
        expect(categories.ui).toBeDefined();
        expect(categories.musical).toBeDefined();
        expect(categories.voice).toBeDefined();
        expect(categories.horror).toBeDefined();
      });

      it('cada categoría debería tener nombre, icono y subcategorías', () => {
        const categories = soundDesign.getCategories();
        for (const [key, cat] of Object.entries(categories)) {
          expect(cat.name).toBeDefined();
          expect(cat.icon).toBeDefined();
          expect(cat.subcategories).toBeDefined();
          expect(Array.isArray(cat.subcategories)).toBe(true);
        }
      });
    });

    describe('getSubcategories', () => {
      it('debería retornar subcategorías de una categoría', () => {
        const subs = soundDesign.getSubcategories('footsteps');
        expect(Array.isArray(subs)).toBe(true);
        expect(subs).toContain('wood');
        expect(subs).toContain('concrete');
        expect(subs).toContain('grass');
      });

      it('debería lanzar error si categoría no existe', () => {
        expect(() => soundDesign.getSubcategories('invalid')).toThrow('Categoría no encontrada');
      });
    });

    describe('getAmbiencePresets', () => {
      it('debería retornar presets de ambiente', () => {
        const presets = soundDesign.getAmbiencePresets();
        expect(presets.office).toBeDefined();
        expect(presets.forest).toBeDefined();
        expect(presets.city_day).toBeDefined();
        expect(presets.city_night).toBeDefined();
        expect(presets.beach).toBeDefined();
        expect(presets.cafe).toBeDefined();
        expect(presets.space).toBeDefined();
      });

      it('cada preset debería tener nombre y capas', () => {
        const presets = soundDesign.getAmbiencePresets();
        for (const [key, preset] of Object.entries(presets)) {
          expect(preset.name).toBeDefined();
          expect(preset.layers).toBeDefined();
          expect(Array.isArray(preset.layers)).toBe(true);
        }
      });
    });

    describe('getFoleyGenerators', () => {
      it('debería retornar lista de generadores', () => {
        const generators = soundDesign.getFoleyGenerators();
        expect(Array.isArray(generators)).toBe(true);
        expect(generators).toContain('beep');
        expect(generators).toContain('static');
        expect(generators).toContain('wind_synth');
        expect(generators).toContain('kick');
        expect(generators).toContain('snare');
      });
    });

    describe('generateSyntheticSound', () => {
      it('debería generar sonido tipo beep', async () => {
        const result = await soundDesign.generateSyntheticSound('beep', {
          duration: 0.5,
          frequency: 880
        });

        expect(result.success).toBe(true);
        expect(result.type).toBe('beep');
        expect(result.duration).toBe(0.5);
        expect(result.frequency).toBe(880);
      });

      it('debería generar ruido estático', async () => {
        const result = await soundDesign.generateSyntheticSound('static', {
          duration: 1
        });

        expect(result.success).toBe(true);
        expect(result.type).toBe('static');
      });

      it('debería generar viento sintético', async () => {
        const result = await soundDesign.generateSyntheticSound('wind_synth', {
          duration: 2
        });

        expect(result.success).toBe(true);
        expect(result.type).toBe('wind_synth');
      });

      it('debería lanzar error si generador no existe', async () => {
        await expect(soundDesign.generateSyntheticSound('invalid_gen'))
          .rejects.toThrow('Generador no encontrado');
      });
    });

    describe('generateAmbience', () => {
      it('debería generar ambiente de oficina', async () => {
        const result = await soundDesign.generateAmbience('office', {
          duration: 5
        });

        expect(result.success).toBe(true);
        expect(result.preset).toBe('office');
        expect(result.duration).toBe(5);
      });

      it('debería generar ambiente de bosque', async () => {
        const result = await soundDesign.generateAmbience('forest', {
          duration: 10
        });

        expect(result.success).toBe(true);
        expect(result.preset).toBe('forest');
        expect(result.presetName).toBe('Bosque');
      });

      it('debería llamar callback de progreso', async () => {
        const onProgress = jest.fn();
        
        await soundDesign.generateAmbience('cafe', {
          duration: 3,
          onProgress
        });

        expect(onProgress).toHaveBeenCalled();
      });

      it('debería lanzar error si preset no existe', async () => {
        await expect(soundDesign.generateAmbience('invalid_preset'))
          .rejects.toThrow('Preset no encontrado');
      });
    });

    describe('mixLayers', () => {
      it('debería mezclar múltiples capas', async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        
        const result = await soundDesign.mixLayers(
          ['/tmp/layer1.wav', '/tmp/layer2.wav'],
          '/tmp/mixed.wav'
        );

        expect(result.success).toBe(true);
        expect(result.layerCount).toBe(2);
      });

      it('debería aplicar volumen master', async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        
        const result = await soundDesign.mixLayers(
          ['/tmp/layer1.wav'],
          '/tmp/mixed.wav',
          { masterVolume: -6 }
        );

        expect(result.success).toBe(true);
        expect(result.masterVolume).toBe(-6);
      });

      it('debería lanzar error sin capas', async () => {
        await expect(soundDesign.mixLayers([], '/tmp/out.wav'))
          .rejects.toThrow('Se requiere al menos una capa');
      });
    });

    describe('addSoundToVideo', () => {
      it('debería agregar efecto a video', async () => {
        const result = await soundDesign.addSoundToVideo(
          testVideo,
          testSound,
          '/tmp/output.mp4',
          { startTime: 5, volume: -6 }
        );

        expect(result.success).toBe(true);
        expect(result.soundAdded.startTime).toBe(5);
        expect(result.soundAdded.volume).toBe(-6);
      });

      it('debería mezclar con audio original', async () => {
        const result = await soundDesign.addSoundToVideo(
          testVideo,
          testSound,
          '/tmp/output.mp4',
          { mixWithOriginal: true }
        );

        expect(result.success).toBe(true);
      });

      it('debería llamar callback de progreso', async () => {
        const onProgress = jest.fn();
        
        await soundDesign.addSoundToVideo(
          testVideo,
          testSound,
          '/tmp/output.mp4',
          { onProgress }
        );

        expect(onProgress).toHaveBeenCalled();
      });
    });

    describe('createSoundTimeline', () => {
      it('debería crear timeline con múltiples efectos', async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        
        const sounds = [
          { path: testSound, startTime: 1, volume: 0 },
          { path: testSound, startTime: 3, volume: -6 },
          { path: testSound, startTime: 5, volume: -3 }
        ];

        const result = await soundDesign.createSoundTimeline(
          testVideo,
          sounds,
          '/tmp/output.mp4'
        );

        expect(result.success).toBe(true);
        expect(result.soundsCount).toBe(3);
      });

      it('debería lanzar error sin efectos', async () => {
        await expect(soundDesign.createSoundTimeline(testVideo, [], '/tmp/out.mp4'))
          .rejects.toThrow('Se requiere al menos un efecto');
      });
    });

    describe('detectFootstepMarkers', () => {
      it('debería detectar marcadores de pasos', async () => {
        const result = await soundDesign.detectFootstepMarkers(testVideo, {
          stepInterval: 0.4
        });

        expect(result.success).toBe(true);
        expect(result.markers).toBeDefined();
        expect(Array.isArray(result.markers)).toBe(true);
        expect(result.markerCount).toBeGreaterThan(0);
      });

      it('cada marcador debería tener propiedades correctas', async () => {
        const result = await soundDesign.detectFootstepMarkers(testVideo);

        for (const marker of result.markers) {
          expect(marker.id).toBeDefined();
          expect(typeof marker.time).toBe('number');
          expect(marker.timeFormatted).toBeDefined();
          expect(marker.surface).toBeDefined();
          expect(marker.foot).toMatch(/left|right/);
        }
      });
    });

    describe('applyAutoFootsteps', () => {
      it('debería aplicar pasos automáticos', async () => {
        const result = await soundDesign.applyAutoFootsteps(
          testVideo,
          '/tmp/output.mp4',
          { surface: 'wood', volume: -10 }
        );

        expect(result.success).toBe(true);
        expect(result.stepsAdded).toBeGreaterThan(0);
      });

      it('debería llamar callback de progreso', async () => {
        const onProgress = jest.fn();
        
        await soundDesign.applyAutoFootsteps(testVideo, '/tmp/output.mp4', { onProgress });

        expect(onProgress).toHaveBeenCalled();
      });
    });

    describe('createTransitionSound', () => {
      it('debería crear sonido de whoosh', async () => {
        const result = await soundDesign.createTransitionSound('whoosh', {
          duration: 0.5
        });

        expect(result.success).toBe(true);
        expect(result.type).toBe('whoosh');
        expect(result.duration).toBe(0.5);
      });

      it('debería crear sonido de impacto', async () => {
        const result = await soundDesign.createTransitionSound('impact', {
          intensity: 1
        });

        expect(result.success).toBe(true);
        expect(result.type).toBe('impact');
      });

      it('debería crear riser', async () => {
        const result = await soundDesign.createTransitionSound('riser', {
          duration: 2
        });

        expect(result.success).toBe(true);
        expect(result.type).toBe('riser');
      });
    });

    describe('cleanup', () => {
      it('debería limpiar sin errores', () => {
        expect(() => soundDesign.cleanup()).not.toThrow();
      });
    });
  });

  // ==================== VFXTools Tests ====================
  describe('VFXTools', () => {
    let vfxTools;
    let originalExistsSync;

    beforeEach(() => {
      // Mock fs.existsSync para que retorne true
      originalExistsSync = fs.existsSync;
      fs.existsSync = jest.fn().mockReturnValue(true);
      
      mockFFmpeg.execute.mockResolvedValue({ success: true });
      vfxTools = new VFXTools();
    });

    afterEach(() => {
      fs.existsSync = originalExistsSync;
      vfxTools.cleanup();
    });

    describe('constructor', () => {
      it('debería inicializar correctamente', () => {
        expect(vfxTools).toBeInstanceOf(VFXTools);
      });

      it('debería tener presets de chroma key', () => {
        const presets = vfxTools.getChromaKeyPresets();
        expect(presets).toHaveProperty('greenScreen');
        expect(presets).toHaveProperty('blueScreen');
        expect(presets).toHaveProperty('customGreen');
      });

      it('debería tener modos de estabilización', () => {
        const modes = vfxTools.getStabilizationModes();
        expect(modes).toHaveProperty('light');
        expect(modes).toHaveProperty('medium');
        expect(modes).toHaveProperty('heavy');
        expect(modes).toHaveProperty('tripod');
      });

      it('debería tener curvas de speed ramp', () => {
        const curves = vfxTools.getSpeedRampCurves();
        expect(curves).toHaveProperty('linear');
        expect(curves).toHaveProperty('easeIn');
        expect(curves).toHaveProperty('easeOut');
        expect(curves).toHaveProperty('easeInOut');
      });

      it('debería tener formas de máscara', () => {
        const shapes = vfxTools.getMaskShapes();
        expect(shapes).toHaveProperty('rectangle');
        expect(shapes).toHaveProperty('ellipse');
        expect(shapes).toHaveProperty('circle');
        expect(shapes).toHaveProperty('vignette');
      });
    });

    describe('applyChromaKey', () => {
      it('debería aplicar chroma key verde', async () => {
        const result = await vfxTools.applyChromaKey(
          '/foreground.mp4',
          '/background.jpg',
          '/output.mp4',
          { preset: 'greenScreen' }
        );

        expect(result.success).toBe(true);
        expect(result.outputPath).toBe('/output.mp4');
      });

      it('debería aplicar chroma key azul', async () => {
        const result = await vfxTools.applyChromaKey(
          '/foreground.mp4',
          '/background.mp4',
          '/output.mp4',
          { preset: 'blueScreen' }
        );

        expect(result.success).toBe(true);
      });

      it('debería aplicar chroma key con supresión de spill', async () => {
        const result = await vfxTools.applyChromaKey(
          '/foreground.mp4',
          '/background.jpg',
          '/output.mp4',
          { preset: 'spill_suppression' }
        );

        expect(result.success).toBe(true);
      });

      it('debería permitir configuración personalizada', async () => {
        const result = await vfxTools.applyChromaKey(
          '/foreground.mp4',
          '/bg.jpg',
          '/output.mp4',
          { 
            color: '0xFF00FF',
            similarity: 0.35,
            blend: 0.12
          }
        );

        expect(result.success).toBe(true);
      });
    });

    describe('stabilizeVideo', () => {
      it('debería estabilizar video con modo light', async () => {
        const result = await vfxTools.stabilizeVideo(
          '/shaky.mp4',
          '/stable.mp4',
          { mode: 'light' }
        );

        expect(result.success).toBe(true);
        expect(result.outputPath).toBe('/stable.mp4');
      });

      it('debería estabilizar con modo medium', async () => {
        const result = await vfxTools.stabilizeVideo(
          '/shaky.mp4',
          '/stable.mp4',
          { mode: 'medium' }
        );

        expect(result.success).toBe(true);
      });

      it('debería estabilizar con modo heavy', async () => {
        const result = await vfxTools.stabilizeVideo(
          '/shaky.mp4',
          '/stable.mp4',
          { mode: 'heavy' }
        );

        expect(result.success).toBe(true);
      });

      it('debería estabilizar con modo tripod', async () => {
        const result = await vfxTools.stabilizeVideo(
          '/shaky.mp4',
          '/stable.mp4',
          { mode: 'tripod' }
        );

        expect(result.success).toBe(true);
      });

      it('debería permitir configuración manual', async () => {
        const result = await vfxTools.stabilizeVideo(
          '/shaky.mp4',
          '/stable.mp4',
          { 
            shakiness: 8,
            accuracy: 10,
            smoothing: 15
          }
        );

        expect(result.success).toBe(true);
      });
    });

    describe('applySlowMotion', () => {
      it('debería aplicar cámara lenta básica', async () => {
        const result = await vfxTools.applySlowMotion(
          '/input.mp4',
          '/output.mp4',
          { speed: 0.5 }
        );

        expect(result.success).toBe(true);
        expect(result.outputPath).toBe('/output.mp4');
      });

      it('debería aplicar cámara ultra lenta', async () => {
        const result = await vfxTools.applySlowMotion(
          '/input.mp4',
          '/output.mp4',
          { speed: 0.1 }
        );

        expect(result.success).toBe(true);
      });

      it('debería preservar audio', async () => {
        const result = await vfxTools.applySlowMotion(
          '/input.mp4',
          '/output.mp4',
          { speed: 0.5, preserveAudio: true }
        );

        expect(result.success).toBe(true);
      });
    });

    describe('applyFastMotion', () => {
      it('debería aplicar cámara rápida básica', async () => {
        const result = await vfxTools.applyFastMotion(
          '/input.mp4',
          '/output.mp4',
          { speed: 2 }
        );

        expect(result.success).toBe(true);
        expect(result.outputPath).toBe('/output.mp4');
      });

      it('debería aplicar time-lapse', async () => {
        const result = await vfxTools.applyFastMotion(
          '/input.mp4',
          '/output.mp4',
          { speed: 16 }
        );

        expect(result.success).toBe(true);
      });
    });

    describe('applyReverse', () => {
      it('debería invertir video', async () => {
        const result = await vfxTools.applyReverse(
          '/input.mp4',
          '/output.mp4',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.outputPath).toBe('/output.mp4');
      });

      it('debería invertir video con audio', async () => {
        const result = await vfxTools.applyReverse(
          '/input.mp4',
          '/output.mp4',
          { reverseAudio: true }
        );

        expect(result.success).toBe(true);
      });
    });

    describe('createFreezeFrame', () => {
      it('debería crear freeze frame', async () => {
        const result = await vfxTools.createFreezeFrame(
          '/input.mp4',
          '/output.mp4',
          { time: 5, duration: 2 }
        );

        expect(result.success).toBe(true);
        expect(result.outputPath).toBe('/output.mp4');
      });

      it('debería crear freeze frame al inicio', async () => {
        const result = await vfxTools.createFreezeFrame(
          '/input.mp4',
          '/output.mp4',
          { time: 0, duration: 3 }
        );

        expect(result.success).toBe(true);
      });
    });

    describe('applySpeedRamp', () => {
      it('debería crear speed ramp simple', async () => {
        const result = await vfxTools.applySpeedRamp(
          '/input.mp4',
          '/output.mp4',
          {
            keyframes: [
              { time: 0, speed: 1 },
              { time: 2, speed: 0.25 },
              { time: 4, speed: 1 }
            ]
          }
        );

        expect(result.success).toBe(true);
        expect(result.outputPath).toBe('/output.mp4');
      });

      it('debería usar curva ease in', async () => {
        const result = await vfxTools.applySpeedRamp(
          '/input.mp4',
          '/output.mp4',
          {
            keyframes: [
              { time: 0, speed: 1 },
              { time: 3, speed: 0.5 }
            ],
            curve: 'easeIn'
          }
        );

        expect(result.success).toBe(true);
      });
    });

    describe('applyVignette', () => {
      it('debería aplicar viñeta', async () => {
        const result = await vfxTools.applyVignette(
          '/input.mp4',
          '/output.mp4',
          { intensity: 0.5 }
        );

        expect(result.success).toBe(true);
        expect(result.outputPath).toBe('/output.mp4');
      });

      it('debería aplicar viñeta suave', async () => {
        const result = await vfxTools.applyVignette(
          '/input.mp4',
          '/output.mp4',
          { intensity: 0.3, softness: 0.8 }
        );

        expect(result.success).toBe(true);
      });
    });

    describe('applyMotionBlur', () => {
      it('debería aplicar motion blur', async () => {
        const result = await vfxTools.applyMotionBlur(
          '/input.mp4',
          '/output.mp4',
          { intensity: 0.5 }
        );

        expect(result.success).toBe(true);
        expect(result.outputPath).toBe('/output.mp4');
      });
    });

    describe('replaceScreen', () => {
      it('debería reemplazar pantalla en video', async () => {
        const result = await vfxTools.replaceScreen(
          '/video.mp4',
          '/new_screen.mp4',
          '/output.mp4',
          {
            corners: [
              { x: 100, y: 100 },
              { x: 500, y: 100 },
              { x: 500, y: 400 },
              { x: 100, y: 400 }
            ]
          }
        );

        expect(result.success).toBe(true);
        expect(result.outputPath).toBe('/output.mp4');
      });
    });

    describe('applyKenBurns', () => {
      it('debería aplicar efecto Ken Burns', async () => {
        const result = await vfxTools.applyKenBurns(
          '/image.jpg',
          '/output.mp4',
          { 
            duration: 5,
            startZoom: 1,
            endZoom: 1.3
          }
        );

        expect(result.success).toBe(true);
        expect(result.outputPath).toBe('/output.mp4');
      });

      it('debería aplicar Ken Burns con pan', async () => {
        const result = await vfxTools.applyKenBurns(
          '/image.jpg',
          '/output.mp4',
          { 
            duration: 5,
            startZoom: 1.2,
            endZoom: 1,
            startPosition: { x: 0.3, y: 0.3 },
            endPosition: { x: 0.7, y: 0.7 }
          }
        );

        expect(result.success).toBe(true);
      });
    });

    describe('cleanup', () => {
      it('debería limpiar sin errores', () => {
        expect(() => vfxTools.cleanup()).not.toThrow();
      });
    });
  });

  // ==================== NodeCompositor Tests ====================
  describe('NodeCompositor', () => {
    let compositor;

    beforeEach(() => {
      compositor = new NodeCompositor();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'copyFileSync').mockImplementation(() => {});
      jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(fs, 'readFileSync').mockReturnValue('{}');
    });

    afterEach(() => {
      compositor.cleanup();
      jest.restoreAllMocks();
    });

    describe('constructor', () => {
      it('debería crear instancia correctamente', () => {
        expect(compositor).toBeInstanceOf(NodeCompositor);
        expect(compositor.nodeTypes).toBeDefined();
        expect(compositor.blendModes).toBeDefined();
      });
    });

    describe('getNodeTypes', () => {
      it('debería retornar tipos de nodos disponibles', () => {
        const types = compositor.getNodeTypes();
        expect(types.input).toBeDefined();
        expect(types.transform).toBeDefined();
        expect(types.merge).toBeDefined();
        expect(types.color).toBeDefined();
        expect(types.effects).toBeDefined();
        expect(types.mask).toBeDefined();
        expect(types.output).toBeDefined();
      });
    });

    describe('getBlendModes', () => {
      it('debería retornar modos de blend', () => {
        const modes = compositor.getBlendModes();
        expect(modes.normal).toBeDefined();
        expect(modes.multiply).toBeDefined();
        expect(modes.screen).toBeDefined();
        expect(modes.overlay).toBeDefined();
        expect(modes.add).toBeDefined();
      });
    });

    describe('createComposition', () => {
      it('debería crear composición con opciones', () => {
        const result = compositor.createComposition({
          name: 'Test Composition',
          width: 1920,
          height: 1080,
          frameRate: 30
        });

        expect(result.success).toBe(true);
        expect(result.compositionId).toBeDefined();
        expect(result.composition.name).toBe('Test Composition');
      });

      it('debería usar valores por defecto', () => {
        const result = compositor.createComposition();

        expect(result.success).toBe(true);
        expect(result.composition.settings.width).toBe(1920);
        expect(result.composition.settings.height).toBe(1080);
      });
    });

    describe('addNode', () => {
      it('debería agregar nodo de entrada media', () => {
        const comp = compositor.createComposition();
        const result = compositor.addNode(comp.compositionId, 'input.media', {
          filePath: '/video.mp4'
        });

        expect(result.success).toBe(true);
        expect(result.node).toBeDefined();
        expect(result.nodeId).toBeDefined();
      });

      it('debería agregar nodo de salida', () => {
        const comp = compositor.createComposition();
        const result = compositor.addNode(comp.compositionId, 'output.write', {});

        expect(result.success).toBe(true);
      });

      it('debería agregar nodo de mezcla', () => {
        const comp = compositor.createComposition();
        const result = compositor.addNode(comp.compositionId, 'merge.blend', {
          mode: 'multiply',
          opacity: 0.8
        });

        expect(result.success).toBe(true);
      });

      it('debería agregar nodo de color', () => {
        const comp = compositor.createComposition();
        const result = compositor.addNode(comp.compositionId, 'color.curves', {});

        expect(result.success).toBe(true);
      });

      it('debería agregar nodo de transformación', () => {
        const comp = compositor.createComposition();
        const result = compositor.addNode(comp.compositionId, 'transform.scale', {
          scaleX: 1.5,
          scaleY: 1.5
        });

        expect(result.success).toBe(true);
      });

      it('debería fallar con tipo de nodo inválido', () => {
        const comp = compositor.createComposition();
        const result = compositor.addNode(comp.compositionId, 'invalid.type', {});

        expect(result.success).toBe(false);
      });
    });

    describe('connectNodes', () => {
      it('debería conectar dos nodos', () => {
        const comp = compositor.createComposition();
        const inputNode = compositor.addNode(comp.compositionId, 'input.media', { filePath: '/video.mp4' });
        const outputNode = compositor.addNode(comp.compositionId, 'output.write', {});

        const result = compositor.connectNodes(
          comp.compositionId,
          inputNode.nodeId,
          'video',
          outputNode.nodeId,
          'video'
        );

        expect(result.success).toBe(true);
        expect(result.connection).toBeDefined();
      });

      it('debería detectar composición inválida', () => {
        const result = compositor.connectNodes('invalid-comp', 'n1', 'out', 'n2', 'in');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('disconnectNodes', () => {
      it('debería desconectar nodos', () => {
        const comp = compositor.createComposition();
        const inputNode = compositor.addNode(comp.compositionId, 'input.media', {});
        const outputNode = compositor.addNode(comp.compositionId, 'output.write', {});
        const conn = compositor.connectNodes(
          comp.compositionId,
          inputNode.nodeId,
          'video',
          outputNode.nodeId,
          'video'
        );

        const result = compositor.disconnectNodes(comp.compositionId, conn.connection.id);

        expect(result.success).toBe(true);
      });
    });

    describe('removeNode', () => {
      it('debería eliminar nodo existente', () => {
        const comp = compositor.createComposition();
        const node = compositor.addNode(comp.compositionId, 'input.media', {});
        
        const result = compositor.removeNode(comp.compositionId, node.nodeId);

        expect(result.success).toBe(true);
      });

      it('debería manejar nodo inexistente', () => {
        const comp = compositor.createComposition();
        const result = compositor.removeNode(comp.compositionId, 'nonexistent');

        expect(result.success).toBe(false);
      });
    });

    describe('updateNodeParams', () => {
      it('debería actualizar parámetros del nodo', () => {
        const comp = compositor.createComposition();
        const node = compositor.addNode(comp.compositionId, 'transform.scale', {
          scaleX: 1,
          scaleY: 1
        });

        const result = compositor.updateNodeParams(comp.compositionId, node.nodeId, {
          scaleX: 2,
          scaleY: 2
        });

        expect(result.success).toBe(true);
      });
    });

    describe('getComposition', () => {
      it('debería devolver composición existente', () => {
        const comp = compositor.createComposition({ name: 'Test' });
        compositor.addNode(comp.compositionId, 'input.media', {});
        compositor.addNode(comp.compositionId, 'output.write', {});

        const result = compositor.getComposition(comp.compositionId);

        expect(result.success).toBe(true);
        expect(result.composition).toBeDefined();
        expect(result.composition.nodes.length).toBe(2);
      });

      it('debería fallar con ID inválido', () => {
        const result = compositor.getComposition('invalid-id');

        expect(result.success).toBe(false);
      });
    });

    describe('listCompositions', () => {
      it('debería listar composiciones', () => {
        compositor.createComposition({ name: 'Comp 1' });
        compositor.createComposition({ name: 'Comp 2' });

        const result = compositor.listCompositions();

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
      });
    });

    describe('deleteComposition', () => {
      it('debería eliminar composición', () => {
        const comp = compositor.createComposition({ name: 'To Delete' });
        
        const result = compositor.deleteComposition(comp.compositionId);

        expect(result.success).toBe(true);
      });
    });

    describe('duplicateNode', () => {
      it('debería duplicar nodo', () => {
        const comp = compositor.createComposition();
        const node = compositor.addNode(comp.compositionId, 'color.colorCorrect', {
          brightness: 1.2
        });

        const result = compositor.duplicateNode(comp.compositionId, node.nodeId);

        expect(result.success).toBe(true);
        expect(result.nodeId).not.toBe(node.nodeId);
      });
    });

    describe('groupNodes', () => {
      it('debería agrupar nodos', () => {
        const comp = compositor.createComposition();
        const node1 = compositor.addNode(comp.compositionId, 'color.curves', {});
        const node2 = compositor.addNode(comp.compositionId, 'color.levels', {});

        const result = compositor.groupNodes(comp.compositionId, [node1.nodeId, node2.nodeId], 'Color Group');

        expect(result.success).toBe(true);
        expect(result.groupId).toBeDefined();
      });
    });

    describe('render', () => {
      it('debería renderizar composición simple', async () => {
        const comp = compositor.createComposition();
        const input = compositor.addNode(comp.compositionId, 'input.media', { filePath: '/test.mp4' });
        const output = compositor.addNode(comp.compositionId, 'output.write', { filePath: '/output.mp4' });
        compositor.connectNodes(comp.compositionId, input.nodeId, 'video', output.nodeId, 'video');

        const result = await compositor.render(comp.compositionId, '/output.mp4');

        expect(result.success).toBe(true);
      });

      it('debería manejar composición vacía', async () => {
        const comp = compositor.createComposition();
        const result = await compositor.render(comp.compositionId, '/output.mp4');

        expect(result.success).toBe(false);
      });
    });

    describe('exportCompositionToJSON', () => {
      it('debería exportar composición a JSON', async () => {
        const comp = compositor.createComposition({ name: 'Export Test' });
        compositor.addNode(comp.compositionId, 'input.media', { filePath: '/test.mp4' });

        const result = await compositor.exportCompositionToJSON(comp.compositionId, '/export.json');

        expect(result.success).toBe(true);
      });
    });

    describe('importCompositionFromJSON', () => {
      it('debería importar composición desde JSON', async () => {
        // Mockear lectura de archivo JSON válido
        jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
          id: 'test-uuid-1234',
          name: 'Imported',
          settings: { width: 1920, height: 1080, frameRate: 30, duration: 10 },
          nodes: [],
          connections: [],
          metadata: {}
        }));

        const result = await compositor.importCompositionFromJSON('/import.json');

        expect(result.success).toBe(true);
      });
    });

    describe('cleanup', () => {
      it('debería limpiar sin errores', () => {
        const comp = compositor.createComposition();
        compositor.addNode(comp.compositionId, 'input.media', {});
        
        expect(() => compositor.cleanup()).not.toThrow();
      });
    });
  });

  // ==================== MusicComposer Tests ====================
  describe('MusicComposer', () => {
    const MusicComposer = require('../phase6/musicComposer');
    let composer;

    beforeEach(() => {
      composer = new MusicComposer();
    });

    afterEach(() => {
      if (composer) {
        composer.cleanup();
      }
    });

    describe('constructor', () => {
      it('debería crear instancia correctamente', () => {
        expect(composer).toBeInstanceOf(MusicComposer);
        expect(composer.genres).toBeDefined();
        expect(composer.moods).toBeDefined();
        expect(composer.scales).toBeDefined();
      });

      it('debería tener géneros musicales', () => {
        expect(composer.genres.electronic).toBeDefined();
        expect(composer.genres.cinematic).toBeDefined();
        expect(composer.genres.corporate).toBeDefined();
      });
    });

    describe('getGenres', () => {
      it('debería retornar géneros disponibles', () => {
        const genres = composer.getGenres();
        expect(genres).toBeDefined();
        expect(genres.electronic).toBeDefined();
        expect(genres.electronic.name).toBe('Electronic');
        expect(genres.electronic.subgenres).toContain('ambient');
      });
    });

    describe('getMoods', () => {
      it('debería retornar moods disponibles', () => {
        const moods = composer.getMoods();
        expect(moods).toBeDefined();
        expect(moods.happy).toBeDefined();
        expect(moods.happy.energy).toBe(0.8);
        expect(moods.sad).toBeDefined();
        expect(moods.epic).toBeDefined();
      });
    });

    describe('getScales', () => {
      it('debería retornar escalas musicales', () => {
        const scales = composer.getScales();
        expect(scales).toBeDefined();
        expect(scales.major).toBeDefined();
        expect(scales.minor).toBeDefined();
        expect(scales.pentatonic_major).toBeDefined();
        expect(Array.isArray(scales.major)).toBe(true);
      });
    });

    describe('createProject', () => {
      it('debería crear un proyecto musical', () => {
        const result = composer.createProject({
          name: 'Test Track',
          genre: 'electronic',
          mood: 'calm'
        });
        
        expect(result.success).toBe(true);
        expect(result.projectId).toBeDefined();
        expect(result.project).toBeDefined();
        expect(result.project.name).toBe('Test Track');
        expect(result.project.genre).toBe('electronic');
      });

      it('debería usar valores por defecto', () => {
        const result = composer.createProject({});
        
        expect(result.success).toBe(true);
        expect(result.project.name).toBe('Untitled Track');
        expect(result.project.duration).toBe(60);
      });

      it('debería validar el género', () => {
        const result = composer.createProject({
          genre: 'invalid_genre'
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Género no válido');
      });

      it('debería validar el mood', () => {
        const result = composer.createProject({
          genre: 'electronic',
          mood: 'invalid_mood'
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Mood no válido');
      });
    });

    describe('addTrack', () => {
      it('debería agregar un track al proyecto', () => {
        const project = composer.createProject({ genre: 'electronic' });
        
        const result = composer.addTrack(project.projectId, {
          name: 'Lead Synth',
          type: 'melody',
          instrument: 'synth'
        });
        
        expect(result.success).toBe(true);
        expect(result.trackId).toBeDefined();
        expect(result.track.name).toBe('Lead Synth');
      });

      it('debería manejar proyecto inexistente', () => {
        const result = composer.addTrack('invalid-id', {});
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Proyecto no encontrado');
      });
    });

    describe('generateMelody', () => {
      it('debería generar una melodía', () => {
        const project = composer.createProject({ genre: 'electronic' });
        
        const result = composer.generateMelody(project.projectId, {
          bars: 4
        });
        
        expect(result.success).toBe(true);
        expect(result.patternId).toBeDefined();
        expect(result.pattern).toBeDefined();
        expect(result.pattern.notes).toBeDefined();
        expect(Array.isArray(result.pattern.notes)).toBe(true);
      });

      it('debería manejar proyecto inexistente', () => {
        const result = composer.generateMelody('invalid-id', {});
        
        expect(result.success).toBe(false);
      });
    });

    describe('generateBassline', () => {
      it('debería generar línea de bajo', () => {
        const project = composer.createProject({ genre: 'electronic' });
        
        const result = composer.generateBassline(project.projectId, {
          bars: 4,
          style: 'simple'
        });
        
        expect(result.success).toBe(true);
        expect(result.patternId).toBeDefined();
        expect(result.pattern.type).toBe('bass');
      });

      it('debería soportar diferentes estilos', () => {
        const project = composer.createProject({ genre: 'hiphop' });
        
        const simpleResult = composer.generateBassline(project.projectId, { style: 'simple' });
        const walkingResult = composer.generateBassline(project.projectId, { style: 'walking' });
        const syncopatedResult = composer.generateBassline(project.projectId, { style: 'syncopated' });
        
        expect(simpleResult.success).toBe(true);
        expect(walkingResult.success).toBe(true);
        expect(syncopatedResult.success).toBe(true);
      });
    });

    describe('generateDrumPattern', () => {
      it('debería generar patrón de batería', () => {
        const project = composer.createProject({ genre: 'electronic' });
        
        const result = composer.generateDrumPattern(project.projectId, {
          bars: 4,
          complexity: 0.5
        });
        
        expect(result.success).toBe(true);
        expect(result.patternId).toBeDefined();
        expect(result.pattern.type).toBe('drums');
      });

      it('debería manejar proyecto inexistente', () => {
        const result = composer.generateDrumPattern('invalid-id', {});
        
        expect(result.success).toBe(false);
      });
    });

    describe('generateChordProgression', () => {
      it('debería generar progresión de acordes', () => {
        const project = composer.createProject({ 
          genre: 'cinematic',
          mood: 'epic'
        });
        
        const result = composer.generateChordProgression(project.projectId, {
          bars: 8
        });
        
        expect(result.success).toBe(true);
        expect(result.patternId).toBeDefined();
        expect(result.pattern.type).toBe('chords');
      });
    });

    describe('generateArpeggio', () => {
      it('debería generar arpegios', () => {
        const project = composer.createProject({ genre: 'electronic' });
        
        const result = composer.generateArpeggio(project.projectId, {
          bars: 4,
          pattern: 'up'
        });
        
        expect(result.success).toBe(true);
        expect(result.patternId).toBeDefined();
        expect(result.pattern.type).toBe('arpeggio');
      });

      it('debería soportar diferentes patrones', () => {
        const project = composer.createProject({ genre: 'electronic' });
        
        const upResult = composer.generateArpeggio(project.projectId, { pattern: 'up' });
        const downResult = composer.generateArpeggio(project.projectId, { pattern: 'down' });
        
        expect(upResult.success).toBe(true);
        expect(downResult.success).toBe(true);
      });
    });

    describe('generateFullComposition', () => {
      it('debería generar composición completa', async () => {
        const result = await composer.generateFullComposition({
          genre: 'electronic',
          mood: 'energetic',
          duration: 30
        });
        
        expect(result.success).toBe(true);
        expect(result.projectId).toBeDefined();
        expect(result.project).toBeDefined();
        expect(result.summary).toBeDefined();
        expect(result.summary.tracks).toBeGreaterThan(0);
      });

      it('debería usar género por defecto', async () => {
        const result = await composer.generateFullComposition({
          duration: 20
        });
        
        expect(result.success).toBe(true);
        expect(result.project).toBeDefined();
      });
    });

    describe('createVariation', () => {
      it('debería crear variación de proyecto', () => {
        const project = composer.createProject({ genre: 'acoustic' });
        composer.generateMelody(project.projectId, { bars: 4 });
        
        const result = composer.createVariation(project.projectId, {
          variationType: 'tempo',
          amount: 0.2
        });
        
        expect(result.success).toBe(true);
        expect(result.projectId).toBeDefined();
        expect(result.project).toBeDefined();
      });

      it('debería manejar proyecto inexistente', () => {
        const result = composer.createVariation('invalid-id', {});
        
        expect(result.success).toBe(false);
      });
    });

    describe('getProject', () => {
      it('debería obtener proyecto por ID', () => {
        const created = composer.createProject({ name: 'My Project' });
        
        const result = composer.getProject(created.projectId);
        
        expect(result.success).toBe(true);
        expect(result.project).toBeDefined();
        expect(result.project.name).toBe('My Project');
      });

      it('debería retornar error para ID inexistente', () => {
        const result = composer.getProject('non-existent-id');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('listProjects', () => {
      it('debería listar todos los proyectos', () => {
        composer.createProject({ name: 'Project 1' });
        composer.createProject({ name: 'Project 2' });
        composer.createProject({ name: 'Project 3' });
        
        const projects = composer.listProjects();
        
        expect(Array.isArray(projects)).toBe(true);
        expect(projects.length).toBe(3);
      });

      it('debería retornar array vacío si no hay proyectos', () => {
        const projects = composer.listProjects();
        expect(projects).toEqual([]);
      });
    });

    describe('deleteProject', () => {
      it('debería eliminar un proyecto', () => {
        const created = composer.createProject({ name: 'To Delete' });
        
        const result = composer.deleteProject(created.projectId);
        
        expect(result.success).toBe(true);
        const getResult = composer.getProject(created.projectId);
        expect(getResult.success).toBe(false);
      });

      it('debería manejar proyecto inexistente', () => {
        const result = composer.deleteProject('non-existent-id');
        expect(result.success).toBe(false);
      });
    });

    describe('exportToMIDI', () => {
      it('debería exportar proyecto a MIDI', async () => {
        const project = composer.createProject({ genre: 'electronic' });
        composer.generateMelody(project.projectId, { bars: 4 });
        
        const result = await composer.exportToMIDI(
          project.projectId,
          '/tmp/test.mid'
        );
        
        expect(result.success).toBe(true);
        expect(result.outputPath).toBeDefined();
      });

      it('debería manejar proyecto inexistente', async () => {
        const result = await composer.exportToMIDI('invalid-id', '/tmp/test.mid');
        expect(result.success).toBe(false);
      });
    });

    describe('render', () => {
      it('debería renderizar proyecto a audio', async () => {
        const project = composer.createProject({ genre: 'electronic' });
        composer.generateMelody(project.projectId, { bars: 2 });
        
        const result = await composer.render(
          project.projectId,
          '/tmp/test.wav',
          { format: 'wav' }
        );
        
        expect(result.success).toBe(true);
        expect(result.outputPath).toBeDefined();
      });

      it('debería manejar proyecto inexistente', async () => {
        const result = await composer.render('invalid-id', '/tmp/test.wav', {});
        expect(result.success).toBe(false);
      });
    });

    describe('cleanup', () => {
      it('debería limpiar recursos correctamente', () => {
        composer.createProject({ genre: 'electronic' });
        composer.createProject({ genre: 'cinematic' });
        
        expect(() => composer.cleanup()).not.toThrow();
        expect(composer.listProjects()).toEqual([]);
      });
    });
  });

  // ==================== Integration Tests ====================
  describe('Phase 6 Integration', () => {
    it('debería exportar todos los módulos desde index', () => {
      const Phase6 = require('../phase6');
      expect(Phase6.LutCreator).toBeDefined();
      expect(Phase6.HdrGrading).toBeDefined();
      expect(Phase6.SpatialAudio).toBeDefined();
      expect(Phase6.PodcastMode).toBeDefined();
      expect(Phase6.ADRTools).toBeDefined();
      expect(Phase6.SoundDesign).toBeDefined();
      expect(Phase6.VFXTools).toBeDefined();
      expect(Phase6.NodeCompositor).toBeDefined();
      expect(Phase6.MusicComposer).toBeDefined();
    });

    it('debería poder crear instancias de todos los módulos', () => {
      const MusicComposer = require('../phase6/musicComposer');
      
      const lutCreator = new LutCreator(mockFFmpeg);
      const hdrGrading = new HdrGrading(mockFFmpeg);
      const spatialAudio = new SpatialAudio(mockFFmpeg);
      const podcastMode = new PodcastMode(mockFFmpeg);
      const adrTools = new ADRTools();
      const soundDesign = new SoundDesign();
      const vfxTools = new VFXTools();
      const nodeCompositor = new NodeCompositor();
      const musicComposer = new MusicComposer();

      expect(lutCreator).toBeInstanceOf(LutCreator);
      expect(hdrGrading).toBeInstanceOf(HdrGrading);
      expect(spatialAudio).toBeInstanceOf(SpatialAudio);
      expect(podcastMode).toBeInstanceOf(PodcastMode);
      expect(adrTools).toBeInstanceOf(ADRTools);
      expect(soundDesign).toBeInstanceOf(SoundDesign);
      expect(vfxTools).toBeInstanceOf(VFXTools);
      expect(nodeCompositor).toBeInstanceOf(NodeCompositor);
      expect(musicComposer).toBeInstanceOf(MusicComposer);

      lutCreator.cleanup();
      hdrGrading.cleanup();
      spatialAudio.cleanup();
      podcastMode.cleanup();
      adrTools.cleanup();
      soundDesign.cleanup();
      vfxTools.cleanup();
      nodeCompositor.cleanup();
      musicComposer.cleanup();
    });
  });
});
