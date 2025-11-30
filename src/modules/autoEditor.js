/**
 * Auto Editor Module
 * Automatically edits videos based on content analysis
 * Saves time for editors by creating optimized edits automatically
 */

const path = require('path');
const fs = require('fs');
const VideoProcessor = require('./videoProcessor');
const ContentAnalyzer = require('./contentAnalyzer');
const ExportPresets = require('./exportPresets');
const FFmpegWrapper = require('./ffmpegWrapper');
const { v4: uuidv4 } = require('uuid');

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
   * Ensure temporary directory exists
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Automatically edit a video based on content analysis
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @param {Object} options - Auto-edit options
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Result with output path and statistics
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

    // Report initial progress
    if (onProgress) {
      onProgress({ stage: 'analyzing', percent: 5, message: 'Analizando contenido del video...' });
    }

    // Analyze video content
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

    // Apply the selected editing style
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

    // Create individual clip files
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

    // Join clips together
    if (clipPaths.length === 1) {
      // Only one clip, just copy it
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

    // Clean up temporary files
    for (const clipPath of clipPaths) {
      if (fs.existsSync(clipPath)) {
        fs.unlinkSync(clipPath);
      }
    }

    // Get summary statistics
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
   * Select highlight clips based on score
   * @param {Array} suggestedClips - Clips from analysis
   * @param {Object} config - Configuration
   * @returns {Array} Selected clips
   */
  selectHighlights(suggestedClips, config) {
    // Sort by score and take the best clips
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

    // Re-sort by start time for chronological order
    selected.sort((a, b) => a.start - b.start);
    
    return selected;
  }

  /**
   * Create a summary by selecting evenly distributed clips
   * @param {Array} suggestedClips - Clips from analysis
   * @param {number} totalDuration - Original video duration
   * @param {Object} config - Configuration
   * @returns {Array} Selected clips
   */
  createSummary(suggestedClips, totalDuration, config) {
    const targetDuration = config.targetDuration || totalDuration * 0.2;
    const numClips = Math.max(3, Math.ceil(targetDuration / config.maxClipDuration));
    const segmentLength = totalDuration / numClips;

    const selected = [];
    
    for (let i = 0; i < numClips; i++) {
      const segmentStart = i * segmentLength;
      const segmentEnd = (i + 1) * segmentLength;

      // Find the best clip in this segment
      const clipsInSegment = suggestedClips.filter(
        c => c.start >= segmentStart && c.start < segmentEnd
      );

      if (clipsInSegment.length > 0) {
        // Pick the highest scoring clip in this segment
        const best = clipsInSegment.reduce(
          (prev, curr) => curr.score > prev.score ? curr : prev
        );
        selected.push(best);
      }
    }

    // Sort by start time
    selected.sort((a, b) => a.start - b.start);

    return selected;
  }

  /**
   * Select action-focused moments (high activity)
   * @param {Array} suggestedClips - Clips from analysis
   * @param {Object} config - Configuration
   * @returns {Array} Selected clips
   */
  selectActionMoments(suggestedClips, config) {
    // Filter for clips with combined visual and audio activity
    const actionClips = suggestedClips.filter(
      clip => clip.source === 'combined' || clip.score > 0.7
    );

    // If not enough action clips, include high-score clips
    if (actionClips.length < 3) {
      const additionalClips = suggestedClips
        .filter(c => !actionClips.includes(c))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      actionClips.push(...additionalClips);
    }

    // Sort by start time
    actionClips.sort((a, b) => a.start - b.start);

    // Apply target duration limit
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
   * Get available auto-edit styles
   * @returns {Array} Available styles
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
   * Estimate auto-edit processing time
   * @param {number} videoDuration - Duration of input video in seconds
   * @returns {Object} Estimated processing times
   */
  estimateProcessingTime(videoDuration) {
    // Rough estimates based on typical processing speeds
    const analysisTime = Math.ceil(videoDuration * 0.1);
    const cuttingTime = Math.ceil(videoDuration * 0.2);
    const joiningTime = Math.ceil(videoDuration * 0.3);
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
   * Format duration in seconds to human-readable string
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
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
   * Clean up temporary files
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
          // Ignore cleanup errors
        }
      }
    }
  }
}

module.exports = AutoEditor;
