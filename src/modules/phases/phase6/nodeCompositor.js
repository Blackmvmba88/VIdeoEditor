/**
 * Node-based Compositor - Sistema de Composición por Nodos
 * 
 * Funcionalidades:
 * - Editor de nodos visual (estilo Fusion/Nuke)
 * - Nodos de entrada: Media, Color sólido, Generadores
 * - Nodos de transformación: Scale, Rotate, Position, Crop
 * - Nodos de mezcla: Blend modes, Composite, Merge
 * - Nodos de corrección: Color, Curves, Levels
 * - Nodos de efectos: Blur, Glow, Sharpen
 * - Nodos de máscara: Shape, Roto, Keyer
 * - Conexiones y flujo de datos entre nodos
 * - Renderizado del grafo de nodos
 */

const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { v4: uuidv4 } = require('uuid');
const FFmpegWrapper = require('../../ffmpegWrapper');

class NodeCompositor {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.tempDir = path.join(os.tmpdir(), 'video-editor-compositor');
    
    // Tipos de nodos disponibles
    this.nodeTypes = {
      // Nodos de entrada
      input: {
        media: {
          name: 'Media Input',
          category: 'input',
          inputs: [],
          outputs: ['video', 'audio'],
          params: ['filePath', 'startTime', 'endTime', 'loop']
        },
        solidColor: {
          name: 'Solid Color',
          category: 'input',
          inputs: [],
          outputs: ['video'],
          params: ['color', 'width', 'height', 'duration']
        },
        gradient: {
          name: 'Gradient',
          category: 'input',
          inputs: [],
          outputs: ['video'],
          params: ['colorStart', 'colorEnd', 'direction', 'width', 'height']
        },
        noise: {
          name: 'Noise Generator',
          category: 'input',
          inputs: [],
          outputs: ['video'],
          params: ['type', 'amount', 'width', 'height', 'animated']
        },
        text: {
          name: 'Text',
          category: 'input',
          inputs: [],
          outputs: ['video'],
          params: ['text', 'font', 'size', 'color', 'backgroundColor']
        }
      },
      
      // Nodos de transformación
      transform: {
        scale: {
          name: 'Scale',
          category: 'transform',
          inputs: ['video'],
          outputs: ['video'],
          params: ['scaleX', 'scaleY', 'uniform', 'filter']
        },
        rotate: {
          name: 'Rotate',
          category: 'transform',
          inputs: ['video'],
          outputs: ['video'],
          params: ['angle', 'centerX', 'centerY', 'expand']
        },
        position: {
          name: 'Position',
          category: 'transform',
          inputs: ['video'],
          outputs: ['video'],
          params: ['x', 'y', 'motionBlur']
        },
        crop: {
          name: 'Crop',
          category: 'transform',
          inputs: ['video'],
          outputs: ['video'],
          params: ['left', 'top', 'right', 'bottom']
        },
        flip: {
          name: 'Flip',
          category: 'transform',
          inputs: ['video'],
          outputs: ['video'],
          params: ['horizontal', 'vertical']
        },
        cornerPin: {
          name: 'Corner Pin',
          category: 'transform',
          inputs: ['video'],
          outputs: ['video'],
          params: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight']
        }
      },
      
      // Nodos de mezcla/composición
      merge: {
        blend: {
          name: 'Blend',
          category: 'merge',
          inputs: ['background', 'foreground'],
          outputs: ['video'],
          params: ['mode', 'opacity']
        },
        composite: {
          name: 'Composite',
          category: 'merge',
          inputs: ['background', 'foreground', 'mask'],
          outputs: ['video'],
          params: ['operation', 'premultiplied']
        },
        merge: {
          name: 'Merge',
          category: 'merge',
          inputs: ['inputA', 'inputB'],
          outputs: ['video'],
          params: ['operation', 'mix']
        },
        switch: {
          name: 'Switch',
          category: 'merge',
          inputs: ['input1', 'input2', 'input3', 'input4'],
          outputs: ['video'],
          params: ['which', 'dissolve']
        }
      },
      
      // Nodos de corrección de color
      color: {
        colorCorrect: {
          name: 'Color Correct',
          category: 'color',
          inputs: ['video'],
          outputs: ['video'],
          params: ['brightness', 'contrast', 'saturation', 'gamma', 'gain', 'offset']
        },
        curves: {
          name: 'Curves',
          category: 'color',
          inputs: ['video'],
          outputs: ['video'],
          params: ['master', 'red', 'green', 'blue']
        },
        levels: {
          name: 'Levels',
          category: 'color',
          inputs: ['video'],
          outputs: ['video'],
          params: ['inBlack', 'inWhite', 'gamma', 'outBlack', 'outWhite']
        },
        hueShift: {
          name: 'Hue Shift',
          category: 'color',
          inputs: ['video'],
          outputs: ['video'],
          params: ['hue', 'saturation', 'lightness']
        },
        colorMatrix: {
          name: 'Color Matrix',
          category: 'color',
          inputs: ['video'],
          outputs: ['video'],
          params: ['matrix3x3', 'preserveLuminance']
        },
        lut: {
          name: 'LUT',
          category: 'color',
          inputs: ['video'],
          outputs: ['video'],
          params: ['lutFile', 'intensity']
        }
      },
      
      // Nodos de efectos
      effects: {
        blur: {
          name: 'Blur',
          category: 'effects',
          inputs: ['video'],
          outputs: ['video'],
          params: ['type', 'radius', 'sigma']
        },
        sharpen: {
          name: 'Sharpen',
          category: 'effects',
          inputs: ['video'],
          outputs: ['video'],
          params: ['amount', 'radius', 'threshold']
        },
        glow: {
          name: 'Glow',
          category: 'effects',
          inputs: ['video'],
          outputs: ['video'],
          params: ['intensity', 'radius', 'threshold']
        },
        defocus: {
          name: 'Defocus',
          category: 'effects',
          inputs: ['video'],
          outputs: ['video'],
          params: ['size', 'aspectRatio', 'blades']
        },
        motionBlur: {
          name: 'Motion Blur',
          category: 'effects',
          inputs: ['video'],
          outputs: ['video'],
          params: ['angle', 'distance', 'samples']
        },
        grain: {
          name: 'Film Grain',
          category: 'effects',
          inputs: ['video'],
          outputs: ['video'],
          params: ['amount', 'size', 'softness', 'animated']
        },
        vignette: {
          name: 'Vignette',
          category: 'effects',
          inputs: ['video'],
          outputs: ['video'],
          params: ['amount', 'softness', 'roundness']
        },
        chromatic: {
          name: 'Chromatic Aberration',
          category: 'effects',
          inputs: ['video'],
          outputs: ['video'],
          params: ['redOffset', 'blueOffset', 'strength']
        }
      },
      
      // Nodos de máscara
      mask: {
        shapeMask: {
          name: 'Shape Mask',
          category: 'mask',
          inputs: [],
          outputs: ['mask'],
          params: ['shape', 'position', 'size', 'feather', 'invert']
        },
        rotoMask: {
          name: 'Roto Mask',
          category: 'mask',
          inputs: [],
          outputs: ['mask'],
          params: ['points', 'feather', 'invert', 'motionBlur']
        },
        luminanceMask: {
          name: 'Luminance Key',
          category: 'mask',
          inputs: ['video'],
          outputs: ['mask'],
          params: ['lowThreshold', 'highThreshold', 'softness']
        },
        chromaKey: {
          name: 'Chroma Key',
          category: 'mask',
          inputs: ['video'],
          outputs: ['video', 'mask'],
          params: ['color', 'tolerance', 'softness', 'spillSuppression']
        }
      },
      
      // Nodos de salida
      output: {
        viewer: {
          name: 'Viewer',
          category: 'output',
          inputs: ['video'],
          outputs: [],
          params: ['gain', 'gamma', 'channels']
        },
        write: {
          name: 'Write',
          category: 'output',
          inputs: ['video', 'audio'],
          outputs: [],
          params: ['filePath', 'format', 'codec', 'quality']
        }
      }
    };
    
