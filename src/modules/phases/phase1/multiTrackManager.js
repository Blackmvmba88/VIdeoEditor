/**
 * Multi-Track Manager Module - Phase 1.2
 * Manages multiple video and audio tracks in the timeline
 */

const { v4: uuidv4 } = require('uuid');

// Track types
const TRACK_TYPE = {
  VIDEO: 'video',
  AUDIO: 'audio'
};

class MultiTrackManager {
  constructor() {
    this.tracks = new Map();
    this.trackOrder = [];
    this.listeners = [];
  }

  /**
   * Create a new track
   * @param {Object} options - Track options
   * @returns {Object} Created track
   */
  createTrack(options = {}) {
    const track = {
      id: uuidv4(),
      name: options.name || `Track ${this.tracks.size + 1}`,
      type: options.type || TRACK_TYPE.VIDEO,
      clips: [],
      muted: false,
      solo: false,
      locked: false,
      visible: true,
      volume: 1.0,
      opacity: 1.0,
      createdAt: new Date().toISOString()
    };

    this.tracks.set(track.id, track);
    this.trackOrder.push(track.id);

    this.emit('trackCreated', track);
    return track;
  }

  /**
   * Delete a track
   * @param {string} trackId - Track ID
   * @returns {boolean} True if deleted
   */
  deleteTrack(trackId) {
    if (!this.tracks.has(trackId)) {
      return false;
    }

    this.tracks.delete(trackId);
    this.trackOrder = this.trackOrder.filter(id => id !== trackId);

    this.emit('trackDeleted', { trackId });
    return true;
  }

  /**
   * Get track by ID
   * @param {string} trackId - Track ID
   * @returns {Object|null} Track or null
   */
  getTrack(trackId) {
    return this.tracks.get(trackId) || null;
  }

  /**
   * Get all tracks
   * @returns {Array} List of tracks in order
   */
  getAllTracks() {
    return this.trackOrder.map(id => this.tracks.get(id)).filter(Boolean);
  }

  /**
   * Get tracks by type
   * @param {string} type - Track type
   * @returns {Array} List of tracks
   */
  getTracksByType(type) {
    return this.getAllTracks().filter(t => t.type === type);
  }

  /**
   * Add clip to track
   * @param {string} trackId - Track ID
   * @param {Object} clipData - Clip data
   * @returns {Object|null} Added clip or null
   */
  addClipToTrack(trackId, clipData) {
    const track = this.tracks.get(trackId);
    if (!track) {
      return null;
    }

    const clip = {
      id: uuidv4(),
      trackId,
      source: clipData.source,
      startTime: clipData.startTime || 0,
      duration: clipData.duration || 0,
      inPoint: clipData.inPoint || 0,
      outPoint: clipData.outPoint || clipData.duration || 0,
      position: clipData.position || track.clips.length,
      volume: clipData.volume || 1.0,
      opacity: clipData.opacity || 1.0,
      effects: clipData.effects || [],
      metadata: clipData.metadata || {}
    };

    track.clips.push(clip);
    track.clips.sort((a, b) => a.startTime - b.startTime);

    this.emit('clipAdded', { trackId, clip });
    return clip;
  }

  /**
   * Remove clip from track
   * @param {string} trackId - Track ID
   * @param {string} clipId - Clip ID
   * @returns {boolean} True if removed
   */
  removeClipFromTrack(trackId, clipId) {
    const track = this.tracks.get(trackId);
    if (!track) {
      return false;
    }

    const clipIndex = track.clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) {
      return false;
    }

    track.clips.splice(clipIndex, 1);

