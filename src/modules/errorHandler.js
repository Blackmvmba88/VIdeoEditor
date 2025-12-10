/**
 * Módulo Manejador de Errores
 * Manejo centralizado de errores y mensajes amigables al usuario
 */

/**
 * Clase de error personalizado de la aplicación
 */
class VideoEditorError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'VideoEditorError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * Enumeración de códigos de error
 */
const ErrorCodes = {
  // Errores de archivo (1000-1999)
  FILE_NOT_FOUND: 1001,
  FILE_READ_ERROR: 1002,
  FILE_WRITE_ERROR: 1003,
  FILE_PERMISSION_DENIED: 1004,
  FILE_INVALID_FORMAT: 1005,
  FILE_TOO_LARGE: 1006,
  FILE_CORRUPTED: 1007,

  // Errores de FFmpeg (2000-2999)
  FFMPEG_NOT_FOUND: 2001,
  FFMPEG_EXECUTION_ERROR: 2002,
  FFMPEG_INVALID_INPUT: 2003,
  FFMPEG_CODEC_NOT_SUPPORTED: 2004,
  FFMPEG_OUTPUT_ERROR: 2005,

  // Errores de procesamiento (3000-3999)
  PROCESSING_FAILED: 3001,
  PROCESSING_CANCELLED: 3002,
  PROCESSING_TIMEOUT: 3003,
  INVALID_TIME_RANGE: 3004,
  INCOMPATIBLE_FORMATS: 3005,

  // Errores de validación (4000-4999)
  VALIDATION_FAILED: 4001,
  INVALID_PARAMETER: 4002,
  MISSING_REQUIRED_FIELD: 4003,

  // Errores del sistema (5000-5999)
  SYSTEM_ERROR: 5001,
  OUT_OF_MEMORY: 5002,
  DISK_FULL: 5003,

  // Desconocido
  UNKNOWN_ERROR: 9999
};

/**
 * Mensajes de error amigables al usuario
 */
const ErrorMessages = {
  [ErrorCodes.FILE_NOT_FOUND]: 'No se pudo encontrar el archivo especificado. Por favor verifique la ruta del archivo.',
  [ErrorCodes.FILE_READ_ERROR]: 'No se puede leer el archivo. Por favor verifique los permisos del archivo.',
  [ErrorCodes.FILE_WRITE_ERROR]: 'No se puede escribir en la ubicación de salida. Por favor verifique los permisos y el espacio en disco disponible.',
  [ErrorCodes.FILE_PERMISSION_DENIED]: 'Acceso denegado. Por favor verifique sus permisos para este archivo o directorio.',
  [ErrorCodes.FILE_INVALID_FORMAT]: 'El formato de archivo no es compatible. Por favor use un formato de video compatible.',
  [ErrorCodes.FILE_TOO_LARGE]: 'El archivo es demasiado grande para procesar. Por favor use un archivo más pequeño.',
  [ErrorCodes.FILE_CORRUPTED]: 'El archivo parece estar corrupto o incompleto.',

  [ErrorCodes.FFMPEG_NOT_FOUND]: 'FFmpeg no está instalado o no se encuentra en el PATH. Por favor instale FFmpeg para usar esta aplicación.',
  [ErrorCodes.FFMPEG_EXECUTION_ERROR]: 'Ocurrió un error al procesar el video. Por favor intente de nuevo.',
  [ErrorCodes.FFMPEG_INVALID_INPUT]: 'El archivo de entrada no puede procesarse. Puede estar corrupto o en un formato no compatible.',
  [ErrorCodes.FFMPEG_CODEC_NOT_SUPPORTED]: 'El códec de video no es compatible. Por favor convierta a un formato compatible.',
  [ErrorCodes.FFMPEG_OUTPUT_ERROR]: 'Error al crear el archivo de salida. Por favor verifique la ruta de salida.',

  [ErrorCodes.PROCESSING_FAILED]: 'El procesamiento de video falló. Por favor intente de nuevo con diferentes configuraciones.',
  [ErrorCodes.PROCESSING_CANCELLED]: 'El procesamiento fue cancelado.',
  [ErrorCodes.PROCESSING_TIMEOUT]: 'El procesamiento agotó el tiempo de espera. El archivo puede ser demasiado grande o complejo.',
  [ErrorCodes.INVALID_TIME_RANGE]: 'Rango de tiempo no válido especificado. El tiempo final debe ser mayor que el tiempo inicial.',
  [ErrorCodes.INCOMPATIBLE_FORMATS]: 'Los archivos seleccionados tienen formatos incompatibles. Puede ser necesaria la recodificación.',

  [ErrorCodes.VALIDATION_FAILED]: 'La validación falló. Por favor verifique su entrada.',
  [ErrorCodes.INVALID_PARAMETER]: 'Se proporcionó un parámetro no válido.',
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 'Falta un campo requerido.',

  [ErrorCodes.SYSTEM_ERROR]: 'Ocurrió un error del sistema. Por favor reinicie la aplicación.',
  [ErrorCodes.OUT_OF_MEMORY]: 'Sin memoria. Por favor cierre otras aplicaciones e intente de nuevo.',
  [ErrorCodes.DISK_FULL]: 'No hay suficiente espacio en disco disponible. Por favor libere algo de espacio.',

  [ErrorCodes.UNKNOWN_ERROR]: 'Ocurrió un error desconocido. Por favor intente de nuevo.'
};

