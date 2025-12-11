/**
 * SubtitleTranslator - Traducción de subtítulos
 * 
 * Traduce subtítulos entre idiomas usando servicios externos
 * o diccionarios locales básicos.
 * 
 * Formatos soportados: SRT, VTT, ASS/SSA
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

class SubtitleTranslator {
  constructor(options = {}) {
    this.tempDir = path.join(os.tmpdir(), 'video-editor-translation');
    
    // Idiomas soportados (códigos ISO 639-1)
    this.languages = {
      en: { name: 'English', native: 'English' },
      es: { name: 'Spanish', native: 'Español' },
      fr: { name: 'French', native: 'Français' },
      de: { name: 'German', native: 'Deutsch' },
      it: { name: 'Italian', native: 'Italiano' },
      pt: { name: 'Portuguese', native: 'Português' },
      zh: { name: 'Chinese', native: '中文' },
      ja: { name: 'Japanese', native: '日本語' },
      ko: { name: 'Korean', native: '한국어' },
      ru: { name: 'Russian', native: 'Русский' },
      ar: { name: 'Arabic', native: 'العربية' },
      hi: { name: 'Hindi', native: 'हिन्दी' },
      nl: { name: 'Dutch', native: 'Nederlands' },
      pl: { name: 'Polish', native: 'Polski' },
      tr: { name: 'Turkish', native: 'Türkçe' },
      vi: { name: 'Vietnamese', native: 'Tiếng Việt' },
      th: { name: 'Thai', native: 'ไทย' },
      id: { name: 'Indonesian', native: 'Bahasa Indonesia' },
      sv: { name: 'Swedish', native: 'Svenska' },
      da: { name: 'Danish', native: 'Dansk' }
    };
    
    // Proveedores de traducción soportados
    this.providers = {
      local: {
        name: 'Local (Básico)',
        description: 'Traducción básica sin conexión',
        requiresApiKey: false
      },
      libre: {
        name: 'LibreTranslate',
        description: 'Servicio gratuito y de código abierto',
        requiresApiKey: false,
        endpoint: 'https://libretranslate.com/translate'
      },
      deepl: {
        name: 'DeepL',
        description: 'Alta calidad, requiere API key',
        requiresApiKey: true
      },
      google: {
        name: 'Google Translate',
        description: 'Amplia cobertura de idiomas',
        requiresApiKey: true
      }
    };
    
    // Configuración del proveedor
    this.provider = options.provider || 'local';
    this.apiKey = options.apiKey || null;
    this.apiEndpoint = options.apiEndpoint || null;
    
    this._ensureTempDir();
  }

  /**
   * Crear directorio temporal
   */
  _ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Obtener idiomas disponibles
   * @returns {Object} Lista de idiomas
   */
  getLanguages() {
    return { ...this.languages };
  }

  /**
   * Obtener proveedores disponibles
   * @returns {Object} Lista de proveedores
   */
  getProviders() {
    return { ...this.providers };
  }

  /**
   * Configurar proveedor de traducción
   * @param {string} provider - Nombre del proveedor
   * @param {Object} config - Configuración (apiKey, endpoint)
   */
  setProvider(provider, config = {}) {
    if (!this.providers[provider]) {
      throw new Error(`Proveedor no soportado: ${provider}`);
    }
    
    this.provider = provider;
    this.apiKey = config.apiKey || null;
    this.apiEndpoint = config.endpoint || null;
  }

  /**
   * Parsear archivo SRT
   * @param {string} content - Contenido del archivo SRT
   * @returns {Array} Array de subtítulos
   */
  parseSRT(content) {
    const subtitles = [];
    const blocks = content.trim().split(/\n\s*\n/);
    
    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 3) continue;
      
      const index = Number.parseInt(lines[0], 10);
      const timeLine = lines[1];
      const text = lines.slice(2).join('\n');
      
      const timeMatch = timeLine.match(
        /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
      );
      
      if (timeMatch) {
        subtitles.push({
          index,
          startTime: timeLine.split('-->')[0].trim(),
          endTime: timeLine.split('-->')[1].trim(),
          text
        });
      }
    }
    
    return subtitles;
  }

  /**
   * Parsear archivo VTT
   * @param {string} content - Contenido del archivo VTT
   * @returns {Array} Array de subtítulos
   */
  parseVTT(content) {
    const subtitles = [];
    // Remover header WEBVTT
    const cleanContent = content.replace(/^WEBVTT.*\n\n?/, '');
    const blocks = cleanContent.trim().split(/\n\s*\n/);
    
    let index = 1;
    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 2) continue;
      
      // VTT puede tener o no número de índice
      let timeLineIndex = 0;
      if (!lines[0].includes('-->')) {
        timeLineIndex = 1;
      }
      
      const timeLine = lines[timeLineIndex];
      const text = lines.slice(timeLineIndex + 1).join('\n');
      
      if (timeLine && timeLine.includes('-->')) {
        subtitles.push({
          index: index++,
          startTime: timeLine.split('-->')[0].trim(),
          endTime: timeLine.split('-->')[1].trim(),
          text
        });
      }
    }
    
    return subtitles;
  }

  /**
   * Generar contenido SRT
   * @param {Array} subtitles - Array de subtítulos
   * @returns {string} Contenido SRT
   */
  generateSRT(subtitles) {
    return subtitles.map((sub, i) => {
      return `${i + 1}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}`;
    }).join('\n\n');
  }

  /**
   * Generar contenido VTT
   * @param {Array} subtitles - Array de subtítulos
   * @returns {string} Contenido VTT
   */
  generateVTT(subtitles) {
    const header = 'WEBVTT\n\n';
    const content = subtitles.map((sub, i) => {
      // Convertir formato de tiempo SRT a VTT si es necesario
      const start = sub.startTime.replace(',', '.');
      const end = sub.endTime.replace(',', '.');
      return `${i + 1}\n${start} --> ${end}\n${sub.text}`;
    }).join('\n\n');
    
    return header + content;
  }

  /**
   * Traducir texto usando el proveedor configurado
   * @param {string} text - Texto a traducir
   * @param {string} sourceLang - Idioma origen
   * @param {string} targetLang - Idioma destino
   * @returns {Promise<string>} Texto traducido
   */
  async translateText(text, sourceLang, targetLang) {
    if (sourceLang === targetLang) {
      return text;
    }
    
    switch (this.provider) {
    case 'local':
      return this._translateLocal(text, sourceLang, targetLang);
    case 'libre':
      return this._translateLibre(text, sourceLang, targetLang);
    case 'deepl':
      return this._translateDeepL(text, sourceLang, targetLang);
    case 'google':
      return this._translateGoogle(text, sourceLang, targetLang);
    default:
      return this._translateLocal(text, sourceLang, targetLang);
    }
  }

  /**
   * Traducción local básica (placeholder para demo)
   */
  _translateLocal(text, sourceLang, targetLang) {
    // Diccionario muy básico para demo
    // En producción, usar un servicio real
    const basicDict = {
      'en-es': {
        'Hello': 'Hola',
        'Goodbye': 'Adiós',
        'Thank you': 'Gracias',
        'Yes': 'Sí',
        'No': 'No',
        'Please': 'Por favor'
      },
      'es-en': {
        'Hola': 'Hello',
        'Adiós': 'Goodbye',
        'Gracias': 'Thank you',
        'Sí': 'Yes',
        'No': 'No',
        'Por favor': 'Please'
      }
    };
    
    const dictKey = `${sourceLang}-${targetLang}`;
    const dict = basicDict[dictKey] || {};
    
    // Intentar traducir palabras conocidas
    let result = text;
    for (const [source, target] of Object.entries(dict)) {
      result = result.replace(new RegExp(source, 'gi'), target);
    }
    
    // Agregar marcador de idioma si no hubo traducción
    if (result === text && Object.keys(dict).length === 0) {
      return `[${targetLang}] ${text}`;
    }
    
    return result;
  }

  /**
   * Traducción usando LibreTranslate (servicio gratuito)
   */
  async _translateLibre(text, sourceLang, targetLang) {
    const endpoint = this.apiEndpoint || 'https://libretranslate.com/translate';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        })
      });
      
      if (!response.ok) {
        throw new Error(`LibreTranslate error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.translatedText || text;
    } catch (error) {
      console.warn('LibreTranslate failed, falling back to local:', error.message);
      return this._translateLocal(text, sourceLang, targetLang);
    }
  }

  /**
   * Traducción usando DeepL API
   */
  async _translateDeepL(text, sourceLang, targetLang) {
    if (!this.apiKey) {
      console.warn('DeepL requires API key, falling back to local');
      return this._translateLocal(text, sourceLang, targetLang);
    }
    
    const endpoint = 'https://api-free.deepl.com/v2/translate';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: [text],
          source_lang: sourceLang.toUpperCase(),
          target_lang: targetLang.toUpperCase()
        })
      });
      
      if (!response.ok) {
        throw new Error(`DeepL error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.translations?.[0]?.text || text;
    } catch (error) {
      console.warn('DeepL failed, falling back to local:', error.message);
      return this._translateLocal(text, sourceLang, targetLang);
    }
  }

  /**
   * Traducción usando Google Cloud Translation API
   */
  async _translateGoogle(text, sourceLang, targetLang) {
    if (!this.apiKey) {
      console.warn('Google Translate requires API key, falling back to local');
      return this._translateLocal(text, sourceLang, targetLang);
    }
    
    const endpoint = `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Google Translate error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data?.translations?.[0]?.translatedText || text;
    } catch (error) {
      console.warn('Google Translate failed, falling back to local:', error.message);
      return this._translateLocal(text, sourceLang, targetLang);
    }
  }

  /**
   * Traducir archivo de subtítulos completo
   * @param {string} inputPath - Ruta del archivo de subtítulos
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones de traducción
   * @returns {Promise<Object>} Resultado
   */
  async translateSubtitles(inputPath, outputPath = null, options = {}) {
    const {
      sourceLang = 'en',
      targetLang = 'es',
      format = null, // auto-detect si es null
      onProgress = null
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }

    // Leer archivo
    const content = fs.readFileSync(inputPath, 'utf-8');
    
    // Detectar formato
    const ext = path.extname(inputPath).toLowerCase();
    const detectedFormat = format || (ext === '.vtt' ? 'vtt' : 'srt');
    
    // Parsear subtítulos
    let subtitles;
    if (detectedFormat === 'vtt') {
      subtitles = this.parseVTT(content);
    } else {
      subtitles = this.parseSRT(content);
    }

    if (onProgress) {
      onProgress({ stage: 'Traduciendo', percent: 0, message: 'Iniciando...' });
    }

    // Traducir cada subtítulo
    const translatedSubtitles = [];
    const total = subtitles.length;
    
    for (let i = 0; i < subtitles.length; i++) {
      const sub = subtitles[i];
      const translatedText = await this.translateText(sub.text, sourceLang, targetLang);
      
      translatedSubtitles.push({
        ...sub,
        text: translatedText
      });

      if (onProgress) {
        const percent = Math.round(((i + 1) / total) * 100);
        onProgress({
          stage: 'Traduciendo',
          percent,
          message: `Subtítulo ${i + 1} de ${total}`
        });
      }
    }

    // Generar archivo de salida
    if (!outputPath) {
      const baseName = path.basename(inputPath, ext);
      outputPath = path.join(
        this.tempDir,
        `${baseName}_${targetLang}${ext}`
      );
    }

    // Generar contenido
    let outputContent;
    if (detectedFormat === 'vtt') {
      outputContent = this.generateVTT(translatedSubtitles);
    } else {
      outputContent = this.generateSRT(translatedSubtitles);
    }

    fs.writeFileSync(outputPath, outputContent, 'utf-8');

    if (onProgress) {
      onProgress({ stage: 'Traduciendo', percent: 100, message: 'Completado' });
    }

    return {
      success: true,
      outputPath,
      sourceLang,
      targetLang,
      format: detectedFormat,
      subtitleCount: translatedSubtitles.length,
      provider: this.provider,
      message: `Traducidos ${translatedSubtitles.length} subtítulos de ${this.languages[sourceLang]?.name || sourceLang} a ${this.languages[targetLang]?.name || targetLang}`
    };
  }

  /**
   * Crear subtítulos en múltiples idiomas
   * @param {string} inputPath - Ruta del archivo original
   * @param {Array} targetLangs - Array de idiomas destino
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado con paths de todos los archivos
   */
  async translateToMultipleLanguages(inputPath, targetLangs, options = {}) {
    const {
      sourceLang = 'en',
      onProgress = null
    } = options;

    const results = [];
    const total = targetLangs.length;

    for (let i = 0; i < targetLangs.length; i++) {
      const targetLang = targetLangs[i];
      
      if (onProgress) {
        onProgress({
          stage: 'Traducción múltiple',
          percent: Math.round((i / total) * 100),
          message: `Traduciendo a ${this.languages[targetLang]?.name || targetLang}...`
        });
      }

      const result = await this.translateSubtitles(inputPath, null, {
        sourceLang,
        targetLang,
        onProgress: null // No pasar callback interno
      });

      results.push({
        language: targetLang,
        languageName: this.languages[targetLang]?.name || targetLang,
        outputPath: result.outputPath,
        subtitleCount: result.subtitleCount
      });
    }

    if (onProgress) {
      onProgress({ stage: 'Traducción múltiple', percent: 100, message: 'Completado' });
    }

    return {
      success: true,
      translations: results,
      message: `Creados subtítulos en ${results.length} idiomas`
    };
  }

  /**
   * Detectar idioma de un texto (muy básico)
   * @param {string} text - Texto a analizar
   * @returns {string} Código de idioma probable
   */
  detectLanguage(text) {
    // Detección muy básica basada en caracteres
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    if (/[\u0600-\u06ff]/.test(text)) return 'ar';
    if (/[\u0400-\u04ff]/.test(text)) return 'ru';
    if (/[\u0900-\u097f]/.test(text)) return 'hi';
    
    // Para idiomas latinos, usar palabras comunes
    const lowerText = text.toLowerCase();
    if (/\b(el|la|los|las|que|de|en|es|por|con)\b/.test(lowerText)) return 'es';
    if (/\b(le|la|les|de|et|en|que|pour|avec)\b/.test(lowerText)) return 'fr';
    if (/\b(der|die|das|und|ist|von|mit|für)\b/.test(lowerText)) return 'de';
    if (/\b(il|la|di|che|per|con|non|una)\b/.test(lowerText)) return 'it';
    if (/\b(o|a|os|as|de|que|em|para|com)\b/.test(lowerText)) return 'pt';
    
    // Por defecto inglés
    return 'en';
  }

  /**
   * Limpiar archivos temporales
   */
  cleanup() {
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(this.tempDir, file));
        } catch {
          // Ignorar errores
        }
      }
    }
  }
}

module.exports = SubtitleTranslator;
