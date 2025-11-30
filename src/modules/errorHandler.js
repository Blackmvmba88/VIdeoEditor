/**
 * Error Handler Module
 * Centralized error handling and user-friendly messages
 */

/**
 * Custom application error class
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
 * Error codes enumeration
 */
const ErrorCodes = {
  // File errors (1000-1999)
  FILE_NOT_FOUND: 1001,
  FILE_READ_ERROR: 1002,
  FILE_WRITE_ERROR: 1003,
  FILE_PERMISSION_DENIED: 1004,
  FILE_INVALID_FORMAT: 1005,
  FILE_TOO_LARGE: 1006,
  FILE_CORRUPTED: 1007,

  // FFmpeg errors (2000-2999)
  FFMPEG_NOT_FOUND: 2001,
  FFMPEG_EXECUTION_ERROR: 2002,
  FFMPEG_INVALID_INPUT: 2003,
  FFMPEG_CODEC_NOT_SUPPORTED: 2004,
  FFMPEG_OUTPUT_ERROR: 2005,

  // Processing errors (3000-3999)
  PROCESSING_FAILED: 3001,
  PROCESSING_CANCELLED: 3002,
  PROCESSING_TIMEOUT: 3003,
  INVALID_TIME_RANGE: 3004,
  INCOMPATIBLE_FORMATS: 3005,

  // Validation errors (4000-4999)
  VALIDATION_FAILED: 4001,
  INVALID_PARAMETER: 4002,
  MISSING_REQUIRED_FIELD: 4003,

  // System errors (5000-5999)
  SYSTEM_ERROR: 5001,
  OUT_OF_MEMORY: 5002,
  DISK_FULL: 5003,

  // Unknown
  UNKNOWN_ERROR: 9999
};

/**
 * User-friendly error messages
 */
const ErrorMessages = {
  [ErrorCodes.FILE_NOT_FOUND]: 'The specified file could not be found. Please check the file path.',
  [ErrorCodes.FILE_READ_ERROR]: 'Unable to read the file. Please check file permissions.',
  [ErrorCodes.FILE_WRITE_ERROR]: 'Unable to write to the output location. Please check permissions and available disk space.',
  [ErrorCodes.FILE_PERMISSION_DENIED]: 'Access denied. Please check your permissions for this file or directory.',
  [ErrorCodes.FILE_INVALID_FORMAT]: 'The file format is not supported. Please use a supported video format.',
  [ErrorCodes.FILE_TOO_LARGE]: 'The file is too large to process. Please use a smaller file.',
  [ErrorCodes.FILE_CORRUPTED]: 'The file appears to be corrupted or incomplete.',

  [ErrorCodes.FFMPEG_NOT_FOUND]: 'FFmpeg is not installed or not found in PATH. Please install FFmpeg to use this application.',
  [ErrorCodes.FFMPEG_EXECUTION_ERROR]: 'An error occurred while processing the video. Please try again.',
  [ErrorCodes.FFMPEG_INVALID_INPUT]: 'The input file cannot be processed. It may be corrupted or in an unsupported format.',
  [ErrorCodes.FFMPEG_CODEC_NOT_SUPPORTED]: 'The video codec is not supported. Please convert to a supported format.',
  [ErrorCodes.FFMPEG_OUTPUT_ERROR]: 'Failed to create the output file. Please check the output path.',

  [ErrorCodes.PROCESSING_FAILED]: 'Video processing failed. Please try again with different settings.',
  [ErrorCodes.PROCESSING_CANCELLED]: 'Processing was cancelled.',
  [ErrorCodes.PROCESSING_TIMEOUT]: 'Processing timed out. The file may be too large or complex.',
  [ErrorCodes.INVALID_TIME_RANGE]: 'Invalid time range specified. End time must be greater than start time.',
  [ErrorCodes.INCOMPATIBLE_FORMATS]: 'The selected files have incompatible formats. Re-encoding may be required.',

  [ErrorCodes.VALIDATION_FAILED]: 'Validation failed. Please check your input.',
  [ErrorCodes.INVALID_PARAMETER]: 'Invalid parameter provided.',
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 'A required field is missing.',

  [ErrorCodes.SYSTEM_ERROR]: 'A system error occurred. Please restart the application.',
  [ErrorCodes.OUT_OF_MEMORY]: 'Out of memory. Please close other applications and try again.',
  [ErrorCodes.DISK_FULL]: 'Not enough disk space available. Please free up some space.',

  [ErrorCodes.UNKNOWN_ERROR]: 'An unknown error occurred. Please try again.'
};

/**
 * Error Handler Class
 */
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.onError = null;
  }

  /**
   * Create a VideoEditorError
   * @param {number} code - Error code
   * @param {string} customMessage - Optional custom message
   * @param {*} details - Optional error details
   * @returns {VideoEditorError}
   */
  createError(code, customMessage = null, details = null) {
    const message = customMessage || ErrorMessages[code] || ErrorMessages[ErrorCodes.UNKNOWN_ERROR];
    return new VideoEditorError(message, code, details);
  }

  /**
   * Handle an error
   * @param {Error} error - Error to handle
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
   * Parse native error to VideoEditorError
   * @param {Error} error - Native error
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
   * Log error
   * @param {VideoEditorError} error - Error to log
   */
  logError(error) {
    this.errorLog.push(error.toJSON());

    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    console.error(`[${error.timestamp}] Error ${error.code}: ${error.message}`);
  }

  /**
   * Get error log
   * @returns {Object[]}
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Set error callback
   * @param {Function} callback - Error callback
   */
  setErrorCallback(callback) {
    this.onError = callback;
  }

  /**
   * Get user-friendly message for error code
   * @param {number} code - Error code
   * @returns {string}
   */
  getUserMessage(code) {
    return ErrorMessages[code] || ErrorMessages[ErrorCodes.UNKNOWN_ERROR];
  }

  /**
   * Check if error is recoverable
   * @param {VideoEditorError} error - Error to check
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
   * Get recovery suggestions for error
   * @param {VideoEditorError} error - Error
   * @returns {string[]}
   */
  getRecoverySuggestions(error) {
    const suggestions = [];

    switch (error.code) {
    case ErrorCodes.FILE_NOT_FOUND:
      suggestions.push('Check if the file path is correct');
      suggestions.push('Ensure the file has not been moved or deleted');
      break;

    case ErrorCodes.FILE_PERMISSION_DENIED:
      suggestions.push('Run the application with administrator privileges');
      suggestions.push('Check file and folder permissions');
      break;

    case ErrorCodes.FFMPEG_NOT_FOUND:
      suggestions.push('Install FFmpeg from https://ffmpeg.org');
      suggestions.push('Add FFmpeg to your system PATH');
      break;

    case ErrorCodes.FILE_INVALID_FORMAT:
      suggestions.push('Convert the file to a supported format (MP4, MOV, AVI)');
      suggestions.push('Check if the file is corrupted');
      break;

    case ErrorCodes.DISK_FULL:
      suggestions.push('Free up disk space');
      suggestions.push('Choose a different output location');
      break;

    case ErrorCodes.OUT_OF_MEMORY:
      suggestions.push('Close other applications');
      suggestions.push('Restart the application');
      suggestions.push('Process smaller files');
      break;

    default:
      suggestions.push('Try again with different settings');
      suggestions.push('Restart the application');
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
