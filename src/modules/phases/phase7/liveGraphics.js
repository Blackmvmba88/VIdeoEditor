/**
 * @module LiveGraphics
 * @description Sistema de gráficos en vivo para BlackMamba Studio
 * Overlays en tiempo real, lower thirds, alertas, tickers
 * @version 7.1.0
 */

const { v4: uuidv4 } = require('uuid');

class LiveGraphics {
  constructor(options = {}) {
    this.options = {
      defaultDuration: options.defaultDuration || 5000,
      defaultTransition: options.defaultTransition || 'fade',
      transitionDuration: options.transitionDuration || 500,
      maxActiveGraphics: options.maxActiveGraphics || 10,
      ...options
    };
    
    // Gráficos
    this.graphics = new Map();
    this.activeGraphics = new Map();
    this.templates = new Map();
    this.scenes = new Map();
    
    // Cola de alertas
    this.alertQueue = [];
    this.processingAlerts = false;
    
    // Templates predefinidos
    this._initializeTemplates();
    
    // Transiciones disponibles
    this.transitions = ['none', 'fade', 'slide_left', 'slide_right', 'slide_up', 'slide_down', 'zoom', 'wipe'];
  }
  
  /**
   * Inicializar templates predefinidos
   * @private
   */
  _initializeTemplates() {
    // Lower Thirds
    this.templates.set('lower_third_simple', {
      id: 'lower_third_simple',
      name: 'Lower Third Simple',
      category: 'lower_third',
      fields: [
        { name: 'title', type: 'text', default: 'Nombre' },
        { name: 'subtitle', type: 'text', default: 'Cargo o título' }
      ],
      style: {
        position: { x: 50, y: 'bottom', offsetY: 100 },
        size: { width: 400, height: 80 },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textColor: '#ffffff',
        accentColor: '#6366f1',
        animation: 'slide_left'
      },
      duration: 5000
    });
    
    this.templates.set('lower_third_modern', {
      id: 'lower_third_modern',
      name: 'Lower Third Moderno',
      category: 'lower_third',
      fields: [
        { name: 'name', type: 'text', default: 'Nombre' },
        { name: 'title', type: 'text', default: 'Título' },
        { name: 'company', type: 'text', default: 'Empresa' }
      ],
      style: {
        position: { x: 50, y: 'bottom', offsetY: 120 },
        size: { width: 450, height: 100 },
        backgroundColor: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
        textColor: '#ffffff',
        animation: 'slide_up'
      },
      duration: 6000
    });
    
    // Alertas
    this.templates.set('alert_follower', {
      id: 'alert_follower',
      name: 'Alerta Nuevo Seguidor',
      category: 'alert',
      fields: [
        { name: 'username', type: 'text', default: 'Usuario' }
      ],
      style: {
        position: { x: 'center', y: 'top', offsetY: 50 },
        size: { width: 350, height: 60 },
        backgroundColor: '#10b981',
        textColor: '#ffffff',
        icon: '🎉',
        animation: 'zoom'
      },
      duration: 4000,
      sound: '/assets/sounds/alert_follow.mp3'
    });
    
    this.templates.set('alert_donation', {
      id: 'alert_donation',
      name: 'Alerta Donación',
      category: 'alert',
      fields: [
        { name: 'username', type: 'text', default: 'Usuario' },
        { name: 'amount', type: 'number', default: 5 },
        { name: 'message', type: 'text', default: '' }
      ],
      style: {
        position: { x: 'center', y: 'center' },
        size: { width: 400, height: 150 },
        backgroundColor: '#f59e0b',
        textColor: '#ffffff',
        icon: '💰',
        animation: 'zoom'
      },
      duration: 8000,
      sound: '/assets/sounds/alert_donation.mp3'
    });
    
    // Tickers
    this.templates.set('ticker_news', {
      id: 'ticker_news',
      name: 'Ticker Noticias',
      category: 'ticker',
      fields: [
        { name: 'items', type: 'array', default: [] }
      ],
      style: {
        position: { x: 0, y: 'bottom', offsetY: 0 },
        size: { width: '100%', height: 40 },
        backgroundColor: '#1e293b',
        textColor: '#ffffff',
        speed: 50, // px/s
        separator: '  •  '
      },
      duration: null // Continuo
    });
    
    // Banners
    this.templates.set('banner_social', {
      id: 'banner_social',
      name: 'Banner Redes Sociales',
      category: 'banner',
      fields: [
        { name: 'platform', type: 'select', options: ['twitter', 'instagram', 'youtube', 'tiktok'], default: 'twitter' },
        { name: 'username', type: 'text', default: '@usuario' }
      ],
      style: {
        position: { x: 'right', y: 'bottom', offsetX: 20, offsetY: 80 },
        size: { width: 250, height: 50 },
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        textColor: '#ffffff',
        animation: 'slide_right'
      },
      duration: null // Persistente
    });
    
    // Countdown
    this.templates.set('countdown_timer', {
      id: 'countdown_timer',
      name: 'Cuenta Regresiva',
      category: 'utility',
      fields: [
        { name: 'minutes', type: 'number', default: 5 },
        { name: 'message', type: 'text', default: 'Comenzamos en...' }
      ],
      style: {
        position: { x: 'center', y: 'center' },
        size: { width: 300, height: 150 },
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        textColor: '#ffffff',
        fontSize: 72,
        animation: 'fade'
      },
      duration: null // Hasta que termine
    });
    
    // Logo overlay
    this.templates.set('logo_corner', {
      id: 'logo_corner',
      name: 'Logo Esquina',
      category: 'branding',
      fields: [
        { name: 'logoUrl', type: 'image', default: '/assets/logo.png' }
      ],
      style: {
        position: { x: 'right', y: 'top', offsetX: 20, offsetY: 20 },
        size: { width: 100, height: 100 },
        opacity: 0.8,
        animation: 'fade'
      },
      duration: null // Persistente
    });
  }
  
