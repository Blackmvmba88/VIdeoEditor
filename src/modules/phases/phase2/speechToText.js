/**
 * Speech to Text Module - Phase 2.1
 * Automatic speech transcription for subtitles
 * Note: Full implementation requires external speech recognition service
 */

const { v4: uuidv4 } = require('uuid');

// Transcription status
const TRANSCRIPTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Supported languages
const SUPPORTED_LANGUAGES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
  ru: 'Russian'
};

class SpeechToText {
  constructor() {
    this.transcriptions = new Map();
    this.listeners = [];
  }

  /**
   * Start transcription for a video/audio file
   * @param {string} mediaPath - Path to media file
   * @param {Object} options - Transcription options
   * @returns {Object} Transcription job
   */
  async startTranscription(mediaPath, options = {}) {
    const jobId = uuidv4();
    
    const job = {
      id: jobId,
      mediaPath,
      language: options.language || 'en',
      autoDetectLanguage: options.autoDetectLanguage || false,
      status: TRANSCRIPTION_STATUS.PENDING,
      progress: 0,
      segments: [],
      fullText: '',
      createdAt: new Date().toISOString(),
      completedAt: null,
      error: null
    };

    this.transcriptions.set(jobId, job);
    this.emit('transcriptionStarted', job);

    // Simulate transcription process
    // In production, this would call an external service like Whisper
    job.status = TRANSCRIPTION_STATUS.PROCESSING;

    try {
      // Placeholder for actual transcription
      // This would integrate with OpenAI Whisper or similar
      job.segments = await this.simulateTranscription(options.duration || 60);
      job.fullText = job.segments.map(s => s.text).join(' ');
      job.status = TRANSCRIPTION_STATUS.COMPLETED;
      job.completedAt = new Date().toISOString();
      job.progress = 100;
      
      this.emit('transcriptionCompleted', job);
    } catch (error) {
      job.status = TRANSCRIPTION_STATUS.FAILED;
      job.error = error.message;
      this.emit('transcriptionFailed', { job, error });
    }

    return job;
  }

  /**
   * Simulate transcription (placeholder)
   * @param {number} duration - Video duration
   * @returns {Promise<Array>} Simulated segments
   */
  async simulateTranscription(duration) {
    const segments = [];
    const avgSegmentDuration = 3;
    let currentTime = 0;

    while (currentTime < duration) {
      const segmentDuration = avgSegmentDuration + (Math.random() - 0.5) * 2;
      
      segments.push({
        id: uuidv4(),
        start: currentTime,
        end: Math.min(currentTime + segmentDuration, duration),
        text: '[Transcription placeholder - integrate with Whisper API]',
        confidence: 0.95,
        words: []
      });

      currentTime += segmentDuration;
    }

    return segments;
  }

  /**
   * Get transcription by job ID
   * @param {string} jobId - Job ID
   * @returns {Object|null} Transcription job or null
   */
  getTranscription(jobId) {
    return this.transcriptions.get(jobId) || null;
  }

  /**
   * Update segment text
   * @param {string} jobId - Job ID
   * @param {string} segmentId - Segment ID
   * @param {string} newText - New text
   * @returns {Object|null} Updated segment or null
   */
  updateSegmentText(jobId, segmentId, newText) {
    const job = this.transcriptions.get(jobId);
    if (!job) return null;

    const segment = job.segments.find(s => s.id === segmentId);
    if (!segment) return null;

    segment.text = newText;
    job.fullText = job.segments.map(s => s.text).join(' ');

    this.emit('segmentUpdated', { jobId, segment });
    return segment;
  }

  /**
   * Export as SRT format
   * @param {string} jobId - Job ID
   * @returns {string} SRT formatted subtitles
   */
  exportSRT(jobId) {
    const job = this.transcriptions.get(jobId);
    if (!job || !job.segments) return '';

    return job.segments.map((segment, index) => {
      const startTime = this.formatSRTTime(segment.start);
      const endTime = this.formatSRTTime(segment.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
    }).join('\n');
  }

  /**
   * Export as VTT format
   * @param {string} jobId - Job ID
   * @returns {string} VTT formatted subtitles
   */
  exportVTT(jobId) {
    const job = this.transcriptions.get(jobId);
    if (!job || !job.segments) return '';

    let vtt = 'WEBVTT\n\n';
    
    vtt += job.segments.map((segment, index) => {
      const startTime = this.formatVTTTime(segment.start);
      const endTime = this.formatVTTTime(segment.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
    }).join('\n');

    return vtt;
  }

  /**
   * Format time for SRT (HH:MM:SS,mmm)
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  formatSRTTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Format time for VTT (HH:MM:SS.mmm)
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  formatVTTTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Get supported languages
   * @returns {Object} Supported languages
   */
  getSupportedLanguages() {
    return { ...SUPPORTED_LANGUAGES };
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
   * Get status constants
   * @returns {Object} Status constants
   */
  static getStatusConstants() {
    return { ...TRANSCRIPTION_STATUS };
  }

  /**
   * Clear all transcriptions
   */
  clear() {
    this.transcriptions.clear();
    this.emit('cleared');
  }
}

module.exports = SpeechToText;
