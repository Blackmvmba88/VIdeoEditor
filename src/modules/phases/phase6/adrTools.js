/**
 * ADR Tools - Automated Dialogue Replacement
 * Herramientas profesionales para reemplazo de diálogo
 * 
 * Funcionalidades:
 * - Detección de segmentos de diálogo
 * - Sincronización de audio con video
 * - Reemplazo de diálogo manteniendo ambiente
 * - Mezcla inteligente de capas de audio
 * - Análisis de room tone
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { v4: uuidv4 } = require('uuid');
const FFmpegWrapper = require('../../ffmpegWrapper');

class ADRTools {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.tempDir = path.join(os.tmpdir(), 'video-editor-adr');
    
    // Configuración por defecto
    this.config = {
      // Detección de diálogo
      speechThreshold: -30,      // dB - umbral para detectar habla
      silenceThreshold: -50,     // dB - umbral de silencio
      minSpeechDuration: 0.3,    // segundos mínimos de habla
      minSilenceDuration: 0.2,   // segundos mínimos de silencio
      
      // Sincronización
      crossfadeDuration: 0.05,   // segundos de crossfade
      preRoll: 0.1,              // segundos antes del cue
      postRoll: 0.1,             // segundos después del cue
      
      // Room tone
      roomToneDuration: 2,       // segundos de room tone a extraer
      roomToneAnalysisWindow: 5  // segundos para buscar room tone
    };
    
    // Modos de ADR
    this.modes = {
      replace: {
        name: 'Reemplazo Total',
        description: 'Reemplaza completamente el diálogo original',
        keepAmbience: false
      },
      blend: {
        name: 'Mezcla Suave',
        description: 'Mezcla nuevo diálogo con ambiente original',
        keepAmbience: true,
        ambienceLevel: -12  // dB
      },
      layer: {
        name: 'Capas',
        description: 'Agrega diálogo como capa adicional',
        keepAmbience: true,
        ambienceLevel: 0
      },
      ducking: {
        name: 'Ducking Automático',
        description: 'Reduce ambiente cuando hay nuevo diálogo',
        keepAmbience: true,
        duckAmount: -15  // dB
      }
    };
    
    // Presets de mezcla
    this.mixPresets = {
      film: {
        name: 'Película',
        dialogueLevel: 0,
        ambienceLevel: -18,
        crossfade: 0.08,
        roomToneLevel: -24
      },
      tv: {
        name: 'Televisión',
        dialogueLevel: 0,
        ambienceLevel: -15,
        crossfade: 0.05,
        roomToneLevel: -20
      },
      documentary: {
        name: 'Documental',
        dialogueLevel: 0,
        ambienceLevel: -12,
        crossfade: 0.03,
        roomToneLevel: -18
      },
      podcast: {
        name: 'Podcast',
        dialogueLevel: 0,
        ambienceLevel: -30,
        crossfade: 0.02,
        roomToneLevel: -36
      },
      clean: {
        name: 'Limpio',
        dialogueLevel: 0,
        ambienceLevel: -96,
        crossfade: 0.05,
        roomToneLevel: -96
      }
    };
    
    this._ensureTempDir();
  }
  
  /**
   * Asegurar que existe el directorio temporal
   * @private
   */
  _ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  /**
   * Obtener modos de ADR disponibles
   * @returns {Object} Modos disponibles
   */
  getModes() {
    return { ...this.modes };
  }
  
  /**
   * Obtener presets de mezcla
   * @returns {Object} Presets disponibles
   */
  getMixPresets() {
    return { ...this.mixPresets };
  }
  
  /**
   * Detectar segmentos de diálogo en un archivo
   * @param {string} inputPath - Ruta al archivo de video/audio
   * @param {Object} options - Opciones de detección
   * @returns {Promise<Object>} Segmentos detectados
   */
  async detectDialogueSegments(inputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }
    
    const {
      speechThreshold = this.config.speechThreshold,
      minSpeechDuration = this.config.minSpeechDuration,
      minSilenceDuration = this.config.minSilenceDuration
    } = options;
    
    // Obtener info del archivo
    const info = await this.ffmpeg.getVideoInfo(inputPath);
    const duration = info.duration || 0;
    
    // Detectar actividad de voz usando silencedetect
    const silenceArgs = [
      '-i', inputPath,
      '-af', `silencedetect=n=${speechThreshold}dB:d=${minSilenceDuration}`,
      '-f', 'null',
      '-'
    ];
    
    let silenceOutput = '';
    try {
      await this.ffmpeg.execute(silenceArgs, null, (data) => {
        silenceOutput += data;
      });
    } catch {
      // silencedetect puede terminar con código no-cero pero genera output válido
    }
    
    // Parsear segmentos de silencio
    const silences = this._parseSilenceDetect(silenceOutput);
    
    // Invertir silencios para obtener segmentos de habla
    const speechSegments = this._invertSilences(silences, duration);
    
    // Filtrar segmentos muy cortos
    const filteredSegments = speechSegments.filter(
      seg => (seg.end - seg.start) >= minSpeechDuration
    );
    
    // Analizar características de cada segmento
    const analyzedSegments = await Promise.all(
      filteredSegments.map(async (seg, index) => ({
        id: `segment_${index + 1}`,
        start: seg.start,
        end: seg.end,
        duration: seg.end - seg.start,
        startFormatted: this._formatTime(seg.start),
        endFormatted: this._formatTime(seg.end),
        durationFormatted: this._formatTime(seg.end - seg.start)
      }))
    );
    
    return {
      success: true,
      segments: analyzedSegments,
      totalSegments: analyzedSegments.length,
      totalSpeechDuration: analyzedSegments.reduce((sum, s) => sum + s.duration, 0),
      fileDuration: duration,
      speechPercentage: (analyzedSegments.reduce((sum, s) => sum + s.duration, 0) / duration * 100).toFixed(1),
      settings: {
        speechThreshold,
        minSpeechDuration,
        minSilenceDuration
      }
    };
  }
  
  /**
   * Parsear output de silencedetect
   * @private
   */
  _parseSilenceDetect(output) {
    const silences = [];
    const startRegex = /silence_start:\s*([\d.]+)/g;
    const endRegex = /silence_end:\s*([\d.]+)/g;
    
    const starts = [];
    const ends = [];
    
    let match;
    while ((match = startRegex.exec(output)) !== null) {
      starts.push(Number.parseFloat(match[1]));
    }
    while ((match = endRegex.exec(output)) !== null) {
      ends.push(Number.parseFloat(match[1]));
    }
    
    // Emparejar starts con ends
    const minLen = Math.min(starts.length, ends.length);
    for (let i = 0; i < minLen; i++) {
      silences.push({
        start: starts[i],
        end: ends[i]
      });
    }
    
    return silences;
  }
  
  /**
   * Invertir silencios para obtener segmentos de habla
   * @private
   */
  _invertSilences(silences, totalDuration) {
    const speech = [];
    let currentPos = 0;
    
    for (const silence of silences) {
      if (silence.start > currentPos) {
        speech.push({
          start: currentPos,
          end: silence.start
        });
      }
      currentPos = silence.end;
    }
    
    // Agregar último segmento si existe
    if (currentPos < totalDuration) {
      speech.push({
        start: currentPos,
        end: totalDuration
      });
    }
    
    return speech;
  }
  
  /**
   * Extraer room tone de un archivo
   * @param {string} inputPath - Ruta al archivo
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado con ruta al room tone
   */
  async extractRoomTone(inputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }
    
    const {
      duration = this.config.roomToneDuration,
      outputPath = path.join(this.tempDir, `roomtone_${uuidv4()}.wav`)
    } = options;
    
    // Detectar segmentos silenciosos (potencial room tone)
    const detection = await this.detectDialogueSegments(inputPath, {
      speechThreshold: -40,  // Más sensible
      minSilenceDuration: duration
    });
    
    // Obtener info del archivo
    const info = await this.ffmpeg.getVideoInfo(inputPath);
    const fileDuration = info.duration || 0;
    
    // Buscar el mejor segmento de silencio para room tone
    // Preferir silencios en medio del archivo (menos probabilidad de ruido de inicio/fin)
    let bestStart = 0;
    let bestScore = -Infinity;
    
    // Analizar cada segundo buscando el más silencioso
    const windowSize = duration;
    const analysisStep = 0.5;
    
    for (let t = 0; t < fileDuration - windowSize; t += analysisStep) {
      // Evitar inicio y final del archivo
      const positionScore = 1 - Math.abs((t / fileDuration) - 0.5) * 2;
      
      // Verificar si está fuera de segmentos de habla
      const inSpeech = detection.segments.some(
        seg => t < seg.end && t + windowSize > seg.start
      );
      
      if (!inSpeech) {
        const score = positionScore;
        if (score > bestScore) {
          bestScore = score;
          bestStart = t;
        }
      }
    }
    
    // Extraer el room tone
    const args = [
      '-i', inputPath,
      '-ss', bestStart.toString(),
      '-t', duration.toString(),
      '-vn',
      '-acodec', 'pcm_s16le',
      '-ar', '48000',
      '-ac', '2',
      '-y',
      outputPath
    ];
    
    await this.ffmpeg.execute(args);
    
    // Analizar el room tone extraído
    const analysis = await this._analyzeAudioLevel(outputPath);
    
    return {
      success: true,
      roomTonePath: outputPath,
      sourceStart: bestStart,
      duration,
      analysis: {
        averageLevel: analysis.meanVolume,
        peakLevel: analysis.maxVolume,
        isClean: analysis.maxVolume < -30
      },
      message: `Room tone extraído de ${this._formatTime(bestStart)} (${duration}s)`
    };
  }
  
  /**
   * Analizar niveles de audio
   * @private
   */
  async _analyzeAudioLevel(filePath) {
    const args = [
      '-i', filePath,
      '-af', 'volumedetect',
      '-f', 'null',
      '-'
    ];
    
    let output = '';
    try {
      await this.ffmpeg.execute(args, null, (data) => {
        output += data;
      });
    } catch {
      // volumedetect puede fallar pero genera output
    }
    
    // Parsear resultados
    const meanMatch = output.match(/mean_volume:\s*([-\d.]+)/);
    const maxMatch = output.match(/max_volume:\s*([-\d.]+)/);
    
    return {
      meanVolume: meanMatch ? Number.parseFloat(meanMatch[1]) : -20,
      maxVolume: maxMatch ? Number.parseFloat(maxMatch[1]) : -10
    };
  }
  
  /**
   * Reemplazar diálogo en un segmento específico
   * @param {string} originalPath - Video/audio original
   * @param {string} newDialoguePath - Nuevo audio de diálogo
   * @param {string} outputPath - Ruta de salida
   * @param {Object} segment - Segmento a reemplazar {start, end}
   * @param {Object} options - Opciones de reemplazo
   * @returns {Promise<Object>} Resultado
   */
  async replaceDialogue(originalPath, newDialoguePath, outputPath, segment, options = {}) {
    if (!fs.existsSync(originalPath)) {
      throw new Error(`Archivo original no encontrado: ${originalPath}`);
    }
    if (!fs.existsSync(newDialoguePath)) {
      throw new Error(`Nuevo diálogo no encontrado: ${newDialoguePath}`);
    }
    
    const {
      mode = 'blend',
      mixPreset = 'film',
      crossfade = null,
      keepVideo = true,
      roomTonePath = null,
      onProgress = null
    } = options;
    
    // Obtener configuración del modo y preset
    const modeConfig = this.modes[mode] || this.modes.blend;
    const presetConfig = this.mixPresets[mixPreset] || this.mixPresets.film;
    
    const crossfadeDuration = crossfade || presetConfig.crossfade;
    
    // Reportar progreso
    if (onProgress) {
      onProgress({ stage: 'preparing', percent: 10, message: 'Preparando archivos...' });
    }
    
    // Obtener info de archivos
    const originalInfo = await this.ffmpeg.getVideoInfo(originalPath);
    const hasVideo = originalInfo.hasVideo !== false;
    
    // Crear filtro de audio complejo
    let filterComplex = '';
    let inputs = ['-i', originalPath, '-i', newDialoguePath];
    let inputCount = 2;
    
    // Agregar room tone si se proporciona
    if (roomTonePath && fs.existsSync(roomTonePath)) {
      inputs.push('-i', roomTonePath);
      inputCount++;
    }
    
    // Construir filtro según el modo
    const segmentStart = segment.start || 0;
    const segmentEnd = segment.end || segmentStart + 5;
    const segmentDuration = segmentEnd - segmentStart;
    
    if (onProgress) {
      onProgress({ stage: 'processing', percent: 30, message: 'Procesando audio...' });
    }
    
    if (mode === 'replace') {
      // Reemplazo total: silenciar original en el segmento y poner nuevo
      filterComplex = this._buildReplaceFilter(segmentStart, segmentEnd, crossfadeDuration);
    } else if (mode === 'blend' || mode === 'layer') {
      // Mezcla: combinar ambos audios
      const ambienceLevel = modeConfig.ambienceLevel || presetConfig.ambienceLevel;
      filterComplex = this._buildBlendFilter(segmentStart, segmentEnd, ambienceLevel, crossfadeDuration);
    } else if (mode === 'ducking') {
      // Ducking: reducir original cuando hay nuevo diálogo
      filterComplex = this._buildDuckingFilter(segmentStart, segmentEnd, modeConfig.duckAmount, crossfadeDuration);
    }
    
    // Construir comando FFmpeg
    const args = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', hasVideo && keepVideo ? '0:v' : '',
      '-map', '[aout]'
    ].filter(arg => arg !== '');
    
    // Añadir codecs
    if (hasVideo && keepVideo) {
      args.push('-c:v', 'copy');
    }
    args.push(
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      outputPath
    );
    
    if (onProgress) {
      onProgress({ stage: 'encoding', percent: 50, message: 'Codificando...' });
    }
    
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        const percent = 50 + (progress.percent || 0) * 0.4;
        onProgress({ stage: 'encoding', percent, message: `Codificando: ${Math.round(progress.percent || 0)}%` });
      }
    });
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Completado' });
    }
    
    return {
      success: true,
      outputPath,
      segment: {
        start: segmentStart,
        end: segmentEnd,
        duration: segmentDuration
      },
      mode,
      mixPreset,
      message: `Diálogo reemplazado en ${this._formatTime(segmentStart)} - ${this._formatTime(segmentEnd)}`
    };
  }
  
  /**
   * Construir filtro de reemplazo total
   * @private
   */
  _buildReplaceFilter(start, end, crossfade) {
    // Silenciar el segmento original y agregar nuevo diálogo
    const fadeIn = crossfade;
    const fadeOut = crossfade;
    
    return `[0:a]volume=enable='between(t,${start},${end})':volume=0[orig];` +
           `[1:a]adelay=${Math.floor(start * 1000)}|${Math.floor(start * 1000)},` +
           `afade=t=in:st=${start}:d=${fadeIn},` +
           `afade=t=out:st=${end - fadeOut}:d=${fadeOut}[new];` +
           `[orig][new]amix=inputs=2:duration=longest[aout]`;
  }
  
  /**
   * Construir filtro de mezcla
   * @private
   */
  _buildBlendFilter(start, end, ambienceLevel, crossfade) {
    // Reducir original y mezclar con nuevo
    const volumeReduction = Math.pow(10, ambienceLevel / 20);
    
    return `[0:a]volume=enable='between(t,${start},${end})':volume=${volumeReduction}[orig];` +
           `[1:a]adelay=${Math.floor(start * 1000)}|${Math.floor(start * 1000)},` +
           `afade=t=in:st=${start}:d=${crossfade},` +
           `afade=t=out:st=${end - crossfade}:d=${crossfade}[new];` +
           `[orig][new]amix=inputs=2:duration=longest:normalize=0[aout]`;
  }
  
  /**
   * Construir filtro de ducking
   * @private
   */
  _buildDuckingFilter(start, end, duckAmount, crossfade) {
    // Usar sidechaincompress para ducking automático
    const ratio = 4;
    const threshold = -20;
    
    return `[0:a]asplit=2[orig][sc];` +
           `[1:a]adelay=${Math.floor(start * 1000)}|${Math.floor(start * 1000)}[new];` +
           `[orig][new]sidechaincompress=threshold=${threshold}dB:ratio=${ratio}:attack=50:release=200[ducked];` +
           `[ducked]afade=t=in:st=0:d=${crossfade}[aout]`;
  }
  
  /**
   * Crear cue sheet para sesión de ADR
   * @param {string} inputPath - Video original
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Cue sheet generado
   */
  async createCueSheet(inputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }
    
    const {
      characterName = 'Character',
      actorName = 'Actor',
      scene = 'Scene 1',
      notes = ''
    } = options;
    
    // Detectar segmentos de diálogo
    const detection = await this.detectDialogueSegments(inputPath);
    
    // Crear cue sheet
    const cueSheet = {
      project: path.basename(inputPath, path.extname(inputPath)),
      scene,
      characterName,
      actorName,
      createdAt: new Date().toISOString(),
      notes,
      cues: detection.segments.map((seg, index) => ({
        cueNumber: index + 1,
        id: seg.id,
        timecodeIn: this._formatTimecode(seg.start),
        timecodeOut: this._formatTimecode(seg.end),
        duration: seg.durationFormatted,
        status: 'pending',  // pending, recorded, approved
        takes: [],
        notes: ''
      })),
      summary: {
        totalCues: detection.segments.length,
        totalDuration: detection.totalSpeechDuration,
        pendingCues: detection.segments.length,
        recordedCues: 0,
        approvedCues: 0
      }
    };
    
    return {
      success: true,
      cueSheet,
      message: `Cue sheet creado con ${cueSheet.cues.length} cues`
    };
  }
  
  /**
   * Exportar cue sheet a formato EDL
   * @param {Object} cueSheet - Cue sheet generado
   * @param {string} outputPath - Ruta de salida
   * @returns {Promise<Object>} Resultado
   */
  async exportCueSheetEDL(cueSheet, outputPath) {
    const lines = [
      'TITLE: ' + cueSheet.project,
      'FCM: NON-DROP FRAME',
      ''
    ];
    
    for (const cue of cueSheet.cues) {
      const edlLine = [
        String(cue.cueNumber).padStart(3, '0'),
        'AX',
        'AA/V',
        'C',
        cue.timecodeIn,
        cue.timecodeOut,
        cue.timecodeIn,
        cue.timecodeOut
      ].join('  ');
      
      lines.push(edlLine);
      lines.push(`* FROM CLIP NAME: ${cue.id}`);
      lines.push('');
    }
    
    fs.writeFileSync(outputPath, lines.join('\n'));
    
    return {
      success: true,
      outputPath,
      format: 'EDL',
      cueCount: cueSheet.cues.length
    };
  }
  
  /**
   * Batch replace - reemplazar múltiples segmentos
   * @param {string} originalPath - Video original
   * @param {Array} replacements - Lista de {segment, dialoguePath}
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async batchReplace(originalPath, replacements, outputPath, options = {}) {
    if (!fs.existsSync(originalPath)) {
      throw new Error(`Archivo no encontrado: ${originalPath}`);
    }
    
    const { onProgress = null, mode = 'blend', mixPreset = 'film' } = options;
    
    // Procesar secuencialmente
    let currentInput = originalPath;
    const tempFiles = [];
    
    for (let i = 0; i < replacements.length; i++) {
      const replacement = replacements[i];
      const isLast = i === replacements.length - 1;
      const tempOutput = isLast ? outputPath : path.join(this.tempDir, `batch_${uuidv4()}.mp4`);
      
      if (!isLast) {
        tempFiles.push(tempOutput);
      }
      
      if (onProgress) {
        const percent = Math.round((i / replacements.length) * 100);
        onProgress({ 
          stage: 'batch', 
          percent, 
          message: `Procesando segmento ${i + 1} de ${replacements.length}` 
        });
      }
      
      await this.replaceDialogue(
        currentInput,
        replacement.dialoguePath,
        tempOutput,
        replacement.segment,
        { mode, mixPreset }
      );
      
      currentInput = tempOutput;
    }
    
    // Limpiar archivos temporales
    for (const tempFile of tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch {
        // Ignorar errores de limpieza
      }
    }
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Batch completado' });
    }
    
    return {
      success: true,
      outputPath,
      replacementsCount: replacements.length,
      message: `${replacements.length} segmentos reemplazados`
    };
  }
  
  /**
   * Crear guía de audio para grabar ADR
   * @param {string} inputPath - Video original
   * @param {Object} segment - Segmento {start, end}
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async createRecordingGuide(inputPath, segment, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo no encontrado: ${inputPath}`);
    }
    
    const {
      preRoll = 3,           // segundos antes
      postRoll = 2,          // segundos después
      beepCount = 3,         // beeps de cuenta regresiva
      includeOriginal = true // incluir audio original de referencia
    } = options;
    
    const segStart = Math.max(0, segment.start - preRoll);
    const segEnd = segment.end + postRoll;
    
    // Extraer clip con pre/post roll
    const tempClip = path.join(this.tempDir, `guide_clip_${uuidv4()}.mp4`);
    
    const extractArgs = [
      '-i', inputPath,
      '-ss', segStart.toString(),
      '-t', (segEnd - segStart).toString(),
      '-c', 'copy',
      '-y',
      tempClip
    ];
    
    await this.ffmpeg.execute(extractArgs);
    
    // Generar beeps de cuenta regresiva
    const beepDuration = 0.1;
    const beepInterval = 1;
    const beepFreq = 1000;
    
    let beepFilter = '';
    for (let i = 0; i < beepCount; i++) {
      const beepTime = preRoll - (beepCount - i);
      if (beepTime >= 0) {
        if (beepFilter) beepFilter += '+';
        beepFilter += `sine=f=${beepFreq}:d=${beepDuration}:enable='between(t,${beepTime},${beepTime + beepDuration})'`;
      }
    }
    
    // Crear filtro complejo con beeps
    const args = [
      '-i', tempClip,
      '-f', 'lavfi',
      '-i', `sine=frequency=${beepFreq}:duration=${beepDuration}`,
      '-filter_complex',
      `[0:a]volume=${includeOriginal ? '1' : '0'}[orig];` +
      `aevalsrc=0:d=${segEnd - segStart}[silence];` +
      `[silence][orig]amix=inputs=2[aout]`,
      '-map', '0:v',
      '-map', '[aout]',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-y',
      outputPath
    ];
    
    await this.ffmpeg.execute(args);
    
    // Limpiar temporal
    try {
      fs.unlinkSync(tempClip);
    } catch {
      // Ignorar
    }
    
    return {
      success: true,
      outputPath,
      segment: {
        original: segment,
        withRolls: { start: segStart, end: segEnd }
      },
      preRoll,
      postRoll,
      beepCount,
      message: `Guía de grabación creada con ${beepCount} beeps`
    };
  }
  
  /**
   * Formatear tiempo en segundos a MM:SS.ms
   * @private
   */
  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
  }
  
  /**
   * Formatear tiempo a timecode SMPTE
   * @private
   */
  _formatTimecode(seconds, fps = 25) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * fps);
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0'),
      frames.toString().padStart(2, '0')
    ].join(':');
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

module.exports = ADRTools;
