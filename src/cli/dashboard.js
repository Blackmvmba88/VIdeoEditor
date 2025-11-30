#!/usr/bin/env node
/**
 * BlackMamba Studio - Terminal Dashboard
 * A visual dashboard for the video editor in the terminal
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

// Import modules
const FFmpegWrapper = require('../modules/ffmpegWrapper');
const FormatDetector = require('../modules/formatDetector');
const ExportPresets = require('../modules/exportPresets');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgBlack: '\x1b[40m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m'
};

// Box drawing characters
const box = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║',
  teeLeft: '╠',
  teeRight: '╣',
  teeTop: '╦',
  teeBottom: '╩',
  cross: '╬'
};

/**
 * Get terminal width
 * @returns {number}
 */
function getTerminalWidth() {
  return process.stdout.columns || 80;
}

/**
 * Create a horizontal line
 * @param {number} width 
 * @param {string} leftChar 
 * @param {string} rightChar 
 * @returns {string}
 */
function horizontalLine(width, leftChar = box.teeLeft, rightChar = box.teeRight) {
  return `${colors.cyan}${leftChar}${box.horizontal.repeat(width - 2)}${rightChar}${colors.reset}`;
}

/**
 * Create a centered text line
 * @param {string} text 
 * @param {number} width 
 * @param {string} color 
 * @returns {string}
 */
function centeredLine(text, width, color = colors.white) {
  const padding = Math.max(0, width - text.length - 4);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return `${colors.cyan}${box.vertical}${colors.reset} ${' '.repeat(leftPad)}${color}${text}${colors.reset}${' '.repeat(rightPad)} ${colors.cyan}${box.vertical}${colors.reset}`;
}

/**
 * Create a left-aligned text line
 * @param {string} text 
 * @param {number} width 
 * @param {string} color 
 * @returns {string}
 */
function leftLine(text, width, color = colors.white) {
  const content = `${color}${text}${colors.reset}`;
  const padding = Math.max(0, width - text.length - 4);
  return `${colors.cyan}${box.vertical}${colors.reset} ${content}${' '.repeat(padding)} ${colors.cyan}${box.vertical}${colors.reset}`;
}

/**
 * Create a key-value line
 * @param {string} key 
 * @param {string} value 
 * @param {number} width 
 * @param {string} keyColor 
 * @param {string} valueColor 
 * @returns {string}
 */
function keyValueLine(key, value, width, keyColor = colors.yellow, valueColor = colors.green) {
  const content = `${keyColor}${key}:${colors.reset} ${valueColor}${value}${colors.reset}`;
  const rawLength = key.length + 2 + value.length;
  const padding = Math.max(0, width - rawLength - 4);
  return `${colors.cyan}${box.vertical}${colors.reset} ${content}${' '.repeat(padding)} ${colors.cyan}${box.vertical}${colors.reset}`;
}

/**
 * Format bytes to human readable format
 * @param {number} bytes 
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format uptime
 * @param {number} seconds 
 * @returns {string}
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Get system information
 * @returns {object}
 */
function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: os.uptime(),
    nodeVersion: process.version
  };
}

/**
 * Get project information
 * @returns {object}
 */
function getProjectInfo() {
  const packagePath = path.join(__dirname, '../../package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return {
      name: packageJson.name || 'Unknown',
      productName: packageJson.productName || packageJson.name || 'Unknown',
      version: packageJson.version || '0.0.0',
      description: packageJson.description || '',
      author: packageJson.author || 'Unknown'
    };
  } catch {
    return {
      name: 'blackmamba-studio',
      productName: 'BlackMamba Studio',
      version: '1.0.0',
      description: 'Video Editor',
      author: 'Unknown'
    };
  }
}

/**
 * Get supported formats information
 * @returns {object}
 */
function getFormatsInfo() {
  const detector = new FormatDetector();
  const extensions = detector.getSupportedExtensions();
  return {
    videoFormats: extensions.video.length,
    audioFormats: extensions.audio.length,
    totalFormats: extensions.all.length
  };
}

/**
 * Get export presets information
 * @returns {object}
 */