    this.emit('clipRemoved', { trackId, clipId });
    return true;
  }

  /**
   * Move clip to different track
   * @param {string} clipId - Clip ID
   * @param {string} sourceTrackId - Source track ID
   * @param {string} targetTrackId - Target track ID
   * @returns {boolean} True if moved
   */
  moveClipToTrack(clipId, sourceTrackId, targetTrackId) {
    const sourceTrack = this.tracks.get(sourceTrackId);
    const targetTrack = this.tracks.get(targetTrackId);

    if (!sourceTrack || !targetTrack) {
      return false;
    }

    const clipIndex = sourceTrack.clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) {
      return false;
    }

    const [clip] = sourceTrack.clips.splice(clipIndex, 1);
    clip.trackId = targetTrackId;
    targetTrack.clips.push(clip);
    targetTrack.clips.sort((a, b) => a.startTime - b.startTime);

    this.emit('clipMoved', { clipId, sourceTrackId, targetTrackId });
    return true;
  }

  /**
   * Reorder tracks
   * @param {Array} newOrder - New track order (array of track IDs)
   * @returns {boolean} True if reordered
   */
  reorderTracks(newOrder) {
    if (newOrder.length !== this.trackOrder.length) {
      return false;
    }

    // Validate all IDs exist
    for (const id of newOrder) {
      if (!this.tracks.has(id)) {
        return false;
      }
    }

    this.trackOrder = [...newOrder];

    this.emit('tracksReordered', { order: this.trackOrder });
    return true;
  }

  /**
   * Update track properties
   * @param {string} trackId - Track ID
   * @param {Object} updates - Properties to update
   * @returns {Object|null} Updated track or null
   */
  updateTrack(trackId, updates) {
    const track = this.tracks.get(trackId);
    if (!track) {
      return null;
    }

    const allowedUpdates = ['name', 'muted', 'solo', 'locked', 'visible', 'volume', 'opacity'];
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        track[key] = updates[key];
      }
    }

    this.emit('trackUpdated', track);
    return track;
  }

  /**
   * Update clip properties
   * @param {string} trackId - Track ID
   * @param {string} clipId - Clip ID
   * @param {Object} updates - Properties to update
   * @returns {Object|null} Updated clip or null
   */
  updateClip(trackId, clipId, updates) {
    const track = this.tracks.get(trackId);
    if (!track) {
      return null;
    }

    const clip = track.clips.find(c => c.id === clipId);
    if (!clip) {
      return null;
    }

    const allowedUpdates = ['startTime', 'duration', 'inPoint', 'outPoint', 'position', 'volume', 'opacity'];
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        clip[key] = updates[key];
      }
    }

    track.clips.sort((a, b) => a.startTime - b.startTime);

    this.emit('clipUpdated', { trackId, clip });
    return clip;
  }

  /**
   * Get total timeline duration
   * @returns {number} Duration in seconds
   */
  getTotalDuration() {
    let maxDuration = 0;

    for (const track of this.tracks.values()) {
      for (const clip of track.clips) {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > maxDuration) {
          maxDuration = clipEnd;
        }
      }
    }

    return maxDuration;
  }

  /**
   * Check for clip collisions on a track
   * @param {string} trackId - Track ID
   * @param {number} startTime - Start time
   * @param {number} duration - Duration
   * @param {string} excludeClipId - Clip ID to exclude (for move operations)
   * @returns {Array} List of colliding clips
   */
  getCollisions(trackId, startTime, duration, excludeClipId = null) {
    const track = this.tracks.get(trackId);
    if (!track) {
      return [];
    }

    const endTime = startTime + duration;
    return track.clips.filter(clip => {
      if (excludeClipId && clip.id === excludeClipId) {
        return false;
      }
      const clipEnd = clip.startTime + clip.duration;
      return (startTime < clipEnd && endTime > clip.startTime);
    });
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
   * Get track type constants
   * @returns {Object} Track type constants
   */
  static getTrackTypes() {
    return { ...TRACK_TYPE };
  }

  /**
   * Clear all tracks
   */
  clear() {
    this.tracks.clear();
    this.trackOrder = [];
    this.emit('cleared');
  }

  /**
   * Export timeline data
   * @returns {Object} Timeline data for serialization
   */
  exportTimeline() {
    return {
      tracks: this.getAllTracks(),
      trackOrder: [...this.trackOrder],
      totalDuration: this.getTotalDuration()
    };
  }

  /**
   * Import timeline data
   * @param {Object} data - Timeline data
   */
  importTimeline(data) {
    this.clear();

    if (data.tracks) {
      for (const trackData of data.tracks) {
        const track = { ...trackData };
        this.tracks.set(track.id, track);
      }
    }

    if (data.trackOrder) {
      this.trackOrder = [...data.trackOrder];
    }

    this.emit('timelineImported', data);
  }
}

module.exports = MultiTrackManager;
