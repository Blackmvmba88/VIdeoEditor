/**
 * BlackMamba Studio - Animated Titles
 * 
 * Sistema de títulos animados profesionales para intros, outros y títulos
 * de sección.
 * 
 * Características:
 * - Biblioteca de animaciones de texto prediseñadas
 * - Estilos cinematográficos y modernos
 * - Soporte para múltiples capas de texto
 * - Efectos de partículas y transiciones
 * - Presets optimizados para redes sociales
 * 
 * @module AnimatedTitles
 */

const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

class AnimatedTitles {
  constructor() {
    this.animations = new Map();
    this.loadDefaultAnimations();
  }

  /**
   * Carga las animaciones predeterminadas
   * @private
   */
  loadDefaultAnimations() {
    this.animations.set('typewriter', {
      name: 'Typewriter',
      category: 'text',
      duration: 2,
      style: {
        effect: 'character-by-character',
        speed: 'medium',
        sound: true
      }
    });

    this.animations.set('glitch', {
      name: 'Glitch',
      category: 'modern',
      duration: 1.5,
      style: {
        effect: 'digital-glitch',
        intensity: 'high',
        colorSeparation: true
      }
    });

    this.animations.set('cinematic-reveal', {
      name: 'Cinematic Reveal',
      category: 'cinematic',
      duration: 3,
      style: {
        effect: 'wipe-reveal',
        direction: 'horizontal',
        blur: true
      }
    });

    this.animations.set('neon-glow', {
      name: 'Neon Glow',
      category: 'modern',
      duration: 2,
      style: {
        effect: 'glow-pulse',
        color: '#00d4ff',
        intensity: 'high'
      }
    });

    this.animations.set('particle-burst', {
      name: 'Particle Burst',
      category: 'effects',
      duration: 2.5,
      style: {
        effect: 'particles',
        count: 100,
        behavior: 'burst'
      }
    });

    this.animations.set('3d-rotate', {
      name: '3D Rotate',
      category: '3d',
      duration: 2,
      style: {
        effect: '3d-transform',
        axis: 'y',
        rotation: 360
      }
    });

    this.animations.set('bounce', {
      name: 'Bounce',
      category: 'playful',
      duration: 1.5,
      style: {
        effect: 'bounce',
        iterations: 3,
        elasticity: 'high'
      }
    });

    this.animations.set('fade-scale', {
      name: 'Fade & Scale',
      category: 'classic',
      duration: 1.5,
      style: {
        effect: 'fade-scale',
        scale: { from: 0.5, to: 1 },
        easing: 'ease-out'
      }
    });
  }

  /**
   * Obtiene todas las animaciones disponibles
   * @returns {Array} Array de animaciones
   */
  getAnimations() {
    return Array.from(this.animations.entries()).map(([id, animation]) => ({
      id,
      ...animation
    }));
  }

  /**
   * Obtiene animaciones por categoría
   * @param {string} category - Categoría de animación
   * @returns {Array} Animaciones filtradas
   */
  getAnimationsByCategory(category) {
    return this.getAnimations().filter(anim => anim.category === category);
  }

  /**
   * Obtiene una animación específica
   * @param {string} animationId - ID de la animación
   * @returns {Object} Animación solicitada
   */
  getAnimation(animationId) {
    if (!this.animations.has(animationId)) {
      throw new VideoEditorError(
        `Animation ${animationId} not found`,
        ErrorCodes.INVALID_INPUT
      );
    }
    return this.animations.get(animationId);
  }

  /**
   * Crea un título animado
   * @param {Object} config - Configuración del título
   * @returns {Promise<Object>} Título animado configurado
   */
  async createTitle(config) {
    const {
      text,
      animationId = 'fade-scale',
      fontSize = 72,
      fontFamily = 'Arial',
      color = '#ffffff',
      backgroundColor = 'transparent',
      position = 'center',
      duration = 5,
      startTime = 0
    } = config;

    if (!text) {
      throw new VideoEditorError(
        'Text is required for animated title',
        ErrorCodes.INVALID_INPUT
      );
    }

    const animation = this.getAnimation(animationId);

    return {
      success: true,
      title: {
        text,
        animation: {
          id: animationId,
          ...animation
        },
        style: {
          fontSize,
          fontFamily,
          color,
          backgroundColor
        },
        position,
        timing: {
          start: startTime,
          duration: duration
        }
      },
      message: 'Animated title created successfully'
    };
  }

  /**
   * Crea un título con múltiples líneas
   * @param {Object} config - Configuración del título multilínea
   * @returns {Promise<Object>} Título multilínea configurado
   */
  async createMultilineTitle(config) {
    const {
      lines = [],
      animationId = 'fade-scale',
      stagger = 0.3,
      ...otherConfig
    } = config;

    if (lines.length === 0) {
      throw new VideoEditorError(
        'At least one line is required',
        ErrorCodes.INVALID_INPUT
      );
    }

    const titleLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const lineConfig = {
        text: lines[i],
        animationId,
        startTime: (otherConfig.startTime || 0) + (i * stagger),
        ...otherConfig
      };
      
      const title = await this.createTitle(lineConfig);
      titleLines.push(title.title);
    }

    return {
      success: true,
      multilineTitle: {
        lines: titleLines,
        stagger,
        totalDuration: (otherConfig.duration || 5) + (lines.length * stagger)
      },
      message: 'Multiline title created successfully'
    };
  }

  /**
   * Aplica un título animado a un video
   * @param {string} inputPath - Ruta del video de entrada
   * @param {string} outputPath - Ruta del video de salida
   * @param {Object} titleConfig - Configuración del título
   * @returns {Promise<Object>} Resultado de la operación
   */
  async applyToVideo(inputPath, outputPath, titleConfig) {
    const title = await this.createTitle(titleConfig);

    // Aquí se implementaría la integración con FFmpeg
    return {
      success: true,
      input: inputPath,
      output: outputPath,
      title: title.title,
      message: 'Animated title ready to apply (FFmpeg integration pending)'
    };
  }

  /**
   * Obtiene las categorías de animaciones disponibles
   * @returns {Array} Categorías
   */
  getCategories() {
    const categories = new Set();
    for (const animation of this.animations.values()) {
      if (animation.category) {
        categories.add(animation.category);
      }
    }
    return Array.from(categories);
  }

  /**
   * Registra una nueva animación personalizada
   * @param {string} animationId - ID de la animación
   * @param {Object} animation - Definición de la animación
   */
  registerAnimation(animationId, animation) {
    if (this.animations.has(animationId)) {
      throw new VideoEditorError(
        `Animation ${animationId} already exists`,
        ErrorCodes.INVALID_INPUT
      );
    }

    if (!animation.name || !animation.category) {
      throw new VideoEditorError(
        'Animation must have name and category',
        ErrorCodes.INVALID_INPUT
      );
    }

    this.animations.set(animationId, animation);
  }
}

module.exports = AnimatedTitles;
