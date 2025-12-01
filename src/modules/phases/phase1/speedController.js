/**
 * Speed Controller Module - Phase 1.3
 * Slow motion, time-lapse, and speed ramps
 */

const { v4: uuidv4 } = require('uuid');

// Speed change types
const SPEED_TYPE = {
  CONSTANT: 'constant',
  RAMP: 'ramp',
  REVERSE: 'reverse',
  FREEZE: 'freeze'
};

// Frame duration constant for freeze frame (single frame at 25fps)
const SINGLE_FRAME_DURATION = 0.04; // 1/25 seconds

// Preset speed configurations
const SPEED_PRESETS = {
  slowmo2x: { name: 'Slow Mo 2x', speed: 0.5, type: SPEED_TYPE.CONSTANT },
  slowmo4x: { name: 'Slow Mo 4x', speed: 0.25, type: SPEED_TYPE.CONSTANT },
  slowmo8x: { name: 'Slow Mo 8x', speed: 0.125, type: SPEED_TYPE.CONSTANT },
  fast2x: { name: 'Fast 2x', speed: 2, type: SPEED_TYPE.CONSTANT },
  fast4x: { name: 'Fast 4x', speed: 4, type: SPEED_TYPE.CONSTANT },
  timelapse10x: { name: 'Time-lapse 10x', speed: 10, type: SPEED_TYPE.CONSTANT },
  timelapse20x: { name: 'Time-lapse 20x', speed: 20, type: SPEED_TYPE.CONSTANT },
  reverse: { name: 'Reverse', speed: -1, type: SPEED_TYPE.REVERSE },
  reverseSlowmo: { name: 'Reverse Slow Mo', speed: -0.5, type: SPEED_TYPE.REVERSE }
};

class SpeedController {
  constructor() {
    this.speedChanges = new Map(); // Map of object ID to speed settings
    this.listeners = [];
  }

  /**
   * Set constant speed for a clip
   * @param {string} objectId - Object ID (clip)
   * @param {number} speed - Speed multiplier (1 = normal)
   * @param {Object} options - Additional options
   * @returns {Object} Speed change object
   */
  setConstantSpeed(objectId, speed, options = {}) {
    const speedChange = {
      id: uuidv4(),
      objectId,
      type: SPEED_TYPE.CONSTANT,
      speed: Math.max(0.05, Math.min(100, speed)),
      preservePitch: options.preservePitch !== false,
      interpolation: options.interpolation || 'blend', // blend, mci, dup
      enabled: true
    };

    this.speedChanges.set(objectId, speedChange);
    this.emit('speedChanged', speedChange);
    return speedChange;
  }

  /**
   * Create a speed ramp
   * @param {string} objectId - Object ID
   * @param {Array} keyframes - Array of {time, speed} objects
   * @param {Object} options - Additional options
   * @returns {Object} Speed ramp object
   */
  createSpeedRamp(objectId, keyframes, options = {}) {
    // Sort keyframes by time
    const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);
    
    const speedChange = {
      id: uuidv4(),
      objectId,
      type: SPEED_TYPE.RAMP,
      keyframes: sortedKeyframes,
      preservePitch: options.preservePitch !== false,
      interpolation: options.interpolation || 'blend',
      easing: options.easing || 'linear',
      enabled: true
    };

