/**
 * Módulo Generador de Thumbnails
 * Genera miniaturas de video para visualización
 */

const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const FFmpegWrapper = require('./ffmpegWrapper');

class ThumbnailGenerator {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.cache = new Map();
    this.tempDir = path.join(os.tmpdir(), 'blackmamba-thumbnails');
    
    // Crear directorio temporal si no existe
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Generar thumbnail de un video
   * @param {string} filePath - Ruta al archivo de video
   * @param {Object} options - Opciones de generación
   * @returns {Promise<Object>} Resultado con ruta al thumbnail
   */
  async generateThumbnail(filePath, options = {}) {
    const {
      width = 160,
      height = 90,
      timestamp = 1, // Segundos desde el inicio
      format = 'jpg',
      quality = 80
    } = options;

    // Generar clave de cache única
    const cacheKey = `${filePath}-${width}x${height}-${timestamp}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (fs.existsSync(cached.path)) {
        return cached;
      }
    }

    // Generar nombre único para el thumbnail
    const hash = this.hashString(filePath + timestamp);
    const outputPath = path.join(this.tempDir, `thumb_${hash}.${format}`);

    // Si ya existe el archivo, retornarlo
    if (fs.existsSync(outputPath)) {
      const result = {
        success: true,
        path: outputPath,
        dataUrl: await this.fileToDataUrl(outputPath)
      };
      this.cache.set(cacheKey, result);
      return result;
    }

    try {
      await this.extractFrame(filePath, outputPath, timestamp, width, height, quality);
      
      const result = {
        success: true,
        path: outputPath,
        dataUrl: await this.fileToDataUrl(outputPath)
      };
      
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extraer frame del video usando FFmpeg
   * @param {string} inputPath - Ruta del video
   * @param {string} outputPath - Ruta de salida
   * @param {number} timestamp - Segundo a extraer
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @param {number} quality - Calidad (1-100)
   */
  async extractFrame(inputPath, outputPath, timestamp, width, height, quality) {
    return new Promise((resolve, reject) => {
      const args = [
        '-ss', String(timestamp),
        '-i', inputPath,
        '-vframes', '1',
        '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
        '-q:v', String(Math.round((100 - quality) / 10) + 1), // FFmpeg quality: 1-10 (1=best)
        '-y',
        outputPath
      ];

      const process = spawn(this.ffmpeg.ffmpegPath, args);
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Generar múltiples thumbnails (para scrubbing)
   * @param {string} filePath - Ruta al video
   * @param {number} count - Número de thumbnails
   * @param {Object} options - Opciones
   * @returns {Promise<Array>} Array de thumbnails
   */
  async generateThumbnailStrip(filePath, count = 10, options = {}) {
    const info = await this.ffmpeg.getVideoInfo(filePath);
    const duration = info.duration || 0;
    
    if (duration === 0) {
      return { success: false, error: 'Could not determine video duration' };
    }

    const thumbnails = [];
    const interval = duration / (count + 1);

    for (let i = 1; i <= count; i++) {
      const timestamp = interval * i;
      const result = await this.generateThumbnail(filePath, {
        ...options,
        timestamp
      });
      
      if (result.success) {
        thumbnails.push({
          timestamp,
          ...result
        });
      }
    }

    return {
      success: true,
      count: thumbnails.length,
      duration,
      thumbnails
    };
  }

  /**
   * Convertir archivo a Data URL para uso en HTML
   * @param {string} filePath - Ruta al archivo
   * @returns {Promise<string>} Data URL
   */
  async fileToDataUrl(filePath) {
    try {
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).slice(1);
      const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    }
  }

  /**
   * Generar hash simple de string
   * @param {string} str - String a hashear
   * @returns {string} Hash hexadecimal
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Limpiar cache y archivos temporales
   */
  cleanup() {
    this.cache.clear();
    
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.tempDir, file));
        }
      }
    } catch (error) {
      console.error('Error cleaning up thumbnails:', error);
    }
  }

  /**
   * Obtener thumbnail del cache
   * @param {string} filePath - Ruta del video
   * @returns {Object|null} Thumbnail cacheado o null
   */
  getCached(filePath) {
    for (const [key, value] of this.cache) {
      if (key.startsWith(filePath)) {
        return value;
      }
    }
    return null;
  }
}

module.exports = ThumbnailGenerator;
