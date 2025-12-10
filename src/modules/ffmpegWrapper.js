/**
 * Módulo Wrapper de FFmpeg
 * Maneja todas las operaciones de FFmpeg para procesamiento de video
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

class FFmpegWrapper {
  constructor() {
    this.ffmpegPath = this.detectFFmpegPath();
    this.ffprobePath = this.detectFFprobePath();
  }

  /**
   * Detectar ruta de instalación de FFmpeg
   * @returns {string} Ruta al ejecutable de FFmpeg
   */
  detectFFmpegPath() {
    const possiblePaths = [
      '/opt/homebrew/bin/ffmpeg',  // macOS Apple Silicon (Homebrew)
      '/usr/local/bin/ffmpeg',     // macOS Intel (Homebrew)
      '/usr/bin/ffmpeg',           // Linux
      'ffmpeg',                    // PATH
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      path.join(process.env.LOCALAPPDATA || '', 'ffmpeg', 'bin', 'ffmpeg.exe'),
      path.join(process.env.ProgramFiles || '', 'ffmpeg', 'bin', 'ffmpeg.exe')
    ];

    for (const ffmpegPath of possiblePaths) {
      if (this.isExecutableAvailable(ffmpegPath)) {
        return ffmpegPath;
      }
    }

    return 'ffmpeg';
  }

  /**
   * Detectar ruta de instalación de FFprobe
   * @returns {string} Ruta al ejecutable de FFprobe
   */
  detectFFprobePath() {
    const possiblePaths = [
      '/opt/homebrew/bin/ffprobe',  // macOS Apple Silicon (Homebrew)
      '/usr/local/bin/ffprobe',     // macOS Intel (Homebrew)
      '/usr/bin/ffprobe',           // Linux
      'ffprobe',                    // PATH
      'C:\\ffmpeg\\bin\\ffprobe.exe',
      path.join(process.env.LOCALAPPDATA || '', 'ffmpeg', 'bin', 'ffprobe.exe'),
      path.join(process.env.ProgramFiles || '', 'ffmpeg', 'bin', 'ffprobe.exe')
    ];

    for (const ffprobePath of possiblePaths) {
      if (this.isExecutableAvailable(ffprobePath)) {
        return ffprobePath;
      }
    }

    return 'ffprobe';
  }

  /**
   * Verificar si un ejecutable está disponible
   * @param {string} execPath - Ruta al ejecutable
   * @returns {boolean}
   */
  isExecutableAvailable(execPath) {
    try {
      const result = require('child_process').spawnSync(execPath, ['-version'], {
        stdio: 'pipe',
        timeout: 5000
      });
      return result.status === 0;
    } catch {
      return false;
    }
  }

  /**
   * Ejecutar comando de FFmpeg
   * @param {string[]} args - Argumentos del comando
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<{success: boolean, output: string}>}
   */
  execute(args, onProgress = null) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args);
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;

        if (onProgress) {
          const progressMatch = dataStr.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
          if (progressMatch) {
            const hours = parseInt(progressMatch[1], 10);
            const minutes = parseInt(progressMatch[2], 10);
            const seconds = parseInt(progressMatch[3], 10);
            const centiseconds = parseInt(progressMatch[4], 10);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
            onProgress(totalSeconds);
          }
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: output || errorOutput });
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${errorOutput}`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to start FFmpeg: ${err.message}`));
      });
    });
  }

  /**
   * Obtener información del video usando FFprobe
   * @param {string} filePath - Ruta al archivo de video
   * @returns {Promise<Object>} Metadatos del video
   */
  getVideoInfo(filePath) {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];

      const process = spawn(this.ffprobePath, args);
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            resolve(this.parseVideoInfo(info));
          } catch (parseError) {
            reject(new Error(`Failed to parse video info: ${parseError.message}`));
          }
        } else {
          reject(new Error(`FFprobe exited with code ${code}: ${errorOutput}`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to start FFprobe: ${err.message}`));
      });
    });
  }

  /**
   * Parsear salida de FFprobe a formato estructurado
   * @param {Object} rawInfo - Salida JSON cruda de FFprobe
   * @returns {Object} Información de video parseada
   */
  parseVideoInfo(rawInfo) {
    const videoStream = rawInfo.streams?.find(s => s.codec_type === 'video');
    const audioStream = rawInfo.streams?.find(s => s.codec_type === 'audio');
    const format = rawInfo.format || {};

    return {
      duration: parseFloat(format.duration) || 0,
      size: parseInt(format.size, 10) || 0,
      bitrate: parseInt(format.bit_rate, 10) || 0,
      format: format.format_name || 'unknown',
      video: videoStream ? {
        codec: videoStream.codec_name,
        width: videoStream.width,
        height: videoStream.height,
        fps: this.parseFPS(videoStream.r_frame_rate),
        bitrate: parseInt(videoStream.bit_rate, 10) || 0
      } : null,
      audio: audioStream ? {
        codec: audioStream.codec_name,
        sampleRate: parseInt(audioStream.sample_rate, 10),
        channels: audioStream.channels,
        bitrate: parseInt(audioStream.bit_rate, 10) || 0
      } : null
    };
  }

  /**
   * Parsear FPS desde formato de FFprobe
   * @param {string} fpsStr - Cadena de FPS (ej., "30/1")
   * @returns {number} Valor de FPS
   */
  parseFPS(fpsStr) {
    if (!fpsStr) return 0;
    const parts = fpsStr.split('/');
    if (parts.length === 2) {
      return Math.round(parseInt(parts[0], 10) / parseInt(parts[1], 10));
    }
    return parseFloat(fpsStr) || 0;
  }

  /**
   * Verificar si FFmpeg está disponible
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      await this.execute(['-version']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtener versión de FFmpeg
   * @returns {Promise<string>}
   */
  async getVersion() {
    try {
      const result = await this.execute(['-version']);
      const versionMatch = result.output.match(/ffmpeg version ([\d.]+)/i);
      return versionMatch ? versionMatch[1] : 'unknown';
    } catch {
      return 'unavailable';
    }
  }
}

module.exports = FFmpegWrapper;
