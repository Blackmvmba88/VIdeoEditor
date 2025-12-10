/**
 * Módulo Analizador de Contenido
 * Analiza contenido de video para detectar los mejores momentos para edición automática
 * Ayuda a los editores a ahorrar tiempo identificando segmentos interesantes
 */

const FFmpegWrapper = require('./ffmpegWrapper');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Constantes de configuración
const FALLBACK_SCENE_INTERVAL = 5;       // Segundos entre cambios de escena estimados
const MAX_FALLBACK_SCENES = 20;          // Número máximo de cambios de escena de respaldo
const FALLBACK_AUDIO_INTERVAL = 10;      // Segundos entre picos de audio estimados
const MAX_FALLBACK_AUDIO_PEAKS = 10;     // Número máximo de picos de audio de respaldo

class ContentAnalyzer {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.tempDir = path.join(require('os').tmpdir(), 'video-editor-analysis');
    this.ensureTempDir();
  }

  /**
   * Asegurar que el directorio temporal existe
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Analizar contenido de video y detectar momentos interesantes
   * @param {string} inputPath - Ruta al archivo de video
   * @param {Object} options - Opciones de análisis
   * @returns {Promise<Object>} Resultados del análisis con momentos detectados
   */
  async analyzeContent(inputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const videoInfo = await this.ffmpeg.getVideoInfo(inputPath);
    const duration = videoInfo.duration;

    // Opciones por defecto
    const config = {
      detectSceneChanges: options.detectSceneChanges !== false,
      detectAudioPeaks: options.detectAudioPeaks !== false,
      minMomentDuration: options.minMomentDuration || 2,
      maxMomentDuration: options.maxMomentDuration || 30,
      sceneChangeThreshold: options.sceneChangeThreshold || 0.3,
      audioPeakThreshold: options.audioPeakThreshold || -20,
      targetDuration: options.targetDuration || null,
      ...options
    };

    const results = {
      videoInfo,
      duration,
      sceneChanges: [],
      audioPeaks: [],
      interestingMoments: [],
      suggestedClips: []
    };

    // Detectar cambios de escena
    if (config.detectSceneChanges) {
      results.sceneChanges = await this.detectSceneChanges(
        inputPath,
        duration,
        config.sceneChangeThreshold
      );
    }

    // Detectar picos de audio
    if (config.detectAudioPeaks) {
      results.audioPeaks = await this.detectAudioPeaks(
        inputPath,
        duration,
        config.audioPeakThreshold
      );
    }

    // Combinar análisis para encontrar momentos interesantes
    results.interestingMoments = this.identifyInterestingMoments(
      results.sceneChanges,
      results.audioPeaks,
      duration,
      config
    );

    // Generar clips sugeridos basándose en el análisis
    results.suggestedClips = this.generateSuggestedClips(
      results.interestingMoments,
      duration,
      config
    );

    return results;
  }

  /**
   * Detectar cambios de escena en video
   * @param {string} inputPath - Ruta del archivo de video
   * @param {number} duration - Duración del video
   * @param {number} threshold - Umbral de cambio de escena (0.0 - 1.0)
   * @returns {Promise<Array>} Array de marcas de tiempo de cambios de escena
   */
  async detectSceneChanges(inputPath, duration, threshold) {
    const sceneChanges = [];
    
    try {
      // Usar FFmpeg para detectar cambios de escena
      const outputFile = path.join(this.tempDir, `scenes_${uuidv4()}.txt`);
      
      const args = [
        '-i', inputPath,
        '-filter:v', `select='gt(scene,${threshold})',showinfo`,
        '-f', 'null',
        '-'
      ];

      const result = await this.ffmpeg.execute(args);
      
      // Parsear salida de FFmpeg para detección de escenas
      const lines = result.output.split('\n');
      for (const line of lines) {
        const match = line.match(/pts_time:([\d.]+)/);
        if (match) {
          const time = parseFloat(match[1]);
          if (time > 0 && time < duration) {
            sceneChanges.push({
              time,
              type: 'scene_change',
              score: threshold
            });
          }
        }
      }

      // Limpiar
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }
    } catch (error) {
      // Si la detección de escenas falla, generar cambios de escena estimados
      // basándose en la duración del video (método de respaldo)
      const estimatedChanges = Math.floor(duration / FALLBACK_SCENE_INTERVAL);
      for (let i = 1; i <= estimatedChanges && i <= MAX_FALLBACK_SCENES; i++) {
        sceneChanges.push({
          time: (duration / (estimatedChanges + 1)) * i,
          type: 'scene_change',
          score: 0.5
        });
      }
    }

    return sceneChanges;
  }

  /**
   * Detectar picos de audio en video
   * @param {string} inputPath - Ruta del archivo de video
   * @param {number} duration - Duración del video  
   * @param {number} threshold - Umbral de pico de audio en dB
   * @returns {Promise<Array>} Array de marcas de tiempo de picos de audio
   */
  async detectAudioPeaks(inputPath, duration, threshold) {
    const audioPeaks = [];
    
    try {
      // Usar FFmpeg para analizar niveles de audio
      const args = [
        '-i', inputPath,
        '-af', `silencedetect=noise=${threshold}dB:d=0.5`,
        '-f', 'null',
        '-'
      ];

      const result = await this.ffmpeg.execute(args);
      
      // Parsear salida de detección de silencio para encontrar partes no silenciosas (interesantes)
      const lines = result.output.split('\n');
      let lastSilenceEnd = 0;

      for (const line of lines) {
        const silenceEndMatch = line.match(/silence_end: ([\d.]+)/);
        if (silenceEndMatch) {
          const time = parseFloat(silenceEndMatch[1]);
          if (time > lastSilenceEnd && time < duration) {
            audioPeaks.push({
              time,
              type: 'audio_activity',
              score: 0.8
            });
          }
          lastSilenceEnd = time;
        }

        const silenceStartMatch = line.match(/silence_start: ([\d.]+)/);
        if (silenceStartMatch) {
          const time = parseFloat(silenceStartMatch[1]);
          // Marcar el período antes del silencio como potencialmente interesante
          if (time > 1 && time < duration) {
            audioPeaks.push({
              time: Math.max(0, time - 1),
              type: 'pre_silence_activity',
              score: 0.6
            });
          }
        }
      }
    } catch (error) {
      // Respaldo: estimar picos de audio basándose en la duración
      const estimatedPeaks = Math.floor(duration / FALLBACK_AUDIO_INTERVAL);
      for (let i = 1; i <= estimatedPeaks && i <= MAX_FALLBACK_AUDIO_PEAKS; i++) {
        audioPeaks.push({
          time: (duration / (estimatedPeaks + 1)) * i,
          type: 'audio_activity',
          score: 0.5
        });
      }
    }

    return audioPeaks;
  }

  /**
   * Identificar momentos interesantes combinando diferentes resultados de análisis
   * @param {Array} sceneChanges - Marcas de tiempo de cambios de escena
   * @param {Array} audioPeaks - Marcas de tiempo de picos de audio
   * @param {number} duration - Duración del video
   * @param {Object} config - Configuración del análisis
   * @returns {Array} Array ordenado de momentos interesantes
   */
  identifyInterestingMoments(sceneChanges, audioPeaks, duration, config) {
    const moments = [];
    const processedTimes = new Set();

    // Agregar cambios de escena
    for (const scene of sceneChanges) {
      const roundedTime = Math.round(scene.time);
      if (!processedTimes.has(roundedTime)) {
        moments.push({
          time: scene.time,
          type: scene.type,
          score: scene.score,
          source: 'visual'
        });
        processedTimes.add(roundedTime);
      }
    }

    // Agregar picos de audio, aumentar puntuación si está cerca de un cambio de escena
    for (const peak of audioPeaks) {
      const roundedTime = Math.round(peak.time);
      const existingMoment = moments.find(m => 
        Math.abs(m.time - peak.time) < config.minMomentDuration
      );

      if (existingMoment) {
        // Aumentar puntuación cuando visual y audio coinciden
        existingMoment.score = Math.min(1.0, existingMoment.score + 0.3);
        existingMoment.source = 'combined';
      } else if (!processedTimes.has(roundedTime)) {
        moments.push({
          time: peak.time,
          type: peak.type,
          score: peak.score,
          source: 'audio'
        });
        processedTimes.add(roundedTime);
      }
    }

    // Ordenar por puntuación (más alta primero)
    moments.sort((a, b) => b.score - a.score);

    return moments;
  }

  /**
   * Generar clips sugeridos basándose en momentos interesantes
   * @param {Array} moments - Momentos interesantes
   * @param {number} duration - Duración del video
   * @param {Object} config - Opciones de configuración
   * @returns {Array} Clips sugeridos con tiempos de inicio/fin
   */
  generateSuggestedClips(moments, duration, config) {
    const clips = [];
    const usedRanges = [];
    const targetDuration = config.targetDuration || duration * 0.3;

    let totalClipDuration = 0;

    for (const moment of moments) {
      if (totalClipDuration >= targetDuration) break;

      const clipDuration = Math.min(
        config.maxMomentDuration,
        Math.max(config.minMomentDuration, 5 + moment.score * 10)
      );

      let start = Math.max(0, moment.time - clipDuration / 2);
      let end = Math.min(duration, moment.time + clipDuration / 2);

      // Asegurar duración mínima
      if (end - start < config.minMomentDuration) {
        if (start === 0) {
          end = Math.min(duration, config.minMomentDuration);
        } else {
          start = Math.max(0, end - config.minMomentDuration);
        }
      }

      // Verificar superposición con clips existentes
      const overlaps = usedRanges.some(range => 
        (start >= range.start && start < range.end) ||
        (end > range.start && end <= range.end) ||
        (start <= range.start && end >= range.end)
      );

      if (!overlaps) {
        clips.push({
          start,
          end,
          duration: end - start,
          score: moment.score,
          type: moment.type,
          source: moment.source
        });

        usedRanges.push({ start, end });
        totalClipDuration += end - start;
      }
    }

    // Ordenar clips por tiempo de inicio para edición secuencial
    clips.sort((a, b) => a.start - b.start);

    return clips;
  }

  /**
   * Obtener resumen del análisis para mostrar
   * @param {Object} analysis - Resultados del análisis
   * @returns {Object} Estadísticas de resumen
   */
  getAnalysisSummary(analysis) {
    const totalMoments = analysis.interestingMoments.length;
    const totalClips = analysis.suggestedClips.length;
    const totalClipDuration = analysis.suggestedClips.reduce(
      (sum, clip) => sum + clip.duration, 0
    );
    const compressionRatio = analysis.duration > 0 
      ? (totalClipDuration / analysis.duration * 100).toFixed(1)
      : 0;

    return {
      originalDuration: analysis.duration,
      totalMomentsDetected: totalMoments,
      suggestedClipsCount: totalClips,
      suggestedDuration: totalClipDuration,
      compressionRatio: `${compressionRatio}%`,
      timeSaved: analysis.duration - totalClipDuration,
      averageClipScore: totalClips > 0
        ? (analysis.suggestedClips.reduce((sum, c) => sum + c.score, 0) / totalClips).toFixed(2)
        : 0
    };
  }

  /**
   * Limpiar archivos temporales
   */
  cleanup() {
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        try {
          fs.unlinkSync(filePath);
        } catch {
          // Ignorar errores de limpieza
        }
      }
    }
  }
}

module.exports = ContentAnalyzer;