  /**
   * Crear gráfico desde template
   * @param {string} templateId - ID del template
   * @param {Object} data - Datos del gráfico
   * @returns {Object} Gráfico creado
   */
  async createGraphic(templateId, data = {}) {
    const template = this.templates.get(templateId);
    if (!template) {
      return { success: false, error: 'Template no encontrado' };
    }
    
    const graphicId = uuidv4();
    
    // Combinar datos con defaults del template
    const fieldValues = {};
    for (const field of template.fields) {
      fieldValues[field.name] = data[field.name] !== undefined 
        ? data[field.name] 
        : field.default;
    }
    
    const graphic = {
      id: graphicId,
      templateId,
      templateName: template.name,
      category: template.category,
      
      // Datos
      data: fieldValues,
      
      // Estilo (permite override)
      style: {
        ...template.style,
        ...(data.style || {})
      },
      
      // Configuración
      duration: data.duration !== undefined ? data.duration : template.duration,
      transition: data.transition || template.style?.animation || this.options.defaultTransition,
      transitionDuration: data.transitionDuration || this.options.transitionDuration,
      
      // Estado
      visible: false,
      active: false,
      
      // Timestamps
      createdAt: new Date().toISOString(),
      showAt: null,
      hideAt: null
    };
    
    this.graphics.set(graphicId, graphic);
    
    return {
      success: true,
      graphicId,
      graphic,
      message: 'Gráfico creado'
    };
  }
  
  /**
   * Mostrar gráfico
   * @param {string} graphicId - ID del gráfico
   * @param {Object} options - Opciones
   * @returns {Object} Resultado
   */
  async showGraphic(graphicId, options = {}) {
    const graphic = this.graphics.get(graphicId);
    if (!graphic) {
      return { success: false, error: 'Gráfico no encontrado' };
    }
    
    if (this.activeGraphics.size >= this.options.maxActiveGraphics) {
      return { success: false, error: 'Límite de gráficos activos alcanzado' };
    }
    
    const { transition, transitionDuration, autoHide = true } = options;
    
    graphic.visible = true;
    graphic.active = true;
    graphic.showAt = new Date().toISOString();
    graphic.transition = transition || graphic.transition;
    graphic.transitionDuration = transitionDuration || graphic.transitionDuration;
    
    this.activeGraphics.set(graphicId, graphic);
    
    // Auto-hide si tiene duración
    if (autoHide && graphic.duration) {
      setTimeout(() => {
        this.hideGraphic(graphicId);
      }, graphic.duration);
    }
    
    return {
      success: true,
      graphicId,
      visible: true,
      duration: graphic.duration,
      message: 'Gráfico mostrado'
    };
  }
  
  /**
   * Ocultar gráfico
   * @param {string} graphicId - ID del gráfico
   * @param {Object} options - Opciones
   * @returns {Object} Resultado
   */
  async hideGraphic(graphicId, options = {}) {
    const graphic = this.graphics.get(graphicId);
    if (!graphic) {
      return { success: false, error: 'Gráfico no encontrado' };
    }
    
    graphic.visible = false;
    graphic.active = false;
    graphic.hideAt = new Date().toISOString();
    
    this.activeGraphics.delete(graphicId);
    
    return {
      success: true,
      graphicId,
      visible: false,
      message: 'Gráfico ocultado'
    };
  }
  
