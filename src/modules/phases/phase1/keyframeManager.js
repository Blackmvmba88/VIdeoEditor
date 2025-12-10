/**
 * Keyframe Manager Module - Phase 1.2
 * Animation of properties with keyframes
 */

const { v4: uuidv4 } = require('uuid');

// Easing functions
const EASING = {
  LINEAR: 'linear',
  EASE_IN: 'easeIn',
  EASE_OUT: 'easeOut',
  EASE_IN_OUT: 'easeInOut',
  BEZIER: 'bezier'
};

// Animatable properties
const ANIMATABLE_PROPERTIES = {
  // Transform properties
  POSITION_X: 'positionX',
  POSITION_Y: 'positionY',
  SCALE_X: 'scaleX',
  SCALE_Y: 'scaleY',
  ROTATION: 'rotation',
  OPACITY: 'opacity',
  // Audio properties
  VOLUME: 'volume',
  PAN: 'pan',
  // Effect properties
  BLUR: 'blur',
  BRIGHTNESS: 'brightness',
  CONTRAST: 'contrast',
  SATURATION: 'saturation'
};

// Easing implementations
const easingFunctions = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => t * (2 - t),
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  bezier: (t, p1, p2, p3, _p4) => {
    // Cubic bezier implementation (simplified - p4 used for full bezier curve)
    const cx = 3 * p1;
    const bx = 3 * (p3 - p1) - cx;
    const ax = 1 - cx - bx;
    return ((ax * t + bx) * t + cx) * t;
  }
};

class KeyframeManager {
  constructor() {
    this.animations = new Map(); // Map of object ID to animation data
    this.listeners = [];
  }

  /**
   * Create a new animation track for an object
   * @param {string} objectId - Object ID (clip, track, etc.)
   * @param {string} property - Property to animate
   * @returns {Object} Animation track
   */
  createAnimationTrack(objectId, property) {
    const key = `${objectId}:${property}`;
    
    if (!this.animations.has(key)) {
      const track = {
        id: uuidv4(),
        objectId,
        property,
        keyframes: [],
        enabled: true
      };
      this.animations.set(key, track);
      this.emit('trackCreated', track);
      return track;
    }

    return this.animations.get(key);
  }

  /**
   * Add a keyframe
   * @param {string} objectId - Object ID
   * @param {string} property - Property name
   * @param {number} time - Time in seconds
   * @param {number} value - Value at this keyframe
   * @param {Object} options - Keyframe options
   * @returns {Object} Created keyframe
   */
  addKeyframe(objectId, property, time, value, options = {}) {
    const key = `${objectId}:${property}`;
    
    // Create track if it doesn't exist
    if (!this.animations.has(key)) {
      this.createAnimationTrack(objectId, property);
    }

    const track = this.animations.get(key);
    
    // Check if keyframe exists at this time
    const existingIndex = track.keyframes.findIndex(kf => Math.abs(kf.time - time) < 0.001);
    
    const keyframe = {
      id: uuidv4(),
      time,
      value,
      easing: options.easing || EASING.LINEAR,
      bezierPoints: options.bezierPoints || [0.25, 0.1, 0.25, 1.0] // Default cubic-bezier
    };

    if (existingIndex >= 0) {
      // Update existing keyframe
      track.keyframes[existingIndex] = keyframe;
    } else {
      // Add new keyframe
      track.keyframes.push(keyframe);
    }

    // Sort keyframes by time
    track.keyframes.sort((a, b) => a.time - b.time);

    this.emit('keyframeAdded', { trackKey: key, keyframe });
    return keyframe;
  }

  /**
   * Remove a keyframe
   * @param {string} objectId - Object ID
   * @param {string} property - Property name
   * @param {string} keyframeId - Keyframe ID
   * @returns {boolean} True if removed
   */
  removeKeyframe(objectId, property, keyframeId) {
    const key = `${objectId}:${property}`;
    const track = this.animations.get(key);

    if (!track) {
      return false;
    }

    const index = track.keyframes.findIndex(kf => kf.id === keyframeId);
    if (index === -1) {
      return false;
    }

    track.keyframes.splice(index, 1);

    // Remove track if no keyframes left
    if (track.keyframes.length === 0) {
      this.animations.delete(key);
      this.emit('trackDeleted', { trackKey: key });
    } else {
      this.emit('keyframeRemoved', { trackKey: key, keyframeId });
    }

    return true;
  }

  /**
   * Get interpolated value at a specific time
   * @param {string} objectId - Object ID
   * @param {string} property - Property name
   * @param {number} time - Time in seconds
   * @returns {number|null} Interpolated value or null
   */
  getValueAtTime(objectId, property, time) {
    const key = `${objectId}:${property}`;
    const track = this.animations.get(key);

    if (!track || !track.enabled || track.keyframes.length === 0) {
      return null;
    }

    const keyframes = track.keyframes;

    // Before first keyframe
    if (time <= keyframes[0].time) {
      return keyframes[0].value;
    }

    // After last keyframe
    if (time >= keyframes[keyframes.length - 1].time) {
      return keyframes[keyframes.length - 1].value;
    }

    // Find surrounding keyframes
    let prevKf = keyframes[0];
    let nextKf = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (keyframes[i].time <= time && keyframes[i + 1].time > time) {
        prevKf = keyframes[i];
        nextKf = keyframes[i + 1];
        break;
      }
    }

