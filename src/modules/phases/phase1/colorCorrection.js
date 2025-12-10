/**
 * Color Correction Module - Phase 1.3
 * Basic color adjustments (brightness, contrast, saturation)
 */

const { v4: uuidv4 } = require('uuid');

// Default color values
const DEFAULTS = {
  brightness: 0,      // -1 to 1 (0 = no change)
  contrast: 1,        // 0 to 2 (1 = no change)
  saturation: 1,      // 0 to 2 (1 = no change)
  gamma: 1,           // 0.1 to 10 (1 = no change)
  exposure: 0,        // -3 to 3 (0 = no change)
  temperature: 0,     // -1 to 1 (0 = no change, - = cooler, + = warmer)
  tint: 0,            // -1 to 1 (0 = no change)
  highlights: 0,      // -1 to 1
  shadows: 0,         // -1 to 1
  whites: 0,          // -1 to 1
  blacks: 0           // -1 to 1
};

// Preset color corrections
const COLOR_PRESETS = {
  cinematic: {
    name: 'Cinematic',
    values: { contrast: 1.2, saturation: 0.9, brightness: -0.05, shadows: -0.1 }
  },
  warm: {
    name: 'Warm',
    values: { temperature: 0.3, saturation: 1.1 }
  },
  cool: {
    name: 'Cool',
    values: { temperature: -0.3, saturation: 1.05 }
  },
  vintage: {
    name: 'Vintage',
    values: { saturation: 0.8, contrast: 0.95, brightness: 0.05, temperature: 0.15 }
  },
  blackAndWhite: {
    name: 'Black & White',
    values: { saturation: 0 }
  },
  highContrast: {
    name: 'High Contrast',
    values: { contrast: 1.4, blacks: 0.1, whites: 0.1 }
  },
  lowContrast: {
    name: 'Low Contrast',
    values: { contrast: 0.8, shadows: 0.1, highlights: -0.1 }
  },
  vivid: {
    name: 'Vivid',
    values: { saturation: 1.3, contrast: 1.1 }
  },
  muted: {
    name: 'Muted',
    values: { saturation: 0.7, contrast: 0.9 }
  },
  bleached: {
    name: 'Bleached',
    values: { brightness: 0.2, contrast: 0.8, saturation: 0.6 }
  }
};

class ColorCorrection {
  constructor() {
    this.corrections = new Map(); // Map of object ID to corrections
    this.listeners = [];
  }

  /**
   * Create color correction for an object
   * @param {string} objectId - Object ID (clip, layer)
   * @param {Object} values - Initial values
   * @returns {Object} Color correction object
   */
  createCorrection(objectId, values = {}) {
    const correction = {
      id: uuidv4(),
      objectId,
      enabled: true,
      values: { ...DEFAULTS, ...values },
      createdAt: new Date().toISOString()
    };

    this.corrections.set(objectId, correction);
    this.emit('correctionCreated', correction);
    return correction;
  }

  /**
   * Get correction for an object
   * @param {string} objectId - Object ID
   * @returns {Object|null} Correction or null
   */
  getCorrection(objectId) {
    return this.corrections.get(objectId) || null;
  }

  /**
   * Update correction values
   * @param {string} objectId - Object ID
   * @param {Object} values - Values to update
   * @returns {Object|null} Updated correction or null
   */
  updateCorrection(objectId, values) {
    let correction = this.corrections.get(objectId);
    
    if (!correction) {
      correction = this.createCorrection(objectId, values);
      return correction;
    }

    // Update values with clamping
    for (const [key, value] of Object.entries(values)) {
      if (DEFAULTS[key] !== undefined) {
        correction.values[key] = this.clampValue(key, value);
      }
    }

    this.emit('correctionUpdated', correction);
    return correction;
  }

  /**
   * Apply a preset to an object
   * @param {string} objectId - Object ID
   * @param {string} presetKey - Preset key
   * @returns {Object|null} Updated correction or null
   */
  applyPreset(objectId, presetKey) {
    const preset = COLOR_PRESETS[presetKey];
    if (!preset) {
      return null;
    }

    // Reset to defaults first, then apply preset
    const newValues = { ...DEFAULTS, ...preset.values };
    return this.updateCorrection(objectId, newValues);
  }

  /**
   * Reset correction to defaults
   * @param {string} objectId - Object ID
   * @returns {Object|null} Reset correction or null
   */
  resetCorrection(objectId) {
    return this.updateCorrection(objectId, { ...DEFAULTS });
  }

  /**
   * Delete correction
   * @param {string} objectId - Object ID
   * @returns {boolean} True if deleted
   */
  deleteCorrection(objectId) {
    if (!this.corrections.has(objectId)) {
      return false;
    }

    this.corrections.delete(objectId);
    this.emit('correctionDeleted', { objectId });
    return true;
  }

  /**
   * Enable/disable correction
   * @param {string} objectId - Object ID
   * @param {boolean} enabled - Enable state
   */
  setEnabled(objectId, enabled) {
    const correction = this.corrections.get(objectId);
    if (correction) {
      correction.enabled = enabled;
      this.emit('correctionEnabledChanged', { objectId, enabled });
    }
  }

