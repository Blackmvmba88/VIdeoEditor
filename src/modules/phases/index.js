/**
 * BlackMamba Studio - Phases Modules
 * 
 * Systematic implementation of the roadmap phases:
 * 
 * Phase 1: Fundamentos Avanzados (v1.1 - v1.3)
 *   - v1.1: Performance improvements
 *   - v1.2: Essential editing tools
 *   - v1.3: Transitions and effects
 * 
 * Phase 2: Inteligencia Artificial Avanzada (v2.0 - v2.5)
 *   - v2.0: Auto-Edit 2.0
 *   - v2.1: Transcription and subtitles
 * 
 * For more details, see ROADMAP.md
 */

const Phase1 = require('./phase1');
const Phase2 = require('./phase2');

module.exports = {
  Phase1,
  Phase2,
  
  // Re-export all Phase 1 modules at top level for convenience
  ...Phase1,
  
  // Re-export all Phase 2 modules at top level for convenience
  ...Phase2
};
