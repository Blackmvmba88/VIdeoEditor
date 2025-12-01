/**
 * Phase 2 Modules Index - BlackMamba Studio
 * 
 * Phase 2.0 - Auto-Edit 2.0 (v2.0)
 *   - SmartChapters: Automatic chapter division
 *   - BeatSync: Music beat synchronization
 * 
 * Phase 2.1 - Transcription & Subtitles (v2.1)
 *   - SpeechToText: Automatic transcription
 * 
 * Note: Some Phase 2 features require external AI services for full functionality.
 * The modules provide the infrastructure and interfaces for integration.
 */

const SmartChapters = require('./smartChapters');
const BeatSync = require('./beatSync');
const SpeechToText = require('./speechToText');

module.exports = {
  // Phase 2.0 - Auto-Edit 2.0
  SmartChapters,
  BeatSync,
  
  // Phase 2.1 - Transcription & Subtitles
  SpeechToText
};
