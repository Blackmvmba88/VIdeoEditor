/**
 * BlackMamba Studio - Modules Index
 * Central export for all modules
 * 
 * Core Modules (v1.0):
 *   - FFmpegWrapper, VideoProcessor, FormatDetector, FileValidator
 *   - ExportPresets, ExportRenderer, ContentAnalyzer, AutoEditor
 * 
 * Phase Modules (v1.1+):
 *   - Phase1: Performance, Essential Tools, Transitions & Effects
 *   - Phase2: AI Advanced features
 */

// Core modules (v1.0)
const FFmpegWrapper = require('./ffmpegWrapper');
const VideoProcessor = require('./videoProcessor');
const FormatDetector = require('./formatDetector');
const FileValidator = require('./fileValidator');
const ExportPresets = require('./exportPresets');
const ExportRenderer = require('./exportRenderer');
const ContentAnalyzer = require('./contentAnalyzer');
const AutoEditor = require('./autoEditor');
const { VideoEditorError, ErrorCodes, ErrorMessages, ErrorHandler } = require('./errorHandler');

// Phase modules (v1.1+)
const Phases = require('./phases');

module.exports = {
  // Core modules (v1.0)
  FFmpegWrapper,
  VideoProcessor,
  FormatDetector,
  FileValidator,
  ExportPresets,
  ExportRenderer,
  ContentAnalyzer,
  AutoEditor,
  VideoEditorError,
  ErrorCodes,
  ErrorMessages,
  ErrorHandler,
  
  // Phase modules - organized by phase
  Phases,
  
  // Phase 1 modules (v1.1 - v1.3) - direct access
  ProxyManager: Phases.ProxyManager,
  HardwareAccelerator: Phases.HardwareAccelerator,
  MemoryManager: Phases.MemoryManager,
  BackgroundProcessor: Phases.BackgroundProcessor,
  MultiTrackManager: Phases.MultiTrackManager,
  AudioMixer: Phases.AudioMixer,
  KeyframeManager: Phases.KeyframeManager,
  TransitionsManager: Phases.TransitionsManager,
  ColorCorrection: Phases.ColorCorrection,
  SpeedController: Phases.SpeedController,
  
  // Phase 2 modules (v2.0 - v2.1) - direct access
  SmartChapters: Phases.SmartChapters,
  BeatSync: Phases.BeatSync,
  SpeechToText: Phases.SpeechToText
};
