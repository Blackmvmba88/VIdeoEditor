/**
 * Video Processor Module
 * Handles video operations: join, cut, and order clips
 */

const path = require('path');
const fs = require('fs');
const FFmpegWrapper = require('./ffmpegWrapper');
const { v4: uuidv4 } = require('uuid');

class VideoProcessor {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.tempDir = path.join(require('os').tmpdir(), 'video-editor-pro');
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
   * Cut a video clip
   * @param {string} inputPath - Input video path
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @param {string} outputPath - Output video path
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<{success: boolean, outputPath: string}>}
   */
  async cutVideo(inputPath, startTime, endTime, outputPath, onProgress = null) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    if (startTime < 0) {
      throw new Error('Start time cannot be negative');
    }

    if (endTime <= startTime) {
      throw new Error('End time must be greater than start time');
    }

    const duration = endTime - startTime;
    const args = [
      '-i', inputPath,
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-c', 'copy',
      '-avoid_negative_ts', 'make_zero',
      '-y',
      outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);
    return { success: true, outputPath };
  }

  /**
   * Join multiple video clips
   * @param {string[]} inputPaths - Array of input video paths
   * @param {string} outputPath - Output video path
   * @param {Object} options - Join options
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<{success: boolean, outputPath: string}>}
   */
  async joinVideos(inputPaths, outputPath, options = {}, onProgress = null) {
    if (!inputPaths || inputPaths.length < 2) {
      throw new Error('At least two input files are required for joining');
    }

    for (const inputPath of inputPaths) {
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
      }
    }

    const listFileName = `concat_${uuidv4()}.txt`;
    const listFilePath = path.join(this.tempDir, listFileName);

    const fileListContent = inputPaths
      .map(p => `file '${p.replace(/'/g, '\'\\\'\'')}'`)
      .join('\n');

    fs.writeFileSync(listFilePath, fileListContent, 'utf8');

    try {
      const args = [
        '-f', 'concat',
        '-safe', '0',
        '-i', listFilePath
      ];

      if (options.reencode) {
        args.push('-c:v', options.videoCodec || 'libx264');
        args.push('-c:a', options.audioCodec || 'aac');
        if (options.videoBitrate) {
          args.push('-b:v', options.videoBitrate);
        }
        if (options.audioBitrate) {
          args.push('-b:a', options.audioBitrate);
        }
      } else {
        args.push('-c', 'copy');
      }

      args.push('-y', outputPath);

      await this.ffmpeg.execute(args, onProgress);
      return { success: true, outputPath };
    } finally {
      if (fs.existsSync(listFilePath)) {
        fs.unlinkSync(listFilePath);
      }
    }
  }

  /**
   * Reorder clips and join them
   * @param {Array<{path: string, order: number}>} clips - Clips with order
   * @param {string} outputPath - Output video path
   * @param {Object} options - Processing options
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<{success: boolean, outputPath: string}>}
   */
  async reorderAndJoin(clips, outputPath, options = {}, onProgress = null) {
    if (!clips || clips.length === 0) {
      throw new Error('At least one clip is required');
    }

    const sortedClips = [...clips].sort((a, b) => a.order - b.order);
    const inputPaths = sortedClips.map(clip => clip.path);

    if (inputPaths.length === 1) {
      const args = ['-i', inputPaths[0], '-c', 'copy', '-y', outputPath];
      await this.ffmpeg.execute(args, onProgress);
      return { success: true, outputPath };
    }

    return this.joinVideos(inputPaths, outputPath, options, onProgress);
  }

  /**
   * Split video into multiple parts
   * @param {string} inputPath - Input video path
   * @param {Array<{start: number, end: number}>} segments - Segments to extract
   * @param {string} outputDir - Output directory
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<{success: boolean, outputPaths: string[]}>}
   */
  async splitVideo(inputPath, segments, outputDir, onProgress = null) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    if (!segments || segments.length === 0) {
      throw new Error('At least one segment is required');
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPaths = [];
    const ext = path.extname(inputPath);
    const baseName = path.basename(inputPath, ext);

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const outputPath = path.join(outputDir, `${baseName}_part${i + 1}${ext}`);

      await this.cutVideo(
        inputPath,
        segment.start,
        segment.end,
        outputPath,
        onProgress
      );

      outputPaths.push(outputPath);
    }

    return { success: true, outputPaths };
  }

  /**
   * Extract audio from video
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output audio path
   * @param {Object} options - Extraction options
   * @returns {Promise<{success: boolean, outputPath: string}>}
   */
  async extractAudio(inputPath, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const args = [
      '-i', inputPath,
      '-vn',
      '-acodec', options.codec || 'copy'
    ];

    if (options.bitrate) {
      args.push('-b:a', options.bitrate);
    }

    args.push('-y', outputPath);

    await this.ffmpeg.execute(args);
    return { success: true, outputPath };
  }

  /**
   * Remove audio from video
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @returns {Promise<{success: boolean, outputPath: string}>}
   */
  async removeAudio(inputPath, outputPath) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const args = [
      '-i', inputPath,
      '-an',
      '-c:v', 'copy',
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args);
    return { success: true, outputPath };
  }

  /**
   * Add audio to video
   * @param {string} videoPath - Input video path
   * @param {string} audioPath - Input audio path
   * @param {string} outputPath - Output video path
   * @param {Object} options - Options
   * @returns {Promise<{success: boolean, outputPath: string}>}
   */
  async addAudio(videoPath, audioPath, outputPath, options = {}) {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    const args = [
      '-i', videoPath,
      '-i', audioPath,
      '-c:v', 'copy',
      '-c:a', 'aac'
    ];

    if (options.shortest) {
      args.push('-shortest');
    }

    args.push('-y', outputPath);

    await this.ffmpeg.execute(args);
    return { success: true, outputPath };
  }

  /**
   * Clean up temporary files
   */
  cleanup() {
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        fs.unlinkSync(filePath);
      }
    }
  }
}

module.exports = VideoProcessor;
