/**
 * BlackMamba Studio - Emojis & Callouts
 * 
 * Sistema de emojis animados y callouts para hacer videos más expresivos
 * y engagement-friendly.
 * 
 * Características:
 * - Biblioteca de emojis animados
 * - Callouts (flechas, círculos, resaltados)
 * - Stickers y reacciones
 * - Animaciones de entrada/salida
 * - Presets para redes sociales (TikTok, Instagram, YouTube)
 * 
 * @module EmojisCallouts
 */

const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

class EmojisCallouts {
  constructor() {
    this.emojis = new Map();
    this.callouts = new Map();
    this.loadDefaultLibrary();
  }

  /**
   * Carga la biblioteca predeterminada de emojis y callouts
   * @private
   */
  loadDefaultLibrary() {
    // Emojis populares
    const popularEmojis = [
      { id: 'fire', emoji: '🔥', name: 'Fire', category: 'reaction' },
      { id: 'heart', emoji: '❤️', name: 'Heart', category: 'emotion' },
      { id: 'laugh', emoji: '😂', name: 'Laughing', category: 'emotion' },
      { id: 'shocked', emoji: '😱', name: 'Shocked', category: 'emotion' },
      { id: 'thinking', emoji: '🤔', name: 'Thinking', category: 'emotion' },
      { id: 'star', emoji: '⭐', name: 'Star', category: 'reaction' },
      { id: 'clap', emoji: '👏', name: 'Clapping', category: 'reaction' },
      { id: 'rocket', emoji: '🚀', name: 'Rocket', category: 'action' },
      { id: 'money', emoji: '💰', name: 'Money', category: 'business' },
      { id: 'check', emoji: '✅', name: 'Check', category: 'status' },
      { id: 'warning', emoji: '⚠️', name: 'Warning', category: 'status' },
      { id: 'lightbulb', emoji: '💡', name: 'Idea', category: 'action' }
    ];

    for (const { id, emoji, name, category } of popularEmojis) {
      this.emojis.set(id, {
        emoji,
        name,
        category,
        animations: ['pop', 'bounce', 'pulse', 'spin', 'shake']
      });
    }

    // Callouts
    this.callouts.set('arrow-right', {
      name: 'Arrow Right',
      type: 'arrow',
      direction: 'right',
      style: 'solid',
      color: '#ff4757',
      animation: 'slide-in'
    });

    this.callouts.set('arrow-down', {
      name: 'Arrow Down',
      type: 'arrow',
      direction: 'down',
      style: 'solid',
      color: '#ff4757',
      animation: 'drop-in'
    });

    this.callouts.set('circle', {
      name: 'Circle',
      type: 'shape',
      shape: 'circle',
      style: 'stroke',
      color: '#00d4ff',
      animation: 'draw'
    });

    this.callouts.set('rectangle', {
      name: 'Rectangle',
      type: 'shape',
      shape: 'rectangle',
      style: 'stroke',
      color: '#00d4ff',
      animation: 'draw'
    });

    this.callouts.set('underline', {
      name: 'Underline',
      type: 'highlight',
      style: 'line',
      color: '#feca57',
      animation: 'draw-line'
    });

    this.callouts.set('highlight', {
      name: 'Highlight',
      type: 'highlight',
      style: 'fill',
      color: '#feca57',
      opacity: 0.5,
      animation: 'fade-in'
    });

    this.callouts.set('text-box', {
      name: 'Text Box',
      type: 'container',
      style: 'rounded',
      backgroundColor: '#000000',
      borderColor: '#00d4ff',
      animation: 'expand'
    });
  }

  /**
   * Obtiene todos los emojis disponibles
   * @returns {Array} Array de emojis
   */
  getEmojis() {
    return Array.from(this.emojis.entries()).map(([id, emoji]) => ({
      id,
      ...emoji
    }));
  }

  /**
   * Obtiene emojis por categoría
   * @param {string} category - Categoría de emoji
   * @returns {Array} Emojis filtrados
   */
  getEmojisByCategory(category) {
    return this.getEmojis().filter(emoji => emoji.category === category);
  }

  /**
   * Obtiene todos los callouts disponibles
   * @returns {Array} Array de callouts
   */
  getCallouts() {
    return Array.from(this.callouts.entries()).map(([id, callout]) => ({
      id,
      ...callout
    }));
  }

