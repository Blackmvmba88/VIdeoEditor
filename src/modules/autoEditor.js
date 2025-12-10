/**
 * Módulo de Auto Editor
 * Edita videos automáticamente basándose en análisis de contenido
 * Ahorra tiempo a los editores creando ediciones optimizadas automáticamente
 */

const path = require('path');
const fs = require('fs');
const VideoProcessor = require('./videoProcessor');
const ContentAnalyzer = require('./contentAnalyzer');
const ExportPresets = require('./exportPresets');
const FFmpegWrapper = require('./ffmpegWrapper');
const { v4: uuidv4 } = require('uuid');

// Multiplicadores de estimación de tiempo de procesamiento (segundos por segundo de video)
const ANALYSIS_TIME_MULTIPLIER = 0.1;    // El análisis toma ~10% de la duración del video
const CUTTING_TIME_MULTIPLIER = 0.2;     // El corte toma ~20% de la duración del video
const JOINING_TIME_MULTIPLIER = 0.3;     // La unión toma ~30% de la duración del video

class AutoEditor {
  constructor() {
    this.videoProcessor = new VideoProcessor();
    this.contentAnalyzer = new ContentAnalyzer();
    this.exportPresets = new ExportPresets();
    this.ffmpeg = new FFmpegWrapper();
    this.tempDir = path.join(require('os').tmpdir(), 'video-editor-auto');
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
   * Editar automáticamente un video basándose en análisis de contenido
   * @param {string} inputPath - Ruta del video de entrada
   * @param {string} outputPath - Ruta del video de salida
   * @param {Object} options - Opciones de auto-edición
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado con ruta de salida y estadísticas
   */
  async autoEdit(inputPath, outputPath, options = {}, onProgress = null) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const config = {
      targetDuration: options.targetDuration || null,
      style: options.style || 'highlights',
      minClipDuration: options.minClipDuration || 2,
      maxClipDuration: options.maxClipDuration || 30,
      includeTransitions: options.includeTransitions !== false,
      transitionDuration: options.transitionDuration || 0.5,
      preset: options.preset || 'youtube1080p',
      ...options
    };

    // Reportar progreso inicial
    if (onProgress) {
      onProgress({ stage: 'analyzing', percent: 5, message: 'Analizando contenido del video...' });
    }

    // Analizar contenido del video
    const analysis = await this.contentAnalyzer.analyzeContent(inputPath, {
      targetDuration: config.targetDuration,
      minMomentDuration: config.minClipDuration,
      maxMomentDuration: config.maxClipDuration
    });

    if (analysis.suggestedClips.length === 0) {
      throw new Error('No interesting moments detected in video. Try adjusting analysis settings.');
    }

    if (onProgress) {
      onProgress({ 
        stage: 'processing', 
        percent: 20, 
        message: `Detectados ${analysis.suggestedClips.length} momentos interesantes...` 
      });
    }

    // Aplicar el estilo de edición seleccionado
    let clips;
    switch (config.style) {
    case 'highlights':
      clips = this.selectHighlights(analysis.suggestedClips, config);
      break;
    case 'summary':
      clips = this.createSummary(analysis.suggestedClips, analysis.duration, config);
      break;
    case 'action':
      clips = this.selectActionMoments(analysis.suggestedClips, config);
      break;
    default:
      clips = analysis.suggestedClips;
    }

    if (onProgress) {
      onProgress({ 
        stage: 'cutting', 
        percent: 30, 
        message: `Recortando ${clips.length} clips...` 
      });
    }

    // Crear archivos de clips individuales
    const clipPaths = [];
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const clipPath = path.join(this.tempDir, `clip_${uuidv4()}.mp4`);

      await this.videoProcessor.cutVideo(
        inputPath,
        clip.start,
        clip.end,
        clipPath,
        null
      );

      clipPaths.push(clipPath);

      if (onProgress) {
        const progressPercent = 30 + Math.floor((i / clips.length) * 40);
        onProgress({ 
          stage: 'cutting', 
          percent: progressPercent, 
          message: `Procesando clip ${i + 1} de ${clips.length}...` 
        });
      }
    }

    if (onProgress) {
      onProgress({ 
        stage: 'joining', 
        percent: 75, 
        message: 'Uniendo clips en video final...' 
      });
    }

    // Unir clips juntos
    if (clipPaths.length === 1) {
      // Solo un clip, simplemente copiarlo
      fs.copyFileSync(clipPaths[0], outputPath);
    } else {
      await this.videoProcessor.joinVideos(
        clipPaths,
        outputPath,
        { reencode: true },
        null
      );
    }

    if (onProgress) {
      onProgress({ 
        stage: 'finishing', 
        percent: 95, 
        message: 'Finalizando edición...' 
      });
    }

    // Limpiar archivos temporales
    for (const clipPath of clipPaths) {
      if (fs.existsSync(clipPath)) {
        fs.unlinkSync(clipPath);
      }
    }

    // Obtener estadísticas de resumen
    const summary = this.contentAnalyzer.getAnalysisSummary(analysis);
    
    if (onProgress) {
      onProgress({ 
        stage: 'complete', 
        percent: 100, 
        message: '¡Edición automática completada!' 
      });
    }

