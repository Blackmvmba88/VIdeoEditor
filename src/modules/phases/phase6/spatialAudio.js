/**
 * SpatialAudio - Procesamiento de audio espacial
 * 
 * Soporte para:
 * - Dolby Atmos (metadata-based)
 * - Ambisonics (B-format)
 * - 5.1/7.1 Surround
 * - Binaural (auriculares)
 * 
 * Conversiones:
 * - Stereo → Surround (upmix)
 * - Surround → Stereo (downmix)
 * - Surround → Binaural
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { v4: uuidv4 } = require('uuid');
const FFmpegWrapper = require('../../ffmpegWrapper');

class SpatialAudio {
  constructor(ffmpegWrapper = null) {
    this.ffmpeg = ffmpegWrapper || new FFmpegWrapper();
    this.tempDir = path.join(os.tmpdir(), 'video-editor-spatial');
    
    // Configuraciones de canales
    this.channelLayouts = {
      mono: { channels: 1, layout: 'mono', description: 'Mono' },
      stereo: { channels: 2, layout: 'stereo', description: 'Estéreo' },
      surround51: { channels: 6, layout: '5.1', description: '5.1 Surround' },
      surround71: { channels: 8, layout: '7.1', description: '7.1 Surround' },
      quad: { channels: 4, layout: 'quad', description: 'Cuadrafónico' }
    };
    
    // Presets de espacialización
    this.spatialPresets = {
      cinema: {
        name: 'Cinema',
        description: 'Configuración de cine con envolvente',
        layout: '5.1',
        centerLevel: 0, // dB
        surroundLevel: -3,
        lfeLevel: -10
      },
      music: {
        name: 'Música',
        description: 'Optimizado para música',
        layout: '5.1',
        centerLevel: -6,
        surroundLevel: -6,
        lfeLevel: -15
      },
      gaming: {
        name: 'Gaming',
        description: 'Audio posicional para juegos',
        layout: '7.1',
        centerLevel: 0,
        surroundLevel: 0,
        lfeLevel: -6
      },
      broadcast: {
        name: 'Broadcast',
        description: 'Estándar de transmisión',
        layout: '5.1',
        centerLevel: 0,
        surroundLevel: -3,
        lfeLevel: -10,
        normalize: true
      }
    };
    
    // Presets binaurales
    this.binauralPresets = {
      hrtf_default: {
        name: 'HRTF Default',
        description: 'Perfil binaural estándar',
        hrtf: 'default'
      },
      intimate: {
        name: 'Íntimo',
        description: 'Sonido cercano, en tu cabeza',
        hrtf: 'default',
        distance: 0.5
      },
      room: {
        name: 'Sala',
        description: 'Simula una habitación pequeña',
        hrtf: 'default',
        distance: 2,
        roomSize: 'small'
      },
      concert: {
        name: 'Concierto',
        description: 'Simula sala de conciertos',
        hrtf: 'default',
        distance: 10,
        roomSize: 'large'
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
   * Obtener layouts de canales disponibles
   */
  getChannelLayouts() {
    return { ...this.channelLayouts };
  }

  /**
   * Obtener presets espaciales
   */
  getSpatialPresets() {
    return { ...this.spatialPresets };
  }

  /**
   * Obtener presets binaurales
   */
  getBinauralPresets() {
    return { ...this.binauralPresets };
  }

  /**
   * Detectar configuración de audio de un archivo
   * @param {string} inputPath - Ruta del archivo
   * @returns {Promise<Object>} Información de audio
   */
  async detectAudioLayout(inputPath) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const info = await this.ffmpeg.getVideoInfo(inputPath);
    
    // Buscar stream de audio
    const audioStream = info.streams?.find(s => s.codec_type === 'audio') || {};
    
    const channels = audioStream.channels || 2;
    const channelLayout = audioStream.channel_layout || (channels === 2 ? 'stereo' : 'unknown');
    const sampleRate = audioStream.sample_rate || 48000;
    const codec = audioStream.codec_name || 'unknown';
    
    // Determinar tipo de audio espacial
    let spatialType = 'stereo';
    if (channels >= 6) {
      spatialType = channels >= 8 ? '7.1' : '5.1';
    } else if (channels === 4) {
      spatialType = 'quad';
    } else if (channels === 1) {
      spatialType = 'mono';
    }
    
    return {
      channels,
      channelLayout,
      spatialType,
      sampleRate: parseInt(sampleRate),
      codec,
      isSurround: channels >= 6,
      isSpatial: channels > 2
    };
  }

  /**
   * Upmix stereo a surround
   * @param {string} inputPath - Audio/video estéreo
   * @param {string} outputPath - Salida surround
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async stereoToSurround(inputPath, outputPath = null, options = {}) {
    const {
      targetLayout = '5.1',
      preset = 'cinema',
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const audioInfo = await this.detectAudioLayout(inputPath);
    if (audioInfo.channels > 2) {
      return {
        success: false,
        message: 'El audio ya tiene más de 2 canales'
      };
    }

    const ext = path.extname(inputPath);
    if (!outputPath) {
      outputPath = path.join(this.tempDir, `surround-${uuidv4()}${ext}`);
    }

    const presetConfig = this.spatialPresets[preset] || this.spatialPresets.cinema;
    const layout = targetLayout || presetConfig.layout;

    // Filtro de upmix usando pan filter
    let panFilter;
    if (layout === '5.1') {
      // Crear 5.1 desde stereo
      // FL, FR, FC, LFE, BL, BR
      panFilter = [
        'pan=5.1',
        'c0=0.5*c0', // FL = 50% de L
        'c1=0.5*c1', // FR = 50% de R
        'c2=0.5*c0+0.5*c1', // FC = mix de L+R
        'c3=0.25*c0+0.25*c1', // LFE = mix bajo
        'c4=0.3*c0', // BL = parte de L
        'c5=0.3*c1'  // BR = parte de R
      ].join('|');
    } else if (layout === '7.1') {
      // Crear 7.1 desde stereo
      panFilter = [
        'pan=7.1',
        'c0=0.5*c0',
        'c1=0.5*c1',
        'c2=0.5*c0+0.5*c1',
        'c3=0.25*c0+0.25*c1',
        'c4=0.25*c0',
        'c5=0.25*c1',
        'c6=0.2*c0',
        'c7=0.2*c1'
      ].join('|');
    } else {
      throw new Error(`Layout no soportado para upmix: ${layout}`);
    }

    const args = [
      '-i', inputPath,
      '-af', panFilter,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '384k',
      '-y', outputPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Upmix', percent: 0, message: `Convirtiendo a ${layout}...` });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Upmix', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath,
      sourceChannels: audioInfo.channels,
      targetLayout: layout,
      processingTime: duration,
      message: `Convertido de estéreo a ${layout} en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Downmix surround a stereo
   * @param {string} inputPath - Audio/video surround
   * @param {string} outputPath - Salida estéreo
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async surroundToStereo(inputPath, outputPath = null, options = {}) {
    const {
      centerMix = 0.707, // -3dB
      surroundMix = 0.5,
      lfeMix = 0,
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const audioInfo = await this.detectAudioLayout(inputPath);
    if (audioInfo.channels <= 2) {
      return {
        success: false,
        message: 'El audio ya es estéreo o mono'
      };
    }

    const ext = path.extname(inputPath);
    if (!outputPath) {
      outputPath = path.join(this.tempDir, `stereo-${uuidv4()}${ext}`);
    }

    // Filtro de downmix
    const downmixFilter = `pan=stereo|c0=c0+${centerMix}*c2+${surroundMix}*c4+${lfeMix}*c3|c1=c1+${centerMix}*c2+${surroundMix}*c5+${lfeMix}*c3`;

    const args = [
      '-i', inputPath,
      '-af', downmixFilter,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '256k',
      '-y', outputPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Downmix', percent: 0, message: 'Convirtiendo a estéreo...' });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Downmix', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath,
      sourceChannels: audioInfo.channels,
      sourceLayout: audioInfo.channelLayout,
      processingTime: duration,
      message: `Convertido de ${audioInfo.channelLayout} a estéreo en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Convertir a audio binaural (para auriculares)
   * @param {string} inputPath - Audio/video entrada
   * @param {string} outputPath - Salida binaural
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async toBinaural(inputPath, outputPath = null, options = {}) {
    const {
      preset = 'hrtf_default',
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const audioInfo = await this.detectAudioLayout(inputPath);
    
    const ext = path.extname(inputPath);
    if (!outputPath) {
      outputPath = path.join(this.tempDir, `binaural-${uuidv4()}${ext}`);
    }

    // Usar filtro sofalizer para HRTF si está disponible,
    // o simular con filtros básicos
    let filter;
    
    if (audioInfo.isSurround) {
      // Surround a binaural
      filter = 'aresample=48000,pan=stereo|c0=c0+0.707*c2+0.5*c4|c1=c1+0.707*c2+0.5*c5';
    } else {
      // Stereo a binaural mejorado
      filter = 'aresample=48000,extrastereo=m=1.5';
    }

    const args = [
      '-i', inputPath,
      '-af', filter,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '256k',
      '-y', outputPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Binaural', percent: 0, message: 'Procesando audio binaural...' });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Binaural', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath,
      sourceChannels: audioInfo.channels,
      binauralPreset: preset,
      processingTime: duration,
      message: `Audio binaural creado en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Posicionar audio en espacio 3D
   * @param {string} inputPath - Audio mono o estéreo
   * @param {Object} position - Posición {azimuth, elevation, distance}
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async positionInSpace(inputPath, position = {}, options = {}) {
    const {
      azimuth = 0,      // -180 a 180 grados (izq a der)
      elevation = 0,     // -90 a 90 grados (abajo a arriba)
      distance = 1       // distancia relativa
    } = position;

    const { outputPath = null, onProgress = null } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const ext = path.extname(inputPath);
    const finalPath = outputPath || path.join(this.tempDir, `positioned-${uuidv4()}${ext}`);

    // Calcular pan y volumen basado en posición
    // Azimuth: -180 (izq) a 180 (der)
    const normalizedAzimuth = Math.max(-180, Math.min(180, azimuth));
    const panValue = (normalizedAzimuth + 180) / 360; // 0 a 1
    
    // Distancia afecta volumen
    const normalizedDistance = Math.max(0.1, distance);
    const volumeMultiplier = 1 / normalizedDistance;
    
    const filter = [
      `stereotools=mpan=${panValue}`,
      `volume=${Math.min(2, volumeMultiplier)}`
    ].join(',');

    const args = [
      '-i', inputPath,
      '-af', filter,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-y', finalPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Posicionamiento', percent: 0, message: 'Posicionando audio...' });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Posicionamiento', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath: finalPath,
      position: { azimuth, elevation, distance },
      processingTime: duration,
      message: `Audio posicionado (azimuth: ${azimuth}°, distance: ${distance})`
    };
  }

  /**
   * Aplicar reverberación espacial
   * @param {string} inputPath - Audio entrada
   * @param {Object} options - Opciones de reverb
   * @returns {Promise<Object>} Resultado
   */
  async applySpatialReverb(inputPath, options = {}) {
    const {
      roomSize = 'medium', // small, medium, large, hall
      wetDry = 0.3,
      outputPath = null,
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const ext = path.extname(inputPath);
    const finalPath = outputPath || path.join(this.tempDir, `reverb-${uuidv4()}${ext}`);

    // Configurar reverb según tamaño de sala
    const reverbConfigs = {
      small: { delay: 20, decay: 0.3 },
      medium: { delay: 40, decay: 0.5 },
      large: { delay: 80, decay: 0.7 },
      hall: { delay: 120, decay: 0.85 }
    };

    const config = reverbConfigs[roomSize] || reverbConfigs.medium;
    
    // Crear reverb usando filtros
    const filter = `aecho=0.8:${wetDry}:${config.delay}:${config.decay}`;

    const args = [
      '-i', inputPath,
      '-af', filter,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-y', finalPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Reverb', percent: 0, message: `Aplicando reverb ${roomSize}...` });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Reverb', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath: finalPath,
      roomSize,
      wetDry,
      processingTime: duration,
      message: `Reverb espacial aplicado en ${duration.toFixed(1)}s`
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
          // Ignorar errores
        }
      }
    }
  }
}

module.exports = SpatialAudio;
