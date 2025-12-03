/**
 * Módulo Validador de Archivos
 * Valida archivos de video antes de procesarlos
 */

const fs = require('fs');
const path = require('path');
const FormatDetector = require('./formatDetector');

class FileValidator {
  constructor() {
    this.formatDetector = new FormatDetector();

    this.maxFileSize = 10 * 1024 * 1024 * 1024;
    this.minFileSize = 1024;
  }

  /**
   * Validar un solo archivo
   * @param {string} filePath - Ruta al archivo
   * @returns {Promise<{valid: boolean, errors: string[], warnings: string[]}>}
   */
  async validateFile(filePath) {
    const errors = [];
    const warnings = [];

    if (!filePath || typeof filePath !== 'string') {
      errors.push('Invalid file path provided');
      return { valid: false, errors, warnings };
    }

    if (!fs.existsSync(filePath)) {
      errors.push(`File not found: ${filePath}`);
      return { valid: false, errors, warnings };
    }

    const stats = fs.statSync(filePath);

    if (!stats.isFile()) {
      errors.push('Path is not a file');
      return { valid: false, errors, warnings };
    }

    if (stats.size < this.minFileSize) {
      errors.push('File is too small to be a valid video');
      return { valid: false, errors, warnings };
    }

    if (stats.size > this.maxFileSize) {
      errors.push(`File exceeds maximum size of ${this.formatBytes(this.maxFileSize)}`);
      return { valid: false, errors, warnings };
    }

    if (!this.formatDetector.isSupportedExtension(filePath)) {
      errors.push(`Unsupported file extension: ${path.extname(filePath)}`);
      return { valid: false, errors, warnings };
    }

    try {
      const format = await this.formatDetector.detectFormat(filePath);

      if (!format.isSupported) {
        errors.push('File format or codec is not supported');
        return { valid: false, errors, warnings };
      }

      if (!format.hasVideo && !format.hasAudio) {
        errors.push('File contains no video or audio streams');
        return { valid: false, errors, warnings };
      }

      if (format.duration <= 0) {
        warnings.push('Could not detect file duration');
      }

      if (format.hasVideo && format.video) {
        if (format.video.width <= 0 || format.video.height <= 0) {
          errors.push('Invalid video dimensions');
          return { valid: false, errors, warnings };
        }

        if (format.video.width > 7680 || format.video.height > 4320) {
          warnings.push('Video resolution exceeds 8K, processing may be slow');
        }
      }

      return { valid: true, errors, warnings, format };
    } catch (error) {
      errors.push(`Failed to analyze file: ${error.message}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Validar múltiples archivos
   * @param {string[]} filePaths - Array de rutas de archivos
   * @returns {Promise<{allValid: boolean, results: Object[]}>}
   */
  async validateFiles(filePaths) {
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      return {
        allValid: false,
        results: [{
          path: null,
          valid: false,
          errors: ['No files provided for validation']
        }]
      };
    }

    const results = [];
    let allValid = true;

    for (const filePath of filePaths) {
      const result = await this.validateFile(filePath);
      results.push({
        path: filePath,
        ...result
      });

      if (!result.valid) {
        allValid = false;
      }
    }

    return { allValid, results };
  }

  /**
   * Validar ruta de salida
   * @param {string} outputPath - Ruta del archivo de salida
   * @returns {{valid: boolean, errors: string[]}}
   */
  validateOutputPath(outputPath) {
    const errors = [];

    if (!outputPath || typeof outputPath !== 'string') {
      errors.push('Invalid output path provided');
      return { valid: false, errors };
    }

    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        errors.push(`Cannot create output directory: ${dir}`);
        return { valid: false, errors };
      }
    }

    const ext = path.extname(outputPath).toLowerCase();
    if (!this.formatDetector.isSupportedExtension(outputPath)) {
      errors.push(`Unsupported output format: ${ext}`);
      return { valid: false, errors };
    }

    if (fs.existsSync(outputPath)) {
      try {
        fs.accessSync(outputPath, fs.constants.W_OK);
      } catch {
        errors.push('Output file exists and is not writable');
        return { valid: false, errors };
      }
    } else {
      try {
        fs.accessSync(dir, fs.constants.W_OK);
      } catch {
        errors.push('Output directory is not writable');
        return { valid: false, errors };
      }
    }

    return { valid: true, errors };
  }

  /**
   * Formatear bytes a formato legible
   * @param {number} bytes - Bytes
   * @returns {string}
   */
  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Establecer tamaño máximo de archivo
   * @param {number} sizeInBytes - Tamaño máximo en bytes
   */
  setMaxFileSize(sizeInBytes) {
    if (sizeInBytes > 0) {
      this.maxFileSize = sizeInBytes;
    }
  }

  /**
   * Verificar si la ruta es segura (sin traversal de ruta)
   * @param {string} filePath - Ruta del archivo
   * @param {string} basePath - Directorio base
   * @returns {boolean}
   */
  isSafePath(filePath, basePath) {
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(basePath);
    return resolvedPath.startsWith(resolvedBase);
  }
}

module.exports = FileValidator;