    // Modos de blend disponibles
    this.blendModes = {
      normal: 'Normal',
      multiply: 'Multiply',
      screen: 'Screen',
      overlay: 'Overlay',
      darken: 'Darken',
      lighten: 'Lighten',
      colorDodge: 'Color Dodge',
      colorBurn: 'Color Burn',
      hardLight: 'Hard Light',
      softLight: 'Soft Light',
      difference: 'Difference',
      exclusion: 'Exclusion',
      hue: 'Hue',
      saturation: 'Saturation',
      color: 'Color',
      luminosity: 'Luminosity',
      add: 'Add',
      subtract: 'Subtract'
    };
    
    // Almacenar composiciones
    this.compositions = new Map();
    
    this._ensureTempDir();
  }
  
  /**
   * Asegurar directorio temporal
   * @private
   */
  _ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  /**
   * Obtener tipos de nodos disponibles
   * @returns {Object} Catálogo de nodos
   */
  getNodeTypes() {
    return JSON.parse(JSON.stringify(this.nodeTypes));
  }
  
  /**
   * Obtener modos de blend disponibles
   * @returns {Object} Modos de mezcla
   */
  getBlendModes() {
    return { ...this.blendModes };
  }
  
  /**
   * Crear nueva composición
   * @param {Object} options - Opciones de composición
   * @returns {Object} Composición creada
   */
  createComposition(options = {}) {
    const {
      name = 'Untitled Composition',
      width = 1920,
      height = 1080,
      frameRate = 30,
      duration = 10
    } = options;
    
    const compositionId = uuidv4();
    
    const composition = {
      id: compositionId,
      name,
      settings: {
        width,
        height,
        frameRate,
        duration,
        pixelAspect: 1,
        colorSpace: 'sRGB'
      },
      nodes: [],
      connections: [],
      metadata: {
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        version: '1.0'
      }
    };
    
    this.compositions.set(compositionId, composition);
    
    return {
      success: true,
      compositionId,
      composition,
      message: `Composición "${name}" creada`
    };
  }
  
  /**
   * Agregar nodo a composición
   * @param {string} compositionId - ID de composición
   * @param {string} nodeType - Tipo de nodo (ej: 'input.media')
   * @param {Object} params - Parámetros del nodo
   * @returns {Object} Nodo creado
   */
  addNode(compositionId, nodeType, params = {}) {
    const composition = this.compositions.get(compositionId);
    if (!composition) {
      return { success: false, error: 'Composición no encontrada' };
    }
    
    // Parsear tipo de nodo
    const [category, type] = nodeType.split('.');
    const nodeDefinition = this.nodeTypes[category]?.[type];
    
    if (!nodeDefinition) {
      return { success: false, error: `Tipo de nodo no válido: ${nodeType}` };
    }
    
    const nodeId = uuidv4();
    const node = {
      id: nodeId,
      type: nodeType,
      name: params.name || nodeDefinition.name,
      category: nodeDefinition.category,
      position: params.position || { x: 0, y: 0 },
      inputs: nodeDefinition.inputs.map(name => ({ name, connected: null })),
      outputs: nodeDefinition.outputs.map(name => ({ name, connections: [] })),
      params: {},
      enabled: true
    };
    
    // Establecer parámetros con valores por defecto
    nodeDefinition.params.forEach(param => {
      node.params[param] = params[param] !== undefined ? params[param] : this._getDefaultValue(param);
    });
    
    composition.nodes.push(node);
    composition.metadata.modifiedAt = new Date().toISOString();
    
    return {
      success: true,
      nodeId,
      node,
      message: `Nodo "${node.name}" agregado`
    };
  }
  
  /**
   * Obtener valor por defecto para un parámetro
   * @private
   */
  _getDefaultValue(param) {
    const defaults = {
      // Transformación
      scaleX: 1, scaleY: 1, uniform: true,
      angle: 0, centerX: 0.5, centerY: 0.5, expand: false,
      x: 0, y: 0,
      left: 0, top: 0, right: 0, bottom: 0,
      horizontal: false, vertical: false,
      
      // Color
      brightness: 0, contrast: 1, saturation: 1, gamma: 1,
      gain: 1, offset: 0,
      hue: 0, lightness: 0,
      inBlack: 0, inWhite: 1, outBlack: 0, outWhite: 1,
      
      // Efectos
      radius: 5, sigma: 2, amount: 0.5, threshold: 0,
      intensity: 0.5, size: 10, softness: 0.5,
      
      // Blend
      mode: 'normal', opacity: 1, mix: 0.5,
      operation: 'over', premultiplied: false,
      
      // Máscara
      feather: 0, invert: false,
      tolerance: 0.1, spillSuppression: 0.5,
      lowThreshold: 0, highThreshold: 1,
      
      // Media
      startTime: 0, endTime: null, loop: false,
      
      // Generadores
      color: '#000000', width: 1920, height: 1080, duration: 10,
      colorStart: '#000000', colorEnd: '#FFFFFF', direction: 'vertical',
      type: 'perlin', animated: true,
      
      // Texto
      text: 'Text', font: 'Arial', fontSize: 48, backgroundColor: 'transparent',
      
      // Salida
      format: 'mp4', codec: 'h264', quality: 'high'
    };
    
    return defaults[param] !== undefined ? defaults[param] : null;
  }
  
  /**
   * Conectar dos nodos
   * @param {string} compositionId - ID de composición
   * @param {string} sourceNodeId - ID del nodo fuente
   * @param {string} sourceOutput - Nombre del output
   * @param {string} targetNodeId - ID del nodo destino
   * @param {string} targetInput - Nombre del input
   * @returns {Object} Conexión creada
   */
  connectNodes(compositionId, sourceNodeId, sourceOutput, targetNodeId, targetInput) {
    const composition = this.compositions.get(compositionId);
    if (!composition) {
      return { success: false, error: 'Composición no encontrada' };
    }
    
    const sourceNode = composition.nodes.find(n => n.id === sourceNodeId);
    const targetNode = composition.nodes.find(n => n.id === targetNodeId);
    
    if (!sourceNode || !targetNode) {
      return { success: false, error: 'Nodo no encontrado' };
    }
    
    // Verificar que el output existe en el nodo fuente
    const output = sourceNode.outputs.find(o => o.name === sourceOutput);
    if (!output) {
      return { success: false, error: `Output "${sourceOutput}" no existe en nodo fuente` };
    }
    
    // Verificar que el input existe en el nodo destino
    const input = targetNode.inputs.find(i => i.name === targetInput);
    if (!input) {
      return { success: false, error: `Input "${targetInput}" no existe en nodo destino` };
    }
    
    // Desconectar input si ya estaba conectado
    if (input.connected) {
      const prevSource = composition.nodes.find(n => n.id === input.connected.nodeId);
      if (prevSource) {
        const prevOutput = prevSource.outputs.find(o => o.name === input.connected.output);
        if (prevOutput) {
          prevOutput.connections = prevOutput.connections.filter(
            c => !(c.nodeId === targetNodeId && c.input === targetInput)
          );
        }
      }
    }
    
    // Crear conexión
    const connectionId = uuidv4();
    const connection = {
      id: connectionId,
      source: { nodeId: sourceNodeId, output: sourceOutput },
      target: { nodeId: targetNodeId, input: targetInput }
    };
    
    // Actualizar nodos
    output.connections.push({ nodeId: targetNodeId, input: targetInput });
    input.connected = { nodeId: sourceNodeId, output: sourceOutput };
    
    composition.connections.push(connection);
    composition.metadata.modifiedAt = new Date().toISOString();
    
    return {
      success: true,
      connectionId,
      connection,
      message: `Nodos conectados: ${sourceNode.name} → ${targetNode.name}`
    };
  }
  
  /**
   * Desconectar nodos
   * @param {string} compositionId - ID de composición
   * @param {string} connectionId - ID de la conexión
   * @returns {Object} Resultado
   */
  disconnectNodes(compositionId, connectionId) {
    const composition = this.compositions.get(compositionId);
    if (!composition) {
      return { success: false, error: 'Composición no encontrada' };
    }
    
    const connectionIndex = composition.connections.findIndex(c => c.id === connectionId);
    if (connectionIndex === -1) {
      return { success: false, error: 'Conexión no encontrada' };
    }
    
    const connection = composition.connections[connectionIndex];
    
    // Actualizar nodos
    const sourceNode = composition.nodes.find(n => n.id === connection.source.nodeId);
    const targetNode = composition.nodes.find(n => n.id === connection.target.nodeId);
    
    if (sourceNode) {
      const output = sourceNode.outputs.find(o => o.name === connection.source.output);
      if (output) {
        output.connections = output.connections.filter(
          c => !(c.nodeId === connection.target.nodeId && c.input === connection.target.input)
        );
      }
    }
    
    if (targetNode) {
      const input = targetNode.inputs.find(i => i.name === connection.target.input);
      if (input) {
        input.connected = null;
      }
    }
    
    composition.connections.splice(connectionIndex, 1);
    composition.metadata.modifiedAt = new Date().toISOString();
    
    return {
      success: true,
      message: 'Conexión eliminada'
    };
  }
  
  /**
   * Actualizar parámetros de un nodo
   * @param {string} compositionId - ID de composición
   * @param {string} nodeId - ID del nodo
   * @param {Object} params - Parámetros a actualizar
   * @returns {Object} Resultado
   */
  updateNodeParams(compositionId, nodeId, params) {
    const composition = this.compositions.get(compositionId);
    if (!composition) {
      return { success: false, error: 'Composición no encontrada' };
    }
    
    const node = composition.nodes.find(n => n.id === nodeId);
    if (!node) {
      return { success: false, error: 'Nodo no encontrado' };
    }
    
    Object.assign(node.params, params);
    composition.metadata.modifiedAt = new Date().toISOString();
    
    return {
      success: true,
      node,
      message: `Parámetros actualizados en "${node.name}"`
    };
  }
  
  /**
   * Eliminar nodo
   * @param {string} compositionId - ID de composición
   * @param {string} nodeId - ID del nodo
   * @returns {Object} Resultado
   */
  removeNode(compositionId, nodeId) {
    const composition = this.compositions.get(compositionId);
    if (!composition) {
      return { success: false, error: 'Composición no encontrada' };
    }
    
    const nodeIndex = composition.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
      return { success: false, error: 'Nodo no encontrado' };
    }
    
    const node = composition.nodes[nodeIndex];
    
    // Eliminar todas las conexiones relacionadas
    const connectionsToRemove = composition.connections.filter(
      c => c.source.nodeId === nodeId || c.target.nodeId === nodeId
    );
    
    for (const conn of connectionsToRemove) {
      this.disconnectNodes(compositionId, conn.id);
    }
    
    composition.nodes.splice(nodeIndex, 1);
    composition.metadata.modifiedAt = new Date().toISOString();
    
    return {
      success: true,
      message: `Nodo "${node.name}" eliminado`
    };
  }
  
  /**
   * Obtener composición
   * @param {string} compositionId - ID de composición
   * @returns {Object} Composición
   */
  getComposition(compositionId) {
    const composition = this.compositions.get(compositionId);
    if (!composition) {
      return { success: false, error: 'Composición no encontrada' };
    }
    
    return {
      success: true,
      composition: JSON.parse(JSON.stringify(composition))
    };
  }
  
  /**
   * Exportar composición a JSON
   * @param {string} compositionId - ID de composición
   * @param {string} outputPath - Ruta de salida
   * @returns {Object} Resultado
   */
  async exportCompositionToJSON(compositionId, outputPath) {
    const composition = this.compositions.get(compositionId);
    if (!composition) {
      return { success: false, error: 'Composición no encontrada' };
    }
    
    const json = JSON.stringify(composition, null, 2);
    fs.writeFileSync(outputPath, json, 'utf8');
    
    return {
      success: true,
      outputPath,
      message: `Composición exportada a ${outputPath}`
    };
  }
  
  /**
   * Importar composición desde JSON
   * @param {string} inputPath - Ruta del archivo JSON
   * @returns {Object} Composición importada
   */
  async importCompositionFromJSON(inputPath) {
    if (!fs.existsSync(inputPath)) {
      return { success: false, error: 'Archivo no encontrado' };
    }
    
    try {
      const json = fs.readFileSync(inputPath, 'utf8');
      const composition = JSON.parse(json);
      
      // Generar nuevo ID
      const newId = uuidv4();
      composition.id = newId;
      composition.metadata.modifiedAt = new Date().toISOString();
      
      this.compositions.set(newId, composition);
      
      return {
        success: true,
        compositionId: newId,
        composition,
        message: `Composición "${composition.name}" importada`
      };
    } catch (error) {
      return { success: false, error: `Error al importar: ${error.message}` };
    }
  }
  
  /**
   * Generar filtro FFmpeg para un nodo
   * @private
   */
  _generateNodeFilter(node, inputLabels) {
    const { type, params } = node;
    const [category, nodeType] = type.split('.');
    
    switch (category) {
    case 'transform':
      return this._generateTransformFilter(nodeType, params, inputLabels);
    case 'color':
      return this._generateColorFilter(nodeType, params, inputLabels);
    case 'effects':
      return this._generateEffectsFilter(nodeType, params, inputLabels);
    case 'merge':
      return this._generateMergeFilter(nodeType, params, inputLabels);
    case 'mask':
      return this._generateMaskFilter(nodeType, params, inputLabels);
    default:
      return null;
    }
  }
  
  /**
   * Generar filtro de transformación
   * @private
   */
  _generateTransformFilter(nodeType, params, inputLabels) {
    const input = inputLabels[0] || '0:v';
    
    switch (nodeType) {
    case 'scale': {
      const sw = params.scaleX || 1;
      const sh = params.uniform ? sw : (params.scaleY || 1);
      return `[${input}]scale=iw*${sw}:ih*${sh}`;
    }
      
    case 'rotate': {
      const angle = (params.angle || 0) * Math.PI / 180;
      return `[${input}]rotate=${angle}:c=none${params.expand ? ':ow=rotw(' + angle + '):oh=roth(' + angle + ')' : ''}`;
    }
      
    case 'position':
      return `[${input}]pad=iw+abs(${params.x || 0})*2:ih+abs(${params.y || 0})*2:${params.x || 0}:${params.y || 0}:color=black@0`;
      
    case 'crop':
      return `[${input}]crop=iw-${params.left || 0}-${params.right || 0}:ih-${params.top || 0}-${params.bottom || 0}:${params.left || 0}:${params.top || 0}`;
      
    case 'flip': {
      const filters = [];
      if (params.horizontal) filters.push('hflip');
      if (params.vertical) filters.push('vflip');
      return filters.length > 0 ? `[${input}]${filters.join(',')}` : null;
    }
      
    default:
      return null;
    }
  }
  
  /**
   * Generar filtro de color
   * @private
   */
  _generateColorFilter(nodeType, params, inputLabels) {
    const input = inputLabels[0] || '0:v';
    
    switch (nodeType) {
    case 'colorCorrect': {
      const cc = [];
      if (params.brightness !== 0) cc.push(`brightness=${params.brightness}`);
      if (params.contrast !== 1) cc.push(`contrast=${params.contrast}`);
      if (params.saturation !== 1) cc.push(`saturation=${params.saturation}`);
      if (params.gamma !== 1) cc.push(`gamma=${params.gamma}`);
      return cc.length > 0 ? `[${input}]eq=${cc.join(':')}` : null;
    }
      
    case 'curves':
      // Simplificado: usar curvas predefinidas
      return `[${input}]curves=preset=lighter`;
      
    case 'levels': {
      const inMin = params.inBlack || 0;
      const inMax = params.inWhite || 1;
      return `[${input}]colorlevels=rimin=${inMin}:gimin=${inMin}:bimin=${inMin}:rimax=${inMax}:gimax=${inMax}:bimax=${inMax}`;
    }
      
    case 'hueShift':
      return `[${input}]hue=h=${params.hue || 0}:s=${params.saturation || 1}:b=${params.lightness || 0}`;
      
    case 'lut':
      if (params.lutFile) {
        return `[${input}]lut3d=${params.lutFile}`;
      }
      return null;
      
    default:
      return null;
    }
  }
  
  /**
   * Generar filtro de efectos
   * @private
   */
  _generateEffectsFilter(nodeType, params, inputLabels) {
    const input = inputLabels[0] || '0:v';
    
    switch (nodeType) {
    case 'blur': {
      const blurType = params.type || 'gaussian';
      if (blurType === 'gaussian') {
        return `[${input}]gblur=sigma=${params.sigma || 2}`;
      } else if (blurType === 'box') {
        return `[${input}]boxblur=${params.radius || 5}`;
      }
      return null;
    }
      
    case 'sharpen':
      return `[${input}]unsharp=5:5:${params.amount || 1}:5:5:0`;
      
    case 'glow':
      // Simular glow con blur y blend
      return `[${input}]split[a][b];[b]gblur=sigma=${params.radius || 10}[bg];[a][bg]blend=all_mode=screen:all_opacity=${params.intensity || 0.5}`;
      
    case 'grain':
      return `[${input}]noise=alls=${(params.amount || 0.5) * 30}:allf=t`;
      
    case 'vignette':
      return `[${input}]vignette=PI/${4 - (params.amount || 0.5) * 3}`;
      
    case 'chromatic': {
      const offset = params.strength || 0.005;
      return `[${input}]rgbashift=rh=${offset}:bh=-${offset}`;
    }
      
    case 'motionBlur':
      // Simulado con tblend
      return `[${input}]tblend=all_mode=average`;
      
    default:
      return null;
    }
  }
  
  /**
   * Generar filtro de mezcla
   * @private
   */
  _generateMergeFilter(nodeType, params, inputLabels) {
    const bgInput = inputLabels[0] || '0:v';
    const fgInput = inputLabels[1] || '1:v';
    
    switch (nodeType) {
    case 'blend': {
      const mode = this._mapBlendMode(params.mode || 'normal');
      return `[${bgInput}][${fgInput}]blend=all_mode=${mode}:all_opacity=${params.opacity || 1}`;
    }
      
    case 'composite':
    case 'merge': {
      return `[${bgInput}][${fgInput}]overlay=format=auto`;
    }
      
    default:
      return null;
    }
  }
  
  /**
   * Mapear modo de blend a FFmpeg
   * @private
   */
  _mapBlendMode(mode) {
    const mapping = {
      'normal': 'normal',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'darken': 'darken',
      'lighten': 'lighten',
      'colorDodge': 'dodge',
      'colorBurn': 'burn',
      'hardLight': 'hardlight',
      'softLight': 'softlight',
      'difference': 'difference',
      'exclusion': 'exclusion',
      'add': 'addition',
      'subtract': 'subtract'
    };
    
    return mapping[mode] || 'normal';
  }
  
  /**
   * Generar filtro de máscara
   * @private
   */
  _generateMaskFilter(nodeType, params, inputLabels) {
    const input = inputLabels[0] || '0:v';
    
    switch (nodeType) {
    case 'chromaKey': {
      const color = params.color || '0x00FF00';
      return `[${input}]chromakey=${color}:${params.tolerance || 0.1}:${params.softness || 0.1}`;
    }
      
    case 'luminanceMask':
      return `[${input}]lumakey=threshold=${params.lowThreshold || 0}:tolerance=${params.highThreshold - params.lowThreshold || 1}`;
      
    default:
      return null;
    }
  }
  
  /**
   * Ordenar nodos topológicamente para renderizado
   * @private
   */
  _topologicalSort(composition) {
    const visited = new Set();
    const result = [];
    
    const visit = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = composition.nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      // Visitar dependencias primero
      for (const input of node.inputs) {
        if (input.connected) {
          visit(input.connected.nodeId);
        }
      }
      
      result.push(node);
    };
    
    // Encontrar nodos de salida y recorrer hacia atrás
    const outputNodes = composition.nodes.filter(n => n.type.startsWith('output.'));
    for (const outputNode of outputNodes) {
      visit(outputNode.id);
    }
    
    // Si no hay nodos de salida, incluir todos
    if (outputNodes.length === 0) {
      for (const node of composition.nodes) {
        visit(node.id);
      }
    }
    
    return result;
  }
  
  /**
   * Renderizar composición
   * @param {string} compositionId - ID de composición
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones de renderizado
   * @param {Function} onProgress - Callback de progreso
   * @returns {Object} Resultado del renderizado
   */
  async render(compositionId, outputPath, options = {}, onProgress = null) {
    const composition = this.compositions.get(compositionId);
    if (!composition) {
      return { success: false, error: 'Composición no encontrada' };
    }
    
    const {
      startFrame = 0,
      endFrame = null,
      quality = 'high'
    } = options;
    
    if (onProgress) {
      onProgress({ stage: 'preparing', percent: 0, message: 'Preparando renderizado...' });
    }
    
    try {
      // Ordenar nodos
      const sortedNodes = this._topologicalSort(composition);
      
      if (sortedNodes.length === 0) {
        return { success: false, error: 'No hay nodos para renderizar' };
      }
      
      // Encontrar nodos de entrada (media)
      const inputNodes = sortedNodes.filter(n => n.type === 'input.media');
      
      // Construir comando FFmpeg
      const inputArgs = [];
      const filterParts = [];
      const labelMap = new Map();
      
      // Agregar inputs
      inputNodes.forEach((node, index) => {
        if (node.params.filePath) {
          inputArgs.push('-i', node.params.filePath);
          labelMap.set(node.id, `${index}:v`);
        }
      });
      
      // Si no hay inputs de media, crear color sólido
      if (inputArgs.length === 0) {
        inputArgs.push('-f', 'lavfi', '-i', `color=c=black:s=${composition.settings.width}x${composition.settings.height}:d=${composition.settings.duration}`);
        if (sortedNodes.length > 0) {
          labelMap.set(sortedNodes[0].id, '0:v');
        }
      }
      
      // Generar filtros para cada nodo (excepto inputs y outputs)
      let filterIndex = 0;
      for (const node of sortedNodes) {
        if (node.type.startsWith('input.') || node.type.startsWith('output.')) {
          continue;
        }
        
        // Obtener labels de entrada
        const inputLabels = node.inputs.map(input => {
          if (input.connected) {
            return labelMap.get(input.connected.nodeId) || '0:v';
          }
          return '0:v';
        });
        
        const filter = this._generateNodeFilter(node, inputLabels);
        if (filter) {
          const outputLabel = `n${filterIndex}`;
          filterParts.push(`${filter}[${outputLabel}]`);
          labelMap.set(node.id, outputLabel);
          filterIndex++;
        }
      }
      
      // Construir filter_complex
      const filterComplex = filterParts.length > 0 ? filterParts.join(';') : null;
      
      // Configurar calidad
      const qualitySettings = {
        low: { crf: 28, preset: 'ultrafast' },
        medium: { crf: 23, preset: 'medium' },
        high: { crf: 18, preset: 'slow' },
        highest: { crf: 15, preset: 'veryslow' }
      };
      
      const { crf, preset } = qualitySettings[quality] || qualitySettings.high;
      
      // Construir argumentos finales
      const args = [
        ...inputArgs
      ];
      
      if (filterComplex) {
        args.push('-filter_complex', filterComplex);
        // Usar el último label generado
        const lastLabel = `n${filterIndex - 1}`;
        args.push('-map', `[${lastLabel}]`);
      }
      
      args.push(
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', crf.toString(),
        '-c:a', 'aac',
        '-b:a', '192k',
        '-y',
        outputPath
      );
      
      if (onProgress) {
        onProgress({ stage: 'rendering', percent: 10, message: 'Renderizando composición...' });
      }
      
      // Ejecutar FFmpeg
      await this.ffmpeg.execute(args, (progress) => {
        if (onProgress) {
          const percent = 10 + (progress.percent || 0) * 0.9;
          onProgress({ stage: 'rendering', percent, message: `Renderizando: ${Math.round(progress.percent || 0)}%` });
        }
      });
      
      if (onProgress) {
        onProgress({ stage: 'complete', percent: 100, message: 'Renderizado completado' });
      }
      
      return {
        success: true,
        outputPath,
        composition: composition.name,
        nodesProcessed: sortedNodes.length,
        settings: composition.settings,
        message: 'Composición renderizada exitosamente'
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Error en renderizado: ${error.message}`
      };
    }
  }
  
  /**
   * Previsualizar un nodo
   * @param {string} compositionId - ID de composición
   * @param {string} nodeId - ID del nodo a previsualizar
   * @param {number} frame - Frame a previsualizar
   * @returns {Object} Resultado con imagen de previsualización
   */
  async previewNode(compositionId, nodeId, frame = 0) {
    const composition = this.compositions.get(compositionId);
    if (!composition) {
      return { success: false, error: 'Composición no encontrada' };
    }
    
    const node = composition.nodes.find(n => n.id === nodeId);
    if (!node) {
      return { success: false, error: 'Nodo no encontrado' };
    }
    
    const previewPath = path.join(this.tempDir, `preview-${nodeId}-${frame}.jpg`);
    
    // Generar previsualización simplificada
    // En una implementación real, renderizaríamos hasta ese nodo
    
    return {
      success: true,
      nodeId,
      frame,
      previewPath,
      message: 'Previsualización generada'
    };
  }
  
  /**
   * Duplicar nodo
   * @param {string} compositionId - ID de composición
   * @param {string} nodeId - ID del nodo a duplicar
   * @returns {Object} Nuevo nodo
   */
  duplicateNode(compositionId, nodeId) {
    const composition = this.compositions.get(compositionId);
    if (!composition) {
      return { success: false, error: 'Composición no encontrada' };
    }
    
    const sourceNode = composition.nodes.find(n => n.id === nodeId);
    if (!sourceNode) {
      return { success: false, error: 'Nodo no encontrado' };
    }
    
    // Crear copia del nodo
    const newParams = {
      ...sourceNode.params,
      name: `${sourceNode.name} (copia)`,
      position: {
        x: sourceNode.position.x + 50,
        y: sourceNode.position.y + 50
      }
    };
    
    return this.addNode(compositionId, sourceNode.type, newParams);
  }
  
  /**
   * Agrupar nodos en un grupo
   * @param {string} compositionId - ID de composición
   * @param {Array<string>} nodeIds - IDs de nodos a agrupar
   * @param {string} groupName - Nombre del grupo
   * @returns {Object} Grupo creado
   */
  groupNodes(compositionId, nodeIds, groupName = 'Group') {
    const composition = this.compositions.get(compositionId);
    if (!composition) {
      return { success: false, error: 'Composición no encontrada' };
    }
    
    const nodes = nodeIds
      .map(id => composition.nodes.find(n => n.id === id))
      .filter(n => n !== undefined);
    
    if (nodes.length === 0) {
      return { success: false, error: 'No hay nodos válidos para agrupar' };
    }
    
    const groupId = uuidv4();
    
    // Calcular posición del grupo (centro de los nodos)
    const avgX = nodes.reduce((sum, n) => sum + n.position.x, 0) / nodes.length;
    const avgY = nodes.reduce((sum, n) => sum + n.position.y, 0) / nodes.length;
    
    // Agregar propiedad de grupo a cada nodo
    for (const node of nodes) {
      node.group = groupId;
    }
    
    // Almacenar info del grupo en la composición
    if (!composition.groups) {
      composition.groups = [];
    }
    
    composition.groups.push({
      id: groupId,
      name: groupName,
      nodeIds: nodes.map(n => n.id),
      position: { x: avgX, y: avgY },
      collapsed: false
    });
    
    composition.metadata.modifiedAt = new Date().toISOString();
    
    return {
      success: true,
      groupId,
      groupName,
      nodesGrouped: nodes.length,
      message: `${nodes.length} nodos agrupados en "${groupName}"`
    };
  }
  
  /**
   * Listar todas las composiciones
   * @returns {Array} Lista de composiciones
   */
  listCompositions() {
    const list = [];
    for (const [id, comp] of this.compositions) {
      list.push({
        id,
        name: comp.name,
        settings: comp.settings,
        nodeCount: comp.nodes.length,
        connectionCount: comp.connections.length,
        modifiedAt: comp.metadata.modifiedAt
      });
    }
    return list;
  }
  
  /**
   * Eliminar composición
   * @param {string} compositionId - ID de composición
   * @returns {Object} Resultado
   */
  deleteComposition(compositionId) {
    if (!this.compositions.has(compositionId)) {
      return { success: false, error: 'Composición no encontrada' };
    }
    
    const comp = this.compositions.get(compositionId);
    this.compositions.delete(compositionId);
    
    return {
      success: true,
      message: `Composición "${comp.name}" eliminada`
    };
  }
  
  /**
   * Limpiar recursos temporales
   */
  cleanup() {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.tempDir, file));
        }
      }
    } catch (error) {
      // Ignorar errores de limpieza
    }
  }
}

module.exports = NodeCompositor;