  /**
   * Actualizar datos del gráfico
   * @param {string} graphicId - ID del gráfico
   * @param {Object} data - Nuevos datos
   * @returns {Object} Resultado
   */
  async updateGraphic(graphicId, data) {
    const graphic = this.graphics.get(graphicId);
    if (!graphic) {
      return { success: false, error: 'Gráfico no encontrado' };
    }
    
    // Actualizar datos
    graphic.data = { ...graphic.data, ...data };
    
    // Actualizar estilo si se proporciona
    if (data.style) {
      graphic.style = { ...graphic.style, ...data.style };
    }
    
    return {
      success: true,
      graphicId,
      data: graphic.data,
      message: 'Gráfico actualizado'
    };
  }
  
  /**
   * Mostrar lower third
   * @param {Object} config - Configuración
   * @returns {Object} Resultado
   */
  async showLowerThird(config) {
    const {
      template = 'lower_third_simple',
      title,
      subtitle,
      name,
      company,
      duration = 5000
    } = config;
    
    const result = await this.createGraphic(template, {
      title,
      subtitle,
      name,
      company,
      duration
    });
    
    if (!result.success) return result;
    
    return this.showGraphic(result.graphicId);
  }
  
  /**
   * Mostrar alerta
   * @param {Object} alertConfig - Configuración de alerta
   * @returns {Object} Resultado
   */
  async showAlert(alertConfig) {
    const {
      type = 'follower', // follower, donation, subscription, custom
      username,
      amount,
      message,
      priority = 'normal',
      skipQueue = false
    } = alertConfig;
    
    const templateId = `alert_${type}`;
    const template = this.templates.get(templateId) || this.templates.get('alert_follower');
    
    const alertId = uuidv4();
    const alert = {
      id: alertId,
      type,
      data: { username, amount, message },
      template: template.id,
      priority,
      createdAt: new Date().toISOString()
    };
    
    if (skipQueue) {
      // Mostrar inmediatamente
      const result = await this.createGraphic(template.id, alert.data);
      if (result.success) {
        await this.showGraphic(result.graphicId);
      }
      return { success: true, alertId, queued: false, shown: true };
    }
    
    // Agregar a cola
    if (priority === 'high') {
      this.alertQueue.unshift(alert);
    } else {
      this.alertQueue.push(alert);
    }
    
    // Procesar cola si no está procesando
    if (!this.processingAlerts) {
      this._processAlertQueue();
    }
    
    return {
      success: true,
      alertId,
      queued: true,
      position: this.alertQueue.findIndex(a => a.id === alertId) + 1,
      message: 'Alerta agregada a la cola'
    };
  }
  
  /**
   * Crear ticker
   * @param {Object} config - Configuración del ticker
   * @returns {Object} Ticker creado
   */
  async createTicker(config) {
    const {
      items = [],
      speed = 50,
      separator = '  •  ',
      backgroundColor,
      textColor
    } = config;
    
    const result = await this.createGraphic('ticker_news', {
      items,
      style: {
        speed,
        separator,
        backgroundColor,
        textColor
      },
      duration: null // Continuo
    });
    
    return result;
  }
  
  /**
   * Actualizar ticker
   * @param {string} tickerId - ID del ticker
   * @param {Array} items - Nuevos items
   * @returns {Object} Resultado
   */
  async updateTicker(tickerId, items) {
    return this.updateGraphic(tickerId, { items });
  }
  
  /**
   * Crear countdown
   * @param {Object} config - Configuración
   * @returns {Object} Countdown creado
   */
  async createCountdown(config) {
    const {
      minutes = 5,
      message = 'Comenzamos en...',
      onComplete = null
    } = config;
    
    const result = await this.createGraphic('countdown_timer', {
      minutes,
      message
    });
    
    if (!result.success) return result;
    
    const graphic = this.graphics.get(result.graphicId);
    graphic.countdown = {
      endTime: new Date(Date.now() + minutes * 60 * 1000),
      onComplete
    };
    
    return {
      ...result,
      endTime: graphic.countdown.endTime
    };
  }
  
  /**
   * Crear escena de gráficos
   * @param {Object} sceneConfig - Configuración de escena
   * @returns {Object} Escena creada
   */
  async createScene(sceneConfig) {
    const {
      name,
      graphicIds = [],
      autoShow = false
    } = sceneConfig;
    
    const sceneId = uuidv4();
    const scene = {
      id: sceneId,
      name: name || `Escena ${this.scenes.size + 1}`,
      graphics: graphicIds,
      active: false,
      createdAt: new Date().toISOString()
    };
    
    this.scenes.set(sceneId, scene);
    
    if (autoShow) {
      await this.activateScene(sceneId);
    }
    
    return {
      success: true,
      sceneId,
      scene,
      message: 'Escena de gráficos creada'
    };
  }
  
