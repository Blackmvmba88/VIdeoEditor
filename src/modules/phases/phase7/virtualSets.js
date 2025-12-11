/**
 * @module VirtualSets
 * @description Sistema de fondos virtuales y sets 3D para BlackMamba Studio
 * Chroma key, fondos AI, sets virtuales
 * @version 7.1.0
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');

class VirtualSets {
  constructor(options = {}) {
    this.options = {
      defaultChromaColor: options.defaultChromaColor || '#00ff00',
      chromaTolerance: options.chromaTolerance || 0.4,
      edgeSmoothing: options.edgeSmoothing || 0.1,
      spillSuppression: options.spillSuppression || true,
      aiBackgroundQuality: options.aiBackgroundQuality || 'high',
      ...options
    };
    
    // Sets virtuales
    this.sets = new Map();
    this.backgrounds = new Map();
    this.activeSet = null;
    
    // Biblioteca de fondos predefinidos
    this.backgroundLibrary = {
      // Oficina
      office_modern: {
        id: 'office_modern',
        name: 'Oficina Moderna',
        category: 'office',
        thumbnail: '/assets/backgrounds/office_modern_thumb.jpg',
        source: '/assets/backgrounds/office_modern.jpg',
        is3D: false,
        isPremium: false
      },
      office_executive: {
        id: 'office_executive',
        name: 'Oficina Ejecutiva',
        category: 'office',
        thumbnail: '/assets/backgrounds/office_executive_thumb.jpg',
        source: '/assets/backgrounds/office_executive.jpg',
        is3D: false,
        isPremium: false
      },
      
      // Estudio
      studio_podcast: {
        id: 'studio_podcast',
        name: 'Estudio Podcast',
        category: 'studio',
        thumbnail: '/assets/backgrounds/studio_podcast_thumb.jpg',
        source: '/assets/backgrounds/studio_podcast.jpg',
        is3D: false,
        isPremium: false
      },
      studio_news: {
        id: 'studio_news',
        name: 'Estudio Noticias',
        category: 'studio',
        thumbnail: '/assets/backgrounds/studio_news_thumb.jpg',
        source: '/assets/backgrounds/studio_news.jpg',
        is3D: true,
        isPremium: true
      },
      
      // Gaming
      gaming_setup: {
        id: 'gaming_setup',
        name: 'Setup Gaming',
        category: 'gaming',
        thumbnail: '/assets/backgrounds/gaming_setup_thumb.jpg',
        source: '/assets/backgrounds/gaming_setup.jpg',
        is3D: false,
        isPremium: false
      },
      gaming_neon: {
        id: 'gaming_neon',
        name: 'Neon Gaming',
        category: 'gaming',
        thumbnail: '/assets/backgrounds/gaming_neon_thumb.jpg',
        source: '/assets/backgrounds/gaming_neon.jpg',
        is3D: false,
        isPremium: false
      },
      
      // Naturaleza
      nature_beach: {
        id: 'nature_beach',
        name: 'Playa Tropical',
        category: 'nature',
        thumbnail: '/assets/backgrounds/nature_beach_thumb.jpg',
        source: '/assets/backgrounds/nature_beach.jpg',
        is3D: false,
        isPremium: false
      },
      nature_forest: {
        id: 'nature_forest',
        name: 'Bosque',
        category: 'nature',
        thumbnail: '/assets/backgrounds/nature_forest_thumb.jpg',
        source: '/assets/backgrounds/nature_forest.jpg',
        is3D: false,
        isPremium: false
      },
      
      // Abstracto
      abstract_gradient: {
        id: 'abstract_gradient',
        name: 'Gradiente Moderno',
        category: 'abstract',
        thumbnail: '/assets/backgrounds/abstract_gradient_thumb.jpg',
        source: '/assets/backgrounds/abstract_gradient.jpg',
        is3D: false,
        isPremium: false
      },
      abstract_particles: {
        id: 'abstract_particles',
        name: 'Partículas',
        category: 'abstract',
        thumbnail: '/assets/backgrounds/abstract_particles_thumb.jpg',
        source: '/assets/backgrounds/abstract_particles.mp4',
        isVideo: true,
        is3D: false,
        isPremium: true
      }
    };
    
    // Categorías
    this.categories = ['office', 'studio', 'gaming', 'nature', 'abstract', 'custom', '3d'];
    
    // Configuraciones de chroma
    this.chromaProfiles = {
      green_screen: {
        color: '#00ff00',
        tolerance: 0.4,
        edgeSmoothing: 0.1,
        spillSuppression: true
      },
      blue_screen: {
        color: '#0000ff',
        tolerance: 0.35,
        edgeSmoothing: 0.15,
        spillSuppression: true
      },
      custom: {
        color: null,
        tolerance: 0.4,
        edgeSmoothing: 0.1,
        spillSuppression: true
      }
    };
  }
  
  /**
   * Crear set virtual
   * @param {Object} config - Configuración del set
   * @returns {Object} Set creado
   */
  async createSet(config = {}) {
    const {
      name = 'Nuevo Set',
      backgroundId = null,
      customBackground = null,
      chromaKey = true,
      chromaProfile = 'green_screen'
    } = config;
    
    const setId = uuidv4();
    
    // Obtener configuración de chroma
    const chromaConfig = this.chromaProfiles[chromaProfile] || this.chromaProfiles.green_screen;
    
    const set = {
      id: setId,
      name,
      
      // Fondo
      background: backgroundId 
        ? this.backgroundLibrary[backgroundId] 
        : customBackground,
      
      // Chroma key
      chromaKey: {
        enabled: chromaKey,
        color: chromaConfig.color || this.options.defaultChromaColor,
        tolerance: chromaConfig.tolerance,
        edgeSmoothing: chromaConfig.edgeSmoothing,
        spillSuppression: chromaConfig.spillSuppression
      },
      
      // Elementos adicionales (overlays, logos, etc.)
      elements: [],
      
      // Iluminación virtual
      lighting: {
        ambient: 1.0,
        contrast: 1.0,
        shadows: true,
        shadowIntensity: 0.3
      },
      
      // Profundidad de campo
      depthOfField: {
        enabled: false,
        focusDistance: 1.0,
        aperture: 2.8,
        blurAmount: 0.5
      },
      
      // Estado
      active: false,
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.sets.set(setId, set);
    
    return {
      success: true,
      setId,
      set,
      message: 'Set virtual creado'
    };
  }
  
  /**
   * Activar set virtual
   * @param {string} setId - ID del set
   * @returns {Object} Resultado
   */
  async activateSet(setId) {
    const set = this.sets.get(setId);
    if (!set) {
      return { success: false, error: 'Set no encontrado' };
    }
    
    // Desactivar set anterior
    if (this.activeSet) {
      const prevSet = this.sets.get(this.activeSet);
      if (prevSet) {
        prevSet.active = false;
      }
    }
    
    set.active = true;
    this.activeSet = setId;
    
    return {
      success: true,
      setId,
      setName: set.name,
      message: `Set "${set.name}" activado`
    };
  }
  
  /**
   * Desactivar set virtual (volver a fondo real)
   * @returns {Object} Resultado
   */
  async deactivateSet() {
    if (this.activeSet) {
      const set = this.sets.get(this.activeSet);
      if (set) {
        set.active = false;
      }
    }
    
    this.activeSet = null;
    
    return {
      success: true,
      message: 'Set virtual desactivado'
    };
  }
  
  /**
   * Configurar chroma key
   * @param {string} setId - ID del set
   * @param {Object} chromaConfig - Configuración de chroma
   * @returns {Object} Resultado
   */
  async configureChroma(setId, chromaConfig) {
    const set = this.sets.get(setId);
    if (!set) {
      return { success: false, error: 'Set no encontrado' };
    }
    
    const {
      enabled,
      color,
      tolerance,
      edgeSmoothing,
      spillSuppression
    } = chromaConfig;
    
    if (enabled !== undefined) set.chromaKey.enabled = enabled;
    if (color) set.chromaKey.color = color;
    if (tolerance !== undefined) set.chromaKey.tolerance = Math.max(0, Math.min(1, tolerance));
    if (edgeSmoothing !== undefined) set.chromaKey.edgeSmoothing = Math.max(0, Math.min(1, edgeSmoothing));
    if (spillSuppression !== undefined) set.chromaKey.spillSuppression = spillSuppression;
    
    set.updatedAt = new Date().toISOString();
    
    return {
      success: true,
      setId,
      chromaKey: set.chromaKey,
      message: 'Chroma key configurado'
    };
  }
  
  /**
   * Cambiar fondo
   * @param {string} setId - ID del set
   * @param {string} backgroundId - ID del fondo
   * @returns {Object} Resultado
   */
  async setBackground(setId, backgroundId) {
    const set = this.sets.get(setId);
    if (!set) {
      return { success: false, error: 'Set no encontrado' };
    }
    
    const background = this.backgroundLibrary[backgroundId];
    if (!background) {
      return { success: false, error: 'Fondo no encontrado' };
    }
    
    set.background = background;
    set.updatedAt = new Date().toISOString();
    
    return {
      success: true,
      setId,
      background,
      message: `Fondo cambiado a "${background.name}"`
    };
  }
  
  /**
   * Establecer fondo personalizado
   * @param {string} setId - ID del set
   * @param {Object} customBackground - Fondo personalizado
   * @returns {Object} Resultado
   */
  async setCustomBackground(setId, customBackground) {
    const set = this.sets.get(setId);
    if (!set) {
      return { success: false, error: 'Set no encontrado' };
    }
    
    const {
      source,
      name = 'Fondo Personalizado',
      isVideo = false,
      loop = true
    } = customBackground;
    
    if (!source) {
      return { success: false, error: 'Fuente de fondo requerida' };
    }
    
    const bgId = uuidv4();
    const background = {
      id: bgId,
      name,
      source,
      isVideo,
      loop,
      category: 'custom',
      is3D: false,
      isPremium: false,
      addedAt: new Date().toISOString()
    };
    
    set.background = background;
    set.updatedAt = new Date().toISOString();
    
    // Guardar en biblioteca si se solicita
    this.backgrounds.set(bgId, background);
    
    return {
      success: true,
      setId,
      backgroundId: bgId,
      background,
      message: 'Fondo personalizado establecido'
    };
  }
  
  /**
   * Generar fondo con IA
   * @param {string} setId - ID del set
   * @param {Object} options - Opciones de generación
   * @returns {Object} Fondo generado
   */
  async generateAIBackground(setId, options = {}) {
    const set = this.sets.get(setId);
    if (!set) {
      return { success: false, error: 'Set no encontrado' };
    }
    
    const {
      prompt = 'modern office background',
      style = 'photorealistic', // photorealistic, artistic, minimalist
      lighting = 'soft',
      colorScheme = 'neutral'
    } = options;
    
    // Simular generación de IA
    await this._delay(2000);
    
    const bgId = uuidv4();
    const background = {
      id: bgId,
      name: `AI: ${prompt.slice(0, 30)}...`,
      source: `/generated/bg_${bgId}.jpg`,
      category: 'custom',
      is3D: false,
      isPremium: false,
      aiGenerated: true,
      generationParams: {
        prompt,
        style,
        lighting,
        colorScheme
      },
      generatedAt: new Date().toISOString()
    };
    
    set.background = background;
    set.updatedAt = new Date().toISOString();
    
    this.backgrounds.set(bgId, background);
    
    return {
      success: true,
      setId,
      backgroundId: bgId,
      background,
      message: 'Fondo generado con IA'
    };
  }
  
  /**
   * Agregar elemento al set
   * @param {string} setId - ID del set
   * @param {Object} element - Elemento a agregar
   * @returns {Object} Resultado
   */
  async addElement(setId, element) {
    const set = this.sets.get(setId);
    if (!set) {
      return { success: false, error: 'Set no encontrado' };
    }
    
    const {
      type, // logo, overlay, prop, text
      source,
      name,
      position = { x: 0, y: 0 },
      size = { width: 200, height: 200 },
      opacity = 1,
      layer = 'foreground' // background, midground, foreground
    } = element;
    
    const elementId = uuidv4();
    const newElement = {
      id: elementId,
      type,
      source,
      name: name || `${type}_${set.elements.length + 1}`,
      position,
      size,
      opacity,
      layer,
      visible: true,
      locked: false,
      addedAt: new Date().toISOString()
    };
    
    set.elements.push(newElement);
    set.updatedAt = new Date().toISOString();
    
    return {
      success: true,
      elementId,
      element: newElement,
      message: 'Elemento agregado'
    };
  }
  
  /**
   * Mover elemento
   * @param {string} setId - ID del set
   * @param {string} elementId - ID del elemento
   * @param {Object} position - Nueva posición
   * @returns {Object} Resultado
   */
  async moveElement(setId, elementId, position) {
    const set = this.sets.get(setId);
    if (!set) {
      return { success: false, error: 'Set no encontrado' };
    }
    
    const element = set.elements.find(e => e.id === elementId);
    if (!element) {
      return { success: false, error: 'Elemento no encontrado' };
    }
    
    if (element.locked) {
      return { success: false, error: 'Elemento bloqueado' };
    }
    
    element.position = { ...element.position, ...position };
    set.updatedAt = new Date().toISOString();
    
    return {
      success: true,
      elementId,
      position: element.position,
      message: 'Elemento movido'
    };
  }
  
  /**
   * Eliminar elemento
   * @param {string} setId - ID del set
   * @param {string} elementId - ID del elemento
   * @returns {Object} Resultado
   */
  async removeElement(setId, elementId) {
    const set = this.sets.get(setId);
    if (!set) {
      return { success: false, error: 'Set no encontrado' };
    }
    
    const index = set.elements.findIndex(e => e.id === elementId);
    if (index === -1) {
      return { success: false, error: 'Elemento no encontrado' };
    }
    
    set.elements.splice(index, 1);
    set.updatedAt = new Date().toISOString();
    
    return {
      success: true,
      elementId,
      message: 'Elemento eliminado'
    };
  }
  
  /**
   * Configurar iluminación
   * @param {string} setId - ID del set
   * @param {Object} lightingConfig - Configuración de iluminación
   * @returns {Object} Resultado
   */
  async configureLighting(setId, lightingConfig) {
    const set = this.sets.get(setId);
    if (!set) {
      return { success: false, error: 'Set no encontrado' };
    }
    
    const { ambient, contrast, shadows, shadowIntensity } = lightingConfig;
    
    if (ambient !== undefined) set.lighting.ambient = Math.max(0, Math.min(2, ambient));
    if (contrast !== undefined) set.lighting.contrast = Math.max(0, Math.min(2, contrast));
    if (shadows !== undefined) set.lighting.shadows = shadows;
    if (shadowIntensity !== undefined) set.lighting.shadowIntensity = Math.max(0, Math.min(1, shadowIntensity));
    
    set.updatedAt = new Date().toISOString();
    
    return {
      success: true,
      setId,
      lighting: set.lighting,
      message: 'Iluminación configurada'
    };
  }
  
  /**
   * Configurar profundidad de campo
   * @param {string} setId - ID del set
   * @param {Object} dofConfig - Configuración de DoF
   * @returns {Object} Resultado
   */
  async configureDepthOfField(setId, dofConfig) {
    const set = this.sets.get(setId);
    if (!set) {
      return { success: false, error: 'Set no encontrado' };
    }
    
    const { enabled, focusDistance, aperture, blurAmount } = dofConfig;
    
    if (enabled !== undefined) set.depthOfField.enabled = enabled;
    if (focusDistance !== undefined) set.depthOfField.focusDistance = focusDistance;
    if (aperture !== undefined) set.depthOfField.aperture = aperture;
    if (blurAmount !== undefined) set.depthOfField.blurAmount = Math.max(0, Math.min(1, blurAmount));
    
    set.updatedAt = new Date().toISOString();
    
    return {
      success: true,
      setId,
      depthOfField: set.depthOfField,
      message: 'Profundidad de campo configurada'
    };
  }
  
  /**
   * Listar fondos de biblioteca
   * @param {Object} options - Opciones
   * @returns {Object} Lista de fondos
   */
  listBackgrounds(options = {}) {
    const { category = null, includePremium = true, include3D = true } = options;
    
    let backgrounds = Object.values(this.backgroundLibrary);
    
    if (category) {
      backgrounds = backgrounds.filter(b => b.category === category);
    }
    
    if (!includePremium) {
      backgrounds = backgrounds.filter(b => !b.isPremium);
    }
    
    if (!include3D) {
      backgrounds = backgrounds.filter(b => !b.is3D);
    }
    
    return {
      success: true,
      backgrounds,
      total: backgrounds.length,
      categories: this.categories
    };
  }
  
  /**
   * Listar sets
   * @returns {Object} Lista de sets
   */
  listSets() {
    const sets = [...this.sets.values()].map(set => ({
      id: set.id,
      name: set.name,
      backgroundName: set.background?.name || 'Sin fondo',
      elementsCount: set.elements.length,
      active: set.active,
      createdAt: set.createdAt
    }));
    
    return {
      success: true,
      sets,
      total: sets.length,
      activeSet: this.activeSet
    };
  }
  
  /**
   * Obtener set
   * @param {string} setId - ID del set
   * @returns {Object} Set
   */
  getSet(setId) {
    const set = this.sets.get(setId);
    if (!set) {
      return { success: false, error: 'Set no encontrado' };
    }
    
    return {
      success: true,
      set
    };
  }
  
  /**
   * Eliminar set
   * @param {string} setId - ID del set
   * @returns {Object} Resultado
   */
  async deleteSet(setId) {
    const set = this.sets.get(setId);
    if (!set) {
      return { success: false, error: 'Set no encontrado' };
    }
    
    if (set.active) {
      await this.deactivateSet();
    }
    
    this.sets.delete(setId);
    
    return {
      success: true,
      setId,
      message: 'Set eliminado'
    };
  }
  
  /**
   * Obtener perfiles de chroma
   * @returns {Object} Perfiles
   */
  getChromaProfiles() {
    return {
      success: true,
      profiles: Object.entries(this.chromaProfiles).map(([key, profile]) => ({
        id: key,
        ...profile
      }))
    };
  }
  
  // Métodos privados
  
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Limpiar recursos
   */
  cleanup() {
    this.sets.clear();
    this.backgrounds.clear();
    this.activeSet = null;
  }
}

module.exports = VirtualSets;
