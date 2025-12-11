/**
 * @module Phase7
 * @description Platform - BlackMamba Cloud & Broadcasting
 * Cloud storage, GPU rendering, team workspaces, live streaming, education
 */

const CloudStorage = require('./cloudStorage');
const CloudGPU = require('./cloudGPU');
const TeamWorkspaces = require('./teamWorkspaces');
const LiveBroadcast = require('./liveBroadcast');
const VirtualSets = require('./virtualSets');
const LiveGraphics = require('./liveGraphics');
const TutorialEngine = require('./tutorialEngine');
const CertificationSystem = require('./certificationSystem');

module.exports = {
  // v7.0 — BlackMamba Cloud
  CloudStorage,
  CloudGPU,
  TeamWorkspaces,
  
  // v7.1 — Broadcasting
  LiveBroadcast,
  VirtualSets,
  LiveGraphics,
  
  // v7.2 — Education
  TutorialEngine,
  CertificationSystem
};
