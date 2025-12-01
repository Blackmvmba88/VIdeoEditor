/**
 * Beat Sync Module - Phase 2.0
 * Automatic synchronization of video cuts with music beats
 */

const { v4: uuidv4 } = require('uuid');
const FFmpegWrapper = require('../../ffmpegWrapper');

class BeatSync {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.beats = [];
    this.syncPoints = [];
    this.listeners = [];
  }

  /**
   * Detect beats in audio
   * @param {string} audioPath - Path to audio/video file
   * @param {Object} options - Detection options
   * @returns {Promise<Array>} Detected beats
   */
  async detectBeats(audioPath, options = {}) {
    const config = {
      sensitivity: options.sensitivity || 0.5,
      minBeatInterval: options.minBeatInterval || 0.25,
      ...options
    };

    this.beats = [];

    try {
      // Use FFmpeg to analyze audio for beat detection
      const args = [
        '-i', audioPath,
        '-af', `silencedetect=noise=-30dB:d=0.1,astats=metadata=1:reset=1`,
        '-f', 'null',
        '-'
      ];

      const result = await this.ffmpeg.execute(args);
      
      // Parse output for volume peaks (simplified beat detection)
      const lines = result.output.split('\n');
      let lastBeatTime = 0;

      for (const line of lines) {
        const rmsMatch = line.match(/RMS level:\s*([-\d.]+)\s*dB/);
        const timeMatch = line.match(/pts_time:([\d.]+)/);
        
        if (rmsMatch && timeMatch) {
          const rmsLevel = parseFloat(rmsMatch[1]);
          const time = parseFloat(timeMatch[1]);
          
          // Detect beat based on RMS threshold
          if (rmsLevel > -20 * (1 - config.sensitivity) && 
              time - lastBeatTime >= config.minBeatInterval) {
            this.beats.push({
              id: uuidv4(),
              time,
              strength: Math.min(1, (rmsLevel + 60) / 40),
              type: 'detected'
            });
            lastBeatTime = time;
          }
        }
      }
    } catch (error) {
      // Fallback: generate estimated beats based on common tempos
      const duration = options.duration || 60;
      const bpm = options.bpm || 120;
      const beatInterval = 60 / bpm;

      for (let time = 0; time < duration; time += beatInterval) {
        this.beats.push({
          id: uuidv4(),
          time,
          strength: time % (beatInterval * 4) < 0.01 ? 1 : 0.5,
          type: 'estimated'
        });
      }
    }

    this.emit('beatsDetected', this.beats);
    return this.beats;
  }

  /**
   * Generate sync points for video cuts
   * @param {Array} clips - Video clips to sync
   * @param {Object} options - Sync options
   * @returns {Array} Sync points
   */
  generateSyncPoints(clips, options = {}) {
    const config = {
      preferStrongBeats: options.preferStrongBeats !== false,
      minClipDuration: options.minClipDuration || 0.5,
      maxClipDuration: options.maxClipDuration || 10,
      ...options
    };

    this.syncPoints = [];
    
    // Filter beats based on strength preference
    let targetBeats = this.beats;
    if (config.preferStrongBeats) {
      targetBeats = this.beats.filter(b => b.strength >= 0.7);
      
      // If not enough strong beats, include weaker ones
      if (targetBeats.length < clips.length) {
        targetBeats = this.beats;
      }
    }

    // Match clips to beats
    let beatIndex = 0;
    let currentTime = 0;

    for (let i = 0; i < clips.length && beatIndex < targetBeats.length; i++) {
      const clip = clips[i];
      const clipDuration = Math.min(
        config.maxClipDuration,
        Math.max(config.minClipDuration, clip.duration || config.maxClipDuration)
      );

      // Find next beat after current time
      while (beatIndex < targetBeats.length && targetBeats[beatIndex].time < currentTime) {
        beatIndex++;
      }

      if (beatIndex < targetBeats.length) {
        const syncPoint = {
          id: uuidv4(),
          clipId: clip.id,
          clipIndex: i,
          beatTime: targetBeats[beatIndex].time,
          startTime: currentTime,
          endTime: currentTime + clipDuration,
          beatStrength: targetBeats[beatIndex].strength
        };

        this.syncPoints.push(syncPoint);
        currentTime += clipDuration;
        beatIndex++;
      }
    }

    this.emit('syncPointsGenerated', this.syncPoints);
    return this.syncPoints;
  }

  /**
   * Manually add a beat marker
   * @param {number} time - Time in seconds
   * @param {number} strength - Beat strength (0-1)
   * @returns {Object} Created beat
   */
  addManualBeat(time, strength = 1) {
    const beat = {
      id: uuidv4(),
      time,
      strength: Math.max(0, Math.min(1, strength)),
      type: 'manual'
    };

    this.beats.push(beat);
    this.beats.sort((a, b) => a.time - b.time);

    this.emit('beatAdded', beat);
    return beat;
  }

  /**
   * Remove a beat
   * @param {string} beatId - Beat ID
   * @returns {boolean} True if removed
   */
  removeBeat(beatId) {
    const index = this.beats.findIndex(b => b.id === beatId);
    if (index === -1) return false;

    this.beats.splice(index, 1);
    this.emit('beatRemoved', { beatId });
    return true;
  }

  /**
   * Get all beats
   * @returns {Array} List of beats
   */
  getBeats() {
    return [...this.beats];
  }

  /**
   * Get all sync points
   * @returns {Array} List of sync points
   */
  getSyncPoints() {
    return [...this.syncPoints];
  }

  /**
   * Set BPM manually
   * @param {number} bpm - Beats per minute
   * @param {number} duration - Audio duration
   * @param {number} offset - Starting offset
   */
  setBPM(bpm, duration, offset = 0) {
    this.beats = [];
    const beatInterval = 60 / bpm;

    for (let time = offset; time < duration; time += beatInterval) {
      const isDownbeat = Math.abs(((time - offset) / beatInterval) % 4) < 0.01;
      this.beats.push({
        id: uuidv4(),
        time,
        strength: isDownbeat ? 1 : 0.5,
        type: 'bpm'
      });
    }

    this.emit('bpmSet', { bpm, duration, offset });
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
   * Clear all data
   */
  clear() {
    this.beats = [];
    this.syncPoints = [];
    this.emit('cleared');
  }

  /**
   * Export beat data
   * @returns {Object} Beat and sync data
   */
  exportData() {
    return {
      beats: [...this.beats],
      syncPoints: [...this.syncPoints]
    };
  }

  /**
   * Import beat data
   * @param {Object} data - Beat and sync data
   */
  importData(data) {
    this.beats = data.beats || [];
    this.syncPoints = data.syncPoints || [];
    this.emit('dataImported');
  }
}

module.exports = BeatSync;
