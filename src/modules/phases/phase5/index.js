/**
 * Índice de Módulos de Fase 5 - BlackMamba Studio
 * 
 * Fase 5.0 - AI Studio Avanzado (v5.0)
 *   - AIStudio: Motor central del estudio de IA
 *   - MultiLangTranscription: Transcripción multi-idioma
 *   - KaraokeSubtitles: Subtítulos estilo karaoke (TikTok)
 *   - NarrativeSummary: Resumen narrativo automático
 *   - EnhancedChaptering: Capítulos mejorados con IA
 *   - StorytellingAI: Sugerencias de IA para storytelling
 * 
 * Fase 5.1 - Render Farm & API (v5.1)
 *   - RenderFarm: Infraestructura de granja de renderizado
 *   - RenderAPI: API REST para renderizado
 *   - APIManager: Gestor de API y autenticación
 *   - ScalableRenderer: Renderizador escalable
 * 
 * Fase 5.2 - Asset Library (v5.2)
 *   - AssetLibrary: Biblioteca de activos BlackMamba
 *   - AnimatedLoops: Loops animados
 *   - TransitionsLibrary: Biblioteca de transiciones
 *   - AnimatedEmojis: Emojis animados
 *   - GlitchEffects: Efectos glitch
 *   - LottieSupport: Soporte para Lottie JSON
 *   - AnimatedSVG: Títulos SVG animados
 *   - AIAssets: Activos generados por IA
 * 
 * Fase 5.3 - Marketplace (v5.3)
 *   - Marketplace: Plataforma de marketplace
 *   - PresetsStore: Tienda de presets
 *   - TemplatesStore: Tienda de plantillas
 *   - LUTsStore: Marketplace de LUTs
 *   - EffectsStore: Tienda de efectos
 *   - MusicLibrary: Biblioteca de música BlackMamba
 *   - CreatorMonetization: Sistema de monetización para creadores
 * 
 * Nota: Estas características representan el futuro de BlackMamba Studio.
 */

// Fase 5.0 - AI Studio Avanzado
const AIStudio = require('./aiStudio');
const MultiLangTranscription = require('./multiLangTranscription');
const KaraokeSubtitles = require('./karaokeSubtitles');
const NarrativeSummary = require('./narrativeSummary');
const EnhancedChaptering = require('./enhancedChaptering');
const StorytellingAI = require('./storytellingAI');

// Fase 5.1 - Render Farm & API
const RenderFarm = require('./renderFarm');
const RenderAPI = require('./renderAPI');
const APIManager = require('./apiManager');
const ScalableRenderer = require('./scalableRenderer');

// Fase 5.2 - Asset Library
const AssetLibrary = require('./assetLibrary');
const AnimatedLoops = require('./animatedLoops');
const TransitionsLibrary = require('./transitionsLibrary');
const AnimatedEmojis = require('./animatedEmojis');
const GlitchEffects = require('./glitchEffects');
const LottieSupport = require('./lottieSupport');
const AnimatedSVG = require('./animatedSVG');
const AIAssets = require('./aiAssets');

// Fase 5.3 - Marketplace
const Marketplace = require('./marketplace');
const PresetsStore = require('./presetsStore');
const TemplatesStore = require('./templatesStore');
const LUTsStore = require('./lutsStore');
const EffectsStore = require('./effectsStore');
const MusicLibrary = require('./musicLibrary');
const CreatorMonetization = require('./creatorMonetization');

module.exports = {
  // Fase 5.0 - AI Studio Avanzado
  AIStudio,
  MultiLangTranscription,
  KaraokeSubtitles,
  NarrativeSummary,
  EnhancedChaptering,
  StorytellingAI,
  
  // Fase 5.1 - Render Farm & API
  RenderFarm,
  RenderAPI,
  APIManager,
  ScalableRenderer,
  
  // Fase 5.2 - Asset Library
  AssetLibrary,
  AnimatedLoops,
  TransitionsLibrary,
  AnimatedEmojis,
  GlitchEffects,
  LottieSupport,
  AnimatedSVG,
  AIAssets,
  
  // Fase 5.3 - Marketplace
  Marketplace,
  PresetsStore,
  TemplatesStore,
  LUTsStore,
  EffectsStore,
  MusicLibrary,
  CreatorMonetization
};
