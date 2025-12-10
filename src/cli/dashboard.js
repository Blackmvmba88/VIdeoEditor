#!/usr/bin/env node
/**
 * BlackMamba Studio - Panel de Control Terminal
 * Un panel de control visual para el editor de video en la terminal
 */

const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

// Importar módulos
const FFmpegWrapper = require('../modules/ffmpegWrapper');
const FormatDetector = require('../modules/formatDetector');
const ExportPresets = require('../modules/exportPresets');

// Códigos de color ANSI
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Colores de primer plano
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Colores de fondo
  bgBlack: '\x1b[40m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m'
};

// Caracteres de dibujo de caja
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
 * Obtener ancho del terminal
 * @returns {number}
 */
function getTerminalWidth() {
  return process.stdout.columns || 80;
}

/**
 * Crear una línea horizontal
 * @param {number} width 
 * @param {string} leftChar 
 * @param {string} rightChar 
 * @returns {string}
 */
function horizontalLine(width, leftChar = box.teeLeft, rightChar = box.teeRight) {
  return `${colors.cyan}${leftChar}${box.horizontal.repeat(width - 2)}${rightChar}${colors.reset}`;
}

/**
 * Crear una línea de texto centrada
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
 * Crear una línea de texto alineada a la izquierda
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
 * Crear una línea clave-valor
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
 * Formatear bytes a formato legible
 * @param {number} bytes 
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formatear tiempo de actividad
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
 * Obtener información del sistema
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
 * Obtener información del proyecto
 * @returns {object}
 */
function getProjectInfo() {
  const packagePath = path.join(__dirname, '../../package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return {
      name: packageJson.name || 'Unknown',
      productName: packageJson.productName || packageJson.name || 'Unknown',
      version: packageJson.version || '0.0',
      description: packageJson.description || '',
      author: packageJson.author || 'Unknown'
    };
  } catch {
    return {
      name: 'blackmamba-studio',
      productName: 'BlackMamba Studio',
      version: '1.0',
      description: 'Video Editor',
      author: 'Unknown'
    };
  }
}

/**
 * Obtener información de formatos soportados
 * @returns {object}
 */
function getFormatsInfo() {
  try {
    const detector = new FormatDetector();
    const extensions = detector.getSupportedExtensions();
    return {
      videoFormats: extensions.video.length,
      audioFormats: extensions.audio.length,
      totalFormats: extensions.all.length
    };
  } catch {
    return {
      videoFormats: 0,
      audioFormats: 0,
      totalFormats: 0
    };
  }
}

/**
 * Obtener información de presets de exportación
 * @returns {object}
 */
function getPresetsInfo() {
  try {
    const presetsManager = new ExportPresets();
    const presets = presetsManager.getAllPresets();
    // Categorías definidas en ExportPresets.getPresetsByCategory
    const categoryNames = ['social', 'web', 'professional', 'audio', 'other'];
    return {
      totalPresets: Object.keys(presets).length,
      categories: categoryNames.length,
      categoryNames: categoryNames
    };
  } catch {
    return {
      totalPresets: 0,
      categories: 0,
      categoryNames: []
    };
  }
}

/**
 * Verificar disponibilidad de FFmpeg
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
 * Dibujar el logo ASCII art
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
    const totalPadding = Math.max(0, width - line.length - 4);
    const leftPad = Math.floor(totalPadding / 2);
    const rightPad = totalPadding - leftPad;
    const content = `${' '.repeat(leftPad)}${colors.magenta}${colors.bold}${line}${colors.reset}${' '.repeat(rightPad)}`;
    return `${colors.cyan}${box.vertical}${colors.reset}${content}${colors.cyan}${box.vertical}${colors.reset}`;
  });
}

/**
 * Dibujar una barra de progreso
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
 * Función principal del panel de control
 */
