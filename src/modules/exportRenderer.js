/**
 * Export Renderer Module
 * Handles final video export and rendering
 */

const path = require('path');
const fs = require('fs');
const FFmpegWrapper = require('./ffmpegWrapper');
const ExportPresets = require('./exportPresets');
const FileValidator = require('./fileValidator');

class ExportRenderer {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.presets = new ExportPresets();
    this.validator = new FileValidator();
  }

  /**
   * Export video with preset
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @param {string} presetKey - Preset key
   * @param {Object} options - Additional options
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<{success: boolean, outputPath: string}>}
   */
  async exportWithPreset(inputPath, outputPath, presetKey, options = {}, onProgress = null) {
    const inputValidation = await this.validator.validateFile(inputPath);
    if (!inputValidation.valid) {
      throw new Error(`Input validation failed: ${inputValidation.errors.join(', ')}`);
    }

    const outputValidation = this.validator.validateOutputPath(outputPath);
    if (!outputValidation.valid) {
      throw new Error(`Output validation failed: ${outputValidation.errors.join(', ')}`);
    }

    const presetArgs = this.presets.generateFFmpegArgs(presetKey, options);

    const args = [
      '-i', inputPath,
      ...presetArgs,
      '-y',
      outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);
    return { success: true, outputPath };
  }

  /**
   * Export with custom settings
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @param {Object} settings - Custom export settings
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<{success: boolean, outputPath: string}>}
   */
  async exportCustom(inputPath, outputPath, settings = {}, onProgress = null) {
    const inputValidation = await this.validator.validateFile(inputPath);
    if (!inputValidation.valid) {
      throw new Error(`Input validation failed: ${inputValidation.errors.join(', ')}`);
    }

    const outputValidation = this.validator.validateOutputPath(outputPath);
    if (!outputValidation.valid) {
      throw new Error(`Output validation failed: ${outputValidation.errors.join(', ')}`);
    }

    const args = ['-i', inputPath];

    if (settings.videoCodec) {
      args.push('-c:v', settings.videoCodec);
    }

    if (settings.audioCodec) {
      args.push('-c:a', settings.audioCodec);
    }

    if (settings.videoBitrate) {
      args.push('-b:v', settings.videoBitrate);
    }

    if (settings.audioBitrate) {
      args.push('-b:a', settings.audioBitrate);
    }

    if (settings.resolution) {
      args.push('-s', settings.resolution);
    }

    if (settings.fps) {
      args.push('-r', settings.fps.toString());
    }

    if (settings.crf !== undefined) {
      args.push('-crf', settings.crf.toString());
    }

    if (settings.preset) {
      args.push('-preset', settings.preset);
    }

    if (settings.startTime !== undefined) {
      args.push('-ss', settings.startTime.toString());
    }

    if (settings.duration) {
      args.push('-t', settings.duration.toString());
    }

    if (settings.filters && settings.filters.length > 0) {
      args.push('-vf', settings.filters.join(','));
    }

    args.push('-y', outputPath);

    await this.ffmpeg.execute(args, onProgress);
    return { success: true, outputPath };
  }

  /**
   * Export for multiple platforms at once
   * @param {string} inputPath - Input video path
   * @param {string} outputDir - Output directory
   * @param {string[]} presetKeys - Array of preset keys
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<{success: boolean, outputs: Object[]}>}
   */
  async exportMultiplePlatforms(inputPath, outputDir, presetKeys, onProgress = null) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputs = [];
    const baseName = path.basename(inputPath, path.extname(inputPath));

    for (let i = 0; i < presetKeys.length; i++) {
      const presetKey = presetKeys[i];
      const preset = this.presets.getPreset(presetKey);

      if (!preset) {
        outputs.push({
          presetKey,
          success: false,
          error: `Preset not found: ${presetKey}`
        });
        continue;
      }

      const ext = this.presets.getOutputExtension(presetKey);
      const outputPath = path.join(outputDir, `${baseName}_${presetKey}${ext}`);

      try {
        const progressWrapper = onProgress ? (seconds) => {
          onProgress({
            currentPreset: presetKey,
            presetIndex: i + 1,
            totalPresets: presetKeys.length,
            seconds
          });
        } : null;

        await this.exportWithPreset(inputPath, outputPath, presetKey, {}, progressWrapper);

        outputs.push({
          presetKey,
          success: true,
          outputPath
        });
      } catch (error) {
        outputs.push({
          presetKey,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: outputs.every(o => o.success),
      outputs
    };
  }

  /**
   * Generate thumbnail from video
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output image path
   * @param {Object} options - Thumbnail options
   * @returns {Promise<{success: boolean, outputPath: string}>}
   */
  async generateThumbnail(inputPath, outputPath, options = {}) {
    const time = options.time || 0;
    const width = options.width || 320;
    const height = options.height || -1;

    const args = [
      '-i', inputPath,
      '-ss', time.toString(),
      '-vframes', '1',
      '-vf', `scale=${width}:${height}`,
      '-y',
      outputPath
    ];

    await this.ffmpeg.execute(args);
    return { success: true, outputPath };
  }

  /**
   * Generate video preview/proxy
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output preview path
   * @param {Object} options - Preview options
   * @returns {Promise<{success: boolean, outputPath: string}>}
   */
  async generatePreview(inputPath, outputPath, options = {}) {
    const width = options.width || 640;
    const fps = options.fps || 15;
    const quality = options.quality || 28;

    const args = [
      '-i', inputPath,
      '-vf', `scale=${width}:-2`,
      '-r', fps.toString(),
      '-c:v', 'libx264',
      '-crf', quality.toString(),
      '-preset', 'ultrafast',
      '-an',
      '-y',
      outputPath
    ];

    await this.ffmpeg.execute(args);
    return { success: true, outputPath };
  }

  /**
   * Estimate output file size
   * @param {string} inputPath - Input video path
   * @param {string} presetKey - Preset key
   * @returns {Promise<{estimatedSize: number, estimatedSizeFormatted: string}>}
   */
  async estimateOutputSize(inputPath, presetKey) {
    const info = await this.ffmpeg.getVideoInfo(inputPath);
    const preset = this.presets.getPreset(presetKey);

    if (!preset) {
      throw new Error(`Preset not found: ${presetKey}`);
    }

    let videoBitrate = 0;
    let audioBitrate = 0;

    if (preset.video && preset.video.bitrate) {
      const bitrateStr = preset.video.bitrate.toString();
      const match = bitrateStr.match(/^(\d+(?:\.\d+)?)(M|K)?$/i);
      if (match) {
        videoBitrate = parseFloat(match[1]);
        if (match[2]?.toLowerCase() === 'm') {
          videoBitrate *= 1000000;
        } else if (match[2]?.toLowerCase() === 'k') {
          videoBitrate *= 1000;
        }
      }
    } else {
      videoBitrate = info.video?.bitrate || info.bitrate * 0.9;
    }

    if (preset.audio && preset.audio.bitrate) {
      const bitrateStr = preset.audio.bitrate.toString();
      const match = bitrateStr.match(/^(\d+)(k)?$/i);
      if (match) {
        audioBitrate = parseInt(match[1], 10);
        if (match[2]?.toLowerCase() === 'k') {
          audioBitrate *= 1000;
        }
      }
    } else {
      audioBitrate = info.audio?.bitrate || 128000;
    }

    const totalBitrate = videoBitrate + audioBitrate;
    const estimatedSize = Math.round((totalBitrate * info.duration) / 8);

    return {
      estimatedSize,
      estimatedSizeFormatted: this.validator.formatBytes(estimatedSize)
    };
  }

  /**
   * Get available presets
   * @returns {Object}
   */
  getAvailablePresets() {
    return this.presets.getAllPresets();
  }

  /**
   * Get preset info
   * @param {string} presetKey - Preset key
   * @returns {Object|null}
   */
  getPresetInfo(presetKey) {
    return this.presets.getPreset(presetKey);
  }
}

module.exports = ExportRenderer;