  /**
   * Activar escena
   * @param {string} sceneId - ID de escena
   * @returns {Object} Resultado
   */
  async activateScene(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      return { success: false, error: 'Escena no encontrada' };
    }
    
    // Desactivar otras escenas
    for (const [, s] of this.scenes) {
      if (s.active) {
        await this.deactivateScene(s.id);
      }
    }
    
    // Mostrar gráficos de esta escena
    const results = [];
    for (const graphicId of scene.graphics) {
      const result = await this.showGraphic(graphicId, { autoHide: false });
      results.push({ graphicId, success: result.success });
    }
    
    scene.active = true;
    
    return {
      success: true,
      sceneId,
      graphicsShown: results.filter(r => r.success).length,
      message: `Escena "${scene.name}" activada`
    };
  }
  
  /**
   * Desactivar escena
   * @param {string} sceneId - ID de escena
   * @returns {Object} Resultado
   */
  async deactivateScene(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      return { success: false, error: 'Escena no encontrada' };
    }
    
    // Ocultar gráficos de esta escena
    for (const graphicId of scene.graphics) {
      await this.hideGraphic(graphicId);
    }
    
    scene.active = false;
    
    return {
      success: true,
      sceneId,
      message: `Escena "${scene.name}" desactivada`
    };
  }
  
  /**
   * Listar templates
   * @param {Object} options - Opciones
   * @returns {Object} Templates
   */
  listTemplates(options = {}) {
    const { category = null } = options;
    
    let templates = [...this.templates.values()];
    
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    
    return {
      success: true,
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        fields: t.fields,
        duration: t.duration
      })),
      total: templates.length,
      categories: ['lower_third', 'alert', 'ticker', 'banner', 'utility', 'branding']
    };
  }
  
  /**
   * Listar gráficos activos
   * @returns {Object} Gráficos activos
   */
  listActiveGraphics() {
    const graphics = [...this.activeGraphics.values()].map(g => ({
      id: g.id,
      templateName: g.templateName,
      category: g.category,
      data: g.data,
      showAt: g.showAt,
      duration: g.duration
    }));
    
    return {
      success: true,
      graphics,
      total: graphics.length
    };
  }
  
  /**
   * Ocultar todos los gráficos
   * @returns {Object} Resultado
   */
  async hideAll() {
    const graphicIds = [...this.activeGraphics.keys()];
    
    for (const id of graphicIds) {
      await this.hideGraphic(id);
    }
    
    return {
      success: true,
      hidden: graphicIds.length,
      message: 'Todos los gráficos ocultados'
    };
  }
  
  /**
   * Eliminar gráfico
   * @param {string} graphicId - ID del gráfico
   * @returns {Object} Resultado
   */
  async deleteGraphic(graphicId) {
    const graphic = this.graphics.get(graphicId);
    if (!graphic) {
      return { success: false, error: 'Gráfico no encontrado' };
    }
    
    // Ocultar primero si está activo
    if (graphic.active) {
      await this.hideGraphic(graphicId);
    }
    
    this.graphics.delete(graphicId);
    
    return {
      success: true,
      graphicId,
      message: 'Gráfico eliminado'
    };
  }
  
  /**
   * Obtener transiciones disponibles
   * @returns {Object} Transiciones
   */
  getTransitions() {
    return {
      success: true,
      transitions: this.transitions
    };
  }
  
  // Métodos privados
  
  async _processAlertQueue() {
    if (this.alertQueue.length === 0) {
      this.processingAlerts = false;
      return;
    }
    
    this.processingAlerts = true;
    const alert = this.alertQueue.shift();
    
    // Crear y mostrar alerta
    const result = await this.createGraphic(alert.template, alert.data);
    if (result.success) {
      await this.showGraphic(result.graphicId);
      
      // Esperar a que termine
      const template = this.templates.get(alert.template);
      const duration = template?.duration || 5000;
      await this._delay(duration + 500);
    }
    
    // Continuar con la siguiente
    await this._processAlertQueue();
  }
  
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Limpiar recursos
   */
  cleanup() {
    this.graphics.clear();
    this.activeGraphics.clear();
    this.scenes.clear();
    this.alertQueue = [];
    this.processingAlerts = false;
  }
}

module.exports = LiveGraphics;