    this.speedChanges.set(objectId, speedChange);
    this.emit('speedRampCreated', speedChange);
    return speedChange;
  }

  /**
   * Add keyframe to speed ramp
   * @param {string} objectId - Object ID
   * @param {number} time - Time in seconds
   * @param {number} speed - Speed value
   * @returns {Object|null} Updated speed change or null
   */
  addRampKeyframe(objectId, time, speed) {
    const speedChange = this.speedChanges.get(objectId);
    
    if (!speedChange || speedChange.type !== SPEED_TYPE.RAMP) {
      return null;
    }

    // Remove existing keyframe at same time
    speedChange.keyframes = speedChange.keyframes.filter(
      kf => Math.abs(kf.time - time) > 0.01
    );

    // Add new keyframe
    speedChange.keyframes.push({ time, speed: Math.max(0.05, Math.min(100, speed)) });
    speedChange.keyframes.sort((a, b) => a.time - b.time);

    this.emit('rampKeyframeAdded', { objectId, time, speed });
    return speedChange;
  }

  /**
   * Remove keyframe from speed ramp
   * @param {string} objectId - Object ID
   * @param {number} time - Time to remove
   * @returns {boolean} True if removed
   */
  removeRampKeyframe(objectId, time) {
    const speedChange = this.speedChanges.get(objectId);
    
    if (!speedChange || speedChange.type !== SPEED_TYPE.RAMP) {
      return false;
    }

    const initialLength = speedChange.keyframes.length;
    speedChange.keyframes = speedChange.keyframes.filter(
      kf => Math.abs(kf.time - time) > 0.01
    );

    if (speedChange.keyframes.length !== initialLength) {
      this.emit('rampKeyframeRemoved', { objectId, time });
      return true;
    }

    return false;
  }

  /**
   * Reverse a clip
   * @param {string} objectId - Object ID
   * @param {number} speed - Speed (negative for reverse)
   * @returns {Object} Speed change object
   */
  setReverse(objectId, speed = -1) {
    const speedChange = {
      id: uuidv4(),
      objectId,
      type: SPEED_TYPE.REVERSE,
      speed: speed < 0 ? speed : -Math.abs(speed),
      preservePitch: true,
      enabled: true
    };

    this.speedChanges.set(objectId, speedChange);
    this.emit('reverseSet', speedChange);
    return speedChange;
  }

  /**
   * Create freeze frame
   * @param {string} objectId - Object ID
   * @param {number} freezeTime - Time to freeze at
   * @param {number} duration - Freeze duration
   * @returns {Object} Freeze frame object
   */
  createFreezeFrame(objectId, freezeTime, duration) {
    const speedChange = {
      id: uuidv4(),
      objectId,
      type: SPEED_TYPE.FREEZE,
      freezeTime,
      duration,
      enabled: true
    };

    this.speedChanges.set(objectId, speedChange);
    this.emit('freezeCreated', speedChange);
    return speedChange;
  }

  /**
   * Get speed change for object
   * @param {string} objectId - Object ID
   * @returns {Object|null} Speed change or null
   */
  getSpeedChange(objectId) {
    return this.speedChanges.get(objectId) || null;
  }

  /**
   * Delete speed change
   * @param {string} objectId - Object ID
   * @returns {boolean} True if deleted
   */
  deleteSpeedChange(objectId) {
    if (!this.speedChanges.has(objectId)) {
      return false;
    }

    this.speedChanges.delete(objectId);
    this.emit('speedChangeDeleted', { objectId });
    return true;
  }

  /**
   * Apply speed preset
   * @param {string} objectId - Object ID
   * @param {string} presetKey - Preset key
   * @returns {Object|null} Speed change or null
   */
  applyPreset(objectId, presetKey) {
    const preset = SPEED_PRESETS[presetKey];
    if (!preset) {
      return null;
    }

    if (preset.type === SPEED_TYPE.REVERSE) {
      return this.setReverse(objectId, preset.speed);
    }

    return this.setConstantSpeed(objectId, preset.speed);
  }

  /**
   * Get speed at specific time for ramps
   * @param {string} objectId - Object ID
   * @param {number} time - Time in seconds
   * @returns {number} Speed value
   */
  getSpeedAtTime(objectId, time) {
    const speedChange = this.speedChanges.get(objectId);
    
    if (!speedChange || !speedChange.enabled) {
      return 1;
    }

    if (speedChange.type !== SPEED_TYPE.RAMP) {
      return Math.abs(speedChange.speed) || 1;
    }

    const { keyframes } = speedChange;
    
    if (keyframes.length === 0) return 1;
    if (keyframes.length === 1) return keyframes[0].speed;
    if (time <= keyframes[0].time) return keyframes[0].speed;
    if (time >= keyframes[keyframes.length - 1].time) {
      return keyframes[keyframes.length - 1].speed;
    }

    // Find surrounding keyframes
    let prev = keyframes[0];
    let next = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (keyframes[i].time <= time && keyframes[i + 1].time > time) {
        prev = keyframes[i];
        next = keyframes[i + 1];
        break;
      }
    }

    // Linear interpolation
    const t = (time - prev.time) / (next.time - prev.time);
    return prev.speed + (next.speed - prev.speed) * t;
  }

  /**
   * Calculate new duration after speed change
   * @param {string} objectId - Object ID
   * @param {number} originalDuration - Original duration in seconds
   * @returns {number} New duration
   */
  calculateNewDuration(objectId, originalDuration) {
    const speedChange = this.speedChanges.get(objectId);
    
    if (!speedChange || !speedChange.enabled) {
      return originalDuration;
    }

    if (speedChange.type === SPEED_TYPE.FREEZE) {
      return speedChange.duration;
    }

    if (speedChange.type === SPEED_TYPE.CONSTANT || speedChange.type === SPEED_TYPE.REVERSE) {
      return originalDuration / Math.abs(speedChange.speed);
    }

    // For ramps, calculate by integrating speed over time
    // This is a simplified calculation
    if (speedChange.type === SPEED_TYPE.RAMP && speedChange.keyframes.length > 0) {
      let totalDuration = 0;
      const step = 0.1;
      
      for (let t = 0; t < originalDuration; t += step) {
        const speed = this.getSpeedAtTime(objectId, t);
        totalDuration += step / speed;
      }
      
      return totalDuration;
    }

    return originalDuration;
  }

  /**
   * Generate FFmpeg filter for speed change
   * @param {string} objectId - Object ID
   * @returns {Object} Filter configuration {video: string, audio: string}
   */
  generateFilter(objectId) {
    const speedChange = this.speedChanges.get(objectId);
    
    if (!speedChange || !speedChange.enabled) {
      return { video: '', audio: '' };
    }

    const filters = { video: '', audio: '' };

    switch (speedChange.type) {
    case SPEED_TYPE.CONSTANT: {
      const pts = (1 / speedChange.speed).toFixed(4);
      filters.video = `setpts=${pts}*PTS`;
      
      if (speedChange.preservePitch) {
        filters.audio = `atempo=${Math.min(2, Math.max(0.5, speedChange.speed))}`;
        // For speeds outside 0.5-2 range, chain atempo filters
        if (speedChange.speed < 0.5 || speedChange.speed > 2) {
          const remainder = speedChange.speed < 0.5 
            ? speedChange.speed / 0.5 
            : speedChange.speed / 2;
          filters.audio += `,atempo=${Math.min(2, Math.max(0.5, remainder))}`;
        }
      } else {
        filters.audio = `asetrate=44100*${speedChange.speed},aresample=44100`;
      }
      break;
    }

    case SPEED_TYPE.REVERSE:
      filters.video = 'reverse';
      filters.audio = 'areverse';
      if (speedChange.speed !== -1) {
        const pts = (1 / Math.abs(speedChange.speed)).toFixed(4);
        filters.video = `reverse,setpts=${pts}*PTS`;
        filters.audio += `,atempo=${Math.min(2, Math.max(0.5, Math.abs(speedChange.speed)))}`;
      }
      break;

    case SPEED_TYPE.FREEZE:
      // Freeze at specific frame (using single frame duration constant)
      filters.video = `trim=${speedChange.freezeTime}:${speedChange.freezeTime + SINGLE_FRAME_DURATION},loop=-1:1,trim=0:${speedChange.duration}`;
      filters.audio = `anull`; // Mute during freeze
      break;

    case SPEED_TYPE.RAMP:
      // Speed ramps require complex filter
      filters.video = `setpts='if(between(T,0,1),PTS*1.0,PTS)'`;
      filters.audio = ''; // Audio ramps are complex, skip for basic implementation
      break;
    }

    return filters;
  }

  /**
   * Get available presets
   * @returns {Object} Speed presets
   */
  getPresets() {
    return { ...SPEED_PRESETS };
  }

  /**
   * Get all speed changes
   * @returns {Array} List of speed changes
   */
  getAllSpeedChanges() {
    return Array.from(this.speedChanges.values());
  }

  /**
   * Enable/disable speed change
   * @param {string} objectId - Object ID
   * @param {boolean} enabled - Enable state
   */
  setEnabled(objectId, enabled) {
    const speedChange = this.speedChanges.get(objectId);
    if (speedChange) {
      speedChange.enabled = enabled;
      this.emit('enabledChanged', { objectId, enabled });
    }
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
   * Get speed type constants
   * @returns {Object} Speed types
   */
  static getSpeedTypes() {
    return { ...SPEED_TYPE };
  }

  /**
   * Clear all speed changes
   */
  clear() {
    this.speedChanges.clear();
    this.emit('cleared');
  }

  /**
   * Export speed data
   * @returns {Array} Speed changes data
   */
  exportData() {
    return this.getAllSpeedChanges();
  }

  /**
   * Import speed data
   * @param {Array} data - Speed changes data
   */
  importData(data) {
    this.clear();
    for (const speedChange of data) {
      this.speedChanges.set(speedChange.objectId, speedChange);
    }
    this.emit('dataImported');
  }
}

module.exports = SpeedController;
