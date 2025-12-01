/**
 * Proxy Manager Module - Phase 1.1
 * Generates and manages proxy files for smoother editing of high-resolution videos
 */

const path = require('path');
const fs = require('fs');
const FFmpegWrapper = require('../../ffmpegWrapper');
const { v4: uuidv4 } = require('uuid');

// Proxy generation settings
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
    this.proxyDir = path.join(require('os').tmpdir(), 'video-editor-proxies');
    this.proxyMap = new Map(); // Maps original file to proxy file
    this.ensureProxyDir();
  }

  /**
   * Ensure proxy directory exists
   */
  ensureProxyDir() {
    if (!fs.existsSync(this.proxyDir)) {
      fs.mkdirSync(this.proxyDir, { recursive: true });
    }
  }

  /**
   * Generate a proxy file for a video
   * @param {string} inputPath - Original video path
   * @param {Object} options - Proxy generation options
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Result with proxy path
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
      onProgress({ stage: 'starting', percent: 0, message: 'Iniciando generación de proxy...' });
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
      
      // Store mapping
      this.proxyMap.set(inputPath, {
        proxyPath,
        resolution: config.resolution,
        createdAt: new Date().toISOString()
      });

      if (onProgress) {
        onProgress({ stage: 'complete', percent: 100, message: 'Proxy generado exitosamente' });
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
   * Get proxy path for an original file
   * @param {string} originalPath - Original video path
   * @returns {string|null} Proxy path or null if not found
   */
  getProxy(originalPath) {
    const proxyInfo = this.proxyMap.get(originalPath);
    if (proxyInfo && fs.existsSync(proxyInfo.proxyPath)) {
      return proxyInfo.proxyPath;
    }
    return null;
  }

  /**
   * Check if proxy exists for a file
   * @param {string} originalPath - Original video path
   * @returns {boolean} True if proxy exists
   */
  hasProxy(originalPath) {
    const proxyInfo = this.proxyMap.get(originalPath);
    return proxyInfo && fs.existsSync(proxyInfo.proxyPath);
  }

  /**
   * Delete proxy for a file
   * @param {string} originalPath - Original video path
   * @returns {boolean} True if proxy was deleted
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
   * Get available resolution presets
   * @returns {Object} Resolution presets
   */
  getResolutionPresets() {
    return { ...PROXY_RESOLUTION_PRESETS };
  }

  /**
   * Get all active proxies
   * @returns {Array} List of proxy mappings
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
   * Clean up all proxy files
   */
  cleanup() {
    for (const [, proxyInfo] of this.proxyMap) {
      if (fs.existsSync(proxyInfo.proxyPath)) {
        try {
          fs.unlinkSync(proxyInfo.proxyPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
    this.proxyMap.clear();
  }
}

module.exports = ProxyManager;
