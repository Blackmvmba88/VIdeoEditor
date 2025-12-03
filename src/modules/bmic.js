/**
 * BlackMamba Intelligence Core (BMIC)
 * Agente Maestro - Decision Engine
 * 
 * Este agente maestro:
 * - Recibe input (video, preset, objetivos del usuario)
 * - Llama a los 3 agentes en orden (Validator -> Optimizer -> AutoImprove)
 * - Decide qué parámetro ajustar
 * - Guarda logs
 * - Aprende de elecciones previas (perfil del usuario)
 * - Permite modos: rápido, calidad máxima, redes sociales, película
 */

const path = require('path');
const fs = require('fs');
const FileValidator = require('./fileValidator');
const Optimizer = require('./optimizer');
const AutoImprove = require('./autoImprove');
const FFmpegWrapper = require('./ffmpegWrapper');
const ExportPresets = require('./exportPresets');

// Modos de procesamiento disponibles
const PROCESSING_MODES = {
  fast: {
    name: 'Modo Rápido',
    description: 'Prioriza velocidad sobre calidad. Ideal para previews o cuando el tiempo es crítico.',
    settings: {
      skipDeepValidation: true,
      useGPU: true,
      optimizerMode: 'fast',
      skipAutoImprove: true,
      twoPass: false
    }
  },
  highQuality: {
    name: 'Modo Calidad Máxima',
    description: 'Prioriza calidad sobre velocidad. Ideal para exportación final.',
    settings: {
      skipDeepValidation: false,
      useGPU: true,
      optimizerMode: 'highQuality',
      skipAutoImprove: false,
      twoPass: true
    }
  },
  socialMedia: {
    name: 'Modo Redes Sociales',
    description: 'Optimizado para plataformas sociales. Balance entre calidad y tamaño.',
    settings: {
      skipDeepValidation: false,
      useGPU: true,
      optimizerMode: 'balanced',
      skipAutoImprove: false,
      twoPass: false,
      targetPlatform: 'social'
    }
  },
  movie: {
    name: 'Modo Película',
    description: 'Configuración profesional para producción cinematográfica.',
    settings: {
      skipDeepValidation: false,
      useGPU: true,
      optimizerMode: 'highQuality',
      skipAutoImprove: false,
      twoPass: true,
      colorGrading: true,
      audioMastering: true
    }
  },
  balanced: {
    name: 'Modo Balanceado',
    description: 'Balance óptimo entre calidad, velocidad y tamaño de archivo.',
    settings: {
      skipDeepValidation: false,
      useGPU: true,
      optimizerMode: 'balanced',
      skipAutoImprove: false,
      twoPass: false
    }
  }
};

// Estructura de decisión del BMIC
const DECISION_TEMPLATE = {
  mode: 'balanced',
  validator: {
    status: 'pending',
    issues: [],
    recommendations: [],
    suggestedParameters: null
  },
  optimizer: {
    status: 'pending',
    codec: null,
    profile: null,
    bitrate: null,
    passes: 1,
    scalingAlgorithm: null
  },
  autoImprove: {
    status: 'pending',
    sharpnessBoost: false,
    audioNormalize: false,
    colorCorrection: false,
    qualityScore: null
  },
  metadata: {
    startTime: null,
    endTime: null,
    processingDuration: null,
    logs: []
  }
};

class BMIC {
  constructor() {
    this.validator = new FileValidator();
    this.optimizer = new Optimizer();
    this.autoImprove = new AutoImprove();
    this.ffmpeg = new FFmpegWrapper();
    this.exportPresets = new ExportPresets();
    
    this.userProfile = this.loadUserProfile();
    this.logsDir = path.join(require('os').homedir(), '.blackmamba-studio', 'logs');
    this.profilePath = path.join(require('os').homedir(), '.blackmamba-studio', 'profile.json');
    
    this.ensureDirectories();
  }

