/**
 * Índice de Módulos de Fase 1 - BlackMamba Studio
 * 
 * Fase 1.1 - Mejoras de Rendimiento (v1.1)
 *   - ProxyManager: Genera archivos proxy para edición más fluida
 *   - HardwareAccelerator: Soporte de aceleración por GPU
 *   - MemoryManager: Gestión inteligente de memoria
 *   - BackgroundProcessor: Tareas de renderizado en segundo plano
 * 
 * Fase 1.2 - Herramientas de Edición Esenciales (v1.2)
 *   - MultiTrackManager: Múltiples pistas de video/audio
 *   - AudioMixer: Mezcla de audio con niveles
 *   - KeyframeManager: Animación de propiedades
 *   - LayersManager: Sistema de capas para superposición
 *   - BasicTitles: Editor de títulos básicos
 *   - AudioEffects: Normalización y efectos de audio
 *   - CropPan: Recorte y panorámica animados
 * 
 * Fase 1.3 - Transiciones y Efectos (v1.3)
 *   - TransitionsManager: Transiciones profesionales
 *   - ColorCorrection: Ajustes básicos de color
 *   - SpeedController: Control de velocidad y manipulación de tiempo
 */

// Fase 1.1 - Mejoras de Rendimiento
const ProxyManager = require('./proxyManager');
const HardwareAccelerator = require('./hardwareAccelerator');
const MemoryManager = require('./memoryManager');
const BackgroundProcessor = require('./backgroundProcessor');

// Fase 1.2 - Herramientas de Edición Esenciales
const MultiTrackManager = require('./multiTrackManager');
const AudioMixer = require('./audioMixer');
const KeyframeManager = require('./keyframeManager');
const LayersManager = require('./layersManager');
const BasicTitles = require('./basicTitles');
const AudioEffects = require('./audioEffects');
const CropPan = require('./cropPan');

// Fase 1.3 - Transiciones y Efectos
const TransitionsManager = require('./transitionsManager');
const ColorCorrection = require('./colorCorrection');
const SpeedController = require('./speedController');

module.exports = {
  // Fase 1.1
  ProxyManager,
  HardwareAccelerator,
  MemoryManager,
  BackgroundProcessor,
  
  // Fase 1.2
  MultiTrackManager,
  AudioMixer,
  KeyframeManager,
  LayersManager,
  BasicTitles,
  AudioEffects,
  CropPan,
  
  // Fase 1.3
  TransitionsManager,
  ColorCorrection,
  SpeedController
};
