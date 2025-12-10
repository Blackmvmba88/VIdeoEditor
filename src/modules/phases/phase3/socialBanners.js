/**
 * BlackMamba Studio - Social Banners
 * 
 * Sistema de banners optimizados para redes sociales con plantillas
 * prediseñadas para cada plataforma.
 * 
 * Características:
 * - Plantillas para YouTube, Instagram, TikTok, Twitter, Facebook
 * - Banners de subscribe/follow
 * - Call-to-action (CTA) animados
 * - End screens profesionales
 * - Optimización automática de dimensiones
 * 
 * @module SocialBanners
 */

const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

class SocialBanners {
  constructor() {
    this.templates = new Map();
    this.platforms = new Map();
    this.loadDefaultTemplates();
    this.loadPlatformSpecs();
  }

  /**
   * Carga las especificaciones de cada plataforma
   * @private
   */
  loadPlatformSpecs() {
    this.platforms.set('youtube', {
      name: 'YouTube',
      dimensions: {
        landscape: { width: 1920, height: 1080 },
        square: { width: 1080, height: 1080 },
        vertical: { width: 1080, height: 1920 }
      },
      safeZone: { top: 90, bottom: 90, left: 90, right: 90 },
      colors: {
        primary: '#FF0000',
        accent: '#FFFFFF'
      }
    });

    this.platforms.set('instagram', {
      name: 'Instagram',
      dimensions: {
        feed: { width: 1080, height: 1080 },
        story: { width: 1080, height: 1920 },
        reel: { width: 1080, height: 1920 }
      },
      safeZone: { top: 250, bottom: 250, left: 50, right: 50 },
      colors: {
        primary: '#E4405F',
        accent: '#FCAF45'
      }
    });

    this.platforms.set('tiktok', {
      name: 'TikTok',
      dimensions: {
        video: { width: 1080, height: 1920 }
      },
      safeZone: { top: 200, bottom: 300, left: 50, right: 50 },
      colors: {
        primary: '#000000',
        accent: '#FE2C55'
      }
    });

    this.platforms.set('twitter', {
      name: 'Twitter',
      dimensions: {
        landscape: { width: 1280, height: 720 },
        square: { width: 1200, height: 1200 }
      },
      safeZone: { top: 50, bottom: 50, left: 50, right: 50 },
      colors: {
        primary: '#1DA1F2',
        accent: '#FFFFFF'
      }
    });

    this.platforms.set('facebook', {
      name: 'Facebook',
      dimensions: {
        landscape: { width: 1920, height: 1080 },
        square: { width: 1080, height: 1080 }
      },
      safeZone: { top: 50, bottom: 50, left: 50, right: 50 },
      colors: {
        primary: '#1877F2',
        accent: '#FFFFFF'
      }
    });
  }

  /**
   * Carga las plantillas predeterminadas
   * @private
   */
  loadDefaultTemplates() {
    this.templates.set('subscribe-button', {
      name: 'Subscribe Button',
      type: 'cta',
      platform: 'youtube',
      elements: {
        text: 'SUBSCRIBE',
        icon: 'bell',
        animation: 'pulse'
      },
      style: {
        backgroundColor: '#FF0000',
        textColor: '#FFFFFF',
        fontSize: 36
      }
    });

    this.templates.set('follow-instagram', {
      name: 'Follow Instagram',
      type: 'cta',
      platform: 'instagram',
      elements: {
        text: 'Follow @username',
        icon: 'instagram',
        animation: 'slide-up'
      },
      style: {
        backgroundColor: '#E4405F',
        textColor: '#FFFFFF',
        fontSize: 32
      }
    });

    this.templates.set('like-share', {
      name: 'Like & Share',
      type: 'cta',
      platform: 'multi',
      elements: {
        text: 'Like & Share',
        icons: ['thumbs-up', 'share'],
        animation: 'bounce'
      },
      style: {
        backgroundColor: '#00d4ff',
        textColor: '#000000',
        fontSize: 34
      }
    });

    this.templates.set('end-screen-youtube', {
      name: 'YouTube End Screen',
      type: 'end-screen',
      platform: 'youtube',
      elements: {
        subscribe: true,
        videoThumbnails: 2,
        socialLinks: true
      },
      style: {
        layout: 'modern',
        backgroundColor: '#000000',
        accentColor: '#FF0000'
      }
    });

    this.templates.set('swipe-up', {
      name: 'Swipe Up',
      type: 'cta',
      platform: 'instagram',
      elements: {
        text: 'Swipe Up',
        icon: 'arrow-up',
        animation: 'continuous-bounce'
      },
      style: {
        backgroundColor: 'transparent',
        textColor: '#FFFFFF',
        fontSize: 28
      }
    });

    this.templates.set('link-in-bio', {
      name: 'Link in Bio',
      type: 'cta',
      platform: 'tiktok',
      elements: {
        text: 'Link in Bio',
        icon: 'link',
        animation: 'blink'
      },
      style: {
        backgroundColor: '#FE2C55',
        textColor: '#FFFFFF',
        fontSize: 30
      }
    });
  }

