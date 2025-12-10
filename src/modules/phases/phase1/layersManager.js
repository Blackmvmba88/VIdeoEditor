/**
 * BlackMamba Studio - Layers Manager
 * 
 * Sistema de capas para superposición de videos e imágenes.
 * 
 * Características:
 * - Múltiples capas de video
 * - Superposición de imágenes (PNG, JPG, WebP)
 * - Control de opacidad por capa
 * - Modos de fusión (blend modes)
 * - Posicionamiento y escalado
 * - Orden de capas (z-index)
 * 
 * @module LayersManager
 */

const path = require('path');
const FFmpegWrapper = require('../../ffmpegWrapper');
const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

// Modos de fusión disponibles
const BLEND_MODES = {
  normal: 'overlay',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
  colorDodge: 'dodge',
  colorBurn: 'burn',
  hardLight: 'hardlight',
  softLight: 'softlight',
  difference: 'difference',
  exclusion: 'exclusion'
};

class LayersManager {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.layers = [];
    this.blendModes = BLEND_MODES;
  }

  /**
   * Agrega una nueva capa
   * @param {Object} layerConfig - Configuración de la capa
   * @returns {Object} Capa creada
   */
  addLayer(layerConfig) {
    const layer = {
      id: `layer-${Date.now()}-${this.layers.length}`,
      type: layerConfig.type || 'video', // video, image, text
      source: layerConfig.source,
      position: {
        x: layerConfig.x || 0,
        y: layerConfig.y || 0
      },
      size: {
        width: layerConfig.width || null, // null = original
        height: layerConfig.height || null
      },
      opacity: layerConfig.opacity !== undefined ? layerConfig.opacity : 1.0,
      blendMode: layerConfig.blendMode || 'normal',
      startTime: layerConfig.startTime || 0,
      duration: layerConfig.duration || null,
      zIndex: this.layers.length,
      visible: true
    };

    this.layers.push(layer);
    return layer;
  }

  /**
   * Remueve una capa por ID
   * @param {string} layerId - ID de la capa
   */
  removeLayer(layerId) {
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index === -1) {
      throw new VideoEditorError(`Layer ${layerId} not found`, ErrorCodes.INVALID_PARAMETER);
    }
    this.layers.splice(index, 1);
    this.reorderZIndex();
  }

  /**
   * Actualiza propiedades de una capa
   * @param {string} layerId - ID de la capa
   * @param {Object} updates - Propiedades a actualizar
   */
  updateLayer(layerId, updates) {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) {
      throw new VideoEditorError(`Layer ${layerId} not found`, ErrorCodes.INVALID_PARAMETER);
    }

    if (updates.x !== undefined) layer.position.x = updates.x;
    if (updates.y !== undefined) layer.position.y = updates.y;
    if (updates.width !== undefined) layer.size.width = updates.width;
    if (updates.height !== undefined) layer.size.height = updates.height;
    if (updates.opacity !== undefined) layer.opacity = Math.max(0, Math.min(1, updates.opacity));
    if (updates.blendMode !== undefined) layer.blendMode = updates.blendMode;
    if (updates.visible !== undefined) layer.visible = updates.visible;

    return layer;
  }

  /**
   * Mueve una capa hacia arriba en el orden
   * @param {string} layerId - ID de la capa
   */
  moveLayerUp(layerId) {
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index < this.layers.length - 1) {
      [this.layers[index], this.layers[index + 1]] = [this.layers[index + 1], this.layers[index]];
      this.reorderZIndex();
    }
  }

  /**
   * Mueve una capa hacia abajo en el orden
   * @param {string} layerId - ID de la capa
   */
  moveLayerDown(layerId) {
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index > 0) {
      [this.layers[index], this.layers[index - 1]] = [this.layers[index - 1], this.layers[index]];
      this.reorderZIndex();
    }
  }

  /**
   * Reordena los z-index de todas las capas
   * @private
   */
  reorderZIndex() {
    this.layers.forEach((layer, index) => {
      layer.zIndex = index;
    });
  }

  /**
   * Obtiene todas las capas ordenadas por z-index
   * @returns {Array} Lista de capas
   */
  getLayers() {
    return [...this.layers].sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Obtiene los modos de fusión disponibles
   * @returns {Object} Modos de fusión
   */
  getBlendModes() {
    return Object.keys(BLEND_MODES);
  }

  /**
   * Compone todas las capas visibles sobre un video base
   * @param {string} baseVideoPath - Video base
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones de composición
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async composeLayers(baseVideoPath, outputPath, options = {}, onProgress = null) {
    const visibleLayers = this.layers.filter(l => l.visible && l.source);
    
    if (visibleLayers.length === 0) {
      // Sin capas, solo copiar el video base
      const args = ['-i', baseVideoPath, '-c', 'copy', '-y', outputPath];
      await this.ffmpeg.execute(args, onProgress);
      return { success: true, outputPath, layersApplied: 0 };
    }

    // Construir filtro complejo para composición
    const inputs = ['-i', baseVideoPath];
    const filterParts = [];
    let lastOutput = '[0:v]';

    visibleLayers.forEach((layer, index) => {
      inputs.push('-i', layer.source);
      const inputIndex = index + 1;
      const outputLabel = `[v${index}]`;

      // Escalar si es necesario
      let scaleFilter = '';
      if (layer.size.width && layer.size.height) {
        scaleFilter = `scale=${layer.size.width}:${layer.size.height},`;
      }

      // Aplicar opacidad si es menor a 1
      let opacityFilter = '';
      if (layer.opacity < 1) {
        opacityFilter = `format=rgba,colorchannelmixer=aa=${layer.opacity},`;
      }

      // Overlay con posición
      const overlayX = layer.position.x;
      const overlayY = layer.position.y;
      
      filterParts.push(
        `[${inputIndex}:v]${scaleFilter}${opacityFilter}format=rgba[layer${index}]`,
        `${lastOutput}[layer${index}]overlay=${overlayX}:${overlayY}:format=auto${outputLabel}`
      );
      
      lastOutput = outputLabel;
    });

    const filterComplex = filterParts.join(';');
    const outputLabel = lastOutput.replace('[', '').replace(']', '');

    const args = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', lastOutput,
      '-map', '0:a?',
      '-c:a', 'copy',
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      layersApplied: visibleLayers.length
    };
  }

  /**
   * Limpia todas las capas
   */
  clearLayers() {
    this.layers = [];
  }

  /**
   * Exporta la configuración de capas
   * @returns {Object} Configuración serializable
   */
  exportConfig() {
    return {
      layers: this.layers.map(l => ({ ...l })),
      version: '1.0'
    };
  }

  /**
   * Importa configuración de capas
   * @param {Object} config - Configuración a importar
   */
  importConfig(config) {
    if (config.layers && Array.isArray(config.layers)) {
      this.layers = config.layers.map(l => ({ ...l }));
      this.reorderZIndex();
    }
  }
}

module.exports = LayersManager;
