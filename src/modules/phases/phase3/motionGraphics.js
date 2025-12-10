/**
 * BlackMamba Studio - Motion Graphics System
 * 
 * Sistema central de motion graphics que proporciona plantillas y animaciones
 * profesionales tipo Canva para video.
 * 
 * Características:
 * - Gestión de plantillas de motion graphics
 * - Sistema de renderizado de animaciones
 * - Presets configurables
 * - Integración con FFmpeg para overlay
 * - Soporte para diferentes formatos de salida
 * 
 * @module MotionGraphics
 */

const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

class MotionGraphics {
  constructor() {
    this.templates = new Map();
    this.loadDefaultTemplates();
  }

  /**
   * Carga las plantillas predeterminadas de motion graphics
   * @private
   */
  loadDefaultTemplates() {
    // Plantillas básicas que se incluirán
    this.templates.set('fade-in', {
      name: 'Fade In',
      type: 'transition',
      duration: 1,
      parameters: {
        easing: 'ease-in'
      }
    });

    this.templates.set('slide-in', {
      name: 'Slide In',
      type: 'transition',
      duration: 0.8,
      parameters: {
        direction: 'left',
        easing: 'ease-out'
      }
    });

    this.templates.set('zoom-in', {
      name: 'Zoom In',
      type: 'transition',
      duration: 1,
      parameters: {
        scale: { from: 0.5, to: 1 },
        easing: 'ease-in-out'
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
   * Obtiene una plantilla específica por ID
   * @param {string} templateId - ID de la plantilla
   * @returns {Object} Plantilla solicitada
   */
  getTemplate(templateId) {
    if (!this.templates.has(templateId)) {
      throw new VideoEditorError(
        `Template ${templateId} not found`,
        ErrorCodes.INVALID_INPUT
      );
    }
    return this.templates.get(templateId);
  }

  /**
   * Registra una nueva plantilla personalizada
   * @param {string} templateId - ID único para la plantilla
   * @param {Object} template - Definición de la plantilla
   */
  registerTemplate(templateId, template) {
    if (this.templates.has(templateId)) {
      throw new VideoEditorError(
        `Template ${templateId} already exists`,
        ErrorCodes.INVALID_INPUT
      );
    }

    // Validar estructura de la plantilla
    if (!template.name || !template.type) {
      throw new VideoEditorError(
        'Template must have name and type',
        ErrorCodes.INVALID_INPUT
      );
    }

    this.templates.set(templateId, template);
  }

  /**
   * Aplica una plantilla de motion graphics a un video
   * @param {string} inputPath - Ruta del video de entrada
   * @param {string} outputPath - Ruta del video de salida
   * @param {string} templateId - ID de la plantilla a aplicar
   * @param {Object} options - Opciones de configuración
   * @returns {Promise<Object>} Resultado de la operación
   */
  async applyTemplate(inputPath, outputPath, templateId, options = {}) {
    const template = this.getTemplate(templateId);

    // Aquí se implementaría la lógica de aplicación usando FFmpeg
    // Por ahora retornamos la configuración que se usaría
    return {
      success: true,
      template: template,
      input: inputPath,
      output: outputPath,
      options: options,
      message: 'Template configuration ready (FFmpeg integration pending)'
    };
  }

  /**
   * Crea un overlay de motion graphics personalizado
   * @param {Object} config - Configuración del overlay
   * @returns {Promise<Object>} Overlay generado
   */
  async createCustomOverlay(config) {
    // Validar configuración
    if (!config.width || !config.height) {
      throw new VideoEditorError(
        'Width and height are required',
        ErrorCodes.INVALID_INPUT
      );
    }

    return {
      success: true,
      overlay: {
        width: config.width,
        height: config.height,
        elements: config.elements || [],
        duration: config.duration || 5
      },
      message: 'Custom overlay created successfully'
    };
  }

  /**
   * Obtiene las categorías de plantillas disponibles
   * @returns {Array} Categorías de plantillas
   */
  getCategories() {
    const categories = new Set();
    this.templates.forEach(template => {
      if (template.type) {
        categories.add(template.type);
      }
    });
    return Array.from(categories);
  }

  /**
   * Filtra plantillas por categoría
   * @param {string} category - Categoría a filtrar
   * @returns {Array} Plantillas filtradas
   */
  getTemplatesByCategory(category) {
    return this.getTemplates().filter(template => template.type === category);
  }
}

module.exports = MotionGraphics;