  /**
   * Obtiene todas las plantillas disponibles
   * @returns {Array} Array de plantillas
   */
  getTemplates() {
    return Array.from(this.templates.entries()).map(([id, template]) => ({
      id,
      ...template
    }));
  }

  /**
   * Obtiene plantillas por plataforma
   * @param {string} platform - Plataforma social
   * @returns {Array} Plantillas filtradas
   */
  getTemplatesByPlatform(platform) {
    return this.getTemplates().filter(
      template => template.platform === platform || template.platform === 'multi'
    );
  }

  /**
   * Obtiene las especificaciones de una plataforma
   * @param {string} platform - Nombre de la plataforma
   * @returns {Object} Especificaciones de la plataforma
   */
  getPlatformSpecs(platform) {
    if (!this.platforms.has(platform)) {
      throw new VideoEditorError(
        `Platform ${platform} not supported`,
        ErrorCodes.INVALID_INPUT
      );
    }
    return this.platforms.get(platform);
  }

  /**
   * Crea un banner social
   * @param {Object} config - Configuración del banner
   * @returns {Promise<Object>} Banner configurado
   */
  async createBanner(config) {
    const {
      templateId,
      platform,
      customText = null,
      customStyle = {},
      position = 'bottom-right',
      startTime = 0,
      duration = 5.0
    } = config;

    if (!templateId) {
      throw new VideoEditorError(
        'templateId is required',
        ErrorCodes.INVALID_INPUT
      );
    }

    if (!this.templates.has(templateId)) {
      throw new VideoEditorError(
        `Template ${templateId} not found`,
        ErrorCodes.INVALID_INPUT
      );
    }

    const template = this.templates.get(templateId);
    const platformSpecs = platform ? this.getPlatformSpecs(platform) : null;

    // Merge custom style with template style
    const style = { ...template.style, ...customStyle };

    // Override text if custom text provided
    const elements = { ...template.elements };
    if (customText) {
      elements.text = customText;
    }

    return {
      success: true,
      banner: {
        template: templateId,
        platform: platform || template.platform,
        elements,
        style,
        position,
        timing: {
          start: startTime,
          duration
        },
        platformSpecs
      },
      message: 'Social banner created successfully'
    };
  }

  /**
   * Crea un end screen completo
   * @param {Object} config - Configuración del end screen
   * @returns {Promise<Object>} End screen configurado
   */
  async createEndScreen(config) {
    const {
      platform = 'youtube',
      subscribeCTA = true,
      videoThumbnails = [],
      socialLinks = [],
      customBackground = null,
      duration = 10.0
    } = config;

    const platformSpecs = this.getPlatformSpecs(platform);

    return {
      success: true,
      endScreen: {
        platform,
        elements: {
          subscribeCTA,
          videoThumbnails: videoThumbnails.length > 0 ? videoThumbnails : [],
          socialLinks
        },
        background: customBackground || '#000000',
        duration,
        dimensions: platformSpecs.dimensions
      },
      message: 'End screen created successfully'
    };
  }

  /**
   * Aplica un banner a un video
   * @param {string} inputPath - Ruta del video de entrada
   * @param {string} outputPath - Ruta del video de salida
   * @param {Object} bannerConfig - Configuración del banner
   * @returns {Promise<Object>} Resultado de la operación
   */
  async applyToVideo(inputPath, outputPath, bannerConfig) {
    const banner = await this.createBanner(bannerConfig);

    // Aquí se implementaría la integración con FFmpeg
    return {
      success: true,
      input: inputPath,
      output: outputPath,
      banner: banner.banner,
      message: 'Social banner ready to apply (FFmpeg integration pending)'
    };
  }

  /**
   * Obtiene las plataformas soportadas
   * @returns {Array} Array de plataformas
   */
  getSupportedPlatforms() {
    return Array.from(this.platforms.entries()).map(([id, platform]) => ({
      id,
      name: platform.name,
      dimensions: platform.dimensions
    }));
  }

  /**
   * Registra una nueva plantilla
   * @param {string} templateId - ID de la plantilla
   * @param {Object} template - Definición de la plantilla
   */
  registerTemplate(templateId, template) {
    if (this.templates.has(templateId)) {
      throw new VideoEditorError(
        `Template ${templateId} already exists`,
        ErrorCodes.INVALID_INPUT
      );
    }

    if (!template.name || !template.type) {
      throw new VideoEditorError(
        'Template must have name and type',
        ErrorCodes.INVALID_INPUT
      );
    }

    this.templates.set(templateId, template);
  }
}

module.exports = SocialBanners;
