/**
 * Transitions Manager Module - Phase 1.3
 * Professional video transitions (Fade, Dissolve, Wipe, Slide, Zoom)
 */

const { v4: uuidv4 } = require('uuid');

// Transition types
const TRANSITION_TYPE = {
  FADE: 'fade',
  DISSOLVE: 'dissolve',
  WIPE: 'wipe',
  SLIDE: 'slide',
  ZOOM: 'zoom',
  PUSH: 'push',
  IRIS: 'iris'
};

// Transition directions
const DIRECTION = {
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up',
  DOWN: 'down',
  IN: 'in',
  OUT: 'out'
};

// Predefined transitions with FFmpeg filter configurations
const TRANSITION_PRESETS = {
  fadeIn: {
    type: TRANSITION_TYPE.FADE,
    direction: DIRECTION.IN,
    name: 'Fade In',
    filter: (duration) => `fade=in:0:${Math.floor(duration * 30)}`
  },
  fadeOut: {
    type: TRANSITION_TYPE.FADE,
    direction: DIRECTION.OUT,
    name: 'Fade Out',
    filter: (duration, totalFrames) => `fade=out:${totalFrames - Math.floor(duration * 30)}:${Math.floor(duration * 30)}`
  },
  crossDissolve: {
    type: TRANSITION_TYPE.DISSOLVE,
    name: 'Cross Dissolve',
    filter: (duration, offset) => `xfade=transition=dissolve:duration=${duration}:offset=${offset}`
  },
  wipeLeft: {
    type: TRANSITION_TYPE.WIPE,
    direction: DIRECTION.LEFT,
    name: 'Wipe Left',
    filter: (duration, offset) => `xfade=transition=wipeleft:duration=${duration}:offset=${offset}`
  },
  wipeRight: {
    type: TRANSITION_TYPE.WIPE,
    direction: DIRECTION.RIGHT,
    name: 'Wipe Right',
    filter: (duration, offset) => `xfade=transition=wiperight:duration=${duration}:offset=${offset}`
  },
  wipeUp: {
    type: TRANSITION_TYPE.WIPE,
    direction: DIRECTION.UP,
    name: 'Wipe Up',
    filter: (duration, offset) => `xfade=transition=wipeup:duration=${duration}:offset=${offset}`
  },
  wipeDown: {
    type: TRANSITION_TYPE.WIPE,
    direction: DIRECTION.DOWN,
    name: 'Wipe Down',
    filter: (duration, offset) => `xfade=transition=wipedown:duration=${duration}:offset=${offset}`
  },
  slideLeft: {
    type: TRANSITION_TYPE.SLIDE,
    direction: DIRECTION.LEFT,
    name: 'Slide Left',
    filter: (duration, offset) => `xfade=transition=slideleft:duration=${duration}:offset=${offset}`
  },
  slideRight: {
    type: TRANSITION_TYPE.SLIDE,
    direction: DIRECTION.RIGHT,
    name: 'Slide Right',
    filter: (duration, offset) => `xfade=transition=slideright:duration=${duration}:offset=${offset}`
  },
  slideUp: {
    type: TRANSITION_TYPE.SLIDE,
    direction: DIRECTION.UP,
    name: 'Slide Up',
    filter: (duration, offset) => `xfade=transition=slideup:duration=${duration}:offset=${offset}`
  },
  slideDown: {
    type: TRANSITION_TYPE.SLIDE,
    direction: DIRECTION.DOWN,
    name: 'Slide Down',
    filter: (duration, offset) => `xfade=transition=slidedown:duration=${duration}:offset=${offset}`
  },
  zoomIn: {
    type: TRANSITION_TYPE.ZOOM,
    direction: DIRECTION.IN,
    name: 'Zoom In',
    filter: (duration, offset) => `xfade=transition=zoomin:duration=${duration}:offset=${offset}`
  },
  circleOpen: {
    type: TRANSITION_TYPE.IRIS,
    direction: DIRECTION.OUT,
    name: 'Circle Open',
    filter: (duration, offset) => `xfade=transition=circleopen:duration=${duration}:offset=${offset}`
  },
  circleClose: {
    type: TRANSITION_TYPE.IRIS,
    direction: DIRECTION.IN,
    name: 'Circle Close',
    filter: (duration, offset) => `xfade=transition=circleclose:duration=${duration}:offset=${offset}`
  },
  radial: {
    type: TRANSITION_TYPE.WIPE,
    name: 'Radial',
    filter: (duration, offset) => `xfade=transition=radial:duration=${duration}:offset=${offset}`
  },
  smoothLeft: {
    type: TRANSITION_TYPE.SLIDE,
    direction: DIRECTION.LEFT,
    name: 'Smooth Left',
    filter: (duration, offset) => `xfade=transition=smoothleft:duration=${duration}:offset=${offset}`
  },
  smoothRight: {
    type: TRANSITION_TYPE.SLIDE,
    direction: DIRECTION.RIGHT,
    name: 'Smooth Right',
    filter: (duration, offset) => `xfade=transition=smoothright:duration=${duration}:offset=${offset}`
  }
};

