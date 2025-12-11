/**
 * @module LiveBroadcast
 * @description Sistema de transmisión en vivo para BlackMamba Studio
 * Multi-cam streaming, RTMP output, grabación simultánea
 * @version 7.1.0
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const os = require('os');

class LiveBroadcast {
  constructor(options = {}) {
    this.options = {
      maxSources: options.maxSources || 8,
      maxOutputs: options.maxOutputs || 4,
      defaultResolution: options.defaultResolution || '1920x1080',
      defaultFrameRate: options.defaultFrameRate || 30,
      defaultBitrate: options.defaultBitrate || '6000k',
      audioSampleRate: options.audioSampleRate || 48000,
      recordingsPath: options.recordingsPath || path.join(os.tmpdir(), 'blackmamba-recordings'),
      ...options
    };
    
    // Estado de broadcast
    this.sessions = new Map();
    this.sources = new Map();
    this.outputs = new Map();
    this.scenes = new Map();
    
    // Presets de streaming
    this.streamingPresets = {
      youtube: {
        name: 'YouTube Live',
        rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
        resolution: '1920x1080',
        bitrate: '6000k',
        keyframe: 2,
        profile: 'high',
        audioCodec: 'aac',
        audioBitrate: '128k'
      },
      twitch: {
        name: 'Twitch',
        rtmpUrl: 'rtmp://live.twitch.tv/app',
        resolution: '1920x1080',
        bitrate: '6000k',
        keyframe: 2,
        profile: 'main',
        audioCodec: 'aac',
        audioBitrate: '160k'
      },
      facebook: {
        name: 'Facebook Live',
        rtmpUrl: 'rtmps://live-api-s.facebook.com:443/rtmp',
        resolution: '1920x1080',
        bitrate: '4000k',
        keyframe: 2,
        profile: 'high',
        audioCodec: 'aac',
        audioBitrate: '128k'
      },
      instagram: {
        name: 'Instagram Live',
        rtmpUrl: 'rtmps://live-upload.instagram.com:443/rtmp',
        resolution: '1080x1920', // Vertical
        bitrate: '3500k',
        keyframe: 2,
        profile: 'main',
        audioCodec: 'aac',
        audioBitrate: '128k'
      },
      custom: {
        name: 'Custom RTMP',
        rtmpUrl: '',
        resolution: '1920x1080',
        bitrate: '6000k',
        keyframe: 2,
        profile: 'high',
        audioCodec: 'aac',
        audioBitrate: '128k'
      }
    };
    
    // Tipos de fuentes
    this.sourceTypes = ['camera', 'screen', 'window', 'video', 'image', 'browser', 'ndi'];
    
    // Estadísticas en tiempo real
    this.liveStats = new Map();
  }
  
  /**
   * Crear sesión de broadcast
   * @param {Object} config - Configuración
   * @returns {Object} Sesión creada
   */
  async createSession(config = {}) {
    const {
      name = 'Nueva Sesión',
      resolution = this.options.defaultResolution,
      frameRate = this.options.defaultFrameRate,
      bitrate = this.options.defaultBitrate
    } = config;
    
    const sessionId = uuidv4();
    
    const session = {
      id: sessionId,
      name,
      status: 'created', // created, preview, live, paused, ended
      
      // Configuración de video
      videoConfig: {
        resolution,
        frameRate,
        bitrate,
        codec: 'h264',
        profile: 'high'
      },
      
      // Configuración de audio
      audioConfig: {
        sampleRate: this.options.audioSampleRate,
        channels: 2,
        bitrate: '192k',
        codec: 'aac'
      },
      
      // Fuentes
      sources: [],
      activeSource: null,
      
      // Escenas
      scenes: [],
      activeScene: null,
      
      // Outputs (streaming + recording)
      outputs: [],
      
      // Estadísticas
      stats: {
        viewers: 0,
        peakViewers: 0,
        duration: 0,
        droppedFrames: 0,
        bitrate: 0
      },
      
      // Timestamps
      createdAt: new Date().toISOString(),
      startedAt: null,
      endedAt: null
    };
    
    this.sessions.set(sessionId, session);
    
    return {
      success: true,
      sessionId,
      session: this._sanitizeSession(session),
      message: 'Sesión de broadcast creada'
    };
  }
  
  /**
   * Agregar fuente de video
   * @param {string} sessionId - ID de sesión
   * @param {Object} sourceConfig - Configuración de fuente
   * @returns {Object} Fuente agregada
   */
  async addSource(sessionId, sourceConfig) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    if (session.sources.length >= this.options.maxSources) {
      return { success: false, error: 'Límite de fuentes alcanzado' };
    }
    
    const {
      type, // camera, screen, window, video, image, browser, ndi
      name,
      url = null,
      deviceId = null,
      settings = {}
    } = sourceConfig;
    
    if (!this.sourceTypes.includes(type)) {
      return { success: false, error: `Tipo de fuente inválido: ${type}` };
    }
    
    const sourceId = uuidv4();
    
    const source = {
      id: sourceId,
      sessionId,
      type,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${session.sources.length + 1}`,
      url,
      deviceId,
      
      // Transformación
      transform: {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        rotation: 0,
        scale: 1,
        opacity: 1,
        visible: true
      },
      
      // Filtros
      filters: [],
      
      // Configuración específica
      settings: {
        audioEnabled: true,
        volume: 1,
        muted: false,
        ...settings
      },
      
      // Estado
      status: 'inactive', // inactive, active, error
      
      addedAt: new Date().toISOString()
    };
    
    session.sources.push(source);
    this.sources.set(sourceId, source);
    
    // Si es la primera fuente, activarla
    if (session.sources.length === 1) {
      session.activeSource = sourceId;
      source.status = 'active';
    }
    
    return {
      success: true,
      sourceId,
      source,
      message: `Fuente "${source.name}" agregada`
    };
  }
  
  /**
   * Cambiar fuente activa (switch)
   * @param {string} sessionId - ID de sesión
   * @param {string} sourceId - ID de fuente
   * @param {Object} transition - Transición
   * @returns {Object} Resultado
   */
  async switchSource(sessionId, sourceId, transition = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    const source = this.sources.get(sourceId);
    if (!source || source.sessionId !== sessionId) {
      return { success: false, error: 'Fuente no encontrada en esta sesión' };
    }
    
    const {
      type = 'cut', // cut, fade, slide, wipe
      duration = 500 // ms
    } = transition;
    
    const previousSource = session.activeSource;
    
    // Desactivar fuente anterior
    if (previousSource) {
      const prevSource = this.sources.get(previousSource);
      if (prevSource) {
        prevSource.status = 'inactive';
      }
    }
    
    // Activar nueva fuente
    source.status = 'active';
    session.activeSource = sourceId;
    
    return {
      success: true,
      previousSource,
      currentSource: sourceId,
      transition: { type, duration },
      message: `Cambiado a "${source.name}"`
    };
  }
  
  /**
   * Crear escena
   * @param {string} sessionId - ID de sesión
   * @param {Object} sceneConfig - Configuración de escena
   * @returns {Object} Escena creada
   */
  async createScene(sessionId, sceneConfig) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    const {
      name,
      sources = [],
      layout = 'single'
    } = sceneConfig;
    
    const sceneId = uuidv4();
    
    const scene = {
      id: sceneId,
      sessionId,
      name: name || `Escena ${session.scenes.length + 1}`,
      sources, // Array de sourceIds con posiciones
      layout, // single, pip, split, grid
      
      // Configuración de layout
      layoutConfig: this._getLayoutConfig(layout),
      
      // Elementos adicionales (overlays, texto, etc.)
      elements: [],
      
      createdAt: new Date().toISOString()
    };
    
    session.scenes.push(scene);
    this.scenes.set(sceneId, scene);
    
    // Si es la primera escena, activarla
    if (session.scenes.length === 1) {
      session.activeScene = sceneId;
    }
    
    return {
      success: true,
      sceneId,
      scene,
      message: `Escena "${scene.name}" creada`
    };
  }
  
  /**
   * Cambiar escena activa
   * @param {string} sessionId - ID de sesión
   * @param {string} sceneId - ID de escena
   * @param {Object} transition - Transición
   * @returns {Object} Resultado
   */
  async switchScene(sessionId, sceneId, transition = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    const scene = this.scenes.get(sceneId);
    if (!scene || scene.sessionId !== sessionId) {
      return { success: false, error: 'Escena no encontrada' };
    }
    
    const previousScene = session.activeScene;
    session.activeScene = sceneId;
    
    return {
      success: true,
      previousScene,
      currentScene: sceneId,
      sceneName: scene.name,
      message: `Cambiado a escena "${scene.name}"`
    };
  }
  
  /**
   * Agregar output de streaming
   * @param {string} sessionId - ID de sesión
   * @param {Object} outputConfig - Configuración de output
   * @returns {Object} Output agregado
   */
  async addOutput(sessionId, outputConfig) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    if (session.outputs.length >= this.options.maxOutputs) {
      return { success: false, error: 'Límite de outputs alcanzado' };
    }
    
    const {
      type = 'rtmp', // rtmp, rtmps, recording
      platform = 'custom',
      streamKey = '',
      customUrl = null,
      recordingPath = null
    } = outputConfig;
    
    const preset = this.streamingPresets[platform] || this.streamingPresets.custom;
    const outputId = uuidv4();
    
    let url;
    if (type === 'recording') {
      url = recordingPath || path.join(
        this.options.recordingsPath,
        `recording_${sessionId}_${Date.now()}.mp4`
      );
    } else {
      url = customUrl || `${preset.rtmpUrl}/${streamKey}`;
    }
    
    const output = {
      id: outputId,
      sessionId,
      type,
      platform,
      name: type === 'recording' ? 'Grabación Local' : preset.name,
      url,
      streamKey: type !== 'recording' ? streamKey : null,
      
      // Configuración
      config: {
        resolution: preset.resolution,
        bitrate: preset.bitrate,
        keyframe: preset.keyframe,
        profile: preset.profile,
        audioCodec: preset.audioCodec,
        audioBitrate: preset.audioBitrate
      },
      
      // Estado
      status: 'ready', // ready, connecting, streaming, error, stopped
      error: null,
      
      // Estadísticas
      stats: {
        bytesSent: 0,
        duration: 0,
        droppedFrames: 0,
        currentBitrate: 0
      },
      
      addedAt: new Date().toISOString(),
      startedAt: null
    };
    
    session.outputs.push(output);
    this.outputs.set(outputId, output);
    
    return {
      success: true,
      outputId,
      output: this._sanitizeOutput(output),
      message: `Output "${output.name}" agregado`
    };
  }
  
  /**
   * Iniciar streaming
   * @param {string} sessionId - ID de sesión
   * @param {Object} options - Opciones
   * @returns {Object} Resultado
   */
  async startStreaming(sessionId, options = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    if (session.status === 'live') {
      return { success: false, error: 'Ya está transmitiendo' };
    }
    
    if (session.outputs.length === 0) {
      return { success: false, error: 'No hay outputs configurados' };
    }
    
    const { outputIds = null } = options;
    
    // Determinar qué outputs iniciar
    const outputsToStart = outputIds 
      ? session.outputs.filter(o => outputIds.includes(o.id))
      : session.outputs;
    
    const results = [];
    
    for (const output of outputsToStart) {
      output.status = 'connecting';
      
      // Simular conexión
      await this._delay(500);
      
      output.status = 'streaming';
      output.startedAt = new Date().toISOString();
      
      results.push({
        outputId: output.id,
        name: output.name,
        status: 'streaming'
      });
    }
    
    session.status = 'live';
    session.startedAt = new Date().toISOString();
    
    // Iniciar estadísticas en tiempo real
    this._startLiveStats(sessionId);
    
    return {
      success: true,
      sessionId,
      status: 'live',
      outputs: results,
      startedAt: session.startedAt,
      message: 'Transmisión iniciada'
    };
  }
  
  /**
   * Detener streaming
   * @param {string} sessionId - ID de sesión
   * @param {Object} options - Opciones
   * @returns {Object} Resultado
   */
  async stopStreaming(sessionId, options = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    if (session.status !== 'live' && session.status !== 'paused') {
      return { success: false, error: 'No está transmitiendo' };
    }
    
    const { outputIds = null } = options;
    
    // Determinar qué outputs detener
    const outputsToStop = outputIds
      ? session.outputs.filter(o => outputIds.includes(o.id) && o.status === 'streaming')
      : session.outputs.filter(o => o.status === 'streaming');
    
    const results = [];
    
    for (const output of outputsToStop) {
      output.status = 'stopped';
      
      // Calcular duración
      if (output.startedAt) {
        output.stats.duration = Math.round(
          (Date.now() - new Date(output.startedAt).getTime()) / 1000
        );
      }
      
      results.push({
        outputId: output.id,
        name: output.name,
        duration: output.stats.duration,
        bytesSent: output.stats.bytesSent
      });
    }
    
    // Si todos los outputs están detenidos, terminar sesión
    const allStopped = session.outputs.every(o => 
      o.status === 'stopped' || o.status === 'ready'
    );
    
    if (allStopped) {
      session.status = 'ended';
      session.endedAt = new Date().toISOString();
      
      // Calcular duración total
      if (session.startedAt) {
        session.stats.duration = Math.round(
          (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
        );
      }
      
      // Detener estadísticas
      this._stopLiveStats(sessionId);
    }
    
    return {
      success: true,
      sessionId,
      status: session.status,
      outputs: results,
      totalDuration: session.stats.duration,
      message: 'Transmisión detenida'
    };
  }
  
  /**
   * Pausar/Reanudar streaming
   * @param {string} sessionId - ID de sesión
   * @returns {Object} Resultado
   */
  async togglePause(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    if (session.status === 'live') {
      session.status = 'paused';
      return { success: true, status: 'paused', message: 'Transmisión pausada' };
    } else if (session.status === 'paused') {
      session.status = 'live';
      return { success: true, status: 'live', message: 'Transmisión reanudada' };
    }
    
    return { success: false, error: 'Operación no válida en estado actual' };
  }
  
  /**
   * Obtener estadísticas en vivo
   * @param {string} sessionId - ID de sesión
   * @returns {Object} Estadísticas
   */
  getLiveStats(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    const stats = this.liveStats.get(sessionId) || session.stats;
    
    return {
      success: true,
      sessionId,
      status: session.status,
      stats,
      outputs: session.outputs.map(o => ({
        id: o.id,
        name: o.name,
        status: o.status,
        stats: o.stats
      }))
    };
  }
  
  /**
   * Obtener presets de streaming
   * @returns {Object} Presets
   */
  getStreamingPresets() {
    return {
      success: true,
      presets: Object.entries(this.streamingPresets).map(([key, preset]) => ({
        id: key,
        ...preset
      }))
    };
  }
  
  /**
   * Listar sesiones
   * @param {Object} options - Opciones
   * @returns {Object} Lista de sesiones
   */
  listSessions(options = {}) {
    const { status = null, limit = 50 } = options;
    
    let sessions = [...this.sessions.values()];
    
    if (status) {
      sessions = sessions.filter(s => s.status === status);
    }
    
    sessions = sessions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
    
    return {
      success: true,
      sessions: sessions.map(s => this._sanitizeSession(s)),
      total: sessions.length
    };
  }
  
  /**
   * Obtener sesión
   * @param {string} sessionId - ID de sesión
   * @returns {Object} Sesión
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    return {
      success: true,
      session: this._sanitizeSession(session),
      sources: session.sources,
      scenes: session.scenes,
      outputs: session.outputs.map(o => this._sanitizeOutput(o))
    };
  }
  
  /**
   * Eliminar sesión
   * @param {string} sessionId - ID de sesión
   * @returns {Object} Resultado
   */
  async deleteSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    if (session.status === 'live') {
      return { success: false, error: 'No se puede eliminar una sesión activa' };
    }
    
    // Limpiar fuentes
    for (const source of session.sources) {
      this.sources.delete(source.id);
    }
    
    // Limpiar escenas
    for (const scene of session.scenes) {
      this.scenes.delete(scene.id);
    }
    
    // Limpiar outputs
    for (const output of session.outputs) {
      this.outputs.delete(output.id);
    }
    
    this.sessions.delete(sessionId);
    this.liveStats.delete(sessionId);
    
    return {
      success: true,
      sessionId,
      message: 'Sesión eliminada'
    };
  }
  
  // Métodos privados
  
  _getLayoutConfig(layout) {
    const configs = {
      single: {
        slots: 1,
        positions: [{ x: 0, y: 0, width: '100%', height: '100%' }]
      },
      pip: {
        slots: 2,
        positions: [
          { x: 0, y: 0, width: '100%', height: '100%' },
          { x: '70%', y: '70%', width: '25%', height: '25%' }
        ]
      },
      split: {
        slots: 2,
        positions: [
          { x: 0, y: 0, width: '50%', height: '100%' },
          { x: '50%', y: 0, width: '50%', height: '100%' }
        ]
      },
      grid: {
        slots: 4,
        positions: [
          { x: 0, y: 0, width: '50%', height: '50%' },
          { x: '50%', y: 0, width: '50%', height: '50%' },
          { x: 0, y: '50%', width: '50%', height: '50%' },
          { x: '50%', y: '50%', width: '50%', height: '50%' }
        ]
      }
    };
    
    return configs[layout] || configs.single;
  }
  
  _startLiveStats(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    // Simular estadísticas en tiempo real
    this.liveStats.set(sessionId, {
      viewers: Math.floor(Math.random() * 100),
      peakViewers: 0,
      bitrate: parseInt(this.options.defaultBitrate),
      droppedFrames: 0,
      fps: this.options.defaultFrameRate,
      uptime: 0
    });
  }
  
  _stopLiveStats(sessionId) {
    this.liveStats.delete(sessionId);
  }
  
  _sanitizeSession(session) {
    return {
      id: session.id,
      name: session.name,
      status: session.status,
      videoConfig: session.videoConfig,
      sourcesCount: session.sources.length,
      scenesCount: session.scenes.length,
      outputsCount: session.outputs.length,
      stats: session.stats,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      endedAt: session.endedAt
    };
  }
  
  _sanitizeOutput(output) {
    return {
      id: output.id,
      type: output.type,
      platform: output.platform,
      name: output.name,
      status: output.status,
      config: output.config,
      stats: output.stats
    };
  }
  
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Limpiar recursos
   */
  cleanup() {
    // Detener todas las sesiones activas
    for (const [sessionId, session] of this.sessions) {
      if (session.status === 'live') {
        this.stopStreaming(sessionId);
      }
    }
    
    this.sessions.clear();
    this.sources.clear();
    this.outputs.clear();
    this.scenes.clear();
    this.liveStats.clear();
  }
}

module.exports = LiveBroadcast;