function getPresetsInfo() {
  const presetsManager = new ExportPresets();
  const presets = presetsManager.getAllPresets();
  const categoryNames = ['social', 'web', 'professional', 'audio', 'other'];
  return {
    totalPresets: Object.keys(presets).length,
    categories: categoryNames.length,
    categoryNames: categoryNames
  };
}

/**
 * Check FFmpeg availability
 * @returns {Promise<object>}
 */
async function checkFFmpeg() {
  const ffmpeg = new FFmpegWrapper();
  try {
    const available = await ffmpeg.isAvailable();
    const version = available ? await ffmpeg.getVersion() : null;
    return { available, version };
  } catch {
    return { available: false, version: null };
  }
}

/**
 * Draw the ASCII art logo
 * @param {number} width 
 * @returns {string[]}
 */
function drawLogo(width) {
  const logo = [
    '    ____  __           __   __  ___                __         ',
    '   / __ )/ /___ ______/ /__/  |/  /___ _____ ___  / /_  ____ _',
    '  / __  / / __ `/ ___/ //_/ /|_/ / __ `/ __ `__ \\/ __ \\/ __ `/',
    ' / /_/ / / /_/ / /__/ ,< / /  / / /_/ / / / / / / /_/ / /_/ / ',
    '/_____/_/\\__,_/\\___/_/|_/_/  /_/\\__,_/_/ /_/ /_/_.___/\\__,_/  ',
    '                                                               ',
    '               ____  __            ___                         ',
    '              / ___\\/ /___ _____  / (_)___                     ',
    '              \\___ \\/ __/ / / / _ \\/ / / __ \\                  ',
    '             ___/ / /_/ /_/ /  __/ / / /_/ /                   ',
    '            /____/\\__/\\__,_/\\___/_/_/\\____/                    '
  ];
  
  return logo.map(line => {
    const padding = Math.max(0, (width - line.length - 4) / 2);
    const leftPad = Math.floor(padding);
    const rightPad = Math.ceil(padding);
    const content = `${' '.repeat(leftPad)}${colors.magenta}${colors.bold}${line}${colors.reset}${' '.repeat(rightPad)}`;
    return `${colors.cyan}${box.vertical}${colors.reset}${content}${colors.cyan}${box.vertical}${colors.reset}`;
  });
}

/**
 * Draw a progress bar
 * @param {number} percentage 
 * @param {number} barWidth 
 * @returns {string}
 */
