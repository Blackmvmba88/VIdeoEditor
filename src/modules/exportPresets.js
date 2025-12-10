/**
 * Módulo de Presets de Exportación
 * Contiene configuraciones de exportación predefinidas para diferentes casos de uso
 */

const presets = {
  youtube1080p: {
    name: 'YouTube 1080p',
    description: 'Optimized for YouTube at 1080p',
    format: 'mp4',
    video: {
      codec: 'libx264',
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: '8M',
      profile: 'high',
      level: '4',
      preset: 'medium',
      crf: 18
    },
    audio: {
      codec: 'aac',
      bitrate: '192k',
      sampleRate: 48000,
      channels: 2
    }
  },

  youtube4k: {
    name: 'YouTube 4K',
    description: 'Optimized for YouTube at 4K',
    format: 'mp4',
    video: {
      codec: 'libx264',
      width: 3840,
      height: 2160,
      fps: 30,
      bitrate: '35M',
      profile: 'high',
      level: '5.1',
      preset: 'medium',
      crf: 18
    },
    audio: {
      codec: 'aac',
      bitrate: '320k',
      sampleRate: 48000,
      channels: 2
    }
  },

  instagram: {
    name: 'Instagram',
    description: 'Optimized for Instagram feed (1:1 aspect ratio)',
    format: 'mp4',
    video: {
      codec: 'libx264',
      width: 1080,
      height: 1080,
      fps: 30,
      bitrate: '3.5M',
      profile: 'main',
      level: '3.1',
      preset: 'medium',
      crf: 23
    },
    audio: {
      codec: 'aac',
      bitrate: '128k',
      sampleRate: 44100,
      channels: 2
    }
  },

  instagramStory: {
    name: 'Instagram Story/Reels',
    description: 'Optimized for Instagram Stories and Reels (9:16)',
    format: 'mp4',
    video: {
      codec: 'libx264',
      width: 1080,
      height: 1920,
      fps: 30,
      bitrate: '4M',
      profile: 'main',
      level: '3.1',
      preset: 'medium',
      crf: 23
    },
    audio: {
      codec: 'aac',
      bitrate: '128k',
      sampleRate: 44100,
      channels: 2
    }
  },

  tiktok: {
    name: 'TikTok',
    description: 'Optimized for TikTok (9:16)',
    format: 'mp4',
    video: {
      codec: 'libx264',
      width: 1080,
      height: 1920,
      fps: 30,
      bitrate: '4M',
      profile: 'main',
      level: '3.1',
      preset: 'medium',
      crf: 23
    },
    audio: {
      codec: 'aac',
      bitrate: '128k',
      sampleRate: 44100,
      channels: 2
    }
  },

  twitter: {
    name: 'Twitter/X',
    description: 'Optimized for Twitter/X',
    format: 'mp4',
    video: {
      codec: 'libx264',
      width: 1280,
      height: 720,
      fps: 30,
      bitrate: '5M',
      profile: 'main',
      level: '3.1',
      preset: 'medium',
      crf: 23
    },
    audio: {
      codec: 'aac',
      bitrate: '128k',
      sampleRate: 44100,
      channels: 2
    }
  },

  web720p: {
    name: 'Web 720p',
    description: 'Balanced quality for web delivery at 720p',
    format: 'mp4',
    video: {
      codec: 'libx264',
      width: 1280,
      height: 720,
      fps: 30,
      bitrate: '4M',
      profile: 'main',
      level: '3.1',
      preset: 'medium',
      crf: 23
    },
    audio: {
      codec: 'aac',
      bitrate: '128k',
      sampleRate: 44100,
      channels: 2
    }
  },

  webOptimized: {
    name: 'Web Optimized',
    description: 'Fast loading for web with smaller file size',
    format: 'mp4',
    video: {
      codec: 'libx264',
      width: 1280,
      height: 720,
      fps: 30,
      bitrate: '2M',
      profile: 'main',
      level: '3.1',
      preset: 'medium',
      crf: 28
    },
    audio: {
      codec: 'aac',
      bitrate: '96k',
      sampleRate: 44100,
      channels: 2
    },
    fastStart: true
  },

  highQuality: {
    name: 'High Quality',
    description: 'Maximum quality for archival',
    format: 'mp4',
    video: {
      codec: 'libx264',
      width: null,
      height: null,
      fps: null,
      bitrate: '20M',
      profile: 'high',
      level: '5.1',
      preset: 'slow',
      crf: 15
    },
    audio: {
      codec: 'aac',
      bitrate: '320k',
      sampleRate: 48000,
      channels: 2
    }
  },

  proresProxy: {
    name: 'ProRes Proxy',
    description: 'ProRes Proxy for editing',
    format: 'mov',
    video: {
      codec: 'prores_ks',
      profile: 'proxy',
      width: null,
      height: null,
      fps: null
    },
    audio: {
      codec: 'pcm_s16le',
      sampleRate: 48000,
      channels: 2
    }
  },

  dnxhdLb: {
    name: 'DNxHD LB',
    description: 'DNxHD Low Bandwidth for editing',
    format: 'mxf',
    video: {
      codec: 'dnxhd',
      profile: 'dnxhd_lb',
      width: 1920,
      height: 1080,
      fps: 30
    },
    audio: {
      codec: 'pcm_s16le',
      sampleRate: 48000,
      channels: 2
    }
  },

  gif: {
    name: 'Animated GIF',
    description: 'Convert to animated GIF',
    format: 'gif',
    video: {
      width: 480,
      height: null,
      fps: 15,
      palette: true
    },
    audio: null
  },

  audioOnly: {
    name: 'Audio Only (MP3)',
    description: 'Extract audio as MP3',
    format: 'mp3',
    video: null,
    audio: {
      codec: 'libmp3lame',
      bitrate: '320k',
      sampleRate: 44100,
      channels: 2
    }
  },

  audioAac: {
    name: 'Audio Only (AAC)',
    description: 'Extract audio as AAC',
    format: 'm4a',
    video: null,
    audio: {
      codec: 'aac',
      bitrate: '256k',
      sampleRate: 48000,
      channels: 2
    }
  }
};