  /**
   * Asegurar que existen los directorios necesarios
   */
  ensureDirectories() {
    const baseDir = path.dirname(this.logsDir);
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Cargar perfil del usuario
   * @returns {Object} Perfil del usuario
   */
  loadUserProfile() {
    try {
      if (fs.existsSync(this.profilePath)) {
        const data = fs.readFileSync(this.profilePath, 'utf8');
        return JSON.parse(data);
      }
    } catch {
      // Perfil no existe o es inválido
    }
    
    return {
      preferences: {
        defaultMode: 'balanced',
        preferGPU: true,
        autoApplyImprovements: false,
        favoritePresets: []
      },
      history: {
        totalProcessed: 0,
        averageQualityScore: 0,
        commonIssues: {},
        frequentPlatforms: {}
      },
      learnings: {
        preferredCodec: null,
        preferredBitrate: null,
        commonAdjustments: []
      }
    };
  }

  /**
   * Guardar perfil del usuario
   */
  saveUserProfile() {
    try {
      const dir = path.dirname(this.profilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.profilePath, JSON.stringify(this.userProfile, null, 2));
    } catch {
      // Ignorar errores de guardado
    }
  }

  /**
   * Procesar video completo con BMIC
   * @param {Object} input - Configuración de entrada
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async process(input, onProgress = null) {
    const {
      inputPath,
      outputPath,
      preset = 'youtube1080p',
      mode = this.userProfile.preferences.defaultMode,
      platform = null,
      userObjectives = {}
    } = input;

    // Inicializar decisión
    const decision = JSON.parse(JSON.stringify(DECISION_TEMPLATE));
    decision.mode = mode;
    decision.metadata.startTime = new Date().toISOString();
    
    this.log(decision, 'info', `Iniciando procesamiento BMIC en modo: ${mode}`);
    this.log(decision, 'info', `Archivo de entrada: ${inputPath}`);
    this.log(decision, 'info', `Preset seleccionado: ${preset}`);

    const modeSettings = PROCESSING_MODES[mode]?.settings || PROCESSING_MODES.balanced.settings;

    try {
      // ============================
      // FASE 1: VALIDATOR
      // ============================
      if (onProgress) {
        onProgress({ phase: 'validator', percent: 5, message: 'Validando archivo de entrada...' });
      }

      const validatorResult = await this.runValidator(inputPath, preset, modeSettings, decision);
      
      if (!validatorResult.valid) {
        decision.validator.status = 'error';
        decision.metadata.endTime = new Date().toISOString();
        this.saveLog(decision);
        
        return {
          success: false,
          decision,
          error: 'Validación fallida',
          details: validatorResult.errors
        };
      }

      decision.validator.status = 'ok';
      this.log(decision, 'success', 'Validación completada exitosamente');

      // ============================
      // FASE 2: OPTIMIZER
      // ============================
      if (onProgress) {
        onProgress({ phase: 'optimizer', percent: 25, message: 'Optimizando parámetros...' });
      }

      const optimizerResult = await this.runOptimizer(
        validatorResult.format,
        preset,
        platform,
        modeSettings,
        userObjectives,
        decision
      );

      decision.optimizer.status = 'ok';
      this.log(decision, 'success', 'Optimización de parámetros completada');

      // ============================
      // FASE 3: PROCESAMIENTO
      // ============================
      if (onProgress) {
        onProgress({ phase: 'processing', percent: 40, message: 'Procesando video...' });
      }

      await this.executeProcessing(
        inputPath,
        outputPath,
        optimizerResult,
        modeSettings,
        decision,
        (progress) => {
          if (onProgress) {
            // progress is a number representing current progress percentage
            const progressValue = typeof progress === 'number' ? progress : 0;
            const percent = 40 + Math.round(progressValue * 0.4);
            onProgress({ phase: 'processing', percent, message: `Procesando: ${Math.round(progressValue)}%` });
          }
        }
      );

      // ============================
      // FASE 4: AUTO-IMPROVE (Post-proceso)
      // ============================
      if (!modeSettings.skipAutoImprove) {
        if (onProgress) {
          onProgress({ phase: 'autoImprove', percent: 85, message: 'Analizando resultado...' });
        }

        const autoImproveResult = await this.runAutoImprove(
          outputPath,
          modeSettings,
          decision
        );

        decision.autoImprove.status = 'ok';
        decision.autoImprove.qualityScore = autoImproveResult.qualityScore;

        // Aplicar mejoras automáticas si está habilitado
        if (this.userProfile.preferences.autoApplyImprovements && 
            autoImproveResult.suggestions.length > 0) {
          await this.applyAutoImprovements(outputPath, autoImproveResult, decision);
        }
      } else {
        decision.autoImprove.status = 'skipped';
        this.log(decision, 'info', 'Auto-Improve saltado (modo rápido)');
      }

      // ============================
      // FINALIZAR
      // ============================
      decision.metadata.endTime = new Date().toISOString();
      decision.metadata.processingDuration = this.calculateDuration(
        decision.metadata.startTime,
        decision.metadata.endTime
      );

      // Actualizar perfil del usuario
      this.updateUserProfile(decision, preset, platform);
      this.saveUserProfile();
      
      // Guardar log
      this.saveLog(decision);

      if (onProgress) {
        onProgress({ phase: 'complete', percent: 100, message: '¡Procesamiento completado!' });
      }

      return {
        success: true,
        decision,
        outputPath,
        summary: this.generateSummary(decision)
      };

    } catch (error) {
      this.log(decision, 'error', `Error en procesamiento: ${error.message}`);
      decision.metadata.endTime = new Date().toISOString();
      this.saveLog(decision);

      throw error;
    }
  }

  /**
   * Ejecutar fase de validación
   */
  async runValidator(inputPath, preset, modeSettings, decision) {
    this.log(decision, 'info', 'Ejecutando Agente Validator...');

    const result = modeSettings.skipDeepValidation ?
      await this.validator.validateFile(inputPath) :
      await this.validator.validateDeep(inputPath, preset);

    decision.validator.issues = result.errors || [];
    decision.validator.recommendations = result.recommendations || [];
    decision.validator.suggestedParameters = result.suggestedParameters;

    if (result.warnings && result.warnings.length > 0) {
      for (const warning of result.warnings) {
        this.log(decision, 'warning', warning);
      }
    }

    return result;
  }

  /**
   * Ejecutar fase de optimización
   */
  async runOptimizer(videoFormat, preset, platform, modeSettings, userObjectives, decision) {
    this.log(decision, 'info', 'Ejecutando Agente Optimizer...');

    await this.optimizer.initialize();

    const targetPlatform = platform || 
      this.getPlatformFromPreset(preset) ||
      'web';

    const optimized = await this.optimizer.optimizeParameters(videoFormat, {
      platform: targetPlatform,
      mode: modeSettings.optimizerMode,
      useGPU: modeSettings.useGPU,
      ...userObjectives
    });

    // Actualizar decisión
    decision.optimizer.codec = optimized.metadata.gpuEncoder || 'libx264';
    decision.optimizer.bitrate = optimized.metadata.estimatedBitrate;
    decision.optimizer.passes = modeSettings.twoPass ? 2 : 1;
    decision.optimizer.scalingAlgorithm = optimized.metadata.scalingAlgorithm;

    // Determinar profile
    const presetConfig = this.exportPresets.getPreset(preset);
    decision.optimizer.profile = presetConfig?.video?.profile || 'high';

    this.log(decision, 'info', `Codec seleccionado: ${decision.optimizer.codec}`);
    this.log(decision, 'info', `Bitrate objetivo: ${decision.optimizer.bitrate}`);
    this.log(decision, 'info', `Encoding passes: ${decision.optimizer.passes}`);

    return {
      ...optimized,
      preset,
      presetConfig
    };
  }

  /**
   * Ejecutar el procesamiento de video
   */
  async executeProcessing(inputPath, outputPath, optimizerResult, modeSettings, decision, onProgress) {
    this.log(decision, 'info', 'Ejecutando procesamiento de video...');

    const args = ['-i', inputPath];

    // Agregar argumentos optimizados
    args.push(...optimizerResult.args);

    // Si es 2-pass, ejecutar ambas pasadas
    if (modeSettings.twoPass) {
      this.log(decision, 'info', 'Ejecutando encoding de 2 pasadas...');
      
      const twoPassCommands = this.optimizer.generateTwoPassCommand(
        inputPath,
        outputPath,
        optimizerResult
      );

      // Primera pasada
      await this.ffmpeg.execute(twoPassCommands.pass1Args);
      this.log(decision, 'info', 'Primera pasada completada');

      // Segunda pasada
      await this.ffmpeg.execute(twoPassCommands.pass2Args, onProgress);
      this.log(decision, 'info', 'Segunda pasada completada');
    } else {
      // Una sola pasada
      args.push('-y', outputPath);
      await this.ffmpeg.execute(args, onProgress);
    }

    this.log(decision, 'success', `Video exportado a: ${outputPath}`);
    return { success: true, outputPath };
  }

  /**
   * Ejecutar fase de auto-mejora
   */
  async runAutoImprove(outputPath, modeSettings, decision) {
    this.log(decision, 'info', 'Ejecutando Agente Auto-Improve...');

    const analysis = await this.autoImprove.analyzeVideo(outputPath, {
      analyzeSharpness: true,
      analyzeLuminance: true,
      analyzeColor: true,
      analyzeAudio: true,
      analyzeMotion: !modeSettings.skipDeepValidation,
      detectFrameJumps: !modeSettings.skipDeepValidation
    });

    decision.autoImprove.qualityScore = analysis.qualityScore;

    // Registrar problemas detectados
    for (const issue of analysis.issues) {
      this.log(decision, issue.severity === 'high' ? 'warning' : 'info', 
        `Auto-Improve: ${issue.message}`);
    }

    // Registrar sugerencias
    for (const suggestion of analysis.suggestions) {
      this.log(decision, 'info', `Sugerencia: ${suggestion.reason}`);
      
      switch (suggestion.improvement) {
      case 'sharpnessBoost':
        decision.autoImprove.sharpnessBoost = suggestion.autoApplicable;
        break;
      case 'audioNormalize':
        decision.autoImprove.audioNormalize = suggestion.autoApplicable;
        break;
      case 'colorCorrection':
        decision.autoImprove.colorCorrection = suggestion.autoApplicable;
        break;
      }
    }

    this.log(decision, 'info', `Puntuación de calidad: ${analysis.qualityScore.score}/100 (${analysis.qualityScore.grade})`);

    return analysis;
  }

  /**
   * Aplicar mejoras automáticas
   */
  async applyAutoImprovements(outputPath, analysis, decision) {
    const improvements = analysis.suggestions
      .filter(s => s.autoApplicable)
      .map(s => s.improvement);

    if (improvements.length === 0) return;

    this.log(decision, 'info', `Aplicando ${improvements.length} mejoras automáticas...`);

    // Crear archivo temporal para la versión mejorada using robust path manipulation
    const parsedPath = path.parse(outputPath);
    const tempPath = path.format({
      dir: parsedPath.dir,
      name: `${parsedPath.name}_improved`,
      ext: parsedPath.ext || '.mp4'
    });

    try {
      await this.autoImprove.applyImprovements(outputPath, tempPath, improvements);
      
      // Reemplazar archivo original
      fs.unlinkSync(outputPath);
      fs.renameSync(tempPath, outputPath);
      
      this.log(decision, 'success', `Mejoras aplicadas: ${improvements.join(', ')}`);
    } catch (error) {
      this.log(decision, 'error', `Error aplicando mejoras: ${error.message}`);
      
      // Limpiar archivo temporal si existe
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  /**
   * Determinar plataforma desde el preset
   */
  getPlatformFromPreset(preset) {
    const platformMap = {
      youtube1080p: 'youtube',
      youtube4k: 'youtube',
      instagram: 'instagram',
      instagramStory: 'instagramReels',
      tiktok: 'tiktok',
      twitter: 'twitter',
      web720p: 'web',
      webOptimized: 'web',
      highQuality: 'professional'
    };
    return platformMap[preset] || null;
  }

  /**
   * Actualizar perfil del usuario basado en el procesamiento
   */
  updateUserProfile(decision, preset, platform) {
    this.userProfile.history.totalProcessed++;

    // Actualizar puntuación promedio
    if (decision.autoImprove.qualityScore) {
      const currentAvg = this.userProfile.history.averageQualityScore;
      const total = this.userProfile.history.totalProcessed;
      this.userProfile.history.averageQualityScore = 
        (currentAvg * (total - 1) + decision.autoImprove.qualityScore.score) / total;
    }

    // Registrar problemas comunes
    for (const issue of decision.validator.issues) {
      const key = issue.split(':')[0];
      this.userProfile.history.commonIssues[key] = 
        (this.userProfile.history.commonIssues[key] || 0) + 1;
    }

    // Registrar plataformas frecuentes
    if (platform) {
      this.userProfile.history.frequentPlatforms[platform] = 
        (this.userProfile.history.frequentPlatforms[platform] || 0) + 1;
    }

    // Aprender preferencias
    if (decision.optimizer.codec) {
      this.userProfile.learnings.preferredCodec = decision.optimizer.codec;
    }
    if (decision.optimizer.bitrate) {
      this.userProfile.learnings.preferredBitrate = decision.optimizer.bitrate;
    }
  }

  /**
   * Agregar entrada al log
   */
  log(decision, level, message) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    decision.metadata.logs.push(entry);

    // También imprimir en consola según nivel
    const prefix = {
      info: 'ℹ️ ',
      success: '✅ ',
      warning: '⚠️ ',
      error: '❌ '
    }[level] || '';

    console.log(`${prefix}[BMIC] ${message}`);
  }

  /**
   * Guardar log en archivo
   */
  saveLog(decision) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logPath = path.join(this.logsDir, `bmic_${timestamp}.json`);
      fs.writeFileSync(logPath, JSON.stringify(decision, null, 2));
    } catch {
      // Ignorar errores de guardado
    }
  }

