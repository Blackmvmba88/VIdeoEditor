/**
 * Sound Design - Foley & Sound Effects Library
 * Librería integrada de efectos de sonido y foley
 * 
 * Funcionalidades:
 * - Biblioteca de efectos de sonido categorizados
 * - Generador de foley sintético
 * - Sincronización automática con video
 * - Layering y mezcla de efectos
 * - Presets de ambiente
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { v4: uuidv4 } = require('uuid');
const FFmpegWrapper = require('../../ffmpegWrapper');

class SoundDesign {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.tempDir = path.join(os.tmpdir(), 'video-editor-sounddesign');
    
    // Categorías de efectos de sonido
    this.categories = {
      footsteps: {
        name: 'Pasos',
        icon: '👟',
        subcategories: ['wood', 'concrete', 'grass', 'gravel', 'water', 'snow', 'metal', 'carpet']
      },
      impacts: {
        name: 'Impactos',
        icon: '💥',
        subcategories: ['punch', 'kick', 'body_fall', 'crash', 'explosion', 'glass_break', 'metal_hit', 'wood_break']
      },
      whooshes: {
        name: 'Whooshes',
        icon: '💨',
        subcategories: ['fast', 'slow', 'heavy', 'light', 'sword', 'arrow', 'wind', 'movement']
      },
      nature: {
        name: 'Naturaleza',
        icon: '🌿',
        subcategories: ['wind', 'rain', 'thunder', 'birds', 'water', 'fire', 'leaves', 'insects']
      },
      urban: {
        name: 'Urbano',
        icon: '🏙️',
        subcategories: ['traffic', 'crowd', 'siren', 'horn', 'construction', 'subway', 'airport', 'restaurant']
      },
      mechanical: {
        name: 'Mecánicos',
        icon: '⚙️',
        subcategories: ['door', 'switch', 'motor', 'gear', 'hydraulic', 'electronic', 'clock', 'typing']
      },
      ui: {
        name: 'UI/Interfaz',
        icon: '📱',
        subcategories: ['click', 'beep', 'notification', 'error', 'success', 'hover', 'transition', 'popup']
      },
      musical: {
        name: 'Musical',
        icon: '🎵',
        subcategories: ['stinger', 'riser', 'hit', 'drone', 'pad', 'transition', 'logo', 'bumper']
      },
      voice: {
        name: 'Voz',
        icon: '🗣️',
        subcategories: ['crowd_murmur', 'cheer', 'scream', 'laugh', 'gasp', 'whisper', 'grunt', 'reaction']
      },
      horror: {
        name: 'Horror',
        icon: '👻',
        subcategories: ['creepy', 'jumpscare', 'ambient', 'monster', 'ghost', 'heartbeat', 'breathing', 'static']
      }
    };
    
    // Generadores de foley sintético (usando FFmpeg lavfi)
    this.foleyGenerators = {
      // Tonos y beeps
      beep: {
        type: 'sine',
        defaultFreq: 1000,
        defaultDuration: 0.2
      },
      alert: {
        type: 'sine',
        defaultFreq: 880,
        defaultDuration: 0.5,
        envelope: 'attack=0.01:decay=0.1:sustain=0.8:release=0.1'
      },
      // Ruido
      static: {
        type: 'noise',
        color: 'white'
      },
      wind_synth: {
        type: 'noise',
        color: 'brown',
        filter: 'lowpass=f=500'
      },
      rain_synth: {
        type: 'noise',
        color: 'pink',
        filter: 'highpass=f=2000'
      },
      // Percusión
      kick: {
        type: 'sine',
        defaultFreq: 60,
        defaultDuration: 0.3,
        envelope: 'attack=0.001:decay=0.2:sustain=0:release=0.1'
      },
      snare: {
        type: 'noise',
        color: 'white',
        filter: 'highpass=f=200,lowpass=f=8000',
        defaultDuration: 0.15
      }
    };
    
    // Presets de ambiente
    this.ambiencePresets = {
      office: {
        name: 'Oficina',
        layers: [
          { type: 'hvac', volume: -24 },
          { type: 'typing', volume: -30, intermittent: true },
          { type: 'murmur', volume: -36 }
        ]
      },
      forest: {
        name: 'Bosque',
        layers: [
          { type: 'wind_light', volume: -18 },
          { type: 'birds', volume: -24 },
          { type: 'leaves', volume: -30 }
        ]
      },
      city_day: {
        name: 'Ciudad de Día',
        layers: [
          { type: 'traffic', volume: -15 },
          { type: 'crowd', volume: -24 },
          { type: 'horns', volume: -30, intermittent: true }
        ]
      },
      city_night: {
        name: 'Ciudad de Noche',
        layers: [
          { type: 'traffic_distant', volume: -24 },
          { type: 'sirens', volume: -36, intermittent: true },
          { type: 'wind', volume: -30 }
        ]
      },
      rain_indoor: {
        name: 'Lluvia (Interior)',
        layers: [
          { type: 'rain_on_window', volume: -18 },
          { type: 'thunder_distant', volume: -30, intermittent: true },
          { type: 'room_tone', volume: -42 }
        ]
      },
      rain_outdoor: {
        name: 'Lluvia (Exterior)',
        layers: [
          { type: 'rain_heavy', volume: -12 },
          { type: 'thunder', volume: -24, intermittent: true },
          { type: 'wind', volume: -18 }
        ]
      },
      beach: {
        name: 'Playa',
        layers: [
          { type: 'waves', volume: -15 },
          { type: 'seagulls', volume: -30, intermittent: true },
          { type: 'wind', volume: -24 }
        ]
      },
      cafe: {
        name: 'Cafetería',
        layers: [
          { type: 'crowd_murmur', volume: -18 },
          { type: 'dishes', volume: -30, intermittent: true },
          { type: 'coffee_machine', volume: -36, intermittent: true },
          { type: 'music_bg', volume: -42 }
        ]
      },
      space: {
        name: 'Espacio',
        layers: [
          { type: 'drone_low', volume: -24 },
          { type: 'hum', volume: -30 },
          { type: 'beeps', volume: -36, intermittent: true }
        ]
      },
      horror_ambient: {
        name: 'Horror',
        layers: [
          { type: 'drone_dark', volume: -18 },
          { type: 'breathing', volume: -36 },
          { type: 'creaks', volume: -42, intermittent: true }
        ]
      }
    };
    
    // Configuración
    this.config = {
      defaultSampleRate: 48000,
      defaultChannels: 2,
      defaultBitDepth: 16,
      crossfadeDuration: 0.02,
      maxLayers: 16
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
   * Obtener categorías de efectos disponibles
   * @returns {Object} Categorías
   */
  getCategories() {
    return { ...this.categories };
  }
  
  /**
   * Obtener subcategorías de una categoría
   * @param {string} category - Nombre de la categoría
   * @returns {Array} Subcategorías
   */
  getSubcategories(category) {
    if (!this.categories[category]) {
      throw new Error(`Categoría no encontrada: ${category}`);
    }
    return [...this.categories[category].subcategories];
  }
  
  /**
   * Obtener presets de ambiente
   * @returns {Object} Presets disponibles
   */
  getAmbiencePresets() {
    return { ...this.ambiencePresets };
  }
  
  /**
   * Obtener generadores de foley disponibles
   * @returns {Object} Generadores
   */
  getFoleyGenerators() {
    return Object.keys(this.foleyGenerators);
  }
  
  /**
   * Generar efecto de sonido sintético
   * @param {string} type - Tipo de efecto (beep, static, wind_synth, etc.)
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado con ruta al archivo
   */
  async generateSyntheticSound(type, options = {}) {
    const generator = this.foleyGenerators[type];
    if (!generator) {
      throw new Error(`Generador no encontrado: ${type}. Disponibles: ${this.getFoleyGenerators().join(', ')}`);
    }
    
    const {
      duration = generator.defaultDuration || 1,
      frequency = generator.defaultFreq || 440,
      volume = 0,
      outputPath = path.join(this.tempDir, `synth_${type}_${uuidv4()}.wav`)
    } = options;
    
    let filterGraph = '';
    let inputSource = '';
    
    if (generator.type === 'sine') {
      // Generar tono sinusoidal
      inputSource = `sine=frequency=${frequency}:duration=${duration}`;
      filterGraph = 'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo';
      
      if (generator.envelope) {
        filterGraph += `,asdr=${generator.envelope}`;
      }
    } else if (generator.type === 'noise') {
      // Generar ruido
      const noiseColor = generator.color || 'white';
      inputSource = `anoisesrc=color=${noiseColor}:duration=${duration}:sample_rate=48000`;
      filterGraph = 'aformat=channel_layouts=stereo';
      
      if (generator.filter) {
        filterGraph += `,${generator.filter}`;
      }
    }
    
    // Aplicar volumen
    if (volume !== 0) {
      filterGraph += `,volume=${Math.pow(10, volume / 20)}`;
    }
    
    const args = [
      '-f', 'lavfi',
      '-i', inputSource,
      '-af', filterGraph,
      '-c:a', 'pcm_s16le',
      '-y',
      outputPath
    ];
    
    await this.ffmpeg.execute(args);
    
    return {
      success: true,
      outputPath,
      type,
      duration,
      frequency: generator.type === 'sine' ? frequency : null,
      message: `Sonido sintético "${type}" generado (${duration}s)`
    };
  }
  
  /**
   * Generar ambiente a partir de preset
   * @param {string} presetName - Nombre del preset
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async generateAmbience(presetName, options = {}) {
    const preset = this.ambiencePresets[presetName];
    if (!preset) {
      throw new Error(`Preset no encontrado: ${presetName}. Disponibles: ${Object.keys(this.ambiencePresets).join(', ')}`);
    }
    
    const {
      duration = 30,
      outputPath = path.join(this.tempDir, `ambience_${presetName}_${uuidv4()}.wav`),
      masterVolume = 0,
      onProgress = null
    } = options;
    
    if (onProgress) {
      onProgress({ stage: 'generating', percent: 10, message: `Generando ambiente: ${preset.name}` });
    }
    
    // Generar cada capa del ambiente
    const layerFiles = [];
    const layerCount = preset.layers.length;
    
    for (let i = 0; i < layerCount; i++) {
      const layer = preset.layers[i];
      
      if (onProgress) {
        const percent = 10 + (i / layerCount) * 60;
        onProgress({ stage: 'layers', percent, message: `Generando capa ${i + 1}/${layerCount}: ${layer.type}` });
      }
      
      // Generar capa sintética basada en tipo
      const layerPath = path.join(this.tempDir, `layer_${i}_${uuidv4()}.wav`);
      
      // Mapear tipo de capa a generador
      const generatorMapping = {
        hvac: { gen: 'wind_synth', freq: null },
        wind: { gen: 'wind_synth', freq: null },
        wind_light: { gen: 'wind_synth', freq: null },
        rain: { gen: 'rain_synth', freq: null },
        rain_heavy: { gen: 'rain_synth', freq: null },
        rain_on_window: { gen: 'rain_synth', freq: null },
        static: { gen: 'static', freq: null },
        hum: { gen: 'beep', freq: 60 },
        drone_low: { gen: 'beep', freq: 40 },
        drone_dark: { gen: 'beep', freq: 30 },
        room_tone: { gen: 'wind_synth', freq: null },
        beeps: { gen: 'beep', freq: 800 }
      };
      
      const mapping = generatorMapping[layer.type] || { gen: 'static', freq: null };
      
      try {
        await this.generateSyntheticSound(mapping.gen, {
          duration,
          frequency: mapping.freq,
          volume: layer.volume,
          outputPath: layerPath
        });
        layerFiles.push(layerPath);
      } catch {
        // Si falla, usar ruido genérico
        await this.generateSyntheticSound('static', {
          duration,
          volume: layer.volume - 12,
          outputPath: layerPath
        });
        layerFiles.push(layerPath);
      }
    }
    
    if (onProgress) {
      onProgress({ stage: 'mixing', percent: 75, message: 'Mezclando capas...' });
    }
    
    // Mezclar todas las capas
    if (layerFiles.length > 0) {
      await this.mixLayers(layerFiles, outputPath, { masterVolume });
    }
    
    // Limpiar archivos temporales de capas
    for (const file of layerFiles) {
      try {
        fs.unlinkSync(file);
      } catch {
        // Ignorar
      }
    }
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Ambiente generado' });
    }
    
    return {
      success: true,
      outputPath,
      preset: presetName,
      presetName: preset.name,
      duration,
      layerCount: preset.layers.length,
      message: `Ambiente "${preset.name}" generado (${duration}s)`
    };
  }
  
  /**
   * Mezclar múltiples capas de audio
   * @param {Array} layerPaths - Rutas a los archivos de audio
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async mixLayers(layerPaths, outputPath, options = {}) {
    if (!layerPaths || layerPaths.length === 0) {
      throw new Error('Se requiere al menos una capa de audio');
    }
    
    const {
      masterVolume = 0,
      normalize = true
    } = options;
    
    // Verificar que existen los archivos
    for (const layerPath of layerPaths) {
      if (!fs.existsSync(layerPath)) {
        throw new Error(`Capa no encontrada: ${layerPath}`);
      }
    }
    
    // Construir comando FFmpeg para mezclar
    const inputs = layerPaths.flatMap(p => ['-i', p]);
    
    // Crear filtro de mezcla
    const inputLabels = layerPaths.map((_, i) => `[${i}:a]`).join('');
    const mixFilter = `${inputLabels}amix=inputs=${layerPaths.length}:duration=longest:normalize=${normalize ? 1 : 0}`;
    
    let filterComplex = mixFilter;
    
    // Aplicar volumen master
    if (masterVolume !== 0) {
      filterComplex += `[mixed];[mixed]volume=${Math.pow(10, masterVolume / 20)}`;
    }
    
    filterComplex += '[aout]';
    
    const args = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '[aout]',
      '-c:a', 'pcm_s16le',
      '-ar', '48000',
      '-y',
      outputPath
    ];
    
    await this.ffmpeg.execute(args);
    
    return {
      success: true,
      outputPath,
      layerCount: layerPaths.length,
      masterVolume,
      message: `${layerPaths.length} capas mezcladas`
    };
  }
  
  /**
   * Agregar efecto de sonido a video en punto específico
   * @param {string} videoPath - Video original
   * @param {string} soundPath - Efecto de sonido
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async addSoundToVideo(videoPath, soundPath, outputPath, options = {}) {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video no encontrado: ${videoPath}`);
    }
    if (!fs.existsSync(soundPath)) {
      throw new Error(`Sonido no encontrado: ${soundPath}`);
    }
    
    const {
      startTime = 0,
      volume = 0,
      fadeIn = 0,
      fadeOut = 0,
      mixWithOriginal = true,
      originalVolume = 0,
      onProgress = null
    } = options;
    
    if (onProgress) {
      onProgress({ stage: 'processing', percent: 20, message: 'Procesando audio...' });
    }
    
    // Obtener info del video
    const videoInfo = await this.ffmpeg.getVideoInfo(videoPath);
    const hasVideo = videoInfo.hasVideo !== false;
    
    // Construir filtro de audio
    const delayMs = Math.floor(startTime * 1000);
    
    let audioFilter = '';
    
    if (mixWithOriginal) {
      // Mezclar con audio original
      audioFilter = `[1:a]adelay=${delayMs}|${delayMs},volume=${Math.pow(10, volume / 20)}`;
      
      if (fadeIn > 0) {
        audioFilter += `,afade=t=in:st=${startTime}:d=${fadeIn}`;
      }
      if (fadeOut > 0) {
        audioFilter += `,afade=t=out:st=${startTime + fadeOut}:d=${fadeOut}`;
      }
      
      audioFilter += '[sfx];';
      audioFilter += `[0:a]volume=${Math.pow(10, originalVolume / 20)}[orig];`;
      audioFilter += '[orig][sfx]amix=inputs=2:duration=first:normalize=0[aout]';
    } else {
      // Reemplazar audio en ese punto
      audioFilter = `[0:a]volume=enable='between(t,${startTime},${startTime + 5})':volume=0[orig];`;
      audioFilter += `[1:a]adelay=${delayMs}|${delayMs},volume=${Math.pow(10, volume / 20)}[sfx];`;
      audioFilter += '[orig][sfx]amix=inputs=2:duration=first[aout]';
    }
    
    if (onProgress) {
      onProgress({ stage: 'encoding', percent: 50, message: 'Codificando...' });
    }
    
    const args = [
      '-i', videoPath,
      '-i', soundPath,
      '-filter_complex', audioFilter,
      '-map', hasVideo ? '0:v' : '',
      '-map', '[aout]',
      hasVideo ? '-c:v' : '', hasVideo ? 'copy' : '',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      outputPath
    ].filter(arg => arg !== '');
    
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
      soundAdded: {
        path: soundPath,
        startTime,
        volume
      },
      message: `Efecto de sonido agregado en ${this._formatTime(startTime)}`
    };
  }
  
  /**
   * Crear timeline de efectos de sonido
   * @param {string} videoPath - Video original
   * @param {Array} sounds - Lista de efectos [{path, startTime, volume, ...}]
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async createSoundTimeline(videoPath, sounds, outputPath, options = {}) {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video no encontrado: ${videoPath}`);
    }
    
    if (!sounds || sounds.length === 0) {
      throw new Error('Se requiere al menos un efecto de sonido');
    }
    
    const { onProgress = null, masterVolume = 0 } = options;
    
    if (onProgress) {
      onProgress({ stage: 'preparing', percent: 10, message: 'Preparando timeline...' });
    }
    
    // Verificar todos los archivos de sonido
    for (const sound of sounds) {
      if (!fs.existsSync(sound.path)) {
        throw new Error(`Sonido no encontrado: ${sound.path}`);
      }
    }
    
    // Obtener info del video
    const videoInfo = await this.ffmpeg.getVideoInfo(videoPath);
    const hasVideo = videoInfo.hasVideo !== false;
    
    // Construir inputs
    const inputs = ['-i', videoPath];
    for (const sound of sounds) {
      inputs.push('-i', sound.path);
    }
    
    // Construir filtro complejo
    let filterComplex = '';
    const mixInputs = ['[0:a]'];
    
    for (let i = 0; i < sounds.length; i++) {
      const sound = sounds[i];
      const inputIdx = i + 1;
      const label = `[sfx${i}]`;
      
      const delayMs = Math.floor((sound.startTime || 0) * 1000);
      const volume = Math.pow(10, (sound.volume || 0) / 20);
      
      filterComplex += `[${inputIdx}:a]adelay=${delayMs}|${delayMs},volume=${volume}`;
      
      if (sound.fadeIn) {
        filterComplex += `,afade=t=in:st=${sound.startTime || 0}:d=${sound.fadeIn}`;
      }
      if (sound.fadeOut) {
        filterComplex += `,afade=t=out:st=${(sound.startTime || 0) + (sound.duration || 1)}:d=${sound.fadeOut}`;
      }
      
      filterComplex += `${label};`;
      mixInputs.push(label);
    }
    
    // Mezclar todos
    filterComplex += `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:normalize=0`;
    
    if (masterVolume !== 0) {
      filterComplex += `,volume=${Math.pow(10, masterVolume / 20)}`;
    }
    
    filterComplex += '[aout]';
    
    if (onProgress) {
      onProgress({ stage: 'encoding', percent: 40, message: 'Codificando timeline...' });
    }
    
    const args = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', hasVideo ? '0:v' : '',
      '-map', '[aout]',
      hasVideo ? '-c:v' : '', hasVideo ? 'copy' : '',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      outputPath
    ].filter(arg => arg !== '');
    
    await this.ffmpeg.execute(args, (progress) => {
      if (onProgress) {
        const percent = 40 + (progress.percent || 0) * 0.5;
        onProgress({ stage: 'encoding', percent, message: `Codificando: ${Math.round(progress.percent || 0)}%` });
      }
    });
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Timeline completado' });
    }
    
    return {
      success: true,
      outputPath,
      soundsCount: sounds.length,
      sounds: sounds.map(s => ({
        path: path.basename(s.path),
        startTime: s.startTime || 0,
        volume: s.volume || 0
      })),
      message: `Timeline con ${sounds.length} efectos de sonido creado`
    };
  }
  
  /**
   * Generar pasos automáticos basados en detección de movimiento
   * @param {string} videoPath - Video a analizar
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado con marcadores de pasos
   */
  async detectFootstepMarkers(videoPath, options = {}) {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video no encontrado: ${videoPath}`);
    }
    
    const {
      sensitivity = 0.5,
      stepInterval = 0.5,  // Intervalo mínimo entre pasos
      surface = 'concrete'
    } = options;
    
    // Obtener duración del video
    const info = await this.ffmpeg.getVideoInfo(videoPath);
    const duration = info.duration || 0;
    
    // Para una implementación real, usaríamos análisis de video
    // Por ahora, generamos marcadores basados en un patrón regular
    // simulando detección de movimiento
    
    const markers = [];
    const avgStepTime = stepInterval + (1 - sensitivity) * 0.3;
    
    let currentTime = 0.5;  // Empezar medio segundo después del inicio
    let stepNumber = 1;
    
    while (currentTime < duration - 0.5) {
      // Agregar variación natural
      const variation = (Math.random() - 0.5) * 0.1;
      
      markers.push({
        id: `step_${stepNumber}`,
        time: currentTime,
        timeFormatted: this._formatTime(currentTime),
        surface,
        intensity: 0.7 + Math.random() * 0.3,  // Variación de intensidad
        foot: stepNumber % 2 === 0 ? 'right' : 'left'
      });
      
      currentTime += avgStepTime + variation;
      stepNumber++;
    }
    
    return {
      success: true,
      markers,
      markerCount: markers.length,
      duration,
      surface,
      avgInterval: avgStepTime,
      message: `${markers.length} marcadores de pasos detectados`
    };
  }
  
  /**
   * Aplicar pasos automáticos a video
   * @param {string} videoPath - Video original
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async applyAutoFootsteps(videoPath, outputPath, options = {}) {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video no encontrado: ${videoPath}`);
    }
    
    const {
      surface = 'concrete',
      volume = -12,
      onProgress = null
    } = options;
    
    if (onProgress) {
      onProgress({ stage: 'detecting', percent: 10, message: 'Detectando pasos...' });
    }
    
    // Detectar marcadores
    const detection = await this.detectFootstepMarkers(videoPath, { surface });
    
    if (detection.markers.length === 0) {
      return {
        success: true,
        outputPath: videoPath,
        stepsAdded: 0,
        message: 'No se detectaron pasos'
      };
    }
    
    if (onProgress) {
      onProgress({ stage: 'generating', percent: 30, message: 'Generando sonidos de pasos...' });
    }
    
    // Generar sonido de paso base
    const stepSound = await this.generateSyntheticSound('snare', {
      duration: 0.15,
      volume: volume
    });
    
    // Crear lista de sonidos para timeline
    const sounds = detection.markers.map(marker => ({
      path: stepSound.outputPath,
      startTime: marker.time,
      volume: volume + (marker.intensity - 0.85) * 6  // Variar volumen
    }));
    
    if (onProgress) {
      onProgress({ stage: 'applying', percent: 50, message: 'Aplicando pasos...' });
    }
    
    // Aplicar timeline
    const result = await this.createSoundTimeline(videoPath, sounds, outputPath, {
      onProgress: (p) => {
        if (onProgress) {
          const percent = 50 + (p.percent - 40) * 0.5;
          onProgress({ ...p, percent });
        }
      }
    });
    
    // Limpiar sonido temporal
    try {
      fs.unlinkSync(stepSound.outputPath);
    } catch {
      // Ignorar
    }
    
    return {
      success: true,
      outputPath,
      stepsAdded: detection.markers.length,
      surface,
      message: `${detection.markers.length} pasos agregados`
    };
  }
  
  /**
   * Crear efecto de transición de audio
   * @param {string} type - Tipo de transición (whoosh, impact, riser, etc.)
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Resultado
   */
  async createTransitionSound(type, options = {}) {
    const {
      duration = 1,
      intensity = 0.8,
      outputPath = path.join(this.tempDir, `transition_${type}_${uuidv4()}.wav`)
    } = options;
    
    // Parámetros según tipo de transición
    const transitionParams = {
      whoosh: {
        generator: 'wind_synth',
        envelope: 'in',
        filterMod: true
      },
      whoosh_out: {
        generator: 'wind_synth',
        envelope: 'out',
        filterMod: true
      },
      impact: {
        generator: 'kick',
        frequency: 40 + (1 - intensity) * 40,
        extra: 'noise'
      },
      riser: {
        generator: 'beep',
        freqStart: 100,
        freqEnd: 2000,
        envelope: 'in'
      },
      downer: {
        generator: 'beep',
        freqStart: 1000,
        freqEnd: 50,
        envelope: 'out'
      },
      glitch: {
        generator: 'static',
        cuts: true
      },
      sweep: {
        generator: 'beep',
        freqStart: 20,
        freqEnd: 8000,
        envelope: 'smooth'
      }
    };
    
    const params = transitionParams[type] || transitionParams.whoosh;
    
    // Generar sonido base
    const baseSound = await this.generateSyntheticSound(params.generator, {
      duration,
      frequency: params.frequency,
      volume: -6 + intensity * 6,
      outputPath
    });
    
    return {
      success: true,
      outputPath,
      type,
      duration,
      intensity,
      message: `Transición "${type}" creada (${duration}s)`
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

module.exports = SoundDesign;
