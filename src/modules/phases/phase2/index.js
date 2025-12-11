/**
 * Índice de Módulos de Fase 2 - BlackMamba Studio
 * 
 * Fase 2 - Auto-Edit 2 (v2.0)
 *   - SmartChapters: División automática de capítulos
 *   - BeatSync: Sincronización de ritmo musical
 * 
 * Fase 2.1 - Transcripción y Subtítulos (v2.1)
 *   - SpeechToText: Transcripción automática
 *   - VoiceIsolation: Separación de voz del fondo
 *   - SubtitleTranslator: Traducción de subtítulos multi-idioma
 * 
 * Nota: Algunas características de Fase 2 requieren servicios externos de IA para funcionalidad completa.
 * Los módulos proporcionan la infraestructura e interfaces para integración.
 */

const SmartChapters = require('./smartChapters');
const BeatSync = require('./beatSync');
const SpeechToText = require('./speechToText');
const VoiceIsolation = require('./voiceIsolation');
const SubtitleTranslator = require('./subtitleTranslator');

module.exports = {
  // Fase 2 - Auto-Edit 2
  SmartChapters,
  BeatSync,
  
  // Fase 2.1 - Transcripción y Subtítulos
  SpeechToText,
  VoiceIsolation,
  SubtitleTranslator
};