  /**
   * Calcular duración entre dos timestamps
   */
  calculateDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate - startDate;
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Generar resumen del procesamiento
   */
  generateSummary(decision) {
    const lines = [
      '═══════════════════════════════════════════════════',
      '         RESUMEN DE PROCESAMIENTO BMIC             ',
      '═══════════════════════════════════════════════════',
      '',
      `📋 Modo: ${PROCESSING_MODES[decision.mode]?.name || decision.mode}`,
      '',
      '─── VALIDACIÓN ───',
      `   Estado: ${decision.validator.status === 'ok' ? '✅ OK' : '❌ Error'}`,
      `   Advertencias: ${decision.validator.recommendations?.length || 0}`,
      '',
      '─── OPTIMIZACIÓN ───',
      `   Codec: ${decision.optimizer.codec}`,
      `   Perfil: ${decision.optimizer.profile}`,
      `   Bitrate: ${decision.optimizer.bitrate}`,
      `   Pasadas: ${decision.optimizer.passes}`,
      '',
      '─── AUTO-IMPROVE ───',
      `   Estado: ${decision.autoImprove.status === 'ok' ? '✅ Completado' : 
        decision.autoImprove.status === 'skipped' ? '⏭️ Saltado' : '⏳ Pendiente'}`,
    ];

    if (decision.autoImprove.qualityScore) {
      lines.push(`   Puntuación: ${decision.autoImprove.qualityScore.score}/100 (${decision.autoImprove.qualityScore.grade})`);
    }

    if (decision.autoImprove.sharpnessBoost) lines.push('   ✓ Nitidez mejorada');
    if (decision.autoImprove.audioNormalize) lines.push('   ✓ Audio normalizado');
    if (decision.autoImprove.colorCorrection) lines.push('   ✓ Color corregido');

    lines.push('');
    lines.push('─── TIEMPO ───');
    lines.push(`   Duración total: ${decision.metadata.processingDuration}`);
    lines.push('');
    lines.push('═══════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Obtener modos de procesamiento disponibles
   * @returns {Object} Modos disponibles
   */
  getAvailableModes() {
    return { ...PROCESSING_MODES };
  }

  /**
   * Obtener perfil del usuario actual
   * @returns {Object} Perfil del usuario
   */
  getUserProfile() {
    return { ...this.userProfile };
  }

  /**
   * Actualizar preferencias del usuario
   * @param {Object} preferences - Nuevas preferencias
   */
  updatePreferences(preferences) {
    this.userProfile.preferences = {
      ...this.userProfile.preferences,
      ...preferences
    };
    this.saveUserProfile();
  }

  /**
   * Obtener recomendación de modo basada en el historial
   * @param {Object} videoInfo - Información del video
   * @returns {Object} Recomendación
   */
  getRecommendedMode(videoInfo) {
    // Analizar historial y video para recomendar modo
    const duration = videoInfo.duration || 0;

    // Si el video es muy largo, recomendar modo balanceado
    if (duration > 600) { // > 10 min
      return {
        mode: 'balanced',
        reason: 'Video largo - modo balanceado para equilibrar tiempo y calidad'
      };
    }

    // Si la resolución es 4K+, recomendar alta calidad
    if (videoInfo.video && videoInfo.video.width >= 3840) {
      return {
        mode: 'highQuality',
        reason: 'Resolución 4K+ detectada - modo alta calidad recomendado'
      };
    }

    // Si el usuario típicamente usa redes sociales
    const socialPlatforms = ['instagram', 'tiktok', 'youtube'];
    const mostUsedPlatform = Object.entries(this.userProfile.history.frequentPlatforms || {})
      .sort((a, b) => b[1] - a[1])[0];

    if (mostUsedPlatform && socialPlatforms.includes(mostUsedPlatform[0])) {
      return {
        mode: 'socialMedia',
        reason: `Historial indica uso frecuente de ${mostUsedPlatform[0]}`
      };
    }

    // Por defecto, usar la preferencia del usuario
    return {
      mode: this.userProfile.preferences.defaultMode || 'balanced',
      reason: 'Preferencia por defecto del usuario'
    };
  }

  /**
   * Generar JSON de decisión para exportar
   * @param {Object} decision - Decisión del procesamiento
   * @returns {Object} JSON estructurado de decisión
   */
  exportDecisionJSON(decision) {
    return {
      mode: decision.mode,
      validator: decision.validator.status,
      optimizer: {
        codec: decision.optimizer.codec,
        profile: decision.optimizer.profile,
        bitrate: decision.optimizer.bitrate,
        passes: decision.optimizer.passes
      },
      autoImprove: {
        sharpnessBoost: decision.autoImprove.sharpnessBoost,
        audioNormalize: decision.autoImprove.audioNormalize,
        colorCorrection: decision.autoImprove.colorCorrection
      },
      quality: decision.autoImprove.qualityScore,
      processingTime: decision.metadata.processingDuration
    };
  }

  /**
   * Limpiar recursos y archivos temporales
   */
  cleanup() {
    this.autoImprove.cleanup();
  }
}

module.exports = BMIC;