function progressBar(percentage, barWidth = 20) {
  const filled = Math.round((percentage / 100) * barWidth);
  const empty = barWidth - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${colors.green}${bar}${colors.reset} ${percentage.toFixed(0)}%`;
}

/**
 * Main dashboard function
 */
async function renderDashboard() {
  const width = Math.min(getTerminalWidth(), 80);
  const lines = [];
  
  // Clear screen
  console.clear();
  
  // Get all information
  const systemInfo = getSystemInfo();
  const projectInfo = getProjectInfo();
  const formatsInfo = getFormatsInfo();
  const presetsInfo = getPresetsInfo();
  const ffmpegInfo = await checkFFmpeg();
  
  // Calculate memory usage percentage
  const memoryUsagePercent = ((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100;
  
  // Top border
  lines.push(`${colors.cyan}${box.topLeft}${box.horizontal.repeat(width - 2)}${box.topRight}${colors.reset}`);
  
  // Logo
  lines.push(...drawLogo(width));
  
  // Section divider
  lines.push(horizontalLine(width));
  
  // Project Info Section
  lines.push(centeredLine('📦 PROJECT INFO', width, `${colors.bold}${colors.yellow}`));
  lines.push(horizontalLine(width));
  lines.push(keyValueLine('  Product Name', projectInfo.productName, width));
  lines.push(keyValueLine('  Version', projectInfo.version, width));
  lines.push(keyValueLine('  Author', projectInfo.author, width));
  
  // Section divider
  lines.push(horizontalLine(width));
  
  // System Info Section
  lines.push(centeredLine('💻 SYSTEM INFO', width, `${colors.bold}${colors.yellow}`));
  lines.push(horizontalLine(width));
  lines.push(keyValueLine('  Platform', `${systemInfo.platform} (${systemInfo.arch})`, width));
  lines.push(keyValueLine('  Hostname', systemInfo.hostname, width));
  lines.push(keyValueLine('  CPUs', `${systemInfo.cpus} cores`, width));
  lines.push(keyValueLine('  CPU Model', systemInfo.cpuModel.substring(0, 40), width));
  lines.push(keyValueLine('  Total Memory', formatBytes(systemInfo.totalMemory), width));
  lines.push(keyValueLine('  Free Memory', formatBytes(systemInfo.freeMemory), width));
  
  // Memory usage bar
  const memBar = progressBar(memoryUsagePercent, 15);
  lines.push(keyValueLine('  Memory Usage', memBar, width, colors.yellow, colors.white));
  
  lines.push(keyValueLine('  System Uptime', formatUptime(systemInfo.uptime), width));
  lines.push(keyValueLine('  Node.js', systemInfo.nodeVersion, width));
  
  // Section divider
  lines.push(horizontalLine(width));
  
  // FFmpeg Status Section
  lines.push(centeredLine('🎬 FFMPEG STATUS', width, `${colors.bold}${colors.yellow}`));
  lines.push(horizontalLine(width));
  
  if (ffmpegInfo.available) {
    lines.push(keyValueLine('  Status', '✅ Available', width, colors.yellow, colors.green));
    lines.push(keyValueLine('  Version', ffmpegInfo.version || 'Unknown', width));
  } else {
    lines.push(keyValueLine('  Status', '❌ Not Found', width, colors.yellow, colors.red));
    lines.push(leftLine('  ⚠️  Please install FFmpeg to use video processing', width, colors.yellow));
  }
  
  // Section divider
  lines.push(horizontalLine(width));
  
  // Capabilities Section
  lines.push(centeredLine('🎯 CAPABILITIES', width, `${colors.bold}${colors.yellow}`));
  lines.push(horizontalLine(width));
  lines.push(keyValueLine('  Video Formats', `${formatsInfo.videoFormats} supported`, width));
  lines.push(keyValueLine('  Audio Formats', `${formatsInfo.audioFormats} supported`, width));
  lines.push(keyValueLine('  Export Presets', `${presetsInfo.totalPresets} presets`, width));
  lines.push(keyValueLine('  Preset Categories', presetsInfo.categoryNames.join(', '), width));
  
  // Section divider
  lines.push(horizontalLine(width));
  
  // Features Section
  lines.push(centeredLine('✨ FEATURES', width, `${colors.bold}${colors.yellow}`));
  lines.push(horizontalLine(width));
  lines.push(leftLine('  • Join multiple video clips', width, colors.white));
  lines.push(leftLine('  • Cut/trim videos with precision', width, colors.white));
  lines.push(leftLine('  • Reorder clips with drag and drop', width, colors.white));
  lines.push(leftLine('  • Export for YouTube, Instagram, TikTok', width, colors.white));
  lines.push(leftLine('  • Cross-platform (Windows, macOS, Linux)', width, colors.white));
  
  // Section divider
  lines.push(horizontalLine(width));
  
  // Quick Commands Section
  lines.push(centeredLine('⚡ QUICK COMMANDS', width, `${colors.bold}${colors.yellow}`));
  lines.push(horizontalLine(width));
  lines.push(keyValueLine('  Start App', 'npm start', width, colors.cyan, colors.green));
  lines.push(keyValueLine('  Run Tests', 'npm test', width, colors.cyan, colors.green));
  lines.push(keyValueLine('  Lint Code', 'npm run lint', width, colors.cyan, colors.green));
  lines.push(keyValueLine('  Build Windows', 'npm run build:win', width, colors.cyan, colors.green));
  lines.push(keyValueLine('  Build macOS', 'npm run build:mac', width, colors.cyan, colors.green));
  
  // Bottom border
  lines.push(`${colors.cyan}${box.bottomLeft}${box.horizontal.repeat(width - 2)}${box.bottomRight}${colors.reset}`);
  
  // Timestamp
  const timestamp = new Date().toLocaleString();
  lines.push(`${colors.dim}  Dashboard generated at: ${timestamp}${colors.reset}`);
  lines.push('');
  
  // Print all lines
  console.log(lines.join('\n'));
}

// Run if called directly
if (require.main === module) {
  renderDashboard().catch(console.error);
}

module.exports = { renderDashboard };
