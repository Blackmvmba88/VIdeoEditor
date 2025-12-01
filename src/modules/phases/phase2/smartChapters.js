/**
 * Smart Chapters Module - Phase 2.0
 * Automatic chapter division with AI-generated titles
 * Part of Auto-Edit 2.0
 */

const { v4: uuidv4 } = require('uuid');

// Chapter detection methods
const DETECTION_METHOD = {
  SCENE_BASED: 'scene_based',
  AUDIO_BASED: 'audio_based',
  CONTENT_BASED: 'content_based',
  COMBINED: 'combined'
};

// Default text constants
const DEFAULT_TEXTS = {
  FULL_VIDEO: 'Full Video',
  CHAPTER_PREFIX: 'Chapter'
};

class SmartChapters {
  constructor() {
    this.chapters = [];
    this.listeners = [];
  }

  /**
   * Analyze video and detect chapter points
   * @param {Object} analysisData - Content analysis data
   * @param {Object} options - Detection options
   * @returns {Array} Detected chapters
   */
  detectChapters(analysisData, options = {}) {
    const config = {
      minChapterDuration: options.minChapterDuration || 30,
      maxChapters: options.maxChapters || 10,
      method: options.method || DETECTION_METHOD.COMBINED,
      ...options
    };

    this.chapters = [];
    
    // Analyze scene changes to detect chapter boundaries
    const sceneChanges = analysisData.sceneChanges || [];
    const duration = analysisData.duration || 0;

    if (sceneChanges.length === 0) {
      // No scene changes, create single chapter
      this.chapters.push(this.createChapter(0, duration, DEFAULT_TEXTS.FULL_VIDEO, 1));
      return this.chapters;
    }

    // Group significant scene changes as chapter starts
    const significantChanges = sceneChanges
      .filter(sc => sc.score > 0.5)
      .sort((a, b) => a.time - b.time);

    let lastChapterEnd = 0;
    let chapterNum = 1;

    for (const change of significantChanges) {
      if (this.chapters.length >= config.maxChapters) break;
      
      const chapterDuration = change.time - lastChapterEnd;
      
      if (chapterDuration >= config.minChapterDuration) {
        this.chapters.push(
          this.createChapter(
            lastChapterEnd,
            change.time,
            `${DEFAULT_TEXTS.CHAPTER_PREFIX} ${chapterNum}`,
            chapterNum
          )
        );
        lastChapterEnd = change.time;
        chapterNum++;
      }
    }

    // Add final chapter if remaining duration is significant
    if (duration - lastChapterEnd >= config.minChapterDuration) {
      this.chapters.push(
        this.createChapter(
          lastChapterEnd,
          duration,
          `${DEFAULT_TEXTS.CHAPTER_PREFIX} ${chapterNum}`,
          chapterNum
        )
      );
    }

    this.emit('chaptersDetected', this.chapters);
    return this.chapters;
  }

  /**
   * Create a chapter object
   * @param {number} start - Start time
   * @param {number} end - End time
   * @param {string} title - Chapter title
   * @param {number} number - Chapter number
   * @returns {Object} Chapter object
   */
  createChapter(start, end, title, number) {
    return {
      id: uuidv4(),
      number,
      title,
      start,
      end,
      duration: end - start,
      thumbnail: null,
      description: '',
      tags: []
    };
  }

  /**
   * Update chapter title
   * @param {string} chapterId - Chapter ID
   * @param {string} title - New title
   * @returns {Object|null} Updated chapter or null
   */
  updateChapterTitle(chapterId, title) {
    const chapter = this.chapters.find(c => c.id === chapterId);
    if (chapter) {
      chapter.title = title;
      this.emit('chapterUpdated', chapter);
      return chapter;
    }
    return null;
  }

  /**
   * Get all chapters
   * @returns {Array} List of chapters
   */
  getChapters() {
    return [...this.chapters];
  }

  /**
   * Export chapters as YouTube format
   * @returns {string} YouTube chapter markers
   */
  exportYouTubeFormat() {
    return this.chapters
      .map(c => `${this.formatTime(c.start)} ${c.title}`)
      .join('\n');
  }

  /**
   * Format time as HH:MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
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
   * Get detection method constants
   * @returns {Object} Detection methods
   */
  static getDetectionMethods() {
    return { ...DETECTION_METHOD };
  }

  /**
   * Clear all chapters
   */
  clear() {
    this.chapters = [];
    this.emit('cleared');
  }
}

module.exports = SmartChapters;
