/**
 * LutCreator - Creador de LUTs 3D personalizados
 * 
 * Permite crear, modificar y exportar LUTs (Look Up Tables)
 * para corrección de color profesional.
 * 
 * Formatos soportados: .cube (estándar de la industria)
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { v4: uuidv4 } = require('uuid');
const FFmpegWrapper = require('../../ffmpegWrapper');

class LutCreator {
  constructor(ffmpegWrapper = null) {
    this.ffmpeg = ffmpegWrapper || new FFmpegWrapper();
    this.tempDir = path.join(os.tmpdir(), 'video-editor-luts');
    
    // Tamaños de LUT estándar
    this.lutSizes = {
      small: 17,    // 17x17x17 - Rápido, menor precisión
      medium: 33,   // 33x33x33 - Balance
      large: 65,    // 65x65x65 - Alta precisión
      ultra: 129    // 129x129x129 - Máxima precisión (lento)
    };
    
    // Presets de color básicos
    this.colorPresets = {
      neutral: {
        name: 'Neutral',
        description: 'Sin modificación de color',
        adjustments: {}
      },
      warm: {
        name: 'Cálido',
        description: 'Tonos cálidos, atardecer',
        adjustments: {
          temperature: 20,
          tint: 5,
          saturation: 1.1
        }
      },
      cool: {
        name: 'Frío',
        description: 'Tonos fríos, cinematográfico',
        adjustments: {
          temperature: -20,
          tint: -5,
          saturation: 0.9
        }
      },
      vintage: {
        name: 'Vintage',
        description: 'Estilo retro, desaturado',
        adjustments: {
          saturation: 0.7,
          contrast: 0.9,
          fadeAmount: 0.1
        }
      },
      cinematic: {
        name: 'Cinematográfico',
        description: 'Look de película, teal & orange',
        adjustments: {
          tealOrange: true,
          contrast: 1.1,
          saturation: 0.95
        }
      },
      blackAndWhite: {
        name: 'Blanco y Negro',
        description: 'Monocromático con contraste',
        adjustments: {
          saturation: 0,
          contrast: 1.2
        }
      },
      highContrast: {
        name: 'Alto Contraste',
        description: 'Contraste dramático',
        adjustments: {
          contrast: 1.4,
          saturation: 1.1
        }
      },
      lowContrast: {
        name: 'Bajo Contraste',
        description: 'Suave, estilo film',
        adjustments: {
          contrast: 0.8,
          fadeAmount: 0.05
        }
      },
      bleachBypass: {
        name: 'Bleach Bypass',
        description: 'Desaturado con alto contraste',
        adjustments: {
          saturation: 0.5,
          contrast: 1.3
        }
      },
      crossProcess: {
        name: 'Cross Process',
        description: 'Colores cruzados, experimental',
        adjustments: {
          crossProcess: true,
          saturation: 1.2
        }
      }
    };
    
    this._ensureTempDir();
  }

  /**
   * Crear directorio temporal
   */
  _ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Obtener presets disponibles
   */
  getPresets() {
    const result = {};
    for (const [key, value] of Object.entries(this.colorPresets)) {
      result[key] = {
        name: value.name,
        description: value.description
      };
    }
    return result;
  }

  /**
   * Alias para getPresets (compatibilidad)
   */
  getColorPresets() {
    return this.getPresets();
  }

  /**
   * Obtener tamaños de LUT disponibles
   */
  getLutSizes() {
    return { ...this.lutSizes };
  }

  /**
   * Crear un LUT de identidad (sin modificaciones)
   * @param {Object} options - Opciones
   * @returns {Object} Resultado
   */
  createIdentityLut(options = {}) {
    const { size = 'medium', outputPath = null } = options;
    
    const lutSize = this.lutSizes[size] || this.lutSizes.medium;
    const finalPath = outputPath || path.join(this.tempDir, `identity-${uuidv4()}.cube`);
    
    const content = this.generateCubeContent(lutSize, {});
    fs.writeFileSync(finalPath, content);
    
    return {
      success: true,
      outputPath: finalPath,
      size: lutSize,
      type: 'identity',
      message: `LUT de identidad creado (${lutSize}x${lutSize}x${lutSize})`
    };
  }

  /**
   * Crear un LUT con gradiente de color
   * @param {Object} options - Opciones
   * @returns {Object} Resultado
   */
  createGradientLut(options = {}) {
    const {
      startColor = { r: 0, g: 0, b: 0 },
      endColor = { r: 255, g: 255, b: 255 },
      size = 'medium',
      outputPath = null
    } = options;
    
    const lutSize = this.lutSizes[size] || this.lutSizes.medium;
    const finalPath = outputPath || path.join(this.tempDir, `gradient-${uuidv4()}.cube`);
    
    // Generar LUT con gradiente personalizado
    const lines = [];
    lines.push('# Created by BlackMamba Studio LUT Creator');
    lines.push(`# Gradient LUT: ${JSON.stringify(startColor)} -> ${JSON.stringify(endColor)}`);
    lines.push('');
    lines.push('TITLE "BlackMamba Gradient LUT"');
    lines.push(`LUT_3D_SIZE ${lutSize}`);
    lines.push('');
    
    for (let b = 0; b < lutSize; b++) {
      for (let g = 0; g < lutSize; g++) {
        for (let r = 0; r < lutSize; r++) {
          const t = (r + g + b) / (3 * (lutSize - 1));
          const outR = this._lerp(startColor.r / 255, endColor.r / 255, t);
          const outG = this._lerp(startColor.g / 255, endColor.g / 255, t);
          const outB = this._lerp(startColor.b / 255, endColor.b / 255, t);
          lines.push(`${outR.toFixed(6)} ${outG.toFixed(6)} ${outB.toFixed(6)}`);
        }
      }
    }
    
    fs.writeFileSync(finalPath, lines.join('\n'));
    
    return {
      success: true,
      outputPath: finalPath,
      size: lutSize,
      type: 'gradient',
      startColor,
      endColor,
      message: `LUT de gradiente creado (${lutSize}x${lutSize}x${lutSize})`
    };
  }

  /**
   * Ajustar un LUT existente
   * @param {string} lutPath - Ruta del LUT a ajustar
   * @param {Object} adjustments - Ajustes a aplicar
   * @returns {Object} Resultado
   */
  adjustLut(lutPath, adjustments = {}) {
    if (!fs.existsSync(lutPath)) {
      throw new Error(`LUT no encontrado: ${lutPath}`);
    }
    
    const lutInfo = this.parseCubeFile(lutPath);
    const outputPath = path.join(this.tempDir, `adjusted-${uuidv4()}.cube`);
    
    // Generar nuevo LUT con ajustes
    const content = this.generateCubeContent(lutInfo.size, adjustments);
    fs.writeFileSync(outputPath, content);
    
    return {
      success: true,
      outputPath,
      originalPath: lutPath,
      adjustments,
      message: 'LUT ajustado exitosamente'
    };
  }

  /**
   * Interpolar valor de color
   */
  _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Clamp valor entre 0 y 1
   */
  _clamp(value) {
    return Math.max(0, Math.min(1, value));
  }

  /**
   * Convertir RGB a HSL
   */
  _rgbToHsl(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h, s, l };
  }

  /**
   * Convertir HSL a RGB
   */
  _hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        let tt = t;
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1/6) return p + (q - p) * 6 * tt;
        if (tt < 1/2) return q;
        if (tt < 2/3) return p + (q - p) * (2/3 - tt) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return { r, g, b };
  }

  /**
   * Aplicar ajustes de color a un valor RGB
   */
  _applyAdjustments(r, g, b, adjustments) {
    let outR = r;
    let outG = g;
    let outB = b;

    // Temperature (cálido/frío)
    if (adjustments.temperature) {
      const temp = adjustments.temperature / 100;
      outR = this._clamp(outR + temp * 0.1);
      outB = this._clamp(outB - temp * 0.1);
    }

    // Tint (verde/magenta)
    if (adjustments.tint) {
      const tint = adjustments.tint / 100;
      outG = this._clamp(outG + tint * 0.05);
    }

    // Saturation
    if (adjustments.saturation !== undefined) {
      const hsl = this._rgbToHsl(outR, outG, outB);
      hsl.s *= adjustments.saturation;
      hsl.s = this._clamp(hsl.s);
      const rgb = this._hslToRgb(hsl.h, hsl.s, hsl.l);
      outR = rgb.r;
      outG = rgb.g;
      outB = rgb.b;
    }

    // Contrast
    if (adjustments.contrast) {
      const factor = adjustments.contrast;
      outR = this._clamp((outR - 0.5) * factor + 0.5);
      outG = this._clamp((outG - 0.5) * factor + 0.5);
      outB = this._clamp((outB - 0.5) * factor + 0.5);
    }

    // Fade (levantar negros)
    if (adjustments.fadeAmount) {
      const fade = adjustments.fadeAmount;
      outR = this._lerp(fade, 1, outR);
      outG = this._lerp(fade, 1, outG);
      outB = this._lerp(fade, 1, outB);
    }

    // Teal & Orange (cinematográfico)
    if (adjustments.tealOrange) {
      const hsl = this._rgbToHsl(outR, outG, outB);
      // Sombras hacia teal, highlights hacia orange
      if (hsl.l < 0.5) {
        // Push hacia teal (cyan-azul)
        hsl.h = this._lerp(hsl.h, 0.5, 0.3); // 0.5 = cyan
      } else {
        // Push hacia orange
        hsl.h = this._lerp(hsl.h, 0.08, 0.3); // 0.08 = orange
      }
      const rgb = this._hslToRgb(hsl.h, hsl.s, hsl.l);
      outR = rgb.r;
      outG = rgb.g;
      outB = rgb.b;
    }

    // Cross Process
    if (adjustments.crossProcess) {
      // Swap canales parcialmente
      const tempR = outR;
      outR = this._lerp(outR, outB, 0.3);
      outB = this._lerp(outB, tempR, 0.3);
      outG = this._clamp(outG * 1.1);
    }

    return {
      r: this._clamp(outR),
      g: this._clamp(outG),
      b: this._clamp(outB)
    };
  }

  /**
   * Generar contenido de archivo .cube
   * @param {number} size - Tamaño del LUT (17, 33, 65, etc)
   * @param {Object} adjustments - Ajustes de color
   * @returns {string} Contenido del archivo .cube
   */
  generateCubeContent(size, adjustments = {}) {
    const lines = [];
    
    // Header
    lines.push('# Created by BlackMamba Studio LUT Creator');
    lines.push(`# Date: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('TITLE "BlackMamba Custom LUT"');
    lines.push(`LUT_3D_SIZE ${size}`);
    lines.push('');
    lines.push('# LUT data');
    
    // Generar datos del LUT
    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          // Normalizar a 0-1
          const rIn = r / (size - 1);
          const gIn = g / (size - 1);
          const bIn = b / (size - 1);
          
          // Aplicar ajustes
          const adjusted = this._applyAdjustments(rIn, gIn, bIn, adjustments);
          
          // Formato: R G B (6 decimales)
          lines.push(`${adjusted.r.toFixed(6)} ${adjusted.g.toFixed(6)} ${adjusted.b.toFixed(6)}`);
        }
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Crear LUT desde preset
   * @param {string} presetName - Nombre del preset
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado con path del LUT
   */
  async createFromPreset(presetName, options = {}) {
    const {
      size = 'medium',
      outputPath = null,
      onProgress = null
    } = options;

    const preset = this.colorPresets[presetName];
    if (!preset) {
      throw new Error(`Preset no encontrado: ${presetName}`);
    }

    const lutSize = this.lutSizes[size] || this.lutSizes.medium;
    
    if (onProgress) {
      onProgress({ stage: 'Creando LUT', percent: 0, message: 'Generando...' });
    }

    const content = this.generateCubeContent(lutSize, preset.adjustments);

    if (onProgress) {
      onProgress({ stage: 'Creando LUT', percent: 50, message: 'Guardando...' });
    }

    const finalPath = outputPath || path.join(
      this.tempDir,
      `${presetName}-${size}-${uuidv4()}.cube`
    );

    fs.writeFileSync(finalPath, content, 'utf-8');

    if (onProgress) {
      onProgress({ stage: 'Creando LUT', percent: 100, message: 'Completado' });
    }

    return {
      success: true,
      outputPath: finalPath,
      preset: presetName,
      size: lutSize,
      message: `LUT "${preset.name}" creado exitosamente`
    };
  }

  /**
   * Crear LUT personalizado
   * @param {Object} adjustments - Ajustes de color personalizados
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async createCustom(adjustments, options = {}) {
    const {
      size = 'medium',
      name = 'Custom',
      outputPath = null,
      onProgress = null
    } = options;

    const lutSize = this.lutSizes[size] || this.lutSizes.medium;

    if (onProgress) {
      onProgress({ stage: 'Creando LUT', percent: 0, message: 'Generando LUT personalizado...' });
    }

    const content = this.generateCubeContent(lutSize, adjustments);

    const finalPath = outputPath || path.join(
      this.tempDir,
      `custom-${uuidv4()}.cube`
    );

    fs.writeFileSync(finalPath, content, 'utf-8');

    if (onProgress) {
      onProgress({ stage: 'Creando LUT', percent: 100, message: 'Completado' });
    }

    return {
      success: true,
      outputPath: finalPath,
      name,
      size: lutSize,
      adjustments,
      message: `LUT personalizado "${name}" creado`
    };
  }

  /**
   * Aplicar LUT a un video
   * @param {string} inputPath - Video de entrada
   * @param {string} lutPath - Ruta del archivo .cube
   * @param {string} outputPath - Video de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async applyLutToVideo(inputPath, lutPath, outputPath = null, options = {}) {
    const {
      intensity = 1.0, // 0-1, permite mezclar con original
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Video no encontrado: ${inputPath}`);
    }

    if (!fs.existsSync(lutPath)) {
      throw new Error(`LUT no encontrado: ${lutPath}`);
    }

    if (!outputPath) {
      const ext = path.extname(inputPath);
      outputPath = path.join(
        this.tempDir,
        `lut-applied-${uuidv4()}${ext}`
      );
    }

    // Construir filtro
    let filter;
    if (intensity >= 1.0) {
      // Aplicación completa
      filter = `lut3d='${lutPath}'`;
    } else {
      // Mezcla parcial con original
      filter = `split[a][b];[a]lut3d='${lutPath}'[c];[b][c]blend=all_expr='A*(1-${intensity})+B*${intensity}'`;
    }

    const args = [
      '-i', inputPath,
      '-vf', filter,
      '-c:a', 'copy',
      '-y', outputPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Aplicando LUT', percent: 0, message: 'Procesando...' });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        onProgress({
          stage: 'Aplicando LUT',
          percent: Math.min(progress.percent || 0, 99),
          message: `Procesando... ${progress.percent?.toFixed(0) || 0}%`
        });
      }
    });

    if (onProgress) {
      onProgress({ stage: 'Aplicando LUT', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath,
      lutPath,
      intensity,
      processingTime: duration,
      message: `LUT aplicado en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Extraer LUT de una imagen de referencia
   * (Crea un LUT basado en la diferencia entre imagen original y procesada)
   * @param {string} originalImage - Imagen original
   * @param {string} processedImage - Imagen con el look deseado
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  // eslint-disable-next-line no-unused-vars
  async extractFromImages(_originalImage, _processedImage, _options = {}) {
    // Esta es una función placeholder
    // La implementación real requiere análisis de imagen
    // que está fuera del alcance de FFmpeg solo
    
    return {
      success: false,
      message: 'Extracción de LUT desde imágenes requiere librería de procesamiento de imagen adicional. Use createFromPreset o createCustom.',
      suggestion: 'Considere usar ajustes manuales con createCustom()'
    };
  }

  /**
   * Parsear archivo .cube existente
   * @param {string} lutPath - Ruta del archivo .cube
   * @returns {Object} Información del LUT
   */
  parseCubeFile(lutPath) {
    if (!fs.existsSync(lutPath)) {
      throw new Error(`LUT no encontrado: ${lutPath}`);
    }

    const content = fs.readFileSync(lutPath, 'utf-8');
    const lines = content.split('\n');
    
    const info = {
      title: '',
      size: 0,
      domain: { min: [0, 0, 0], max: [1, 1, 1] },
      dataPoints: 0
    };

    let dataCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines before data
      if (trimmed.startsWith('#') || trimmed === '') continue;
      
      // Parse header
      if (trimmed.startsWith('TITLE')) {
        info.title = trimmed.replace(/TITLE\s*"?([^"]*)"?/, '$1');
      } else if (trimmed.startsWith('LUT_3D_SIZE')) {
        info.size = Number.parseInt(trimmed.split(/\s+/)[1], 10);
      } else if (trimmed.startsWith('DOMAIN_MIN')) {
        const parts = trimmed.split(/\s+/).slice(1).map(Number);
        info.domain.min = parts;
      } else if (trimmed.startsWith('DOMAIN_MAX')) {
        const parts = trimmed.split(/\s+/).slice(1).map(Number);
        info.domain.max = parts;
      } else if (/^[\d.-]+\s+[\d.-]+\s+[\d.-]+$/.test(trimmed)) {
        // Data line
        dataCount++;
      }
    }

    info.dataPoints = dataCount;
    const expectedPoints = info.size ** 3;
    info.isValid = dataCount === expectedPoints;

    return info;
  }

  /**
   * Listar LUTs en directorio
   * @param {string} directory - Directorio a escanear
   * @returns {Array} Lista de LUTs encontrados
   */
  listLuts(directory = null) {
    const dir = directory || this.tempDir;
    
    if (!fs.existsSync(dir)) {
      return [];
    }

    const files = fs.readdirSync(dir);
    const luts = [];

    for (const file of files) {
      if (file.endsWith('.cube') || file.endsWith('.CUBE')) {
        const filePath = path.join(dir, file);
        try {
          const info = this.parseCubeFile(filePath);
          luts.push({
            name: file,
            path: filePath,
            ...info
          });
        } catch {
          luts.push({
            name: file,
            path: filePath,
            isValid: false
          });
        }
      }
    }

    return luts;
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

module.exports = LutCreator;