  /**
   * Agrega un emoji animado al video
   * @param {Object} config - Configuración del emoji
   * @returns {Promise<Object>} Emoji configurado
   */
  async addEmoji(config) {
    const {
      emojiId,
      position = { x: '50%', y: '50%' },
      size = 100,
      animation = 'pop',
      startTime = 0,
      duration = 2,
      customEmoji = null
    } = config;

    let emojiData;
    
    if (customEmoji) {
      emojiData = { emoji: customEmoji, name: 'Custom', category: 'custom' };
    } else if (emojiId) {
      if (!this.emojis.has(emojiId)) {
        throw new VideoEditorError(
          `Emoji ${emojiId} not found`,
          ErrorCodes.INVALID_INPUT
        );
      }
      emojiData = this.emojis.get(emojiId);
    } else {
      throw new VideoEditorError(
        'Either emojiId or customEmoji must be provided',
        ErrorCodes.INVALID_INPUT
      );
    }

    return {
      success: true,
      emoji: {
        ...emojiData,
        position,
        size,
        animation,
        timing: {
          start: startTime,
          duration
        }
      },
      message: 'Emoji added successfully'
    };
  }

  /**
   * Agrega un callout al video
   * @param {Object} config - Configuración del callout
   * @returns {Promise<Object>} Callout configurado
   */
  async addCallout(config) {
    const {
      calloutId,
      position,
      size = { width: 200, height: 100 },
      startTime = 0,
      duration = 3,
      customColor = null
    } = config;

    if (!calloutId) {
      throw new VideoEditorError(
        'calloutId is required',
        ErrorCodes.INVALID_INPUT
      );
    }

    if (!this.callouts.has(calloutId)) {
      throw new VideoEditorError(
        `Callout ${calloutId} not found`,
        ErrorCodes.INVALID_INPUT
      );
    }

    const callout = this.callouts.get(calloutId);
    const color = customColor || callout.color;

    return {
      success: true,
      callout: {
        ...callout,
        position,
        size,
        color,
        timing: {
          start: startTime,
          duration
        }
      },
      message: 'Callout added successfully'
    };
  }

  /**
   * Crea una secuencia de emojis (para reacciones múltiples)
   * @param {Array} configs - Array de configuraciones de emojis
   * @returns {Promise<Object>} Secuencia de emojis
   */
  async createEmojiSequence(configs) {
    const emojis = [];
    
    for (const config of configs) {
      try {
        const emoji = await this.addEmoji(config);
        emojis.push(emoji.emoji);
      } catch (error) {
        emojis.push({
          error: error.message,
          config
        });
      }
    }

    return {
      success: true,
      sequence: emojis,
      count: emojis.length,
      message: 'Emoji sequence created successfully'
    };
  }

  /**
   * Aplica emojis y callouts a un video
   * @param {string} inputPath - Ruta del video de entrada
   * @param {string} outputPath - Ruta del video de salida
   * @param {Object} elements - Emojis y callouts a aplicar
   * @returns {Promise<Object>} Resultado de la operación
   */
  async applyToVideo(inputPath, outputPath, elements) {
    const { emojis = [], callouts = [] } = elements;

    // Aquí se implementaría la integración con FFmpeg
    return {
      success: true,
      input: inputPath,
      output: outputPath,
      applied: {
        emojis: emojis.length,
        callouts: callouts.length
      },
      message: 'Elements ready to apply (FFmpeg integration pending)'
    };
  }

  /**
   * Obtiene categorías de emojis
   * @returns {Array} Categorías
   */
  getEmojiCategories() {
    const categories = new Set();
    for (const emoji of this.emojis.values()) {
      if (emoji.category) {
        categories.add(emoji.category);
      }
    }
    return Array.from(categories);
  }

  /**
   * Registra un nuevo callout personalizado
   * @param {string} calloutId - ID del callout
   * @param {Object} callout - Definición del callout
   */
  registerCallout(calloutId, callout) {
    if (this.callouts.has(calloutId)) {
      throw new VideoEditorError(
        `Callout ${calloutId} already exists`,
        ErrorCodes.INVALID_INPUT
      );
    }

    this.callouts.set(calloutId, callout);
  }
}

module.exports = EmojisCallouts;