/**
 * Clase Administrador de Presets de Exportación
 */
class ExportPresets {
  constructor() {
    this.presets = { ...presets };
    this.customPresets = {};
  }

  /**
   * Obtener todos los presets disponibles
   * @returns {Object}
   */
  getAllPresets() {
    return { ...this.presets, ...this.customPresets };
  }

  /**
   * Obtener preset por clave
   * @param {string} key - Clave del preset
   * @returns {Object|null}
   */
  getPreset(key) {
    return this.presets[key] || this.customPresets[key] || null;
  }

  /**
   * Obtener presets por categoría
   * @param {string} category - Nombre de la categoría
   * @returns {Object}
   */
  getPresetsByCategory(category) {
    const categories = {
      social: ['youtube1080p', 'youtube4k', 'instagram', 'instagramStory', 'tiktok', 'twitter'],
      web: ['web720p', 'webOptimized'],
      professional: ['highQuality', 'proresProxy', 'dnxhdLb'],
      audio: ['audioOnly', 'audioAac'],
      other: ['gif']
    };

    const keys = categories[category] || [];
    const result = {};

    for (const key of keys) {
      if (this.presets[key]) {
        result[key] = this.presets[key];
      }
    }

    return result;
  }

  /**
   * Crear preset personalizado
   * @param {string} key - Clave del preset
   * @param {Object} preset - Configuración del preset
   */
  createCustomPreset(key, preset) {
    if (!preset.name) {
      throw new Error('Preset must have a name');
    }

    this.customPresets[key] = {
      ...preset,
      isCustom: true
    };
  }

  /**
   * Eliminar preset personalizado
   * @param {string} key - Clave del preset
   */
  deleteCustomPreset(key) {
    delete this.customPresets[key];
  }

  /**
   * Generar argumentos de FFmpeg desde preset
   * @param {string} presetKey - Clave del preset
   * @param {Object} overrides - Sobreescrituras opcionales de parámetros
   * @returns {string[]}
   */
  generateFFmpegArgs(presetKey, overrides = {}) {
    const preset = this.getPreset(presetKey);
    if (!preset) {
      throw new Error(`Preset not found: ${presetKey}`);
    }

    const args = [];
    const video = { ...preset.video, ...overrides.video };
    const audio = { ...preset.audio, ...overrides.audio };

    if (video && video.codec) {
      args.push('-c:v', video.codec);

      if (video.width && video.height) {
        args.push('-s', `${video.width}x${video.height}`);
      } else if (video.width) {
        args.push('-vf', `scale=${video.width}:-2`);
      } else if (video.height) {
        args.push('-vf', `scale=-2:${video.height}`);
      }

      if (video.fps) {
        args.push('-r', video.fps.toString());
      }

      if (video.bitrate) {
        args.push('-b:v', video.bitrate);
      }

      if (video.crf !== undefined) {
        args.push('-crf', video.crf.toString());
      }

      if (video.profile) {
        args.push('-profile:v', video.profile);
      }

      if (video.level) {
        args.push('-level', video.level);
      }

      if (video.preset) {
        args.push('-preset', video.preset);
      }
    } else if (preset.video === null) {
      args.push('-vn');
    }

    if (audio && audio.codec) {
      args.push('-c:a', audio.codec);

      if (audio.bitrate) {
        args.push('-b:a', audio.bitrate);
      }

      if (audio.sampleRate) {
        args.push('-ar', audio.sampleRate.toString());
      }

      if (audio.channels) {
        args.push('-ac', audio.channels.toString());
      }
    } else if (preset.audio === null) {
      args.push('-an');
    }

    if (preset.fastStart) {
      args.push('-movflags', '+faststart');
    }

    return args;
  }

  /**
   * Obtener extensión de salida por defecto para preset
   * @param {string} presetKey - Clave del preset
   * @returns {string}
   */
  getOutputExtension(presetKey) {
    const preset = this.getPreset(presetKey);
    if (!preset) return '.mp4';

    const extensionMap = {
      'mp4': '.mp4',
      'mov': '.mov',
      'mxf': '.mxf',
      'gif': '.gif',
      'mp3': '.mp3',
      'm4a': '.m4a',
      'mkv': '.mkv',
      'webm': '.webm',
      'avi': '.avi'
    };

    return extensionMap[preset.format] || '.mp4';
  }
}

module.exports = ExportPresets;
