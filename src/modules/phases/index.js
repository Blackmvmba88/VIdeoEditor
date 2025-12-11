/**
 * BlackMamba Studio - Módulos de Fases
 * 
 * Implementación sistemática de las fases del roadmap:
 * 
 * Fase 1: Fundamentos Avanzados (v1.1 - v1.3)
 *   - v1.1: Mejoras de rendimiento
 *   - v1.2: Herramientas de edición esenciales
 *   - v1.3: Transiciones y efectos
 * 
 * Fase 2: Inteligencia Artificial Avanzada (v2.0 - v2.5)
 *   - v2.0: Auto-Edit 2
 *   - v2.1: Transcripción y subtítulos
 * 
 * Fase 3: Profesionalización (v3.0 - v3.1)
 *   - v3.0: Motion Graphics Pro
 *   - v3.1: Audio Profesional con IA
 * 
 * Fase 4: Ecosistema Conectado (v4.0 - v4.1)
 *   - v4.0: Plugin System, Cloud & Colaboración
 *   - v4.1: Multi-Camera
 * 
 * Fase 5: El Futuro (v5.0 - v5.3)
 *   - v5.0: AI Studio Avanzado
 *   - v5.1: Render Farm & API
 *   - v5.2: Asset Library
 *   - v5.3: Marketplace Creativo
 * 
 * Para más detalles, ver ROADMAP.md
 */

const Phase1 = require('./phase1');
const Phase2 = require('./phase2');
const Phase3 = require('./phase3');
const Phase4 = require('./phase4');
const Phase5 = require('./phase5');
const Phase6 = require('./phase6');
const Phase7 = require('./phase7');

module.exports = {
  Phase1,
  Phase2,
  Phase3,
  Phase4,
  Phase5,
  Phase6,
  Phase7,
  
  // Re-exportar todos los módulos de Fase 1 a nivel superior por conveniencia
  ...Phase1,
  
  // Re-exportar todos los módulos de Fase 2 a nivel superior por conveniencia
  ...Phase2,
  
  // Re-exportar todos los módulos de Fase 3 a nivel superior por conveniencia
  ...Phase3,
  
  // Re-exportar todos los módulos de Fase 4 a nivel superior por conveniencia
  ...Phase4,
  
  // Re-exportar todos los módulos de Fase 5 a nivel superior por conveniencia
  ...Phase5,
  
  // Re-exportar todos los módulos de Fase 6 a nivel superior por conveniencia
  ...Phase6,
  
  // Re-exportar todos los módulos de Fase 7 a nivel superior por conveniencia
  ...Phase7
};
