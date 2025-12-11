/**
 * VoiceIsolation - Separación de voz del fondo
 * 
 * Utiliza filtros FFmpeg avanzados para aislar voces humanas
 * del ruido de fondo y otros elementos de audio.
 * 
 * Técnicas:
 * - Filtros de frecuencia (highpass/lowpass para rango vocal)
 * - Compresión de rango dinámico
 * - Noise gate para eliminar silencios ruidosos
 * - Center channel extraction (para stereo)
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { v4: uuidv4 } = require('uuid');
const FFmpegWrapper = require('../../ffmpegWrapper');

class VoiceIsolation {
  constructor(ffmpegWrapper = null) {
    this.ffmpeg = ffmpegWrapper || new FFmpegWrapper();
    this.tempDir = path.join(os.tmpdir(), 'video-editor-voice-isolation');
    
    // Rangos de frecuencia para voz humana
    this.voiceFrequency = {
      low: 80,      // Hz - límite inferior de voz masculina
      high: 3400,   // Hz - límite superior de voz (claridad)
      extended: 8000 // Hz - para sibilantes y consonantes
    };
    
    // Presets de aislamiento
    this.presets = {
      // Aislamiento básico - conservador
      basic: {
        name: 'Básico',
        description: 'Aislamiento suave, preserva naturalidad',
        filters: {
          highpass: 100,
          lowpass: 4000,
          compression: false,
          noiseGate: false
        }
      },
      // Aislamiento estándar - balance
      standard: {
        name: 'Estándar',
        description: 'Balance entre aislamiento y calidad',
        filters: {
          highpass: 80,
          lowpass: 8000,
          compression: true,
          compRatio: 3,
          noiseGate: true,
          gateThreshold: -40
        }
      },
      // Aislamiento agresivo - máxima separación
      aggressive: {
        name: 'Agresivo',
        description: 'Máximo aislamiento, puede afectar calidad',
        filters: {
          highpass: 120,
          lowpass: 3500,
          compression: true,
          compRatio: 6,
          noiseGate: true,
          gateThreshold: -35,
          centerExtract: true
        }
      },
      // Podcast - optimizado para voz hablada
      podcast: {
        name: 'Podcast',
        description: 'Optimizado para voz hablada clara',
        filters: {
          highpass: 80,
          lowpass: 12000,
          compression: true,
          compRatio: 4,
          noiseGate: true,
          gateThreshold: -45,
          deEsser: true,
          normalize: true
        }
      },
      // Entrevista - preserva múltiples voces
      interview: {
        name: 'Entrevista',
        description: 'Preserva múltiples voces, reduce ambiente',
        filters: {
          highpass: 60,
          lowpass: 10000,
          compression: true,
          compRatio: 2.5,
          noiseGate: true,
          gateThreshold: -50
        }
      }
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
   * Obtener presets disponibles
   * @returns {Object} Presets con nombre y descripción
   */
  getPresets() {
    const result = {};
    for (const [key, value] of Object.entries(this.presets)) {
      result[key] = {
        name: value.name,
        description: value.description
      };
    }
    return result;
  }

  /**
   * Construir cadena de filtros FFmpeg para aislamiento de voz
   * @param {Object} settings - Configuración de filtros
   * @returns {string} Cadena de filtros FFmpeg
   */
  _buildFilterChain(settings) {
    const filters = [];
    
    // 1. Highpass filter - elimina frecuencias bajas (rumble, traffic)
    if (settings.highpass) {
      filters.push(`highpass=f=${settings.highpass}:poles=2`);
    }
    
    // 2. Lowpass filter - elimina frecuencias altas (hiss, electronic noise)
    if (settings.lowpass) {
      filters.push(`lowpass=f=${settings.lowpass}:poles=2`);
    }
    
    // 3. Center channel extraction (para audio stereo)
    // Extrae el canal central donde típicamente está la voz
    if (settings.centerExtract) {
      filters.push('pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1');
    }
    
    // 4. Noise gate - silencia partes muy silenciosas (ruido de fondo)
    if (settings.noiseGate) {
      const threshold = settings.gateThreshold || -40;
      filters.push(`agate=threshold=${threshold}dB:ratio=10:attack=10:release=100`);
    }
    
    // 5. Compresor - nivela el volumen de la voz
    if (settings.compression) {
      const ratio = settings.compRatio || 4;
      filters.push(`acompressor=threshold=-20dB:ratio=${ratio}:attack=5:release=100`);
    }
    
    // 6. De-esser - reduce sibilantes (s, sh, ch)
    if (settings.deEsser) {
      // Banda específica para sibilantes (4-8kHz)
      filters.push('highshelf=f=5000:g=-3');
    }
    
    // 7. Normalización final
    if (settings.normalize) {
      filters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
    }
    
    return filters.join(',');
  }

  /**
   * Aislar voz de un archivo de audio/video
   * @param {string} inputPath - Ruta del archivo de entrada
   * @param {string} outputPath - Ruta del archivo de salida (opcional)
   * @param {Object} options - Opciones de procesamiento
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async isolateVoice(inputPath, outputPath = null, options = {}) {
    const {
      preset = 'standard',
      customFilters = null,
      format = 'wav',
      keepVideo = false,
      onProgress = null
    } = options;

    // Validar archivo de entrada
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    // Determinar configuración de filtros
    let filterSettings;
    if (customFilters) {
      filterSettings = customFilters;
    } else if (this.presets[preset]) {
      filterSettings = this.presets[preset].filters;
    } else {
      throw new Error(`Preset no válido: ${preset}`);
    }

    // Generar ruta de salida si no se especifica
    if (!outputPath) {
      const ext = keepVideo ? path.extname(inputPath) : `.${format}`;
      outputPath = path.join(
        this.tempDir,
        `voice-isolated-${uuidv4()}${ext}`
      );
    }

    // Construir cadena de filtros
    const filterChain = this._buildFilterChain(filterSettings);

    // Construir comando FFmpeg
    const args = ['-i', inputPath];
    
    if (keepVideo) {
      // Mantener video, solo procesar audio
      args.push(
        '-c:v', 'copy',
        '-af', filterChain
      );
    } else {
      // Solo audio
      args.push(
        '-vn',
        '-af', filterChain
      );
    }

    // Configuración de salida
    if (format === 'wav') {
      args.push('-c:a', 'pcm_s16le');
    } else if (format === 'mp3') {
      args.push('-c:a', 'libmp3lame', '-b:a', '192k');
    } else if (format === 'aac') {
      args.push('-c:a', 'aac', '-b:a', '192k');
    }

    args.push('-y', outputPath);

    // Ejecutar FFmpeg
    const startTime = Date.now();
    
    if (onProgress) {
      onProgress({ stage: 'Aislando voz', percent: 0, message: 'Iniciando...' });
    }

    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        onProgress({
          stage: 'Aislando voz',
          percent: Math.min(progress.percent || 0, 99),
          message: `Procesando audio... ${progress.percent?.toFixed(0) || 0}%`
        });
      }
    });

    if (onProgress) {
      onProgress({ stage: 'Aislando voz', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath,
      preset: customFilters ? 'custom' : preset,
      filterChain,
      processingTime: duration,
      message: `Voz aislada exitosamente en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Extraer solo el fondo (inverso de isolateVoice)
   * @param {string} inputPath - Ruta del archivo de entrada
   * @param {string} outputPath - Ruta del archivo de salida
   * @param {Object} options - Opciones de procesamiento
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async extractBackground(inputPath, outputPath = null, options = {}) {
    const {
      format = 'wav',
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    if (!outputPath) {
      outputPath = path.join(
        this.tempDir,
        `background-${uuidv4()}.${format}`
      );
    }

    // Filtros para extraer fondo (inverso de voz)
    // Elimina frecuencias vocales centrales
    const filterChain = [
      'highpass=f=4000:poles=2',  // Solo frecuencias altas
      'lowpass=f=200:poles=2',    // O solo frecuencias bajas
      'amix=inputs=2:duration=first' // Mezclar ambas bandas
    ].join(',');

    // En realidad, para extraer fondo necesitamos un enfoque diferente
    // Usamos bandreject para eliminar frecuencias vocales
    const args = [
      '-i', inputPath,
      '-vn',
      '-af', 'bandreject=f=300:w=2000', // Rechaza banda vocal (300-2300Hz)
      '-c:a', format === 'wav' ? 'pcm_s16le' : 'libmp3lame',
      '-y', outputPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Extrayendo fondo', percent: 0, message: 'Iniciando...' });
    }

    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Extrayendo fondo', percent: 100, message: 'Completado' });
    }

    return {
      success: true,
      outputPath,
      message: 'Fondo extraído exitosamente'
    };
  }

  /**
   * Crear stems separados (voz + fondo)
   * @param {string} inputPath - Ruta del archivo de entrada
   * @param {string} outputDir - Directorio de salida
   * @param {Object} options - Opciones de procesamiento
   * @returns {Promise<Object>} Resultado con paths de ambos stems
   */
  async createStems(inputPath, outputDir = null, options = {}) {
    const {
      preset = 'standard',
      format = 'wav',
      onProgress = null
    } = options;

    if (!outputDir) {
      outputDir = this.tempDir;
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const baseName = path.basename(inputPath, path.extname(inputPath));
    const voicePath = path.join(outputDir, `${baseName}_voice.${format}`);
    const backgroundPath = path.join(outputDir, `${baseName}_background.${format}`);

    if (onProgress) {
      onProgress({ stage: 'Creando stems', percent: 0, message: 'Procesando voz...' });
    }

    // Aislar voz
    await this.isolateVoice(inputPath, voicePath, {
      preset,
      format,
      onProgress: (p) => {
        if (onProgress) {
          onProgress({
            stage: 'Creando stems',
            percent: p.percent * 0.5,
            message: `Procesando voz... ${p.percent?.toFixed(0) || 0}%`
          });
        }
      }
    });

    if (onProgress) {
      onProgress({ stage: 'Creando stems', percent: 50, message: 'Procesando fondo...' });
    }

    // Extraer fondo
    await this.extractBackground(inputPath, backgroundPath, {
      format,
      onProgress: (p) => {
        if (onProgress) {
          onProgress({
            stage: 'Creando stems',
            percent: 50 + p.percent * 0.5,
            message: `Procesando fondo... ${p.percent?.toFixed(0) || 0}%`
          });
        }
      }
    });

    if (onProgress) {
      onProgress({ stage: 'Creando stems', percent: 100, message: 'Completado' });
    }

    return {
      success: true,
      stems: {
        voice: voicePath,
        background: backgroundPath
      },
      message: 'Stems creados exitosamente'
    };
  }

  /**
   * Analizar audio para detectar presencia de voz
   * @param {string} inputPath - Ruta del archivo
   * @returns {Promise<Object>} Análisis de voz
   */
  async analyzeVoicePresence(inputPath) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    // Usar silencedetect para encontrar segmentos con audio
    const args = [
      '-i', inputPath,
      '-af', 'silencedetect=noise=-30dB:d=0.5',
      '-f', 'null',
      '-'
    ];

    const result = await this.ffmpeg.execute(args);
    
    // Parsear salida para detectar segmentos de silencio
    // FFmpeg output includes silence_start and silence_end
    const silenceSegments = [];
    const regex = /silence_(start|end): (\d+\.?\d*)/g;
    let match;
    let currentStart = null;

    const output = result.stderr || result.output || '';
    while ((match = regex.exec(output)) !== null) {
      if (match[1] === 'start') {
        currentStart = Number.parseFloat(match[2]);
      } else if (match[1] === 'end' && currentStart !== null) {
        silenceSegments.push({
          start: currentStart,
          end: Number.parseFloat(match[2])
        });
        currentStart = null;
      }
    }

    return {
      success: true,
      silenceSegments,
      hasSpeech: silenceSegments.length < 10, // Heurística simple
      message: `Detectados ${silenceSegments.length} segmentos de silencio`
    };
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
          // Ignorar errores de limpieza
        }
      }
    }
  }
}

module.exports = VoiceIsolation;
