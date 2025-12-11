/**
 * SmartReframe - Reencuadre inteligente de video
 * 
 * Convierte videos entre diferentes aspect ratios de manera inteligente,
 * detectando el contenido principal para centrar el encuadre.
 * 
 * Casos de uso:
 * - 16:9 → 9:16 (YouTube → TikTok/Reels)
 * - 16:9 → 1:1 (YouTube → Instagram Feed)
 * - 9:16 → 16:9 (TikTok → YouTube)
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { v4: uuidv4 } = require('uuid');
const FFmpegWrapper = require('./ffmpegWrapper');

class SmartReframe {
  constructor(ffmpegWrapper = null) {
    this.ffmpeg = ffmpegWrapper || new FFmpegWrapper();
    this.tempDir = path.join(os.tmpdir(), 'video-editor-reframe');
    
    // Aspect ratios comunes
    this.aspectRatios = {
      '16:9': { width: 16, height: 9, name: 'Landscape (YouTube)' },
      '9:16': { width: 9, height: 16, name: 'Portrait (TikTok/Reels)' },
      '1:1': { width: 1, height: 1, name: 'Square (Instagram)' },
      '4:3': { width: 4, height: 3, name: 'Standard (TV)' },
      '4:5': { width: 4, height: 5, name: 'Portrait (Instagram)' },
      '21:9': { width: 21, height: 9, name: 'Ultrawide (Cinema)' },
      '2.35:1': { width: 2.35, height: 1, name: 'Cinemascope' }
    };
    
    // Presets por plataforma
    this.platformPresets = {
      youtube: { ratio: '16:9', resolution: '1920x1080' },
      youtubeShorts: { ratio: '9:16', resolution: '1080x1920' },
      tiktok: { ratio: '9:16', resolution: '1080x1920' },
      instagramReels: { ratio: '9:16', resolution: '1080x1920' },
      instagramFeed: { ratio: '1:1', resolution: '1080x1080' },
      instagramPost: { ratio: '4:5', resolution: '1080x1350' },
      twitter: { ratio: '16:9', resolution: '1280x720' },
      linkedin: { ratio: '1:1', resolution: '1080x1080' }
    };
    
    // Modos de reencuadre
    this.reframeModes = {
      center: {
        name: 'Centro',
        description: 'Encuadra desde el centro del video'
      },
      top: {
        name: 'Arriba',
        description: 'Prioriza la parte superior del frame'
      },
      bottom: {
        name: 'Abajo',
        description: 'Prioriza la parte inferior del frame'
      },
      left: {
        name: 'Izquierda',
        description: 'Prioriza el lado izquierdo'
      },
      right: {
        name: 'Derecha',
        description: 'Prioriza el lado derecho'
      },
      auto: {
        name: 'Automático',
        description: 'Detecta el contenido principal (próximamente)'
      }
    };
    
    // Estilos de fondo para letterbox/pillarbox
    this.backgroundStyles = {
      black: { name: 'Negro', color: '0x000000' },
      white: { name: 'Blanco', color: '0xFFFFFF' },
      blur: { name: 'Blur', description: 'Fondo difuminado del video' },
      gradient: { name: 'Gradiente', description: 'Gradiente basado en colores del video' }
    };
    
    this._ensureTempDir();
  }

  /**
   * Crear directorio temporal si no existe
   */
  _ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Obtener información del video
   * @param {string} inputPath - Ruta del video
   * @returns {Promise<Object>} Información del video
   */
  async getVideoInfo(inputPath) {
    const info = await this.ffmpeg.getVideoInfo(inputPath);
    
    const width = info.width || info.streams?.[0]?.width || 1920;
    const height = info.height || info.streams?.[0]?.height || 1080;
    
    return {
      width,
      height,
      aspectRatio: width / height,
      aspectRatioString: this._simplifyRatio(width, height),
      duration: info.duration,
      fps: info.fps
    };
  }

  /**
   * Simplificar ratio a formato legible
   */
  _simplifyRatio(width, height) {
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    const w = width / divisor;
    const h = height / divisor;
    
    // Mapear a ratios conocidos
    const ratio = width / height;
    if (Math.abs(ratio - 16/9) < 0.05) return '16:9';
    if (Math.abs(ratio - 9/16) < 0.05) return '9:16';
    if (Math.abs(ratio - 1) < 0.05) return '1:1';
    if (Math.abs(ratio - 4/3) < 0.05) return '4:3';
    if (Math.abs(ratio - 4/5) < 0.05) return '4:5';
    
    return `${w}:${h}`;
  }

  /**
   * Calcular dimensiones de crop para nuevo aspect ratio
   * @param {number} srcWidth - Ancho original
   * @param {number} srcHeight - Alto original
   * @param {string} targetRatio - Ratio objetivo (ej: '9:16')
   * @param {string} mode - Modo de reencuadre
   * @returns {Object} Dimensiones de crop
   */
  _calculateCrop(srcWidth, srcHeight, targetRatio, mode = 'center') {
    const [tw, th] = targetRatio.split(':').map(Number);
    const targetAspect = tw / th;
    const srcAspect = srcWidth / srcHeight;
    
    let cropWidth, cropHeight, x, y;
    
    if (srcAspect > targetAspect) {
      // Video más ancho que target - crop horizontal (pillarbox)
      cropHeight = srcHeight;
      cropWidth = Math.floor(srcHeight * targetAspect);
      y = 0;
      
      // Posición X basada en modo
      const maxX = srcWidth - cropWidth;
      switch (mode) {
      case 'left':
        x = 0;
        break;
      case 'right':
        x = maxX;
        break;
      case 'center':
      default:
        x = Math.floor(maxX / 2);
        break;
      }
    } else {
      // Video más alto que target - crop vertical (letterbox)
      cropWidth = srcWidth;
      cropHeight = Math.floor(srcWidth / targetAspect);
      x = 0;
      
      // Posición Y basada en modo
      const maxY = srcHeight - cropHeight;
      switch (mode) {
      case 'top':
        y = 0;
        break;
      case 'bottom':
        y = maxY;
        break;
      case 'center':
      default:
        y = Math.floor(maxY / 2);
        break;
      }
    }
    
    return { cropWidth, cropHeight, x, y };
  }

  /**
   * Calcular dimensiones de pad para nuevo aspect ratio
   * @param {number} srcWidth - Ancho original
   * @param {number} srcHeight - Alto original
   * @param {string} targetRatio - Ratio objetivo
   * @param {string} targetResolution - Resolución objetivo (ej: '1080x1920')
   * @returns {Object} Dimensiones de pad
   */
  _calculatePad(srcWidth, srcHeight, targetRatio, targetResolution) {
    const [outWidth, outHeight] = targetResolution.split('x').map(Number);
    const [tw, th] = targetRatio.split(':').map(Number);
    const targetAspect = tw / th;
    const srcAspect = srcWidth / srcHeight;
    
    let scaleWidth, scaleHeight, padX, padY;
    
    if (srcAspect > targetAspect) {
      // Video más ancho - ajustar por ancho, pad vertical
      scaleWidth = outWidth;
      scaleHeight = Math.floor(outWidth / srcAspect);
      // Asegurar altura par para codecs
      scaleHeight = scaleHeight % 2 === 0 ? scaleHeight : scaleHeight + 1;
      padX = 0;
      padY = Math.floor((outHeight - scaleHeight) / 2);
    } else {
      // Video más alto - ajustar por alto, pad horizontal
      scaleHeight = outHeight;
      scaleWidth = Math.floor(outHeight * srcAspect);
      // Asegurar ancho par para codecs
      scaleWidth = scaleWidth % 2 === 0 ? scaleWidth : scaleWidth + 1;
      padX = Math.floor((outWidth - scaleWidth) / 2);
      padY = 0;
    }
    
    return { scaleWidth, scaleHeight, outWidth, outHeight, padX, padY };
  }

  /**
   * Obtener presets de plataforma disponibles
   */
  getPlatformPresets() {
    return { ...this.platformPresets };
  }

  /**
   * Obtener aspect ratios disponibles
   */
  getAspectRatios() {
    return { ...this.aspectRatios };
  }

  /**
   * Obtener modos de reencuadre disponibles
   */
  getReframeModes() {
    return { ...this.reframeModes };
  }

  /**
   * Reencuadrar video con crop (sin padding)
   * @param {string} inputPath - Ruta del video de entrada
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones de reencuadre
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async reframeWithCrop(inputPath, outputPath = null, options = {}) {
    const {
      targetRatio = '9:16',
      mode = 'center',
      resolution = null, // ej: '1080x1920'
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    // Obtener info del video
    const videoInfo = await this.getVideoInfo(inputPath);
    
    // Calcular crop
    const crop = this._calculateCrop(
      videoInfo.width, 
      videoInfo.height, 
      targetRatio, 
      mode
    );

    // Generar ruta de salida
    if (!outputPath) {
      const ext = path.extname(inputPath);
      outputPath = path.join(
        this.tempDir,
        `reframe-crop-${uuidv4()}${ext}`
      );
    }

    // Construir filtro
    let filter = `crop=${crop.cropWidth}:${crop.cropHeight}:${crop.x}:${crop.y}`;
    
    // Agregar scale si se especifica resolución
    if (resolution) {
      const [w, h] = resolution.split('x');
      filter += `,scale=${w}:${h}`;
    }

    const args = [
      '-i', inputPath,
      '-vf', filter,
      '-c:a', 'copy',
      '-y', outputPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Reencuadrando', percent: 0, message: 'Iniciando crop...' });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        onProgress({
          stage: 'Reencuadrando',
          percent: Math.min(progress.percent || 0, 99),
          message: `Procesando... ${progress.percent?.toFixed(0) || 0}%`
        });
      }
    });

    if (onProgress) {
      onProgress({ stage: 'Reencuadrando', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath,
      originalRatio: videoInfo.aspectRatioString,
      targetRatio,
      mode,
      crop,
      processingTime: duration,
      message: `Reencuadrado de ${videoInfo.aspectRatioString} a ${targetRatio} en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Reencuadrar video con padding (letterbox/pillarbox)
   * @param {string} inputPath - Ruta del video de entrada
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones de reencuadre
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async reframeWithPad(inputPath, outputPath = null, options = {}) {
    const {
      targetRatio = '9:16',
      resolution = '1080x1920',
      backgroundColor = 'black',
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const videoInfo = await this.getVideoInfo(inputPath);
    
    const pad = this._calculatePad(
      videoInfo.width,
      videoInfo.height,
      targetRatio,
      resolution
    );

    if (!outputPath) {
      const ext = path.extname(inputPath);
      outputPath = path.join(
        this.tempDir,
        `reframe-pad-${uuidv4()}${ext}`
      );
    }

    // Color de fondo
    const bgColor = this.backgroundStyles[backgroundColor]?.color || '0x000000';
    
    // Construir filtro: scale + pad
    const filter = `scale=${pad.scaleWidth}:${pad.scaleHeight},pad=${pad.outWidth}:${pad.outHeight}:${pad.padX}:${pad.padY}:color=${bgColor}`;

    const args = [
      '-i', inputPath,
      '-vf', filter,
      '-c:a', 'copy',
      '-y', outputPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Reencuadrando', percent: 0, message: 'Agregando padding...' });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Reencuadrando', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath,
      originalRatio: videoInfo.aspectRatioString,
      targetRatio,
      resolution,
      pad,
      processingTime: duration
    };
  }

  /**
   * Reencuadrar con fondo blur (estilo TikTok)
   * @param {string} inputPath - Ruta del video
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async reframeWithBlurBackground(inputPath, outputPath = null, options = {}) {
    const {
      targetRatio = '9:16',
      resolution = '1080x1920',
      blurStrength = 20,
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const videoInfo = await this.getVideoInfo(inputPath);
    const [outWidth, outHeight] = resolution.split('x').map(Number);

    if (!outputPath) {
      const ext = path.extname(inputPath);
      outputPath = path.join(
        this.tempDir,
        `reframe-blur-${uuidv4()}${ext}`
      );
    }

    // Filtro complejo: fondo blur + video escalado encima
    const filterComplex = [
      // Stream 0: Fondo - escalar y blur
      `[0:v]scale=${outWidth}:${outHeight}:force_original_aspect_ratio=increase,` +
      `crop=${outWidth}:${outHeight},` +
      `boxblur=${blurStrength}:${blurStrength}[bg]`,
      
      // Stream 1: Video principal - escalar manteniendo aspect ratio
      `[0:v]scale='min(${outWidth},iw*${outHeight}/ih)':'min(${outHeight},ih*${outWidth}/iw)'` +
      `:force_original_aspect_ratio=decrease[fg]`,
      
      // Overlay: centrar video sobre fondo
      `[bg][fg]overlay=(W-w)/2:(H-h)/2`
    ].join(';');

    const args = [
      '-i', inputPath,
      '-filter_complex', filterComplex,
      '-c:a', 'copy',
      '-y', outputPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Reencuadrando', percent: 0, message: 'Creando fondo blur...' });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Reencuadrando', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath,
      originalRatio: videoInfo.aspectRatioString,
      targetRatio,
      resolution,
      style: 'blur',
      processingTime: duration,
      message: `Reencuadrado con blur en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Reencuadrar para plataforma específica
   * @param {string} inputPath - Ruta del video
   * @param {string} platform - Plataforma (youtube, tiktok, etc)
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} Resultado
   */
  async reframeForPlatform(inputPath, platform, options = {}) {
    const preset = this.platformPresets[platform];
    
    if (!preset) {
      throw new Error(`Plataforma no soportada: ${platform}. Opciones: ${Object.keys(this.platformPresets).join(', ')}`);
    }

    const { style = 'crop', ...restOptions } = options;

    switch (style) {
    case 'pad':
      return this.reframeWithPad(inputPath, options.outputPath, {
        targetRatio: preset.ratio,
        resolution: preset.resolution,
        ...restOptions
      });
    case 'blur':
      return this.reframeWithBlurBackground(inputPath, options.outputPath, {
        targetRatio: preset.ratio,
        resolution: preset.resolution,
        ...restOptions
      });
    case 'crop':
    default:
      return this.reframeWithCrop(inputPath, options.outputPath, {
        targetRatio: preset.ratio,
        resolution: preset.resolution,
        ...restOptions
      });
    }
  }

  /**
   * Limpiar archivos temporales
   */
  cleanup() {
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(this.tempDir, file));
        } catch {
          // Ignorar errores
        }
      }
    }
  }
}

module.exports = SmartReframe;
