/**
 * Phase 1 Modules Index - BlackMamba Studio
 * 
 * Phase 1.1 - Performance Improvements (v1.1)
 *   - ProxyManager: Generates proxy files for smoother editing
 *   - HardwareAccelerator: GPU acceleration support
 *   - MemoryManager: Intelligent memory management
 *   - BackgroundProcessor: Background rendering tasks
 * 
 * Phase 1.2 - Essential Editing Tools (v1.2)
 *   - MultiTrackManager: Multiple video/audio tracks
 *   - AudioMixer: Audio mixing with levels
 *   - KeyframeManager: Property animation
 * 
 * Phase 1.3 - Transitions and Effects (v1.3)
 *   - TransitionsManager: Professional transitions
 *   - ColorCorrection: Basic color adjustments
 *   - SpeedController: Speed control and time manipulation
 */

// Phase 1.1 - Performance Improvements
const ProxyManager = require('./proxyManager');
const HardwareAccelerator = require('./hardwareAccelerator');
const MemoryManager = require('./memoryManager');
const BackgroundProcessor = require('./backgroundProcessor');

// Phase 1.2 - Essential Editing Tools
const MultiTrackManager = require('./multiTrackManager');
const AudioMixer = require('./audioMixer');
const KeyframeManager = require('./keyframeManager');

// Phase 1.3 - Transitions and Effects
const TransitionsManager = require('./transitionsManager');
const ColorCorrection = require('./colorCorrection');
const SpeedController = require('./speedController');

module.exports = {
  // Phase 1.1
  ProxyManager,
  HardwareAccelerator,
  MemoryManager,
  BackgroundProcessor,
  
  // Phase 1.2
  MultiTrackManager,
  AudioMixer,
  KeyframeManager,
  
  // Phase 1.3
  TransitionsManager,
  ColorCorrection,
  SpeedController
};
