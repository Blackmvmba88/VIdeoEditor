/**
 * Módulo Procesador de Video
 * Maneja operaciones de video: unir, cortar y ordenar clips
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
   * Escapar ruta de archivo para formato de archivo concat de FFmpeg
   * @param {string} filePath - Ruta del archivo a escapar
   * @returns {string} Ruta escapada
   */
  escapePath(filePath) {
    return filePath.replace(/'/g, '\'\\\'\'');
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
   * Cortar un clip de video
   * @param {string} inputPath - Ruta del video de entrada
   * @param {number} startTime - Tiempo de inicio en segundos
   * @param {number} endTime - Tiempo de fin en segundos
   * @param {string} outputPath - Ruta del video de salida
   * @param {Function} onProgress - Callback de progreso
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
   * Unir múltiples clips de video
   * @param {string[]} inputPaths - Array de rutas de videos de entrada
   * @param {string} outputPath - Ruta del video de salida
   * @param {Object} options - Opciones de unión
   * @param {Function} onProgress - Callback de progreso
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
      .map(p => `file '${this.escapePath(p)}'`)
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
   * Reordenar clips y unirlos
   * @param {Array<{path: string, order: number}>} clips - Clips con orden
   * @param {string} outputPath - Ruta del video de salida
   * @param {Object} options - Opciones de procesamiento
   * @param {Function} onProgress - Callback de progreso
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
   * Dividir video en múltiples partes
   * @param {string} inputPath - Ruta del video de entrada
   * @param {Array<{start: number, end: number}>} segments - Segmentos a extraer
   * @param {string} outputDir - Directorio de salida
   * @param {Function} onProgress - Callback de progreso
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
   * Extraer audio del video
   * @param {string} inputPath - Ruta del video de entrada
   * @param {string} outputPath - Ruta del audio de salida
   * @param {Object} options - Opciones de extracción
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
   * Remover audio del video
   * @param {string} inputPath - Ruta del video de entrada
   * @param {string} outputPath - Ruta del video de salida
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
   * Agregar audio al video
   * @param {string} videoPath - Ruta del video de entrada
   * @param {string} audioPath - Ruta del audio de entrada
   * @param {string} outputPath - Ruta del video de salida
   * @param {Object} options - Opciones
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
   * Limpiar archivos temporales
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
