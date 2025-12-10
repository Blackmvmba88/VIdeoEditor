/**
 * Audio Mixer Module - Phase 1.2
 * Audio mixing with per-track levels and controls
 */

const { v4: uuidv4 } = require('uuid');

// Audio channel configurations
const CHANNEL_CONFIG = {
  MONO: 'mono',
  STEREO: 'stereo',
  SURROUND_51: '5.1',
  SURROUND_71: '7.1'
};

class AudioMixer {
  constructor() {
    this.channels = new Map();
    this.masterVolume = 1;
    this.masterMuted = false;
    this.outputConfig = CHANNEL_CONFIG.STEREO;
    this.listeners = [];
  }

  /**
   * Create an audio channel
   * @param {Object} options - Channel options
   * @returns {Object} Created channel
   */
  createChannel(options = {}) {
    const channel = {
      id: options.id || uuidv4(),
      name: options.name || `Channel ${this.channels.size + 1}`,
      trackId: options.trackId || null,
      volume: options.volume !== undefined ? options.volume : 1,
      pan: options.pan !== undefined ? options.pan : 0,   // -1 (left) to 1 (right)
      muted: false,
      solo: false,
      gain: options.gain !== undefined ? options.gain : 0, // dB
      eq: {
        low: 0,     // dB adjustment for low frequencies
        mid: 0,     // dB adjustment for mid frequencies
        high: 0     // dB adjustment for high frequencies
      },
      effects: [],
      peakLevel: 0,
      rmsLevel: 0
    };

    this.channels.set(channel.id, channel);
    this.emit('channelCreated', channel);
    return channel;
  }

  /**
   * Delete a channel
   * @param {string} channelId - Channel ID
   * @returns {boolean} True if deleted
   */
  deleteChannel(channelId) {
    if (!this.channels.has(channelId)) {
      return false;
    }

    this.channels.delete(channelId);
    this.emit('channelDeleted', { channelId });
    return true;
  }

  /**
   * Get channel by ID
   * @param {string} channelId - Channel ID
   * @returns {Object|null} Channel or null
   */
  getChannel(channelId) {
    return this.channels.get(channelId) || null;
  }

  /**
   * Get all channels
   * @returns {Array} List of channels
   */
  getAllChannels() {
    return Array.from(this.channels.values());
  }

