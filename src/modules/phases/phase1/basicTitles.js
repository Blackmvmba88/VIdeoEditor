/**
 * BlackMamba Studio - Basic Titles
 * 
 * Editor de títulos básicos con fuentes y estilos.
 * 
 * Características:
 * - Texto personalizable
 * - Múltiples fuentes del sistema
 * - Colores, tamaños y estilos
 * - Posicionamiento flexible
 * - Sombras y contornos
 * - Renderizado sobre video
 * 
 * @module BasicTitles
 */

const FFmpegWrapper = require('../../ffmpegWrapper');
const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

// Estilos de texto predefinidos
const TEXT_STYLES = {
  heading: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: 3
  },
  subheading: {
    fontSize: 48,
    fontWeight: 'normal',
    color: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: 2
  },
  body: {
    fontSize: 32,
    fontWeight: 'normal',
    color: '#ffffff',
    shadowColor: null,
    shadowOffset: 0
  },
  caption: {
    fontSize: 24,
    fontWeight: 'normal',
    color: '#cccccc',
    shadowColor: '#000000',
    shadowOffset: 1
  },
  accent: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#00d4ff',
    shadowColor: '#000000',
    shadowOffset: 2
  }
};

// Posiciones predefinidas
const POSITIONS = {
  topLeft: { x: 50, y: 50 },
  topCenter: { x: '(w-text_w)/2', y: 50 },
  topRight: { x: 'w-text_w-50', y: 50 },
  centerLeft: { x: 50, y: '(h-text_h)/2' },
  center: { x: '(w-text_w)/2', y: '(h-text_h)/2' },
  centerRight: { x: 'w-text_w-50', y: '(h-text_h)/2' },
  bottomLeft: { x: 50, y: 'h-text_h-50' },
  bottomCenter: { x: '(w-text_w)/2', y: 'h-text_h-50' },
  bottomRight: { x: 'w-text_w-50', y: 'h-text_h-50' }
};

