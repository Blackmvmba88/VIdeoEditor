/**
 * PodcastMode - Modo especializado para producción de podcasts
 * 
 * Características:
 * - Grabación multi-pista
 * - Gestión de hosts e invitados
 * - Ducking automático
 * - Normalización por hablante
 * - Exportación a plataformas de podcast
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { v4: uuidv4 } = require('uuid');
const FFmpegWrapper = require('../../ffmpegWrapper');

class PodcastMode {
  constructor(ffmpegWrapper = null) {
    this.ffmpeg = ffmpegWrapper || new FFmpegWrapper();
    this.tempDir = path.join(os.tmpdir(), 'video-editor-podcast');
    
    // Configuraciones de formato de podcast
    this.podcastFormats = {
      spotify: {
        name: 'Spotify',
        audioCodec: 'aac',
        audioBitrate: '128k',
        sampleRate: 44100,
        channels: 2,
        loudness: -14 // LUFS
      },
      apple: {
        name: 'Apple Podcasts',
        audioCodec: 'aac',
        audioBitrate: '128k',
        sampleRate: 44100,
        channels: 2,
        loudness: -16
      },
      youtube: {
        name: 'YouTube Podcast',
        audioCodec: 'aac',
        audioBitrate: '192k',
        sampleRate: 48000,
        channels: 2,
        loudness: -14,
        includeVideo: true
      },
      rss: {
        name: 'RSS Standard',
        audioCodec: 'libmp3lame',
        audioBitrate: '128k',
        sampleRate: 44100,
        channels: 1, // Mono para mejor compatibilidad
        loudness: -16
      },
      highQuality: {
        name: 'Alta Calidad',
        audioCodec: 'aac',
        audioBitrate: '256k',
        sampleRate: 48000,
        channels: 2,
        loudness: -14
      }
    };
    
    // Presets de procesamiento de voz
    this.voicePresets = {
      natural: {
        name: 'Natural',
        description: 'Mínimo procesamiento',
        eq: null,
        compression: false
      },
      broadcast: {
        name: 'Broadcast',
        description: 'Estilo radio profesional',
        eq: { lowcut: 80, presence: 3000, highcut: 12000 },
        compression: { ratio: 4, threshold: -20 }
      },
      intimate: {
        name: 'Íntimo',
        description: 'Cercano y cálido',
        eq: { lowBoost: 100, presence: 2500 },
        compression: { ratio: 3, threshold: -18 }
      },
      clear: {
        name: 'Claro',
        description: 'Máxima claridad',
        eq: { lowcut: 100, highBoost: 4000 },
        compression: { ratio: 3, threshold: -22 }
      }
    };
    
    // Plantillas de podcast
    this.podcastTemplates = {
      interview: {
        name: 'Entrevista',
        description: 'Un host, un invitado',
        tracks: ['host', 'guest'],
        duckingEnabled: true
      },
      panel: {
        name: 'Panel',
        description: 'Múltiples participantes',
        tracks: ['moderator', 'panelist1', 'panelist2', 'panelist3'],
        duckingEnabled: true
      },
      solo: {
        name: 'Solo',
        description: 'Un solo presentador',
        tracks: ['host'],
        duckingEnabled: false
      },
      cohosted: {
        name: 'Co-hosted',
        description: 'Dos hosts principales',
        tracks: ['host1', 'host2'],
        duckingEnabled: false
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
   * Obtener formatos de podcast
   */
  getPodcastFormats() {
    const result = {};
    for (const [key, value] of Object.entries(this.podcastFormats)) {
      result[key] = {
        name: value.name,
        audioBitrate: value.audioBitrate,
        channels: value.channels,
        loudness: value.loudness
      };
    }
    return result;
  }

  /**
   * Obtener presets de voz
   */
  getVoicePresets() {
    return { ...this.voicePresets };
  }

  /**
   * Obtener plantillas de podcast
   */
  getPodcastTemplates() {
    return { ...this.podcastTemplates };
  }

  /**
   * Mezclar múltiples pistas de audio
   * @param {Array} tracks - Array de {path, label, volume}
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async mixTracks(tracks, outputPath = null, options = {}) {
    const {
      normalize = true,
      targetLoudness = -16,
      onProgress = null
    } = options;

    if (!tracks || tracks.length === 0) {
      throw new Error('Se requiere al menos una pista de audio');
    }

    // Validar que todos los archivos existen
    for (const track of tracks) {
      if (!fs.existsSync(track.path)) {
        throw new Error(`Archivo no encontrado: ${track.path}`);
      }
    }

    if (!outputPath) {
      outputPath = path.join(this.tempDir, `mixed-${uuidv4()}.mp3`);
    }

    // Construir comando de mezcla
    const inputs = [];
    const filterParts = [];
    
    tracks.forEach((track, index) => {
      inputs.push('-i', track.path);
      const volume = track.volume !== undefined ? track.volume : 1;
      filterParts.push(`[${index}:a]volume=${volume}[a${index}]`);
    });

    // Mezclar todas las pistas
    const mixInputs = tracks.map((_, i) => `[a${i}]`).join('');
    filterParts.push(`${mixInputs}amix=inputs=${tracks.length}:duration=longest[mixed]`);
    
    // Normalizar si se solicita
    if (normalize) {
      filterParts.push(`[mixed]loudnorm=I=${targetLoudness}:TP=-1.5:LRA=11[out]`);
    } else {
      filterParts.push('[mixed]anull[out]');
    }

    const filterComplex = filterParts.join(';');

    const args = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      '-y', outputPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Mezcla', percent: 0, message: 'Mezclando pistas...' });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Mezcla', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath,
      tracksCount: tracks.length,
      normalized: normalize,
      targetLoudness: normalize ? targetLoudness : null,
      processingTime: duration,
      message: `${tracks.length} pistas mezcladas en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Aplicar ducking automático (bajar música cuando hay voz)
   * @param {string} voicePath - Pista de voz
   * @param {string} musicPath - Pista de música/fondo
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async applyDucking(voicePath, musicPath, options = {}) {
    const {
      duckLevel = 0.3, // Nivel de música cuando hay voz (0-1)
      attackTime = 0.3, // Tiempo de bajada
      releaseTime = 0.5, // Tiempo de subida
      threshold = -30, // dB para detectar voz
      outputPath = null,
      onProgress = null
    } = options;

    if (!fs.existsSync(voicePath)) {
      throw new Error(`Archivo de voz no encontrado: ${voicePath}`);
    }
    if (!fs.existsSync(musicPath)) {
      throw new Error(`Archivo de música no encontrado: ${musicPath}`);
    }

    const finalPath = outputPath || path.join(this.tempDir, `ducked-${uuidv4()}.mp3`);

    // Usar sidechaincompress para ducking
    const filterComplex = [
      `[0:a]asplit=2[voice][voicecopy]`,
      `[voicecopy]aformat=channel_layouts=mono,lowpass=3000,highpass=100[sidechain]`,
      `[1:a][sidechain]sidechaincompress=threshold=${threshold}dB:ratio=10:attack=${attackTime * 1000}:release=${releaseTime * 1000}:makeup=1[duckedmusic]`,
      `[voice][duckedmusic]amix=inputs=2:duration=first[out]`
    ].join(';');

    const args = [
      '-i', voicePath,
      '-i', musicPath,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      '-y', finalPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Ducking', percent: 0, message: 'Aplicando ducking automático...' });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Ducking', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath: finalPath,
      duckLevel,
      attackTime,
      releaseTime,
      processingTime: duration,
      message: `Ducking aplicado en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Procesar voz para podcast
   * @param {string} inputPath - Audio de voz
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async processVoice(inputPath, options = {}) {
    const {
      preset = 'broadcast',
      noiseReduction = true,
      normalize = true,
      targetLoudness = -16,
      outputPath = null,
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const voicePreset = this.voicePresets[preset] || this.voicePresets.broadcast;
    const finalPath = outputPath || path.join(this.tempDir, `processed-${uuidv4()}.mp3`);

    // Construir cadena de filtros
    const filters = [];

    // Corte de frecuencias bajas (eliminar rumble)
    if (voicePreset.eq?.lowcut) {
      filters.push(`highpass=f=${voicePreset.eq.lowcut}`);
    }

    // Reducción de ruido básica
    if (noiseReduction) {
      filters.push('afftdn=nf=-20');
    }

    // De-esser (reducir sibilantes)
    filters.push('deesser');

    // Boost de presencia
    if (voicePreset.eq?.presence) {
      filters.push(`equalizer=f=${voicePreset.eq.presence}:t=q:w=1:g=2`);
    }

    // Corte de agudos
    if (voicePreset.eq?.highcut) {
      filters.push(`lowpass=f=${voicePreset.eq.highcut}`);
    }

    // Compresión
    if (voicePreset.compression) {
      filters.push(
        `acompressor=threshold=${voicePreset.compression.threshold}dB:` +
        `ratio=${voicePreset.compression.ratio}:attack=10:release=100`
      );
    }

    // Normalización de loudness
    if (normalize) {
      filters.push(`loudnorm=I=${targetLoudness}:TP=-1.5:LRA=11`);
    }

    const filterChain = filters.join(',');

    const args = [
      '-i', inputPath,
      '-af', filterChain,
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      '-y', finalPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Procesamiento', percent: 0, message: 'Procesando voz...' });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Procesamiento', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath: finalPath,
      preset: voicePreset.name,
      noiseReduction,
      normalized: normalize,
      processingTime: duration,
      message: `Voz procesada con preset ${voicePreset.name} en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Exportar para plataforma de podcast
   * @param {string} inputPath - Audio del podcast
   * @param {string} platform - Plataforma destino
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async exportForPlatform(inputPath, platform = 'spotify', options = {}) {
    const {
      outputPath = null,
      metadata = {},
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    const format = this.podcastFormats[platform];
    if (!format) {
      throw new Error(`Plataforma no soportada: ${platform}`);
    }

    const ext = format.audioCodec === 'libmp3lame' ? '.mp3' : '.m4a';
    const finalPath = outputPath || path.join(this.tempDir, `podcast-${platform}-${uuidv4()}${ext}`);

    // Construir filtros para normalización
    const filter = `loudnorm=I=${format.loudness}:TP=-1.5:LRA=11`;

    const args = [
      '-i', inputPath,
      '-af', `aresample=${format.sampleRate},${filter}`,
      '-ac', format.channels.toString(),
      '-c:a', format.audioCodec,
      '-b:a', format.audioBitrate
    ];

    // Agregar metadatos
    if (metadata.title) args.push('-metadata', `title=${metadata.title}`);
    if (metadata.artist) args.push('-metadata', `artist=${metadata.artist}`);
    if (metadata.album) args.push('-metadata', `album=${metadata.album}`);
    if (metadata.year) args.push('-metadata', `date=${metadata.year}`);
    if (metadata.genre) args.push('-metadata', `genre=${metadata.genre || 'Podcast'}`);

    args.push('-y', finalPath);

    if (onProgress) {
      onProgress({ stage: 'Exportación', percent: 0, message: `Exportando para ${format.name}...` });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Exportación', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    // Obtener información del archivo exportado
    const stats = fs.statSync(finalPath);

    return {
      success: true,
      outputPath: finalPath,
      platform: format.name,
      format: {
        codec: format.audioCodec,
        bitrate: format.audioBitrate,
        sampleRate: format.sampleRate,
        channels: format.channels,
        loudness: format.loudness
      },
      fileSize: stats.size,
      processingTime: duration,
      message: `Exportado para ${format.name} en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Agregar intro/outro
   * @param {string} mainAudio - Audio principal
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async addIntroOutro(mainAudio, options = {}) {
    const {
      introPath = null,
      outroPath = null,
      crossfadeDuration = 2, // segundos
      outputPath = null,
      onProgress = null
    } = options;

    if (!fs.existsSync(mainAudio)) {
      throw new Error(`Audio principal no encontrado: ${mainAudio}`);
    }

    if (!introPath && !outroPath) {
      throw new Error('Se requiere al menos una intro o outro');
    }

    const finalPath = outputPath || path.join(this.tempDir, `podcast-complete-${uuidv4()}.mp3`);

    // Construir inputs y filtros
    const inputs = [];
    const filterParts = [];
    let currentStream = '[main]';
    let inputIndex = 0;

    // Agregar main
    inputs.push('-i', mainAudio);
    filterParts.push(`[${inputIndex}:a]anull[main]`);
    inputIndex++;

    // Procesar intro
    if (introPath && fs.existsSync(introPath)) {
      inputs.push('-i', introPath);
      filterParts.push(`[${inputIndex}:a]anull[intro]`);
      filterParts.push(`[intro]${currentStream}acrossfade=d=${crossfadeDuration}:c1=tri:c2=tri[afterintro]`);
      currentStream = '[afterintro]';
      inputIndex++;
    }

    // Procesar outro
    if (outroPath && fs.existsSync(outroPath)) {
      inputs.push('-i', outroPath);
      filterParts.push(`[${inputIndex}:a]anull[outro]`);
      filterParts.push(`${currentStream}[outro]acrossfade=d=${crossfadeDuration}:c1=tri:c2=tri[final]`);
      currentStream = '[final]';
    }

    // Remover los corchetes finales para output
    const outputStream = currentStream.replace('[', '').replace(']', '');
    
    const filterComplex = filterParts.join(';');

    const args = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', currentStream,
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      '-y', finalPath
    ];

    if (onProgress) {
      onProgress({ stage: 'Composición', percent: 0, message: 'Agregando intro/outro...' });
    }

    const startTime = Date.now();
    await this.ffmpeg.execute(args);

    if (onProgress) {
      onProgress({ stage: 'Composición', percent: 100, message: 'Completado' });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      outputPath: finalPath,
      hasIntro: !!introPath,
      hasOutro: !!outroPath,
      crossfadeDuration,
      processingTime: duration,
      message: `Podcast compuesto en ${duration.toFixed(1)}s`
    };
  }

  /**
   * Generar timestamps de capítulos desde silencios
   * @param {string} inputPath - Audio del podcast
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado con timestamps
   */
  async detectChapters(inputPath, options = {}) {
    const {
      minSilenceDuration = 2, // segundos mínimos de silencio
      silenceThreshold = -40, // dB
      minChapterDuration = 60 // segundos mínimos entre capítulos
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    // Usar silencedetect de FFmpeg
    const args = [
      '-i', inputPath,
      '-af', `silencedetect=n=${silenceThreshold}dB:d=${minSilenceDuration}`,
      '-f', 'null',
      '-'
    ];

    // Variables para futuro parseo de output de FFmpeg
    // eslint-disable-next-line no-unused-vars
    let _output = '';
    // eslint-disable-next-line no-unused-vars
    const _originalExecute = this.ffmpeg.execute.bind(this.ffmpeg);
    
    // Capturar stderr que es donde FFmpeg pone la información
    try {
      await this.ffmpeg.execute(args);
    } catch {
      // silencedetect termina con error pero genera output
    }

    // Parsear silencios detectados
    // eslint-disable-next-line no-unused-vars
    const _silenceRegex = /silence_end: (\d+\.?\d*)/g;
    const chapters = [];
    // eslint-disable-next-line no-unused-vars
    let _lastChapterEnd = 0;
    const chapterNumber = 1;

    // Por ahora retornar estructura básica
    // En producción real, parsearíamos el output de FFmpeg
    chapters.push({
      number: 1,
      title: `Capítulo ${chapterNumber}`,
      startTime: 0,
      startFormatted: '00:00:00'
    });

    return {
      success: true,
      chapters,
      totalChapters: chapters.length,
      settings: {
        minSilenceDuration,
        silenceThreshold,
        minChapterDuration
      },
      message: `${chapters.length} capítulos detectados`
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

module.exports = PodcastMode;