  /**
   * Clamp value to valid range
   * @param {string} property - Property name
   * @param {number} value - Value to clamp
   * @returns {number} Clamped value
   */
  clampValue(property, value) {
    const ranges = {
      brightness: [-1, 1],
      contrast: [0, 2],
      saturation: [0, 2],
      gamma: [0.1, 10],
      exposure: [-3, 3],
      temperature: [-1, 1],
      tint: [-1, 1],
      highlights: [-1, 1],
      shadows: [-1, 1],
      whites: [-1, 1],
      blacks: [-1, 1]
    };

    const range = ranges[property];
    if (!range) {
      return value;
    }

    return Math.max(range[0], Math.min(range[1], value));
  }

  /**
   * Generate FFmpeg filter for color correction
   * @param {string} objectId - Object ID
   * @returns {string} FFmpeg filter string
   */
  generateFilter(objectId) {
    const correction = this.corrections.get(objectId);
    if (!correction || !correction.enabled) {
      return '';
    }

    const { values } = correction;
    const filters = [];

    // Brightness and contrast using eq filter
    if (values.brightness !== DEFAULTS.brightness || 
        values.contrast !== DEFAULTS.contrast || 
        values.saturation !== DEFAULTS.saturation ||
        values.gamma !== DEFAULTS.gamma) {
      const eqParts = [];
      
      if (values.brightness !== DEFAULTS.brightness) {
        eqParts.push(`brightness=${values.brightness.toFixed(3)}`);
      }
      if (values.contrast !== DEFAULTS.contrast) {
        eqParts.push(`contrast=${values.contrast.toFixed(3)}`);
      }
      if (values.saturation !== DEFAULTS.saturation) {
        eqParts.push(`saturation=${values.saturation.toFixed(3)}`);
      }
      if (values.gamma !== DEFAULTS.gamma) {
        eqParts.push(`gamma=${values.gamma.toFixed(3)}`);
      }

      if (eqParts.length > 0) {
        filters.push(`eq=${eqParts.join(':')}`);
      }
    }

    // Temperature adjustment using colorbalance
    if (values.temperature !== DEFAULTS.temperature) {
      const temp = values.temperature;
      const rsGain = temp > 0 ? temp * 0.3 : 0;
      const bsGain = temp < 0 ? Math.abs(temp) * 0.3 : 0;
      const rmGain = temp > 0 ? temp * 0.2 : 0;
      const bmGain = temp < 0 ? Math.abs(temp) * 0.2 : 0;
      
      filters.push(`colorbalance=rs=${rsGain}:bs=${bsGain}:rm=${rmGain}:bm=${bmGain}`);
    }

    // Exposure using curves
    if (values.exposure !== DEFAULTS.exposure) {
      const expMult = Math.pow(2, values.exposure);
      filters.push(`curves=m='0/0 1/${Math.min(1, expMult).toFixed(3)}'`);
    }

    // Shadows and highlights using curves
    if (values.shadows !== DEFAULTS.shadows || values.highlights !== DEFAULTS.highlights) {
      const shadowPoint = 0.25 + values.shadows * 0.1;
      const highlightPoint = 0.75 + values.highlights * 0.1;
      filters.push(`curves=m='0/0 0.25/${shadowPoint.toFixed(3)} 0.75/${highlightPoint.toFixed(3)} 1/1'`);
    }

    return filters.join(',');
  }

  /**
   * Get all available presets
   * @returns {Object} Color presets
   */
  getPresets() {
    return { ...COLOR_PRESETS };
  }

  /**
   * Get default values
   * @returns {Object} Default values
   */
  getDefaults() {
    return { ...DEFAULTS };
  }

  /**
   * Get all corrections
   * @returns {Array} List of corrections
   */
  getAllCorrections() {
    return Array.from(this.corrections.values());
  }

  /**
   * Copy correction from one object to another
   * @param {string} sourceId - Source object ID
   * @param {string} targetId - Target object ID
   * @returns {Object|null} New correction or null
   */
  copyCorrection(sourceId, targetId) {
    const source = this.corrections.get(sourceId);
    if (!source) {
      return null;
    }

    return this.createCorrection(targetId, { ...source.values });
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    this.listeners = this.listeners.filter(
      l => l.event !== event || l.callback !== callback
    );
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    for (const listener of this.listeners) {
      if (listener.event === event) {
        listener.callback(data);
      }
    }
  }

  /**
   * Clear all corrections
   */
  clear() {
    this.corrections.clear();
    this.emit('cleared');
  }

  /**
   * Export corrections data
   * @returns {Array} Corrections data
   */
  exportData() {
    return this.getAllCorrections();
  }

  /**
   * Import corrections data
   * @param {Array} data - Corrections data
   */
  importData(data) {
    this.clear();
    for (const correction of data) {
      this.corrections.set(correction.objectId, correction);
    }
    this.emit('dataImported');
  }
}

module.exports = ColorCorrection;