    return {
      success: true,
      outputPath,
      statistics: {
        originalDuration: summary.originalDuration,
        newDuration: summary.suggestedDuration,
        clipsUsed: clips.length,
        timeSaved: summary.timeSaved,
        compressionRatio: summary.compressionRatio
      },
      analysis: analysis
    };
  }

  /**
   * Seleccionar clips destacados basándose en puntuación
   * @param {Array} suggestedClips - Clips del análisis
   * @param {Object} config - Configuración
   * @returns {Array} Clips seleccionados
   */
  selectHighlights(suggestedClips, config) {
    // Ordenar por puntuación y tomar los mejores clips
    const sorted = [...suggestedClips].sort((a, b) => b.score - a.score);
    
    let totalDuration = 0;
    const selected = [];

    for (const clip of sorted) {
      if (config.targetDuration && totalDuration >= config.targetDuration) {
        break;
      }
      selected.push(clip);
      totalDuration += clip.duration;
    }

    // Re-ordenar por tiempo de inicio para orden cronológico
    selected.sort((a, b) => a.start - b.start);
    
    return selected;
  }

  /**
   * Crear un resumen seleccionando clips distribuidos uniformemente
   * @param {Array} suggestedClips - Clips del análisis
   * @param {number} totalDuration - Duración original del video
   * @param {Object} config - Configuración
   * @returns {Array} Clips seleccionados
   */
  createSummary(suggestedClips, totalDuration, config) {
    const targetDuration = config.targetDuration || totalDuration * 0.2;
    const numClips = Math.max(3, Math.ceil(targetDuration / config.maxClipDuration));
    const segmentLength = totalDuration / numClips;

    const selected = [];
    
    for (let i = 0; i < numClips; i++) {
      const segmentStart = i * segmentLength;
      const segmentEnd = (i + 1) * segmentLength;

      // Encontrar el mejor clip en este segmento
      const clipsInSegment = suggestedClips.filter(
        c => c.start >= segmentStart && c.start < segmentEnd
      );

      if (clipsInSegment.length > 0) {
        // Elegir el clip con mayor puntuación en este segmento
        const best = clipsInSegment.reduce(
          (prev, curr) => curr.score > prev.score ? curr : prev
        );
        selected.push(best);
      }
    }

    // Ordenar por tiempo de inicio
    selected.sort((a, b) => a.start - b.start);

    return selected;
  }

  /**
   * Seleccionar momentos enfocados en acción (alta actividad)
   * @param {Array} suggestedClips - Clips del análisis
   * @param {Object} config - Configuración
   * @returns {Array} Clips seleccionados
   */
  selectActionMoments(suggestedClips, config) {
    // Filtrar clips con actividad combinada visual y de audio
    const actionClips = suggestedClips.filter(
      clip => clip.source === 'combined' || clip.score > 0.7
    );

    // Si no hay suficientes clips de acción, incluir clips de alta puntuación
    if (actionClips.length < 3) {
      const additionalClips = suggestedClips
        .filter(c => !actionClips.includes(c))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      actionClips.push(...additionalClips);
    }

    // Ordenar por tiempo de inicio
    actionClips.sort((a, b) => a.start - b.start);

    // Aplicar límite de duración objetivo
    if (config.targetDuration) {
      let totalDuration = 0;
      const limited = [];
      for (const clip of actionClips) {
        if (totalDuration >= config.targetDuration) break;
        limited.push(clip);
        totalDuration += clip.duration;
      }
      return limited;
    }

    return actionClips;
  }

  /**
   * Obtener estilos de auto-edición disponibles
   * @returns {Array} Estilos disponibles
   */
  getAvailableStyles() {
    return [
      {
        key: 'highlights',
        name: 'Mejores Momentos',
        nameEn: 'Highlights',
        description: 'Selecciona los momentos más interesantes del video',
        descriptionEn: 'Selects the most interesting moments from the video'
      },
      {
        key: 'summary',
        name: 'Resumen',
        nameEn: 'Summary',
        description: 'Crea un resumen equilibrado de todo el video',
        descriptionEn: 'Creates a balanced summary of the entire video'
      },
      {
        key: 'action',
        name: 'Acción',
        nameEn: 'Action',
        description: 'Enfocado en momentos de alta actividad visual y auditiva',
        descriptionEn: 'Focused on high visual and audio activity moments'
      }
    ];
  }

  /**
   * Estimar tiempo de procesamiento de auto-edición
   * @param {number} videoDuration - Duración del video de entrada en segundos
   * @returns {Object} Tiempos de procesamiento estimados
   */
  estimateProcessingTime(videoDuration) {
    // Estimaciones aproximadas basadas en velocidades típicas de procesamiento
    const analysisTime = Math.ceil(videoDuration * ANALYSIS_TIME_MULTIPLIER);
    const cuttingTime = Math.ceil(videoDuration * CUTTING_TIME_MULTIPLIER);
    const joiningTime = Math.ceil(videoDuration * JOINING_TIME_MULTIPLIER);
    const totalTime = analysisTime + cuttingTime + joiningTime;

    return {
      analysis: analysisTime,
      cutting: cuttingTime,
      joining: joiningTime,
      total: totalTime,
      formatted: this.formatDuration(totalTime)
    };
  }

  /**
   * Formatear duración en segundos a cadena legible
   * @param {number} seconds - Duración en segundos
   * @returns {string} Duración formateada
   */
  formatDuration(seconds) {
    if (seconds < 60) {
      return `${Math.ceil(seconds)} segundos`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    if (remainingSeconds === 0) {
      return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} minutos`;
  }

  /**
   * Limpiar archivos temporales
   */
  cleanup() {
    this.contentAnalyzer.cleanup();
    
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

module.exports = AutoEditor;