/**
 * Clase Manejador de Errores
 */
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.onError = null;
  }

  /**
   * Crear un VideoEditorError
   * @param {number} code - Código de error
   * @param {string} customMessage - Mensaje personalizado opcional
   * @param {*} details - Detalles opcionales del error
   * @returns {VideoEditorError}
   */
  createError(code, customMessage = null, details = null) {
    const message = customMessage || ErrorMessages[code] || ErrorMessages[ErrorCodes.UNKNOWN_ERROR];
    return new VideoEditorError(message, code, details);
  }

  /**
   * Manejar un error
   * @param {Error} error - Error a manejar
   * @returns {VideoEditorError}
   */
  handle(error) {
    let videoError;

    if (error instanceof VideoEditorError) {
      videoError = error;
    } else {
      videoError = this.parseError(error);
    }

    this.logError(videoError);

    if (this.onError) {
      this.onError(videoError);
    }

    return videoError;
  }

  /**
   * Parsear error nativo a VideoEditorError
   * @param {Error} error - Error nativo
   * @returns {VideoEditorError}
   */
  parseError(error) {
    const message = error.message || '';
    const messageLower = message.toLowerCase();

    if (messageLower.includes('enoent') || messageLower.includes('not found')) {
      return this.createError(ErrorCodes.FILE_NOT_FOUND, null, { original: message });
    }

    if (messageLower.includes('eacces') || messageLower.includes('permission denied')) {
      return this.createError(ErrorCodes.FILE_PERMISSION_DENIED, null, { original: message });
    }

    if (messageLower.includes('enospc') || messageLower.includes('no space')) {
      return this.createError(ErrorCodes.DISK_FULL, null, { original: message });
    }

    if (messageLower.includes('ffmpeg') || messageLower.includes('ffprobe')) {
      if (messageLower.includes('not found') || messageLower.includes('spawn')) {
        return this.createError(ErrorCodes.FFMPEG_NOT_FOUND, null, { original: message });
      }
      return this.createError(ErrorCodes.FFMPEG_EXECUTION_ERROR, null, { original: message });
    }

    if (messageLower.includes('invalid') || messageLower.includes('corrupt')) {
      return this.createError(ErrorCodes.FILE_CORRUPTED, null, { original: message });
    }

    return this.createError(ErrorCodes.UNKNOWN_ERROR, message, { original: message });
  }

  /**
   * Registrar error
   * @param {VideoEditorError} error - Error a registrar
   */
  logError(error) {
    this.errorLog.push(error.toJSON());

    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    console.error(`[${error.timestamp}] Error ${error.code}: ${error.message}`);
  }

  /**
   * Obtener registro de errores
   * @returns {Object[]}
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * Limpiar registro de errores
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Establecer callback de error
   * @param {Function} callback - Callback de error
   */
  setErrorCallback(callback) {
    this.onError = callback;
  }

  /**
   * Obtener mensaje amigable para código de error
   * @param {number} code - Código de error
   * @returns {string}
   */
  getUserMessage(code) {
    return ErrorMessages[code] || ErrorMessages[ErrorCodes.UNKNOWN_ERROR];
  }

  /**
   * Verificar si el error es recuperable
   * @param {VideoEditorError} error - Error a verificar
   * @returns {boolean}
   */
  isRecoverable(error) {
    const nonRecoverableCodes = [
      ErrorCodes.FFMPEG_NOT_FOUND,
      ErrorCodes.OUT_OF_MEMORY,
      ErrorCodes.DISK_FULL,
      ErrorCodes.SYSTEM_ERROR
    ];

    return !nonRecoverableCodes.includes(error.code);
  }

  /**
   * Obtener sugerencias de recuperación para error
   * @param {VideoEditorError} error - Error
   * @returns {string[]}
   */
  getRecoverySuggestions(error) {
    const suggestions = [];

    switch (error.code) {
    case ErrorCodes.FILE_NOT_FOUND:
      suggestions.push('Verifique si la ruta del archivo es correcta');
      suggestions.push('Asegúrese de que el archivo no haya sido movido o eliminado');
      break;

    case ErrorCodes.FILE_PERMISSION_DENIED:
      suggestions.push('Ejecute la aplicación con privilegios de administrador');
      suggestions.push('Verifique los permisos del archivo y la carpeta');
      break;

    case ErrorCodes.FFMPEG_NOT_FOUND:
      suggestions.push('Instale FFmpeg desde https://ffmpeg.org');
      suggestions.push('Agregue FFmpeg al PATH del sistema');
      break;

    case ErrorCodes.FILE_INVALID_FORMAT:
      suggestions.push('Convierta el archivo a un formato compatible (MP4, MOV, AVI)');
      suggestions.push('Verifique si el archivo está corrupto');
      break;

    case ErrorCodes.DISK_FULL:
      suggestions.push('Libere espacio en disco');
      suggestions.push('Elija una ubicación de salida diferente');
      break;

    case ErrorCodes.OUT_OF_MEMORY:
      suggestions.push('Cierre otras aplicaciones');
      suggestions.push('Reinicie la aplicación');
      suggestions.push('Procese archivos más pequeños');
      break;

    default:
      suggestions.push('Intente de nuevo con diferentes configuraciones');
      suggestions.push('Reinicie la aplicación');
    }

    return suggestions;
  }
}

module.exports = {
  VideoEditorError,
  ErrorCodes,
  ErrorMessages,
  ErrorHandler
};