async function renderDashboard() {
  const width = Math.min(getTerminalWidth(), 80);
  const lines = [];
  
  // Limpiar pantalla
  console.clear();
  
  // Obtener toda la información
  const systemInfo = getSystemInfo();
  const projectInfo = getProjectInfo();
  const formatsInfo = getFormatsInfo();
  const presetsInfo = getPresetsInfo();
  const ffmpegInfo = await checkFFmpeg();
  
  // Calcular porcentaje de uso de memoria
  const memoryUsagePercent = ((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100;
  
  // Borde superior
  lines.push(`${colors.cyan}${box.topLeft}${box.horizontal.repeat(width - 2)}${box.topRight}${colors.reset}`);
  
  // Logo
  lines.push(...drawLogo(width));
  
  // Divisor de sección
  lines.push(horizontalLine(width));
  
  // Sección de Información del Proyecto
  lines.push(centeredLine('📦 INFO DEL PROYECTO', width, `${colors.bold}${colors.yellow}`));
  lines.push(horizontalLine(width));
  lines.push(keyValueLine('  Nombre del Producto', projectInfo.productName, width));
  lines.push(keyValueLine('  Versión', projectInfo.version, width));
  lines.push(keyValueLine('  Autor', projectInfo.author, width));
  
  // Divisor de sección
  lines.push(horizontalLine(width));
  
  // Sección de Información del Sistema
  lines.push(centeredLine('💻 INFO DEL SISTEMA', width, `${colors.bold}${colors.yellow}`));
  lines.push(horizontalLine(width));
  lines.push(keyValueLine('  Plataforma', `${systemInfo.platform} (${systemInfo.arch})`, width));
  lines.push(keyValueLine('  Hostname', systemInfo.hostname, width));
  lines.push(keyValueLine('  CPUs', `${systemInfo.cpus} núcleos`, width));
  lines.push(keyValueLine('  Modelo CPU', systemInfo.cpuModel.substring(0, 40), width));
  lines.push(keyValueLine('  Memoria Total', formatBytes(systemInfo.totalMemory), width));
  lines.push(keyValueLine('  Memoria Libre', formatBytes(systemInfo.freeMemory), width));
  
  // Barra de uso de memoria
  const memBar = progressBar(memoryUsagePercent, 15);
  lines.push(keyValueLine('  Uso de Memoria', memBar, width, colors.yellow, colors.white));
  
  lines.push(keyValueLine('  Tiempo Activo', formatUptime(systemInfo.uptime), width));
  lines.push(keyValueLine('  Node.js', systemInfo.nodeVersion, width));
  
  // Divisor de sección
  lines.push(horizontalLine(width));
  
  // Sección de Estado de FFmpeg
  lines.push(centeredLine('🎬 ESTADO DE FFMPEG', width, `${colors.bold}${colors.yellow}`));
  lines.push(horizontalLine(width));
  
  if (ffmpegInfo.available) {
    lines.push(keyValueLine('  Estado', '✅ Disponible', width, colors.yellow, colors.green));
    lines.push(keyValueLine('  Versión', ffmpegInfo.version || 'Desconocida', width));
  } else {
    lines.push(keyValueLine('  Estado', '❌ No Encontrado', width, colors.yellow, colors.red));
    lines.push(leftLine('  ⚠️  Por favor instale FFmpeg para usar procesamiento de video', width, colors.yellow));
  }
  
  // Divisor de sección
  lines.push(horizontalLine(width));
  
  // Sección de Capacidades
  lines.push(centeredLine('🎯 CAPACIDADES', width, `${colors.bold}${colors.yellow}`));
  lines.push(horizontalLine(width));
  lines.push(keyValueLine('  Formatos de Video', `${formatsInfo.videoFormats} soportados`, width));
  lines.push(keyValueLine('  Formatos de Audio', `${formatsInfo.audioFormats} soportados`, width));
  lines.push(keyValueLine('  Presets de Exportación', `${presetsInfo.totalPresets} presets`, width));
  lines.push(keyValueLine('  Categorías de Presets', presetsInfo.categoryNames.join(', '), width));
  
  // Divisor de sección
  lines.push(horizontalLine(width));
  
  // Sección de Características
  lines.push(centeredLine('✨ CARACTERÍSTICAS', width, `${colors.bold}${colors.yellow}`));
  lines.push(horizontalLine(width));
  lines.push(leftLine('  • Unir múltiples clips de video', width, colors.white));
  lines.push(leftLine('  • Cortar/recortar videos con precisión', width, colors.white));
  lines.push(leftLine('  • Reordenar clips arrastrando y soltando', width, colors.white));
  lines.push(leftLine('  • Exportar para YouTube, Instagram, TikTok', width, colors.white));
  lines.push(leftLine('  • Multiplataforma (Windows, macOS, Linux)', width, colors.white));
  
  // Divisor de sección
  lines.push(horizontalLine(width));
  
  // Sección de Comandos Rápidos
  lines.push(centeredLine('⚡ COMANDOS RÁPIDOS', width, `${colors.bold}${colors.yellow}`));
  lines.push(horizontalLine(width));
  lines.push(keyValueLine('  Iniciar App', 'npm start', width, colors.cyan, colors.green));
  lines.push(keyValueLine('  Ejecutar Tests', 'npm test', width, colors.cyan, colors.green));
  lines.push(keyValueLine('  Lint Código', 'npm run lint', width, colors.cyan, colors.green));
  lines.push(keyValueLine('  Compilar Windows', 'npm run build:win', width, colors.cyan, colors.green));
  lines.push(keyValueLine('  Compilar macOS', 'npm run build:mac', width, colors.cyan, colors.green));
  
  // Borde inferior
  lines.push(`${colors.cyan}${box.bottomLeft}${box.horizontal.repeat(width - 2)}${box.bottomRight}${colors.reset}`);
  
  // Marca de tiempo
  const timestamp = new Date().toLocaleString();
  lines.push(`${colors.dim}  Panel generado el: ${timestamp}${colors.reset}`);
  lines.push('');
  
  // Imprimir todas las líneas
  console.log(lines.join('\n'));
}

// Ejecutar si se llama directamente
if (require.main === module) {
  renderDashboard().catch(console.error);
}

module.exports = { renderDashboard };
