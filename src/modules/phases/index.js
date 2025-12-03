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
 *   - v2.0: Auto-Edit 2.0
 *   - v2.1: Transcripción y subtítulos
 * 
 * Para más detalles, ver ROADMAP.md
 */

const Phase1 = require('./phase1');
const Phase2 = require('./phase2');

module.exports = {
  Phase1,
  Phase2,
  
  // Re-exportar todos los módulos de Fase 1 a nivel superior por conveniencia
  ...Phase1,
  
  // Re-exportar todos los módulos de Fase 2 a nivel superior por conveniencia
  ...Phase2
};
