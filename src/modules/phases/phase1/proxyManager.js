/**
 * Módulo Administrador de Proxy - Fase 1.1
 * Genera y administra archivos proxy para edición más fluida de videos de alta resolución
 */

const path = require('node:path');
const fs = require('node:fs');
const FFmpegWrapper = require('../../ffmpegWrapper');
const { v4: uuidv4 } = require('uuid');

// Configuración de generación de proxy
const PROXY_RESOLUTION_PRESETS = {
  low: { width: 640, height: 360, bitrate: '1M' },
  medium: { width: 1280, height: 720, bitrate: '2M' },
  high: { width: 1920, height: 1080, bitrate: '5M' }
};

const DEFAULT_PROXY_CODEC = 'libx264';
const DEFAULT_PROXY_PRESET = 'ultrafast';

class ProxyManager {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.proxyDir = path.join(require('node:os').tmpdir(), 'video-editor-proxies');
    this.proxyMap = new Map(); // Maps original file to proxy file
    this.ensureProxyDir();
  }

  /**
   * Asegurar que el directorio de proxy existe
   */
  ensureProxyDir() {
    if (!fs.existsSync(this.proxyDir)) {
      fs.mkdirSync(this.proxyDir, { recursive: true });
    }
  }

  /**
   * Generar un archivo proxy para un video
   * @param {string} inputPath - Ruta del video original
   * @param {Object} options - Opciones de generación de proxy
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado con ruta del proxy
   */
  async generateProxy(inputPath, options = {}, onProgress = null) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const config = {
      resolution: options.resolution || 'medium',
      codec: options.codec || DEFAULT_PROXY_CODEC,
      preset: options.preset || DEFAULT_PROXY_PRESET,
      ...options
    };

    const resolutionSettings = PROXY_RESOLUTION_PRESETS[config.resolution] || PROXY_RESOLUTION_PRESETS.medium;
    const proxyId = uuidv4();
    const proxyPath = path.join(this.proxyDir, `proxy_${proxyId}.mp4`);

    if (onProgress) {
      onProgress({ stage: 'starting', percent: 0, message: 'Starting proxy generation...' });
    }

    const args = [
      '-i', inputPath,
      '-vf', `scale=${resolutionSettings.width}:${resolutionSettings.height}:force_original_aspect_ratio=decrease`,
      '-c:v', config.codec,
      '-preset', config.preset,
      '-b:v', resolutionSettings.bitrate,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-y',
      proxyPath
    ];

    try {
      await this.ffmpeg.execute(args, onProgress);
      
      // Almacenar mapeo
      this.proxyMap.set(inputPath, {
        proxyPath,
        resolution: config.resolution,
        createdAt: new Date().toISOString()
      });

      if (onProgress) {
        onProgress({ stage: 'complete', percent: 100, message: 'Proxy generated successfully' });
      }

      return {
        success: true,
        originalPath: inputPath,
        proxyPath,
        resolution: config.resolution
      };
    } catch (error) {
      throw new Error(`Failed to generate proxy: ${error.message}`);
    }
  }

  /**
   * Obtener ruta de proxy para un archivo original
   * @param {string} originalPath - Ruta del video original
   * @returns {string|null} Ruta del proxy o null si no se encuentra
   */
  getProxy(originalPath) {
    const proxyInfo = this.proxyMap.get(originalPath);
    if (proxyInfo && fs.existsSync(proxyInfo.proxyPath)) {
      return proxyInfo.proxyPath;
    }
    return null;
  }

  /**
   * Verificar si existe proxy para un archivo
   * @param {string} originalPath - Ruta del video original
   * @returns {boolean} True si el proxy existe
   */
  hasProxy(originalPath) {
    const proxyInfo = this.proxyMap.get(originalPath);
    return proxyInfo && fs.existsSync(proxyInfo.proxyPath);
  }

  /**
   * Eliminar proxy para un archivo
   * @param {string} originalPath - Ruta del video original
   * @returns {boolean} True si el proxy fue eliminado
   */
  deleteProxy(originalPath) {
    const proxyInfo = this.proxyMap.get(originalPath);
    if (proxyInfo && fs.existsSync(proxyInfo.proxyPath)) {
      fs.unlinkSync(proxyInfo.proxyPath);
      this.proxyMap.delete(originalPath);
      return true;
    }
    return false;
  }

  /**
   * Obtener presets de resolución disponibles
   * @returns {Object} Presets de resolución
   */
  getResolutionPresets() {
    return { ...PROXY_RESOLUTION_PRESETS };
  }

  /**
   * Obtener todos los proxies activos
   * @returns {Array} Lista de mapeos de proxy
   */
  getAllProxies() {
    const proxies = [];
    for (const [originalPath, proxyInfo] of this.proxyMap) {
      if (fs.existsSync(proxyInfo.proxyPath)) {
        proxies.push({
          originalPath,
          ...proxyInfo
        });
      }
    }
    return proxies;
  }

  /**
   * Limpiar todos los archivos proxy
   */
  cleanup() {
    for (const [, proxyInfo] of this.proxyMap) {
      if (fs.existsSync(proxyInfo.proxyPath)) {
        try {
          fs.unlinkSync(proxyInfo.proxyPath);
        } catch {
          // Ignorar errores de limpieza
        }
      }
    }
    this.proxyMap.clear();
  }
}

module.exports = ProxyManager;
