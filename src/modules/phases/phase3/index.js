/**
 * Índice de Módulos de Fase 3 - BlackMamba Studio
 * 
 * Fase 3.0 - Motion Graphics Pro (v3.0)
 *   - MotionGraphics: Sistema de plantillas y animación
 *   - LowerThirds: Tercios inferiores profesionales
 *   - AnimatedTitles: Títulos animados
 *   - EmojisCallouts: Emojis y callouts animados
 *   - SocialBanners: Banners para redes sociales
 * 
 * Fase 3.1 - Audio Profesional (v3.1)
 *   - AudioAI: Herramientas de audio con IA
 *   - AudioDenoise: Eliminación inteligente de ruido
 *   - AutoEQ: Ecualización automática para voz
 *   - AudioMixing: Mezcla automática de audio
 *   - VolumeNormalizer: Detección y normalización de volumen
 *   - MusicSync: Sincronización automática con ritmo musical (BPM)
 * 
 * Fase 3.2 - Color Grading (v3.2)
 *   - ColorWheels: Ruedas de color profesionales (Shadows/Midtones/Highlights)
 *   - VideoScopes: Vectorscopio, Waveform, Histogram
 *   - LUTManager: Gestión de LUTs (.cube, .3dl)
 *   - ColorMatch: Emparejamiento de color entre clips
 * 
 * Fase 3.3 - VFX Básicos (v3.3)
 *   - ChromaKey: Pantalla verde/azul
 *   - MotionTracking: Seguimiento de movimiento y estabilización
 *   - BlurGlow: Efectos de blur y glow
 *   - Masking: Sistema de máscaras
 * 
 * Nota: Estas características representan herramientas de nivel profesional
 * para creadores de contenido y editores profesionales.
 */

// Fase 3.0 - Motion Graphics
const MotionGraphics = require('./motionGraphics');
const LowerThirds = require('./lowerThirds');
const AnimatedTitles = require('./animatedTitles');
const EmojisCallouts = require('./emojisCallouts');
const SocialBanners = require('./socialBanners');

// Fase 3.1 - Audio AI
const AudioAI = require('./audioAI');
const AudioDenoise = require('./audioDenoise');
const AutoEQ = require('./autoEQ');
const AudioMixing = require('./audioMixing');
const VolumeNormalizer = require('./volumeNormalizer');
const MusicSync = require('./musicSync');

// Fase 3.2 - Color Grading
const ColorWheels = require('./colorWheels');
const VideoScopes = require('./videoScopes');
const LUTManager = require('./lutManager');
const ColorMatch = require('./colorMatch');

// Fase 3.3 - VFX Básicos
const ChromaKey = require('./chromaKey');
const MotionTracking = require('./motionTracking');
const BlurGlow = require('./blurGlow');
const Masking = require('./masking');

module.exports = {
  // Fase 3.0 - Motion Graphics
  MotionGraphics,
  LowerThirds,
  AnimatedTitles,
  EmojisCallouts,
  SocialBanners,
  
  // Fase 3.1 - Audio AI
  AudioAI,
  AudioDenoise,
  AutoEQ,
  AudioMixing,
  VolumeNormalizer,
  MusicSync,
  
  // Fase 3.2 - Color Grading
  ColorWheels,
  VideoScopes,
  LUTManager,
  ColorMatch,
  
  // Fase 3.3 - VFX Básicos
  ChromaKey,
  MotionTracking,
  BlurGlow,
  Masking
};
