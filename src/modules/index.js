/**
 * BlackMamba Studio - Índice de Módulos
 * Exportación central de todos los módulos
 * 
 * Módulos Core (v1.0):
 *   - FFmpegWrapper, VideoProcessor, FormatDetector, FileValidator
 *   - ExportPresets, ExportRenderer, ContentAnalyzer, AutoEditor
 * 
 * Sistema de Agentes Inteligentes (BMIC):
 *   - FileValidator (Agente Validator): Validación pre-proceso avanzada
 *   - Optimizer (Agente Optimizer): Pipeline inteligente de FFmpeg
 *   - AutoImprove (Agente Auto-Improve): Análisis post-proceso y mejoras
 *   - BMIC (BlackMamba Intelligence Core): Motor de decisión maestro
 * 
 * Módulos de Fases (v1.1+):
 *   - Fase1: Rendimiento, Herramientas Esenciales, Transiciones y Efectos
 *   - Fase2: Características avanzadas de IA
 */

// Módulos core (v1.0)
const FFmpegWrapper = require('./ffmpegWrapper');
const VideoProcessor = require('./videoProcessor');
const FormatDetector = require('./formatDetector');
const FileValidator = require('./fileValidator');
const ExportPresets = require('./exportPresets');
const ExportRenderer = require('./exportRenderer');
const ContentAnalyzer = require('./contentAnalyzer');
const AutoEditor = require('./autoEditor');
const { VideoEditorError, ErrorCodes, ErrorMessages, ErrorHandler } = require('./errorHandler');

// Sistema de Agentes Inteligentes (BMIC)
const Optimizer = require('./optimizer');
const AutoImprove = require('./autoImprove');
const BMIC = require('./bmic');

// Módulos de fases (v1.1+)
const Phases = require('./phases');

module.exports = {
  // Módulos core (v1.0)
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
  
  // Sistema de Agentes Inteligentes (BMIC)
  Optimizer,
  AutoImprove,
  BMIC,
  
  // Módulos de fases - organizados por fase
  Phases,
  
  // Módulos de Fase 1 (v1.1 - v1.3) - acceso directo
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
  
  // Módulos de Fase 2 (v2.0 - v2.1) - acceso directo
  SmartChapters: Phases.SmartChapters,
  BeatSync: Phases.BeatSync,
  SpeechToText: Phases.SpeechToText
};
