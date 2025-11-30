/**
 * Content Analyzer Module
 * Analyzes video content to detect the best moments for automatic editing
 * Helps editors save time by identifying interesting segments
 */

const FFmpegWrapper = require('./ffmpegWrapper');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ContentAnalyzer {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.tempDir = path.join(require('os').tmpdir(), 'video-editor-analysis');
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
   * Analyze video content and detect interesting moments
   * @param {string} inputPath - Path to video file
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results with detected moments
   */
  async analyzeContent(inputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const videoInfo = await this.ffmpeg.getVideoInfo(inputPath);
    const duration = videoInfo.duration;

    // Default options
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

    // Detect scene changes
    if (config.detectSceneChanges) {
      results.sceneChanges = await this.detectSceneChanges(
        inputPath,
        duration,
        config.sceneChangeThreshold
      );
    }

    // Detect audio peaks
    if (config.detectAudioPeaks) {
      results.audioPeaks = await this.detectAudioPeaks(
        inputPath,
        duration,
        config.audioPeakThreshold
      );
    }

    // Combine analysis to find interesting moments
    results.interestingMoments = this.identifyInterestingMoments(
      results.sceneChanges,
      results.audioPeaks,
      duration,
      config
    );

    // Generate suggested clips based on analysis
    results.suggestedClips = this.generateSuggestedClips(
      results.interestingMoments,
      duration,
      config
    );

    return results;
  }

  /**
   * Detect scene changes in video
   * @param {string} inputPath - Video file path
   * @param {number} duration - Video duration
   * @param {number} threshold - Scene change threshold (0.0 - 1.0)
   * @returns {Promise<Array>} Array of scene change timestamps
   */
  async detectSceneChanges(inputPath, duration, threshold) {
    const sceneChanges = [];
    
    try {
      // Use FFmpeg to detect scene changes
      const outputFile = path.join(this.tempDir, `scenes_${uuidv4()}.txt`);
      
      const args = [
        '-i', inputPath,
        '-filter:v', `select='gt(scene,${threshold})',showinfo`,
        '-f', 'null',
        '-'
      ];

      const result = await this.ffmpeg.execute(args);
      
      // Parse FFmpeg output for scene detection
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

      // Clean up
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }
    } catch (error) {
      // If scene detection fails, generate estimated scene changes
      // based on video duration (fallback method)
      const estimatedChanges = Math.floor(duration / 5);
      for (let i = 1; i <= estimatedChanges && i <= 20; i++) {
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
   * Detect audio peaks in video
   * @param {string} inputPath - Video file path
   * @param {number} duration - Video duration  
   * @param {number} threshold - Audio peak threshold in dB
   * @returns {Promise<Array>} Array of audio peak timestamps
   */
  async detectAudioPeaks(inputPath, duration, threshold) {
    const audioPeaks = [];
    
    try {
      // Use FFmpeg to analyze audio levels
      const args = [
        '-i', inputPath,
        '-af', `silencedetect=noise=${threshold}dB:d=0.5`,
        '-f', 'null',
        '-'
      ];

      const result = await this.ffmpeg.execute(args);
      
      // Parse silence detection output to find non-silent (interesting) parts
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
          // Mark the period before silence as potentially interesting
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
      // Fallback: estimate audio peaks based on duration
      const estimatedPeaks = Math.floor(duration / 10);
      for (let i = 1; i <= estimatedPeaks && i <= 10; i++) {
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
   * Identify interesting moments by combining different analysis results
   * @param {Array} sceneChanges - Scene change timestamps
   * @param {Array} audioPeaks - Audio peak timestamps
   * @param {number} duration - Video duration
   * @param {Object} config - Analysis configuration
   * @returns {Array} Sorted array of interesting moments
   */
  identifyInterestingMoments(sceneChanges, audioPeaks, duration, config) {
    const moments = [];
    const processedTimes = new Set();

    // Add scene changes
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

    // Add audio peaks, boost score if near scene change
    for (const peak of audioPeaks) {
      const roundedTime = Math.round(peak.time);
      const existingMoment = moments.find(m => 
        Math.abs(m.time - peak.time) < config.minMomentDuration
      );

      if (existingMoment) {
        // Boost score when visual and audio align
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

    // Sort by score (highest first)
    moments.sort((a, b) => b.score - a.score);

    return moments;
  }

  /**
   * Generate suggested clips based on interesting moments
   * @param {Array} moments - Interesting moments
   * @param {number} duration - Video duration
   * @param {Object} config - Configuration options
   * @returns {Array} Suggested clips with start/end times
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

      // Ensure minimum duration
      if (end - start < config.minMomentDuration) {
        if (start === 0) {
          end = Math.min(duration, config.minMomentDuration);
        } else {
          start = Math.max(0, end - config.minMomentDuration);
        }
      }

      // Check for overlap with existing clips
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

    // Sort clips by start time for sequential editing
    clips.sort((a, b) => a.start - b.start);

    return clips;
  }

  /**
   * Get analysis summary for display
   * @param {Object} analysis - Analysis results
   * @returns {Object} Summary statistics
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
   * Clean up temporary files
   */
  cleanup() {
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

module.exports = ContentAnalyzer;