class BasicTitles {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.styles = TEXT_STYLES;
    this.positions = POSITIONS;
    this.titles = [];
  }

  /**
   * Obtiene los estilos disponibles
   * @returns {Object} Estilos de texto
   */
  getStyles() {
    return { ...TEXT_STYLES };
  }

  /**
   * Obtiene las posiciones predefinidas
   * @returns {Object} Posiciones
   */
  getPositions() {
    return { ...POSITIONS };
  }

  /**
   * Agrega un título al proyecto
   * @param {Object} config - Configuración del título
   * @returns {Object} Título creado
   */
  addTitle(config) {
    const title = {
      id: `title-${Date.now()}`,
      text: config.text || 'Title',
      font: config.font || 'Arial',
      fontSize: config.fontSize || 48,
      fontColor: config.fontColor || '#ffffff',
      backgroundColor: config.backgroundColor || null,
      position: config.position || 'center',
      x: config.x,
      y: config.y,
      startTime: config.startTime || 0,
      duration: config.duration || 5,
      style: config.style || null,
      shadow: {
        enabled: config.shadowEnabled || false,
        color: config.shadowColor || '#000000',
        offset: config.shadowOffset || 2
      },
      outline: {
        enabled: config.outlineEnabled || false,
        color: config.outlineColor || '#000000',
        width: config.outlineWidth || 2
      }
    };

    // Aplicar estilo predefinido si se especifica
    if (title.style && TEXT_STYLES[title.style]) {
      const style = TEXT_STYLES[title.style];
      title.fontSize = style.fontSize;
      title.fontColor = style.color;
      if (style.shadowColor) {
        title.shadow.enabled = true;
        title.shadow.color = style.shadowColor;
        title.shadow.offset = style.shadowOffset;
      }
    }

    this.titles.push(title);
    return title;
  }

  /**
   * Remueve un título
   * @param {string} titleId - ID del título
   */
  removeTitle(titleId) {
    const index = this.titles.findIndex(t => t.id === titleId);
    if (index === -1) {
      throw new VideoEditorError(`Title ${titleId} not found`, ErrorCodes.INVALID_PARAMETER);
    }
    this.titles.splice(index, 1);
  }

  /**
   * Actualiza un título existente
   * @param {string} titleId - ID del título
   * @param {Object} updates - Actualizaciones
   * @returns {Object} Título actualizado
   */
  updateTitle(titleId, updates) {
    const title = this.titles.find(t => t.id === titleId);
    if (!title) {
      throw new VideoEditorError(`Title ${titleId} not found`, ErrorCodes.INVALID_PARAMETER);
    }

    Object.keys(updates).forEach(key => {
      if (key === 'shadow' || key === 'outline') {
        title[key] = { ...title[key], ...updates[key] };
      } else {
        title[key] = updates[key];
      }
    });

    return title;
  }

  /**
   * Obtiene todos los títulos
   * @returns {Array} Lista de títulos
   */
  getTitles() {
    return [...this.titles];
  }

  /**
   * Renderiza títulos sobre un video
   * @param {string} inputPath - Video de entrada
   * @param {string} outputPath - Video de salida
   * @param {Array} titles - Títulos a renderizar (usa this.titles si no se especifica)
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async renderTitles(inputPath, outputPath, titles = null, onProgress = null) {
    const titlesToRender = titles || this.titles;

    if (titlesToRender.length === 0) {
      // Sin títulos, copiar video
      const args = ['-i', inputPath, '-c', 'copy', '-y', outputPath];
      await this.ffmpeg.execute(args, onProgress);
      return { success: true, outputPath, titlesRendered: 0 };
    }

    // Construir filtros drawtext para cada título
    const filterParts = titlesToRender.map(title => {
      return this.buildDrawtextFilter(title);
    });

    const filterComplex = filterParts.join(',');

    const args = [
      '-i', inputPath,
      '-vf', filterComplex,
      '-c:a', 'copy',
      '-y', outputPath
    ];

    await this.ffmpeg.execute(args, onProgress);

    return {
      success: true,
      outputPath,
      titlesRendered: titlesToRender.length
    };
  }

  /**
   * Construye el filtro drawtext para FFmpeg
   * @param {Object} title - Configuración del título
   * @returns {string} Filtro drawtext
   * @private
   */
  buildDrawtextFilter(title) {
    // Escapar texto para FFmpeg
    const escapedText = title.text
      .replace(/'/g, '\'\\\'\'')
      .replace(/:/g, '\\:');

    // Determinar posición
    let x, y;
    if (title.x !== undefined && title.y !== undefined) {
      x = title.x;
      y = title.y;
    } else if (title.position && POSITIONS[title.position]) {
      x = POSITIONS[title.position].x;
      y = POSITIONS[title.position].y;
    } else {
      x = '(w-text_w)/2';
      y = '(h-text_h)/2';
    }

    // Convertir color hex a formato FFmpeg
    const fontColor = title.fontColor.replace('#', '0x');

    let filter = `drawtext=text='${escapedText}':fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=${title.fontSize}:fontcolor=${fontColor}:x=${x}:y=${y}`;

    // Agregar tiempo de inicio y fin
    if (title.startTime > 0 || title.duration) {
      const endTime = title.startTime + (title.duration || 9999);
      filter += `:enable='between(t,${title.startTime},${endTime})'`;
    }

    // Agregar sombra
    if (title.shadow && title.shadow.enabled) {
      const shadowColor = title.shadow.color.replace('#', '0x');
      filter += `:shadowcolor=${shadowColor}:shadowx=${title.shadow.offset}:shadowy=${title.shadow.offset}`;
    }

    // Agregar contorno
    if (title.outline && title.outline.enabled) {
      const outlineColor = title.outline.color.replace('#', '0x');
      filter += `:borderw=${title.outline.width}:bordercolor=${outlineColor}`;
    }

    return filter;
  }

  /**
   * Limpia todos los títulos
   */
  clearTitles() {
    this.titles = [];
  }
}

module.exports = BasicTitles;
