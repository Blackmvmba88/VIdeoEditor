/**
 * Índice de Módulos de Fase 4 - BlackMamba Studio
 * 
 * Fase 4.0 - Ecosystem & Cloud (v4.0)
 *   - PluginSystem: Arquitectura de plugins
 *   - PluginLoader: Cargador y gestor de plugins
 *   - PluginAPI: API para desarrollo de plugins
 *   - CloudSync: Sincronización de proyectos en la nube
 *   - CloudRender: Renderizado en servidor
 *   - Collaboration: Colaboración en tiempo real
 * 
 * Fase 4.1 - Multi-Camera (v4.1)
 *   - MultiCamSync: Sincronización automática de múltiples cámaras
 *   - AudioWaveformSync: Sincronización por forma de onda de audio
 *   - MultiCamEditor: Editor multi-cámara
 * 
 * Nota: Estas características transforman BlackMamba Studio en un ecosistema completo.
 */

// Fase 4.0 - Ecosystem & Cloud
const PluginSystem = require('./pluginSystem');
const PluginLoader = require('./pluginLoader');
const PluginAPI = require('./pluginAPI');
const CloudSync = require('./cloudSync');
const CloudRender = require('./cloudRender');
const Collaboration = require('./collaboration');

// Fase 4.1 - Multi-Camera
const MultiCamSync = require('./multiCamSync');
const AudioWaveformSync = require('./audioWaveformSync');
const MultiCamEditor = require('./multiCamEditor');

module.exports = {
  // Fase 4.0 - Ecosystem & Cloud
  PluginSystem,
  PluginLoader,
  PluginAPI,
  CloudSync,
  CloudRender,
  Collaboration,
  
  // Fase 4.1 - Multi-Camera
  MultiCamSync,
  AudioWaveformSync,
  MultiCamEditor
};
