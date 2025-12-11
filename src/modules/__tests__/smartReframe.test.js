/**
 * Tests para SmartReframe - Reencuadre inteligente
 */

const SmartReframe = require('../smartReframe');

// Mock FFmpegWrapper
jest.mock('../ffmpegWrapper', () => {
  return jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ success: true }),
    getVideoInfo: jest.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      duration: 60,
      fps: 30
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

describe('SmartReframe', () => {
  let smartReframe;

  beforeEach(() => {
    smartReframe = new SmartReframe();
  });

  afterEach(() => {
    smartReframe.cleanup();
  });

  describe('constructor', () => {
    it('debe inicializar con aspect ratios', () => {
      expect(smartReframe.aspectRatios).toBeDefined();
      expect(smartReframe.aspectRatios['16:9']).toBeDefined();
      expect(smartReframe.aspectRatios['9:16']).toBeDefined();
      expect(smartReframe.aspectRatios['1:1']).toBeDefined();
    });

    it('debe tener presets de plataforma', () => {
      expect(smartReframe.platformPresets).toBeDefined();
      expect(smartReframe.platformPresets.youtube).toBeDefined();
      expect(smartReframe.platformPresets.tiktok).toBeDefined();
      expect(smartReframe.platformPresets.instagramReels).toBeDefined();
    });

    it('debe tener modos de reencuadre', () => {
      expect(smartReframe.reframeModes).toBeDefined();
      expect(smartReframe.reframeModes.center).toBeDefined();
      expect(smartReframe.reframeModes.top).toBeDefined();
      expect(smartReframe.reframeModes.auto).toBeDefined();
    });
  });

  describe('getVideoInfo', () => {
    it('debe obtener información del video', async () => {
      const info = await smartReframe.getVideoInfo('/test/video.mp4');

      expect(info.width).toBe(1920);
      expect(info.height).toBe(1080);
      expect(info.aspectRatio).toBeCloseTo(16/9);
      expect(info.aspectRatioString).toBe('16:9');
    });
  });

  describe('_simplifyRatio', () => {
    it('debe identificar 16:9', () => {
      expect(smartReframe._simplifyRatio(1920, 1080)).toBe('16:9');
      expect(smartReframe._simplifyRatio(1280, 720)).toBe('16:9');
    });

    it('debe identificar 9:16', () => {
      expect(smartReframe._simplifyRatio(1080, 1920)).toBe('9:16');
    });

    it('debe identificar 1:1', () => {
      expect(smartReframe._simplifyRatio(1080, 1080)).toBe('1:1');
    });

    it('debe identificar 4:3', () => {
      expect(smartReframe._simplifyRatio(1440, 1080)).toBe('4:3');
    });
  });

  describe('_calculateCrop', () => {
    it('debe calcular crop para 16:9 → 9:16 (center)', () => {
      const crop = smartReframe._calculateCrop(1920, 1080, '9:16', 'center');

      expect(crop.cropWidth).toBe(607); // 1080 * 9/16
      expect(crop.cropHeight).toBe(1080);
      expect(crop.x).toBe(656); // Centrado
      expect(crop.y).toBe(0);
    });

    it('debe calcular crop para 16:9 → 9:16 (left)', () => {
      const crop = smartReframe._calculateCrop(1920, 1080, '9:16', 'left');

      expect(crop.x).toBe(0);
    });

    it('debe calcular crop para 16:9 → 9:16 (right)', () => {
      const crop = smartReframe._calculateCrop(1920, 1080, '9:16', 'right');

      expect(crop.x).toBe(1313); // maxX
    });

    it('debe calcular crop para 16:9 → 1:1 (center)', () => {
      const crop = smartReframe._calculateCrop(1920, 1080, '1:1', 'center');

      expect(crop.cropWidth).toBe(1080);
      expect(crop.cropHeight).toBe(1080);
      expect(crop.x).toBe(420); // (1920-1080)/2
    });

    it('debe calcular crop para 9:16 → 16:9 (center)', () => {
      const crop = smartReframe._calculateCrop(1080, 1920, '16:9', 'center');

      expect(crop.cropWidth).toBe(1080);
      expect(crop.cropHeight).toBe(607); // 1080 / (16/9)
      expect(crop.y).toBe(656); // Centrado vertical
    });

    it('debe calcular crop para 9:16 → 16:9 (top)', () => {
      const crop = smartReframe._calculateCrop(1080, 1920, '16:9', 'top');

      expect(crop.y).toBe(0);
    });

    it('debe calcular crop para 9:16 → 16:9 (bottom)', () => {
      const crop = smartReframe._calculateCrop(1080, 1920, '16:9', 'bottom');

      expect(crop.y).toBe(1313); // maxY
    });
  });

  describe('_calculatePad', () => {
    it('debe calcular pad para 16:9 video en 9:16 canvas', () => {
      const pad = smartReframe._calculatePad(1920, 1080, '9:16', '1080x1920');

      expect(pad.outWidth).toBe(1080);
      expect(pad.outHeight).toBe(1920);
      expect(pad.scaleWidth).toBe(1080);
      expect(pad.scaleHeight).toBe(608); // Ajustado a par
      expect(pad.padX).toBe(0);
      expect(pad.padY).toBeGreaterThan(0); // Pad vertical
    });

    it('debe calcular pad para 9:16 video en 16:9 canvas', () => {
      const pad = smartReframe._calculatePad(1080, 1920, '16:9', '1920x1080');

      expect(pad.outWidth).toBe(1920);
      expect(pad.outHeight).toBe(1080);
      expect(pad.padX).toBeGreaterThan(0); // Pad horizontal
      expect(pad.padY).toBe(0);
    });
  });

  describe('getPlatformPresets', () => {
    it('debe retornar copia de presets', () => {
      const presets = smartReframe.getPlatformPresets();

      expect(presets.youtube.ratio).toBe('16:9');
      expect(presets.tiktok.ratio).toBe('9:16');
      expect(presets.instagramFeed.ratio).toBe('1:1');
    });
  });

  describe('getAspectRatios', () => {
    it('debe retornar aspect ratios disponibles', () => {
      const ratios = smartReframe.getAspectRatios();

      expect(Object.keys(ratios).length).toBeGreaterThan(5);
      expect(ratios['16:9'].name).toContain('Landscape');
    });
  });

  describe('getReframeModes', () => {
    it('debe retornar modos disponibles', () => {
      const modes = smartReframe.getReframeModes();

      expect(modes.center).toBeDefined();
      expect(modes.center.name).toBe('Centro');
    });
  });

  describe('reframeWithCrop', () => {
    it('debe reencuadrar con crop', async () => {
      const result = await smartReframe.reframeWithCrop('/test/video.mp4');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBeDefined();
      expect(result.originalRatio).toBe('16:9');
      expect(result.targetRatio).toBe('9:16');
      expect(result.crop).toBeDefined();
    });

    it('debe aceptar opciones personalizadas', async () => {
      const result = await smartReframe.reframeWithCrop('/test/video.mp4', null, {
        targetRatio: '1:1',
        mode: 'left'
      });

      expect(result.targetRatio).toBe('1:1');
      expect(result.mode).toBe('left');
    });

    it('debe llamar callback de progreso', async () => {
      const progressCallback = jest.fn();

      await smartReframe.reframeWithCrop('/test/video.mp4', null, {
        onProgress: progressCallback
      });

      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('reframeWithPad', () => {
    it('debe reencuadrar con padding', async () => {
      const result = await smartReframe.reframeWithPad('/test/video.mp4');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBeDefined();
      expect(result.pad).toBeDefined();
    });

    it('debe aceptar color de fondo', async () => {
      const result = await smartReframe.reframeWithPad('/test/video.mp4', null, {
        backgroundColor: 'white'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('reframeWithBlurBackground', () => {
    it('debe reencuadrar con fondo blur', async () => {
      const result = await smartReframe.reframeWithBlurBackground('/test/video.mp4');

      expect(result.success).toBe(true);
      expect(result.style).toBe('blur');
    });

    it('debe aceptar strength de blur', async () => {
      const result = await smartReframe.reframeWithBlurBackground('/test/video.mp4', null, {
        blurStrength: 30
      });

      expect(result.success).toBe(true);
    });
  });

  describe('reframeForPlatform', () => {
    it('debe reencuadrar para TikTok', async () => {
      const result = await smartReframe.reframeForPlatform('/test/video.mp4', 'tiktok');

      expect(result.success).toBe(true);
      expect(result.targetRatio).toBe('9:16');
    });

    it('debe reencuadrar para YouTube', async () => {
      const result = await smartReframe.reframeForPlatform('/test/video.mp4', 'youtube');

      expect(result.success).toBe(true);
      expect(result.targetRatio).toBe('16:9');
    });

    it('debe reencuadrar para Instagram Feed con estilo blur', async () => {
      const result = await smartReframe.reframeForPlatform('/test/video.mp4', 'instagramFeed', {
        style: 'blur'
      });

      expect(result.success).toBe(true);
      expect(result.style).toBe('blur');
    });

    it('debe rechazar plataforma no soportada', async () => {
      await expect(
        smartReframe.reframeForPlatform('/test/video.mp4', 'unknown')
      ).rejects.toThrow('Plataforma no soportada');
    });
  });

  describe('cleanup', () => {
    it('debe limpiar sin errores', () => {
      expect(() => smartReframe.cleanup()).not.toThrow();
    });
  });
});
