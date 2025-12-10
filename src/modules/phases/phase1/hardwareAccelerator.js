/**
 * Hardware Accelerator Module - Phase 1.1
 * Manages GPU hardware acceleration for video processing
 * Supports NVIDIA CUDA, AMD AMF, Intel QuickSync, and VideoToolbox (macOS)
 */

const os = require('node:os');
const FFmpegWrapper = require('../../ffmpegWrapper');

// Hardware acceleration configurations
const HW_ACCEL_CONFIGS = {
  nvidia: {
    name: 'NVIDIA CUDA',
    decoder: 'cuda',
    encoder: 'h264_nvenc',
    hevcEncoder: 'hevc_nvenc',
    hwaccel: 'cuda',
    ffmpegArgs: ['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda']
  },
  amd: {
    name: 'AMD AMF',
    decoder: 'amf',
    encoder: 'h264_amf',
    hevcEncoder: 'hevc_amf',
    hwaccel: 'd3d11va',
    ffmpegArgs: ['-hwaccel', 'd3d11va']
  },
  intel: {
    name: 'Intel QuickSync',
    decoder: 'qsv',
    encoder: 'h264_qsv',
    hevcEncoder: 'hevc_qsv',
    hwaccel: 'qsv',
    ffmpegArgs: ['-hwaccel', 'qsv', '-hwaccel_output_format', 'qsv']
  },
  videotoolbox: {
    name: 'Apple VideoToolbox',
    decoder: 'videotoolbox',
    encoder: 'h264_videotoolbox',
    hevcEncoder: 'hevc_videotoolbox',
    hwaccel: 'videotoolbox',
    ffmpegArgs: ['-hwaccel', 'videotoolbox']
  },
  vaapi: {
    name: 'VAAPI (Linux)',
    decoder: 'vaapi',
    encoder: 'h264_vaapi',
    hevcEncoder: 'hevc_vaapi',
    hwaccel: 'vaapi',
    ffmpegArgs: ['-hwaccel', 'vaapi', '-hwaccel_device', '/dev/dri/renderD128']
  }
};

class HardwareAccelerator {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.availableAccelerators = [];
    this.activeAccelerator = null;
    this.detected = false;
  }

  /**
   * Detect available hardware accelerators
   * @returns {Promise<Array>} List of available accelerators
   */
  async detectAccelerators() {
    const platform = os.platform();
    const accelerators = [];

    // Platform-specific default accelerators
    const platformAccelerators = {
      win32: ['nvidia', 'amd', 'intel'],
      darwin: ['videotoolbox', 'intel'],
      linux: ['nvidia', 'vaapi', 'intel']
    };

    const toCheck = platformAccelerators[platform] || ['nvidia', 'intel'];

    for (const accelKey of toCheck) {
      const config = HW_ACCEL_CONFIGS[accelKey];
      if (config) {
        try {
          const isAvailable = await this.testAccelerator(accelKey);
          if (isAvailable) {
            accelerators.push({
              key: accelKey,
              ...config,
              available: true
            });
          }
        } catch {
          // Accelerator not available
        }
      }
    }

    this.availableAccelerators = accelerators;
    this.detected = true;

    // Auto-select the first available accelerator
    if (accelerators.length > 0 && !this.activeAccelerator) {
      this.activeAccelerator = accelerators[0].key;
    }

    return accelerators;
  }

  /**
   * Test if a hardware accelerator is available
   * @param {string} acceleratorKey - Accelerator key
   * @returns {Promise<boolean>} True if available
   */
  async testAccelerator(acceleratorKey) {
    const config = HW_ACCEL_CONFIGS[acceleratorKey];
    if (!config) {
      return false;
    }

    try {
      // Test FFmpeg hwaccel availability
      const args = ['-hwaccels'];
      const result = await this.ffmpeg.execute(args);
      
      if (result.output && result.output.includes(config.hwaccel)) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Set the active hardware accelerator
   * @param {string} acceleratorKey - Accelerator key or null to disable
   * @returns {boolean} True if set successfully
   */
  setAccelerator(acceleratorKey) {
    if (acceleratorKey === null) {
      this.activeAccelerator = null;
      return true;
    }

    if (!this.detected) {
      throw new Error('Accelerators not detected. Call detectAccelerators() first.');
    }

    const available = this.availableAccelerators.find(a => a.key === acceleratorKey);
    if (!available) {
      return false;
    }

    this.activeAccelerator = acceleratorKey;
    return true;
  }

  /**
   * Get FFmpeg arguments for hardware acceleration
   * @param {Object} options - Options for acceleration
   * @returns {Array} FFmpeg arguments for hardware acceleration
   */
  getFFmpegArgs(options = {}) {
    if (!this.activeAccelerator) {
      return [];
    }

    const config = HW_ACCEL_CONFIGS[this.activeAccelerator];
    if (!config) {
      return [];
    }

    const args = [...config.ffmpegArgs];

    // Add encoder if specified
    if (options.encode) {
      const encoder = options.hevc ? config.hevcEncoder : config.encoder;
      args.push('-c:v', encoder);
    }

    return args;
  }

  /**
   * Get the active accelerator info
   * @returns {Object|null} Active accelerator info or null
   */
  getActiveAccelerator() {
    if (!this.activeAccelerator) {
      return null;
    }

    const config = HW_ACCEL_CONFIGS[this.activeAccelerator];
    return {
      key: this.activeAccelerator,
      ...config
    };
  }

  /**
   * Get all available accelerators
   * @returns {Array} List of available accelerators
   */
  getAvailableAccelerators() {
    return [...this.availableAccelerators];
  }

  /**
   * Check if hardware acceleration is enabled
   * @returns {boolean} True if enabled
   */
  isEnabled() {
    return this.activeAccelerator !== null;
  }

  /**
   * Get all supported accelerator configurations
   * @returns {Object} All accelerator configurations
   */
  getSupportedAccelerators() {
    return { ...HW_ACCEL_CONFIGS };
  }

  /**
   * Get recommended accelerator for current platform
   * @returns {string|null} Recommended accelerator key
   */
  getRecommendedAccelerator() {
    const platform = os.platform();
    
    const recommendations = {
      win32: 'nvidia',
      darwin: 'videotoolbox',
      linux: 'vaapi'
    };

    const recommended = recommendations[platform];
    
    // Check if recommended is available
    if (this.availableAccelerators.find(a => a.key === recommended)) {
      return recommended;
    }

    // Return first available
    if (this.availableAccelerators.length > 0) {
      return this.availableAccelerators[0].key;
    }

    return null;
  }

  /**
   * Disable hardware acceleration
   */
  disable() {
    this.activeAccelerator = null;
  }
}

module.exports = HardwareAccelerator;