class TransitionsManager {
  constructor() {
    this.transitions = new Map(); // Transitions applied to timeline
    this.customPresets = new Map();
    this.listeners = [];
  }

  /**
   * Get all available transition presets
   * @returns {Object} Transition presets
   */
  getPresets() {
    const allPresets = { ...TRANSITION_PRESETS };
    
    for (const [key, preset] of this.customPresets) {
      allPresets[key] = preset;
    }

    return allPresets;
  }

  /**
   * Get presets by type
   * @param {string} type - Transition type
   * @returns {Object} Filtered presets
   */
  getPresetsByType(type) {
    const filtered = {};
    const allPresets = this.getPresets();

    for (const [key, preset] of Object.entries(allPresets)) {
      if (preset.type === type) {
        filtered[key] = preset;
      }
    }

    return filtered;
  }

  /**
   * Add a transition between clips
   * @param {Object} transitionConfig - Transition configuration
   * @returns {Object} Created transition
   */
  addTransition(transitionConfig) {
    const transition = {
      id: uuidv4(),
      presetKey: transitionConfig.presetKey || 'crossDissolve',
      clipAId: transitionConfig.clipAId,
      clipBId: transitionConfig.clipBId,
      duration: transitionConfig.duration || 1,
      startTime: transitionConfig.startTime || 0,
      customParams: transitionConfig.customParams || {}
    };

    this.transitions.set(transition.id, transition);
    this.emit('transitionAdded', transition);
    return transition;
  }

  /**
   * Remove a transition
   * @param {string} transitionId - Transition ID
   * @returns {boolean} True if removed
   */
  removeTransition(transitionId) {
    if (!this.transitions.has(transitionId)) {
      return false;
    }

    this.transitions.delete(transitionId);
    this.emit('transitionRemoved', { transitionId });
    return true;
  }

  /**
   * Get transition by ID
   * @param {string} transitionId - Transition ID
   * @returns {Object|null} Transition or null
   */
  getTransition(transitionId) {
    return this.transitions.get(transitionId) || null;
  }

  /**
   * Get all transitions
   * @returns {Array} List of transitions
   */
  getAllTransitions() {
    return Array.from(this.transitions.values());
  }

  /**
   * Get transitions for a clip
   * @param {string} clipId - Clip ID
   * @returns {Array} Transitions involving this clip
   */
  getTransitionsForClip(clipId) {
    return this.getAllTransitions().filter(
      t => t.clipAId === clipId || t.clipBId === clipId
    );
  }

  /**
   * Update transition properties
   * @param {string} transitionId - Transition ID
   * @param {Object} updates - Properties to update
   * @returns {Object|null} Updated transition or null
   */
  updateTransition(transitionId, updates) {
    const transition = this.transitions.get(transitionId);
    if (!transition) {
      return null;
    }

    if (updates.presetKey !== undefined) transition.presetKey = updates.presetKey;
    if (updates.duration !== undefined) transition.duration = updates.duration;
    if (updates.startTime !== undefined) transition.startTime = updates.startTime;
    if (updates.customParams !== undefined) {
      transition.customParams = { ...transition.customParams, ...updates.customParams };
    }

    this.emit('transitionUpdated', transition);
    return transition;
  }

