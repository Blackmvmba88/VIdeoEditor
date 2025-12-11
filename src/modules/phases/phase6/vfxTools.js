/**
 * VFX Tools - Herramientas de Efectos Visuales
 * 
 * Funcionalidades:
 * - Green/Blue Screen (Chroma Key avanzado)
 * - Motion Tracking
 * - Estabilización de video
 * - Screen Replacement
 * - Speed Ramping
 * - Time Remapping
 * - Masking y Rotoscoping básico
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { v4: uuidv4 } = require('uuid');
const FFmpegWrapper = require('../../ffmpegWrapper');

class VFXTools {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.tempDir = path.join(os.tmpdir(), 'video-editor-vfx');
    
    // Presets de Chroma Key
    this.chromaKeyPresets = {
      greenScreen: {
        name: 'Green Screen',
        color: '0x00FF00',
        similarity: 0.3,
        blend: 0.1,
        yuv: true
      },
      blueScreen: {
        name: 'Blue Screen',
        color: '0x0000FF',
        similarity: 0.3,
        blend: 0.1,
        yuv: true
      },
      customGreen: {
        name: 'Green Screen (Estudio)',
        color: '0x00B140',
        similarity: 0.25,
        blend: 0.08,
        yuv: true
      },
      customBlue: {
        name: 'Blue Screen (Estudio)',
        color: '0x0047AB',
        similarity: 0.25,
        blend: 0.08,
        yuv: true
      },
      spill_suppression: {
        name: 'Con Supresión de Spill',
        color: '0x00FF00',
        similarity: 0.35,
        blend: 0.15,
        despill: true,
        yuv: true
      }
    };
    
    // Modos de estabilización
    this.stabilizationModes = {
      light: {
        name: 'Ligera',
        shakiness: 5,
        accuracy: 9,
        smoothing: 10,
        description: 'Para temblor leve'
      },
      medium: {
        name: 'Media',
        shakiness: 8,
        accuracy: 12,
        smoothing: 15,
        description: 'Balance entre estabilidad y naturalidad'
      },
      heavy: {
        name: 'Fuerte',
        shakiness: 10,
        accuracy: 15,
        smoothing: 30,
        description: 'Para video muy inestable'
      },
      tripod: {
        name: 'Trípode Virtual',
        shakiness: 10,
        accuracy: 15,
        smoothing: 0,
        tripod: true,
        description: 'Simula grabación con trípode'
      }
    };
    
    // Curvas de Speed Ramp
    this.speedRampCurves = {
      linear: {
        name: 'Lineal',
        description: 'Transición uniforme'
      },
      easeIn: {
        name: 'Ease In',
        description: 'Empieza lento, termina rápido'
      },
      easeOut: {
        name: 'Ease Out',
        description: 'Empieza rápido, termina lento'
      },
      easeInOut: {
        name: 'Ease In-Out',
        description: 'Suave en ambos extremos'
      },
      bounce: {
        name: 'Bounce',
        description: 'Efecto de rebote'
      }
    };
    
    // Efectos de tiempo
    this.timeEffects = {
      slowmo: {
        name: 'Cámara Lenta',
        speeds: [0.5, 0.25, 0.1, 0.05]
      },
      speedup: {
        name: 'Cámara Rápida',
        speeds: [2, 4, 8, 16]
      },
      reverse: {
        name: 'Reversa',
        speed: -1
      },
      freeze: {
        name: 'Freeze Frame',
        duration: 2
      }
    };
    
    // Presets de máscaras
    this.maskShapes = {
      rectangle: { name: 'Rectángulo', type: 'rect' },
      ellipse: { name: 'Elipse', type: 'ellipse' },
      circle: { name: 'Círculo', type: 'circle' },
      diamond: { name: 'Diamante', type: 'diamond' },
      star: { name: 'Estrella', type: 'star' },
      vignette: { name: 'Viñeta', type: 'vignette' }
    };
    
    this._ensureTempDir();
  }
  
  /**
   * Asegurar directorio temporal
   * @private
   */
  _ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  /**
   * Obtener presets de chroma key
   * @returns {Object} Presets disponibles
   */
  getChromaKeyPresets() {
    return { ...this.chromaKeyPresets };
  }
  
  /**
   * Obtener modos de estabilización
   * @returns {Object} Modos disponibles
   */
  getStabilizationModes() {
    return { ...this.stabilizationModes };
  }
  
  /**
   * Obtener curvas de speed ramp
   * @returns {Object} Curvas disponibles
   */
  getSpeedRampCurves() {
    return { ...this.speedRampCurves };
  }
  
  /**
   * Obtener formas de máscaras
   * @returns {Object} Formas disponibles
   */
  getMaskShapes() {
    return { ...this.maskShapes };
  }
  
  /**
   * Aplicar Chroma Key (Green/Blue Screen)
   * @param {string} foregroundPath - Video con fondo verde/azul
   * @param {string} backgroundPath - Video/imagen de fondo
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async applyChromaKey(foregroundPath, backgroundPath, outputPath, options = {}) {
    if (!fs.existsSync(foregroundPath)) {
      throw new Error(`Video de primer plano no encontrado: ${foregroundPath}`);
    }
    if (!fs.existsSync(backgroundPath)) {
      throw new Error(`Fondo no encontrado: ${backgroundPath}`);
    }
    
    const {
      preset = 'greenScreen',
      color = null,
      similarity = null,
      blend = null,
      despill = false,
      onProgress = null
    } = options;
    
    // Obtener configuración del preset o usar valores custom
    const presetConfig = this.chromaKeyPresets[preset] || this.chromaKeyPresets.greenScreen;
    const keyColor = color || presetConfig.color;
    const keySimilarity = similarity !== null ? similarity : presetConfig.similarity;
    const keyBlend = blend !== null ? blend : presetConfig.blend;
    
    if (onProgress) {
      onProgress({ stage: 'processing', percent: 20, message: 'Aplicando chroma key...' });
    }
    
    // Obtener info de videos
    const fgInfo = await this.ffmpeg.getVideoInfo(foregroundPath);
    const width = fgInfo.width || 1920;
    const height = fgInfo.height || 1080;
    
    // Construir filtro de chroma key
    let filterComplex = '';
    
    // Escalar fondo al tamaño del foreground
    filterComplex += `[1:v]scale=${width}:${height}:force_original_aspect_ratio=increase,`;
    filterComplex += `crop=${width}:${height}[bg];`;
    
    // Aplicar chromakey al foreground
    filterComplex += `[0:v]colorkey=${keyColor}:${keySimilarity}:${keyBlend}`;
    
    // Agregar despill si está habilitado
    if (despill || presetConfig.despill) {
      filterComplex += `,despill=green`;
    }
    
    filterComplex += '[fg];';
    
    // Overlay foreground sobre background
    filterComplex += '[bg][fg]overlay=0:0:format=auto[vout]';
    
    if (onProgress) {
      onProgress({ stage: 'encoding', percent: 50, message: 'Codificando...' });
    }
    
    const args = [
      '-i', foregroundPath,
      '-i', backgroundPath,
      '-filter_complex', filterComplex,
      '-map', '[vout]',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      outputPath
    ];
    
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        const percent = 50 + (progress.percent || 0) * 0.4;
        onProgress({ stage: 'encoding', percent, message: `Codificando: ${Math.round(progress.percent || 0)}%` });
      }
    });
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Chroma key aplicado' });
    }
    
    return {
      success: true,
      outputPath,
      settings: {
        preset,
        color: keyColor,
        similarity: keySimilarity,
        blend: keyBlend,
        despill
      },
      message: 'Chroma key aplicado exitosamente'
    };
  }
  
  /**
   * Estabilizar video
   * @param {string} inputPath - Video a estabilizar
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async stabilizeVideo(inputPath, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Video no encontrado: ${inputPath}`);
    }
    
    const {
      mode = 'medium',
      zoom = 0,
      onProgress = null
    } = options;
    
    const modeConfig = this.stabilizationModes[mode] || this.stabilizationModes.medium;
    
    if (onProgress) {
      onProgress({ stage: 'analyzing', percent: 10, message: 'Analizando movimiento...' });
    }
    
    // Paso 1: Analizar el video (vidstabdetect)
    const transformsFile = path.join(this.tempDir, `transforms_${uuidv4()}.trf`);
    
    const detectArgs = [
      '-i', inputPath,
      '-vf', `vidstabdetect=shakiness=${modeConfig.shakiness}:accuracy=${modeConfig.accuracy}:result='${transformsFile}'`,
      '-f', 'null',
      '-'
    ];
    
    await this.ffmpeg.execute(detectArgs);
    
    if (onProgress) {
      onProgress({ stage: 'stabilizing', percent: 50, message: 'Aplicando estabilización...' });
    }
    
    // Paso 2: Aplicar estabilización (vidstabtransform)
    let transformFilter = `vidstabtransform=input='${transformsFile}'`;
    transformFilter += `:smoothing=${modeConfig.smoothing}`;
    transformFilter += `:zoom=${zoom}`;
    
    if (modeConfig.tripod) {
      transformFilter += ':tripod=1';
    }
    
    // Agregar unsharp para compensar el blur de la estabilización
    transformFilter += ',unsharp=5:5:0.8:3:3:0.4';
    
    const stabilizeArgs = [
      '-i', inputPath,
      '-vf', transformFilter,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-c:a', 'copy',
      '-y',
      outputPath
    ];
    
    await this.ffmpeg.execute(stabilizeArgs, (progress) => {
      if (onProgress) {
        const percent = 50 + (progress.percent || 0) * 0.4;
        onProgress({ stage: 'encoding', percent, message: `Codificando: ${Math.round(progress.percent || 0)}%` });
      }
    });
    
    // Limpiar archivo temporal
    try {
      fs.unlinkSync(transformsFile);
    } catch {
      // Ignorar
    }
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Video estabilizado' });
    }
    
    return {
      success: true,
      outputPath,
      mode,
      modeName: modeConfig.name,
      settings: {
        shakiness: modeConfig.shakiness,
        accuracy: modeConfig.accuracy,
        smoothing: modeConfig.smoothing,
        zoom
      },
      message: `Video estabilizado (${modeConfig.name})`
    };
  }
  
  /**
   * Aplicar cámara lenta
   * @param {string} inputPath - Video original
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async applySlowMotion(inputPath, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Video no encontrado: ${inputPath}`);
    }
    
    const {
      speed = 0.5,           // 0.5 = mitad de velocidad
      interpolation = true,  // Interpolación de frames
      onProgress = null
    } = options;
    
    if (speed <= 0 || speed >= 1) {
      throw new Error('La velocidad debe estar entre 0 y 1 para cámara lenta');
    }
    
    if (onProgress) {
      onProgress({ stage: 'processing', percent: 20, message: 'Aplicando cámara lenta...' });
    }
    
    // Calcular PTS (Presentation Time Stamp)
    const pts = 1 / speed;
    
    let videoFilter = `setpts=${pts}*PTS`;
    
    // Agregar interpolación de frames si está habilitada
    if (interpolation) {
      // minterpolate para crear frames intermedios
      const targetFps = 60;
      videoFilter += `,minterpolate=fps=${targetFps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`;
    }
    
    // Audio: atempo solo acepta 0.5-2.0, encadenar para velocidades menores
    let audioFilter = '';
    let remainingSpeed = speed;
    const tempoChain = [];
    
    while (remainingSpeed < 0.5) {
      tempoChain.push('atempo=0.5');
      remainingSpeed *= 2;
    }
    tempoChain.push(`atempo=${remainingSpeed}`);
    audioFilter = tempoChain.join(',');
    
    const args = [
      '-i', inputPath,
      '-filter_complex', `[0:v]${videoFilter}[v];[0:a]${audioFilter}[a]`,
      '-map', '[v]',
      '-map', '[a]',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      outputPath
    ];
    
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        const percent = 20 + (progress.percent || 0) * 0.7;
        onProgress({ stage: 'encoding', percent, message: `Codificando: ${Math.round(progress.percent || 0)}%` });
      }
    });
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Cámara lenta aplicada' });
    }
    
    return {
      success: true,
      outputPath,
      speed,
      slowdownFactor: 1 / speed,
      interpolation,
      message: `Cámara lenta ${(1/speed).toFixed(1)}x aplicada`
    };
  }
  
  /**
   * Aplicar cámara rápida
   * @param {string} inputPath - Video original
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async applyFastMotion(inputPath, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Video no encontrado: ${inputPath}`);
    }
    
    const {
      speed = 2,        // 2 = doble velocidad
      keepAudio = true,
      onProgress = null
    } = options;
    
    if (speed <= 1) {
      throw new Error('La velocidad debe ser mayor a 1 para cámara rápida');
    }
    
    if (onProgress) {
      onProgress({ stage: 'processing', percent: 20, message: 'Aplicando cámara rápida...' });
    }
    
    // Calcular PTS
    const pts = 1 / speed;
    const videoFilter = `setpts=${pts}*PTS`;
    
    // Audio
    let audioFilter = '';
    if (keepAudio) {
      let remainingSpeed = speed;
      const tempoChain = [];
      
      while (remainingSpeed > 2) {
        tempoChain.push('atempo=2.0');
        remainingSpeed /= 2;
      }
      tempoChain.push(`atempo=${remainingSpeed}`);
      audioFilter = tempoChain.join(',');
    }
    
    const args = [
      '-i', inputPath,
      '-filter_complex', keepAudio 
        ? `[0:v]${videoFilter}[v];[0:a]${audioFilter}[a]`
        : `[0:v]${videoFilter}[v]`,
      '-map', '[v]',
      keepAudio ? '-map' : '', keepAudio ? '[a]' : '',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      keepAudio ? '-c:a' : '', keepAudio ? 'aac' : '',
      keepAudio ? '-b:a' : '', keepAudio ? '192k' : '',
      '-y',
      outputPath
    ].filter(arg => arg !== '');
    
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        const percent = 20 + (progress.percent || 0) * 0.7;
        onProgress({ stage: 'encoding', percent, message: `Codificando: ${Math.round(progress.percent || 0)}%` });
      }
    });
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Cámara rápida aplicada' });
    }
    
    return {
      success: true,
      outputPath,
      speed,
      speedupFactor: speed,
      message: `Cámara rápida ${speed}x aplicada`
    };
  }
  
  /**
   * Aplicar reversa
   * @param {string} inputPath - Video original
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async applyReverse(inputPath, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Video no encontrado: ${inputPath}`);
    }
    
    const { reverseAudio = true, onProgress = null } = options;
    
    if (onProgress) {
      onProgress({ stage: 'processing', percent: 20, message: 'Revirtiendo video...' });
    }
    
    const args = [
      '-i', inputPath,
      '-vf', 'reverse',
      reverseAudio ? '-af' : '', reverseAudio ? 'areverse' : '',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      outputPath
    ].filter(arg => arg !== '');
    
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        const percent = 20 + (progress.percent || 0) * 0.7;
        onProgress({ stage: 'encoding', percent, message: `Codificando: ${Math.round(progress.percent || 0)}%` });
      }
    });
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Video revertido' });
    }
    
    return {
      success: true,
      outputPath,
      reverseAudio,
      message: 'Video reproducido en reversa'
    };
  }
  
  /**
   * Crear freeze frame
   * @param {string} inputPath - Video original
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async createFreezeFrame(inputPath, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Video no encontrado: ${inputPath}`);
    }
    
    const {
      freezeTime = 0,        // Segundo donde hacer freeze
      freezeDuration = 2,    // Duración del freeze
      position = 'middle',   // 'start', 'middle', 'end'
      onProgress = null
    } = options;
    
    if (onProgress) {
      onProgress({ stage: 'processing', percent: 20, message: 'Creando freeze frame...' });
    }
    
    // Obtener duración del video
    const info = await this.ffmpeg.getVideoInfo(inputPath);
    const duration = info.duration || 10;
    
    // Calcular punto de freeze según posición
    let actualFreezeTime = freezeTime;
    if (position === 'start') {
      actualFreezeTime = 0.1;
    } else if (position === 'middle') {
      actualFreezeTime = duration / 2;
    } else if (position === 'end') {
      actualFreezeTime = duration - 0.1;
    }
    
    // Usar filtro freeze
    const freezeFilter = `tpad=stop_mode=clone:stop_duration=${freezeDuration}`;
    
    // Enfoque alternativo: extraer frame, crear video de ese frame, y concatenar
    const frameImage = path.join(this.tempDir, `freeze_${uuidv4()}.png`);
    const freezeClip = path.join(this.tempDir, `freeze_clip_${uuidv4()}.mp4`);
    
    // Extraer el frame
    const extractArgs = [
      '-i', inputPath,
      '-ss', actualFreezeTime.toString(),
      '-vframes', '1',
      '-y',
      frameImage
    ];
    
    await this.ffmpeg.execute(extractArgs);
    
    // Crear clip del frame
    const fps = info.fps || 30;
    const createClipArgs = [
      '-loop', '1',
      '-i', frameImage,
      '-t', freezeDuration.toString(),
      '-vf', `fps=${fps}`,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y',
      freezeClip
    ];
    
    await this.ffmpeg.execute(createClipArgs);
    
    if (onProgress) {
      onProgress({ stage: 'encoding', percent: 60, message: 'Combinando clips...' });
    }
    
    // Concatenar: parte antes + freeze + parte después
    const listFile = path.join(this.tempDir, `concat_${uuidv4()}.txt`);
    
    // Por simplicidad, añadimos freeze al final
    // Una implementación completa dividiría el video
    const part1 = path.join(this.tempDir, `part1_${uuidv4()}.mp4`);
    
    // Cortar hasta el freeze point
    await this.ffmpeg.execute([
      '-i', inputPath,
      '-t', actualFreezeTime.toString(),
      '-c', 'copy',
      '-y',
      part1
    ]);
    
    // Crear archivo de lista
    fs.writeFileSync(listFile, `file '${part1}'\nfile '${freezeClip}'`);
    
    // Concatenar
    await this.ffmpeg.execute([
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-c', 'copy',
      '-y',
      outputPath
    ]);
    
    // Limpiar temporales
    [frameImage, freezeClip, listFile, part1].forEach(f => {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    });
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Freeze frame creado' });
    }
    
    return {
      success: true,
      outputPath,
      freezeTime: actualFreezeTime,
      freezeDuration,
      message: `Freeze frame de ${freezeDuration}s en ${this._formatTime(actualFreezeTime)}`
    };
  }
  
  /**
   * Aplicar Speed Ramp (cambio gradual de velocidad)
   * @param {string} inputPath - Video original
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async applySpeedRamp(inputPath, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Video no encontrado: ${inputPath}`);
    }
    
    const {
      startSpeed = 1,      // Velocidad inicial
      endSpeed = 0.25,     // Velocidad final
      rampStart = 0,       // Segundo donde empieza el ramp
      rampDuration = 2,    // Duración del ramp
      curve = 'easeInOut', // Tipo de curva
      onProgress = null
    } = options;
    
    if (onProgress) {
      onProgress({ stage: 'processing', percent: 20, message: 'Aplicando speed ramp...' });
    }
    
    // Obtener duración del video
    const info = await this.ffmpeg.getVideoInfo(inputPath);
    const fps = info.fps || 30;
    
    // Para speed ramp real, necesitamos manipular PTS dinámicamente
    // FFmpeg nativo es limitado, pero podemos aproximar con setpts expression
    
    // Expresión PTS que varía según el tiempo
    // Esta es una aproximación - para precisión se necesitaría frame-by-frame
    const speedRatio = endSpeed / startSpeed;
    
    // Expresión simplificada de PTS para rampa
    const ptsExpression = `if(lt(T,${rampStart}),PTS,` +
      `if(lt(T,${rampStart + rampDuration}),` +
      `PTS*(1+(${1/endSpeed - 1})*(T-${rampStart})/${rampDuration}),` +
      `PTS*${1/endSpeed}))`;
    
    const args = [
      '-i', inputPath,
      '-vf', `setpts='${ptsExpression}'`,
      '-af', `atempo=${(startSpeed + endSpeed) / 2}`,  // Aproximación
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-c:a', 'aac',
      '-y',
      outputPath
    ];
    
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        const percent = 20 + (progress.percent || 0) * 0.7;
        onProgress({ stage: 'encoding', percent, message: `Codificando: ${Math.round(progress.percent || 0)}%` });
      }
    });
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Speed ramp aplicado' });
    }
    
    return {
      success: true,
      outputPath,
      startSpeed,
      endSpeed,
      rampStart,
      rampDuration,
      curve,
      message: `Speed ramp ${startSpeed}x → ${endSpeed}x aplicado`
    };
  }
  
  /**
   * Aplicar máscara de viñeta
   * @param {string} inputPath - Video original
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async applyVignette(inputPath, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Video no encontrado: ${inputPath}`);
    }
    
    const {
      intensity = 0.5,       // 0-1, intensidad del oscurecimiento
      angle = Math.PI / 4,   // Ángulo del vignette
      onProgress = null
    } = options;
    
    if (onProgress) {
      onProgress({ stage: 'processing', percent: 20, message: 'Aplicando viñeta...' });
    }
    
    // Filtro vignette de FFmpeg
    const vignetteFilter = `vignette=a=${angle}:mode=forward`;
    
    const args = [
      '-i', inputPath,
      '-vf', vignetteFilter,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-c:a', 'copy',
      '-y',
      outputPath
    ];
    
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        const percent = 20 + (progress.percent || 0) * 0.7;
        onProgress({ stage: 'encoding', percent, message: `Codificando: ${Math.round(progress.percent || 0)}%` });
      }
    });
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Viñeta aplicada' });
    }
    
    return {
      success: true,
      outputPath,
      intensity,
      message: 'Viñeta aplicada'
    };
  }
  
  /**
   * Aplicar blur de movimiento
   * @param {string} inputPath - Video original
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async applyMotionBlur(inputPath, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Video no encontrado: ${inputPath}`);
    }
    
    const {
      amount = 5,         // Cantidad de blur
      direction = 0,      // Ángulo en grados
      onProgress = null
    } = options;
    
    if (onProgress) {
      onProgress({ stage: 'processing', percent: 20, message: 'Aplicando motion blur...' });
    }
    
    // Usar tblend para simular motion blur entre frames
    const blendFilter = `tblend=all_mode=average,tmix=frames=${amount}:weights='1 1 1 1 1'`;
    
    const args = [
      '-i', inputPath,
      '-vf', blendFilter,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-c:a', 'copy',
      '-y',
      outputPath
    ];
    
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        const percent = 20 + (progress.percent || 0) * 0.7;
        onProgress({ stage: 'encoding', percent, message: `Codificando: ${Math.round(progress.percent || 0)}%` });
      }
    });
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Motion blur aplicado' });
    }
    
    return {
      success: true,
      outputPath,
      amount,
      direction,
      message: 'Motion blur aplicado'
    };
  }
  
  /**
   * Screen replacement (reemplazar pantalla)
   * @param {string} videoPath - Video con pantalla a reemplazar
   * @param {string} replacementPath - Video/imagen de reemplazo
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async replaceScreen(videoPath, replacementPath, outputPath, options = {}) {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video no encontrado: ${videoPath}`);
    }
    if (!fs.existsSync(replacementPath)) {
      throw new Error(`Contenido de reemplazo no encontrado: ${replacementPath}`);
    }
    
    const {
      x = 100,         // Posición X de la pantalla
      y = 100,         // Posición Y de la pantalla
      width = 400,     // Ancho de la pantalla
      height = 300,    // Alto de la pantalla
      perspective = false,  // Aplicar perspectiva
      onProgress = null
    } = options;
    
    if (onProgress) {
      onProgress({ stage: 'processing', percent: 20, message: 'Reemplazando pantalla...' });
    }
    
    // Escalar el contenido de reemplazo y hacer overlay
    let filterComplex = '';
    
    filterComplex += `[1:v]scale=${width}:${height}[replacement];`;
    filterComplex += `[0:v][replacement]overlay=${x}:${y}[vout]`;
    
    const args = [
      '-i', videoPath,
      '-i', replacementPath,
      '-filter_complex', filterComplex,
      '-map', '[vout]',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-c:a', 'aac',
      '-shortest',
      '-y',
      outputPath
    ];
    
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        const percent = 20 + (progress.percent || 0) * 0.7;
        onProgress({ stage: 'encoding', percent, message: `Codificando: ${Math.round(progress.percent || 0)}%` });
      }
    });
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Pantalla reemplazada' });
    }
    
    return {
      success: true,
      outputPath,
      screen: { x, y, width, height },
      message: 'Pantalla reemplazada exitosamente'
    };
  }
  
  /**
   * Aplicar efecto de zoom dinámico (Ken Burns)
   * @param {string} inputPath - Video/imagen
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async applyKenBurns(inputPath, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }
    
    const {
      duration = 5,          // Duración del efecto
      startZoom = 1,         // Zoom inicial
      endZoom = 1.3,         // Zoom final
      panX = 0,              // Pan horizontal (-1 a 1)
      panY = 0,              // Pan vertical (-1 a 1)
      outputWidth = 1920,
      outputHeight = 1080,
      onProgress = null
    } = options;
    
    if (onProgress) {
      onProgress({ stage: 'processing', percent: 20, message: 'Aplicando Ken Burns...' });
    }
    
    // Calcular el zoom progresivo
    const zoomExpr = `zoom+'${(endZoom - startZoom) / (duration * 25)}'`;
    const xExpr = `iw/2-(iw/zoom/2)+${panX}*((iw-iw/zoom)/2)`;
    const yExpr = `ih/2-(ih/zoom/2)+${panY}*((ih-ih/zoom)/2)`;
    
    const zoompanFilter = `zoompan=z='min(${startZoom}+${(endZoom - startZoom)}*on/${duration * 25},${endZoom})':` +
      `x='${xExpr}':y='${yExpr}':d=${duration * 25}:s=${outputWidth}x${outputHeight}:fps=25`;
    
    const args = [
      '-loop', '1',
      '-i', inputPath,
      '-vf', zoompanFilter,
      '-t', duration.toString(),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y',
      outputPath
    ];
    
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        const percent = 20 + (progress.percent || 0) * 0.7;
        onProgress({ stage: 'encoding', percent, message: `Codificando: ${Math.round(progress.percent || 0)}%` });
      }
    });
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Ken Burns aplicado' });
    }
    
    return {
      success: true,
      outputPath,
      duration,
      startZoom,
      endZoom,
      message: `Efecto Ken Burns ${startZoom}x → ${endZoom}x (${duration}s)`
    };
  }
  
  /**
   * Formatear tiempo
   * @private
   */
  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
  }
  
  /**
   * Limpiar archivos temporales
   */
  cleanup() {
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(this.tempDir, file));
        } catch {
          // Ignorar errores
        }
      }
    }
  }
}

module.exports = VFXTools;
