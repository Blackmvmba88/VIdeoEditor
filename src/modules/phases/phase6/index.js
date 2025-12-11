/**
 * Phase 6 - Next Generation Features
 * 
 * Módulos avanzados de nueva generación:
 * - 8K / HDR Grading
 * - 3D LUT Creator
 * - Spatial Audio / Dolby Atmos
 * - Podcast Mode
 * - ADR Tools (Automated Dialogue Replacement)
 * - Sound Design (Foley & SFX Library)
 * - VFX Tools (Chroma Key, Tracking, Stabilization)
 * - Node Compositor (Fusion/Nuke-style node-based compositing)
 * - Music Composer (AI Music Composition)
 */

const LutCreator = require('./lutCreator');
const HdrGrading = require('./hdrGrading');
const SpatialAudio = require('./spatialAudio');
const PodcastMode = require('./podcastMode');
const ADRTools = require('./adrTools');
const SoundDesign = require('./soundDesign');
const VFXTools = require('./vfxTools');
const NodeCompositor = require('./nodeCompositor');
const MusicComposer = require('./musicComposer');

module.exports = {
  LutCreator,
  HdrGrading,
  SpatialAudio,
  PodcastMode,
  ADRTools,
  SoundDesign,
  VFXTools,
  NodeCompositor,
  MusicComposer
};