    // Calculate interpolation factor
    const duration = nextKf.time - prevKf.time;
    const elapsed = time - prevKf.time;
    let t = duration > 0 ? elapsed / duration : 0;

    // Apply easing
    t = this.applyEasing(t, nextKf.easing, nextKf.bezierPoints);

    // Linear interpolation between values
    return prevKf.value + (nextKf.value - prevKf.value) * t;
  }

  /**
   * Apply easing function
   * @param {number} t - Progress (0-1)
   * @param {string} easing - Easing type
   * @param {Array} bezierPoints - Bezier control points
   * @returns {number} Eased value
   */
  applyEasing(t, easing, bezierPoints) {
    const easingFn = easingFunctions[easing];
    
    if (!easingFn) {
      return t;
    }

    if (easing === EASING.BEZIER && bezierPoints) {
      return easingFn(t, ...bezierPoints);
    }

    return easingFn(t);
  }

  /**
   * Get all keyframes for an object/property
   * @param {string} objectId - Object ID
   * @param {string} property - Property name
   * @returns {Array} Array of keyframes
   */
  getKeyframes(objectId, property) {
    const key = `${objectId}:${property}`;
    const track = this.animations.get(key);
    return track ? [...track.keyframes] : [];
  }

  /**
   * Get all animated properties for an object
   * @param {string} objectId - Object ID
   * @returns {Array} List of animated properties
   */
  getAnimatedProperties(objectId) {
    const properties = [];
    
    for (const [, track] of this.animations) {
      if (track.objectId === objectId) {
        properties.push(track.property);
      }
    }

    return properties;
  }

  /**
   * Get all values at a specific time for an object
   * @param {string} objectId - Object ID
   * @param {number} time - Time in seconds
   * @returns {Object} Object with property:value pairs
   */
  getAllValuesAtTime(objectId, time) {
    const values = {};
    
    for (const [, track] of this.animations) {
      if (track.objectId === objectId && track.enabled) {
        const value = this.getValueAtTime(objectId, track.property, time);
        if (value !== null) {
          values[track.property] = value;
        }
      }
    }

    return values;
  }

  /**
   * Update keyframe properties
   * @param {string} objectId - Object ID
   * @param {string} property - Property name
   * @param {string} keyframeId - Keyframe ID
   * @param {Object} updates - Updates to apply
   * @returns {Object|null} Updated keyframe or null
   */
  updateKeyframe(objectId, property, keyframeId, updates) {
    const key = `${objectId}:${property}`;
    const track = this.animations.get(key);

    if (!track) {
      return null;
    }

    const keyframe = track.keyframes.find(kf => kf.id === keyframeId);
    if (!keyframe) {
      return null;
    }

    if (updates.time !== undefined) keyframe.time = updates.time;
    if (updates.value !== undefined) keyframe.value = updates.value;
    if (updates.easing !== undefined) keyframe.easing = updates.easing;
    if (updates.bezierPoints !== undefined) keyframe.bezierPoints = updates.bezierPoints;

    // Re-sort keyframes
    track.keyframes.sort((a, b) => a.time - b.time);

    this.emit('keyframeUpdated', { trackKey: key, keyframe });
    return keyframe;
  }

  /**
   * Enable/disable animation track
   * @param {string} objectId - Object ID
   * @param {string} property - Property name
   * @param {boolean} enabled - Enable state
   */
  setTrackEnabled(objectId, property, enabled) {
    const key = `${objectId}:${property}`;
    const track = this.animations.get(key);

    if (track) {
      track.enabled = enabled;
      this.emit('trackEnabledChanged', { trackKey: key, enabled });
    }
  }

  /**
   * Delete all animations for an object
   * @param {string} objectId - Object ID
   */
  deleteObjectAnimations(objectId) {
    const keysToDelete = [];
    
    for (const [key, track] of this.animations) {
      if (track.objectId === objectId) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.animations.delete(key);
    }

    this.emit('objectAnimationsDeleted', { objectId, deletedCount: keysToDelete.length });
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
   * Get easing constants
   * @returns {Object} Easing constants
   */
  static getEasingTypes() {
    return { ...EASING };
  }

  /**
   * Get animatable properties constants
   * @returns {Object} Animatable properties
   */
  static getAnimatableProperties() {
    return { ...ANIMATABLE_PROPERTIES };
  }

  /**
   * Clear all animations
   */
  clear() {
    this.animations.clear();
    this.emit('cleared');
  }

  /**
   * Export animation data
   * @returns {Object} Animation data
   */
  exportData() {
    const data = {};
    for (const [key, track] of this.animations) {
      data[key] = { ...track, keyframes: [...track.keyframes] };
    }
    return data;
  }

  /**
   * Import animation data
   * @param {Object} data - Animation data
   */
  importData(data) {
    this.clear();
    for (const [key, track] of Object.entries(data)) {
      this.animations.set(key, track);
    }
    this.emit('dataImported');
  }
}

module.exports = KeyframeManager;