  /**
   * Set channel volume
   * @param {string} channelId - Channel ID
   * @param {number} volume - Volume (0-1)
   * @returns {boolean} True if set
   */
  setChannelVolume(channelId, volume) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return false;
    }

    channel.volume = Math.max(0, Math.min(1, volume));
    this.emit('channelVolumeChanged', { channelId, volume: channel.volume });
    return true;
  }

  /**
   * Set channel pan
   * @param {string} channelId - Channel ID
   * @param {number} pan - Pan value (-1 to 1)
   * @returns {boolean} True if set
   */
  setChannelPan(channelId, pan) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return false;
    }

    channel.pan = Math.max(-1, Math.min(1, pan));
    this.emit('channelPanChanged', { channelId, pan: channel.pan });
    return true;
  }

  /**
   * Mute/unmute channel
   * @param {string} channelId - Channel ID
   * @param {boolean} muted - Mute state
   * @returns {boolean} True if set
   */
  setChannelMute(channelId, muted) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return false;
    }

    channel.muted = muted;
    this.emit('channelMuteChanged', { channelId, muted });
    return true;
  }

  /**
   * Set channel solo
   * @param {string} channelId - Channel ID
   * @param {boolean} solo - Solo state
   * @returns {boolean} True if set
   */
  setChannelSolo(channelId, solo) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return false;
    }

    channel.solo = solo;
    this.emit('channelSoloChanged', { channelId, solo });
    return true;
  }

  /**
   * Set channel EQ
   * @param {string} channelId - Channel ID
   * @param {Object} eq - EQ settings
   * @returns {boolean} True if set
   */
  setChannelEQ(channelId, eq) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return false;
    }

    if (eq.low !== undefined) channel.eq.low = eq.low;
    if (eq.mid !== undefined) channel.eq.mid = eq.mid;
    if (eq.high !== undefined) channel.eq.high = eq.high;

    this.emit('channelEQChanged', { channelId, eq: channel.eq });
    return true;
  }

  /**
   * Set master volume
   * @param {number} volume - Volume (0-1)
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.emit('masterVolumeChanged', { volume: this.masterVolume });
  }

  /**
   * Set master mute
   * @param {boolean} muted - Mute state
   */
  setMasterMute(muted) {
    this.masterMuted = muted;
    this.emit('masterMuteChanged', { muted });
  }

  /**
   * Get master settings
   * @returns {Object} Master settings
   */
  getMasterSettings() {
    return {
      volume: this.masterVolume,
      muted: this.masterMuted,
      outputConfig: this.outputConfig
    };
  }

  /**
   * Calculate effective volume for a channel
   * @param {string} channelId - Channel ID
   * @returns {number} Effective volume
   */
  getEffectiveVolume(channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return 0;
    }

    // Check if master is muted
    if (this.masterMuted) {
      return 0;
    }

    // Check if channel is muted
    if (channel.muted) {
      return 0;
    }

    // Check solo mode - if any channel is soloed, only play soloed channels
    const hasSoloChannels = Array.from(this.channels.values()).some(c => c.solo);
    if (hasSoloChannels && !channel.solo) {
      return 0;
    }

    return channel.volume * this.masterVolume;
  }

  /**
   * Generate FFmpeg audio filter for mixing
   * @returns {string} FFmpeg audio filter string
   */
  generateMixerFilter() {
    const activeChannels = this.getAllChannels().filter(ch => {
      return this.getEffectiveVolume(ch.id) > 0;
    });

    if (activeChannels.length === 0) {
      return 'anull';
    }

    const filters = activeChannels.map((channel, index) => {
      const parts = [];
      const effectiveVolume = this.getEffectiveVolume(channel.id);
      
      // Volume adjustment
      parts.push(`[${index}:a]volume=${effectiveVolume.toFixed(3)}`);
      
      // Pan (stereo balance)
      if (channel.pan !== 0) {
        const leftGain = channel.pan < 0 ? 1 : 1 - channel.pan;
        const rightGain = channel.pan > 0 ? 1 : 1 + channel.pan;
        parts.push(`pan=stereo|c0=${leftGain.toFixed(3)}*c0|c1=${rightGain.toFixed(3)}*c1`);
      }

      // EQ (simplified)
      if (channel.eq.low !== 0 || channel.eq.mid !== 0 || channel.eq.high !== 0) {
        parts.push(`equalizer=f=100:t=h:w=200:g=${channel.eq.low}`);
        parts.push(`equalizer=f=1000:t=h:w=500:g=${channel.eq.mid}`);
        parts.push(`equalizer=f=8000:t=h:w=2000:g=${channel.eq.high}`);
      }

      return parts.join(',');
    });

    // Mix all channels
    if (filters.length > 1) {
      return filters.join(';') + `;amix=inputs=${filters.length}:duration=longest`;
    }

    return filters[0];
  }

  /**
   * Update audio levels (for visualization)
   * @param {string} channelId - Channel ID
   * @param {number} peakLevel - Peak level
   * @param {number} rmsLevel - RMS level
   */
  updateLevels(channelId, peakLevel, rmsLevel) {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.peakLevel = peakLevel;
      channel.rmsLevel = rmsLevel;
      this.emit('levelsUpdated', { channelId, peakLevel, rmsLevel });
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
   * Get channel configuration constants
   * @returns {Object} Channel configuration constants
   */
  static getChannelConfigs() {
    return { ...CHANNEL_CONFIG };
  }

  /**
   * Reset mixer to default state
   */
  reset() {
    this.channels.clear();
    this.masterVolume = 1;
    this.masterMuted = false;
    this.emit('mixerReset');
  }

  /**
   * Export mixer state
   * @returns {Object} Mixer state
   */
  exportState() {
    return {
      channels: this.getAllChannels(),
      masterVolume: this.masterVolume,
      masterMuted: this.masterMuted,
      outputConfig: this.outputConfig
    };
  }

  /**
   * Import mixer state
   * @param {Object} state - Mixer state
   */
  importState(state) {
    this.reset();

    if (state.masterVolume !== undefined) {
      this.masterVolume = state.masterVolume;
    }
    if (state.masterMuted !== undefined) {
      this.masterMuted = state.masterMuted;
    }
    if (state.outputConfig !== undefined) {
      this.outputConfig = state.outputConfig;
    }
    if (state.channels) {
      for (const channelData of state.channels) {
        const channel = { ...channelData };
        this.channels.set(channel.id, channel);
      }
    }

    this.emit('stateImported', state);
  }
}

module.exports = AudioMixer;
