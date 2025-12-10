/**
 * BlackMamba Studio - ��ndice de Módulos
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

// Gesti?n de Proyectos y Codecs
const ProjectManager = require('./projectManager');
const CodecManager = require('./codecManager');

// Utilidades de Media
const WaveformGenerator = require('./waveformGenerator');
const ThumbnailGenerator = require('./thumbnailGenerator');

// Sistema de Historial
const HistoryManager = require('./historyManager');

// M?dulos de fases (v1.1+)
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
  
  // Gesti?n de Proyectos y Codecs
  ProjectManager,
  CodecManager,
  
  // Utilidades de Media
  WaveformGenerator,
  ThumbnailGenerator,
  
  // Sistema de Historial
  HistoryManager,
  
  // M?dulos de fases - organizados por fase
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
  SpeechToText: Phases.SpeechToText,
  
  // Módulos de Fase 3 (v3.0 - v3.1) - acceso directo
  MotionGraphics: Phases.MotionGraphics,
  LowerThirds: Phases.LowerThirds,
  AnimatedTitles: Phases.AnimatedTitles,
  EmojisCallouts: Phases.EmojisCallouts,
  SocialBanners: Phases.SocialBanners,
  AudioAI: Phases.AudioAI,
  AudioDenoise: Phases.AudioDenoise,
  AutoEQ: Phases.AutoEQ,
  AudioMixing: Phases.AudioMixing,
  VolumeNormalizer: Phases.VolumeNormalizer,
  MusicSync: Phases.MusicSync,
  
  // Módulos de Fase 4 (v4.0 - v4.1) - acceso directo
  PluginSystem: Phases.PluginSystem,
  PluginLoader: Phases.PluginLoader,
  PluginAPI: Phases.PluginAPI,
  CloudSync: Phases.CloudSync,
  CloudRender: Phases.CloudRender,
  Collaboration: Phases.Collaboration,
  MultiCamSync: Phases.MultiCamSync,
  AudioWaveformSync: Phases.AudioWaveformSync,
  MultiCamEditor: Phases.MultiCamEditor,
  
  // Módulos de Fase 5 (v5.0 - v5.3) - acceso directo
  AIStudio: Phases.AIStudio,
  MultiLangTranscription: Phases.MultiLangTranscription,
  KaraokeSubtitles: Phases.KaraokeSubtitles,
  NarrativeSummary: Phases.NarrativeSummary,
  EnhancedChaptering: Phases.EnhancedChaptering,
  StorytellingAI: Phases.StorytellingAI,
  RenderFarm: Phases.RenderFarm,
  RenderAPI: Phases.RenderAPI,
  APIManager: Phases.APIManager,
  ScalableRenderer: Phases.ScalableRenderer,
  AssetLibrary: Phases.AssetLibrary,
  AnimatedLoops: Phases.AnimatedLoops,
  TransitionsLibrary: Phases.TransitionsLibrary,
  AnimatedEmojis: Phases.AnimatedEmojis,
  GlitchEffects: Phases.GlitchEffects,
  LottieSupport: Phases.LottieSupport,
  AnimatedSVG: Phases.AnimatedSVG,
  AIAssets: Phases.AIAssets,
  Marketplace: Phases.Marketplace,
  PresetsStore: Phases.PresetsStore,
  TemplatesStore: Phases.TemplatesStore,
  LUTsStore: Phases.LUTsStore,
  EffectsStore: Phases.EffectsStore,
  MusicLibrary: Phases.MusicLibrary,
  CreatorMonetization: Phases.CreatorMonetization
};