  /**
   * Generate FFmpeg filter for a transition
   * @param {string} transitionId - Transition ID
   * @param {Object} clipInfo - Information about the clips
   * @returns {string} FFmpeg filter string
   */
  generateFilter(transitionId, clipInfo = {}) {
    const transition = this.transitions.get(transitionId);
    if (!transition) {
      return '';
    }

    const preset = this.getPresets()[transition.presetKey];
    if (!preset || !preset.filter) {
      return '';
    }

    const offset = clipInfo.offset || transition.startTime;
    const totalFrames = clipInfo.totalFrames || 0;

    return preset.filter(transition.duration, offset, totalFrames);
  }

  /**
   * Generate FFmpeg filter complex for multiple transitions
   * @param {Array} transitionIds - Array of transition IDs
   * @param {Object} clipInfos - Object mapping clip IDs to their info
   * @returns {string} FFmpeg filter complex string
   */
  generateFilterComplex(transitionIds, clipInfos = {}) {
    const filters = [];
    let currentInput = '[0:v]';
    
    for (let i = 0; i < transitionIds.length; i++) {
      const transition = this.transitions.get(transitionIds[i]);
      if (!transition) continue;

      const preset = this.getPresets()[transition.presetKey];
      if (!preset || !preset.filter) continue;

      const offset = clipInfos[transition.clipAId]?.duration - transition.duration || 0;
      const nextInput = i < transitionIds.length - 1 ? `[v${i}]` : '[outv]';
      
      filters.push(
        `${currentInput}[${i + 1}:v]${preset.filter(transition.duration, offset)}${nextInput}`
      );
      
      currentInput = `[v${i}]`;
    }

    return filters.join(';');
  }

  /**
   * Create custom transition preset
   * @param {Object} presetConfig - Preset configuration
   * @returns {string} Preset key
   */
  createCustomPreset(presetConfig) {
    if (!presetConfig.name) {
      throw new Error('Preset name is required');
    }

    const key = `custom_${uuidv4().substring(0, 8)}`;
    
    const preset = {
      type: presetConfig.type || TRANSITION_TYPE.DISSOLVE,
      direction: presetConfig.direction,
      name: presetConfig.name,
      filter: presetConfig.filter || ((duration, offset) => 
        `xfade=transition=fade:duration=${duration}:offset=${offset}`
      ),
      isCustom: true
    };

    this.customPresets.set(key, preset);
    this.emit('presetCreated', { key, preset });
    return key;
  }

  /**
   * Delete custom preset
   * @param {string} presetKey - Preset key
   * @returns {boolean} True if deleted
   */
  deleteCustomPreset(presetKey) {
    if (!this.customPresets.has(presetKey)) {
      return false;
    }

    this.customPresets.delete(presetKey);
    this.emit('presetDeleted', { presetKey });
    return true;
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
   * Get transition type constants
   * @returns {Object} Transition types
   */
  static getTransitionTypes() {
    return { ...TRANSITION_TYPE };
  }

  /**
   * Get direction constants
   * @returns {Object} Direction constants
   */
  static getDirections() {
    return { ...DIRECTION };
  }

  /**
   * Clear all transitions
   */
  clear() {
    this.transitions.clear();
    this.emit('cleared');
  }

  /**
   * Export transitions data
   * @returns {Object} Export data
   */
  exportData() {
    return {
      transitions: this.getAllTransitions(),
      customPresets: Object.fromEntries(this.customPresets)
    };
  }

  /**
   * Import transitions data
   * @param {Object} data - Import data
   */
  importData(data) {
    this.clear();

    if (data.transitions) {
      for (const transition of data.transitions) {
        this.transitions.set(transition.id, transition);
      }
    }

    if (data.customPresets) {
      for (const [key, preset] of Object.entries(data.customPresets)) {
        this.customPresets.set(key, preset);
      }
    }

    this.emit('dataImported');
  }
}

module.exports = TransitionsManager;
