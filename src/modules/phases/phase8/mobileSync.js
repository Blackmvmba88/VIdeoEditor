/**
 * @file MobileSync - Sincronización con dispositivos móviles
 * @description Companion app para edición en iOS/Android con sincronización en tiempo real
 * @module phases/phase8/MobileSync
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

/**
 * Clase para sincronización móvil
 */
class MobileSync extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      syncInterval: options.syncInterval || 5000,
      maxDevices: options.maxDevices || 5,
      compressionLevel: options.compressionLevel || 'medium',
      autoSync: options.autoSync !== false,
      offlineMode: options.offlineMode || true,
      ...options
    };
    
    // Estado
    this.devices = new Map();
    this.syncQueue = [];
    this.pendingChanges = new Map();
    this.sessions = new Map();
    this.isInitialized = false;
    this.syncTimer = null;
  }
  
  /**
   * Inicializar servicio de sincronización
   */
  async initialize() {
    if (this.isInitialized) {
      return { success: true, message: 'Already initialized' };
    }
    
    // Iniciar timer de sincronización
    if (this.config.autoSync) {
      this.syncTimer = setInterval(() => {
        this._processQueue();
      }, this.config.syncInterval);
    }
    
    this.isInitialized = true;
    this.emit('initialized');
    
    return {
      success: true,
      config: this.config
    };
  }
  
  /**
   * Registrar dispositivo móvil
   * @param {Object} deviceInfo - Información del dispositivo
   * @returns {Object} Resultado del registro
   */
  async registerDevice(deviceInfo) {
    if (!deviceInfo || !deviceInfo.platform) {
      throw new Error('Device info with platform is required');
    }
    
    if (this.devices.size >= this.config.maxDevices) {
      throw new Error(`Maximum devices (${this.config.maxDevices}) reached`);
    }
    
    const deviceId = uuidv4();
    const device = {
      id: deviceId,
      name: deviceInfo.name || `Mobile ${this.devices.size + 1}`,
      platform: deviceInfo.platform, // 'ios' | 'android'
      osVersion: deviceInfo.osVersion || 'unknown',
      appVersion: deviceInfo.appVersion || '1.0.0',
      capabilities: deviceInfo.capabilities || ['preview', 'timeline', 'trim'],
      lastSeen: new Date().toISOString(),
      status: 'online',
      syncState: 'idle',
      registeredAt: new Date().toISOString()
    };
    
    this.devices.set(deviceId, device);
    this.emit('deviceRegistered', device);
    
    return {
      success: true,
      deviceId,
      device,
      pairingCode: this._generatePairingCode()
    };
  }
  
  /**
   * Generar código de emparejamiento
   * @private
   */
  _generatePairingCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  /**
   * Emparejar dispositivo con código
   * @param {string} code - Código de emparejamiento
   * @param {string} deviceId - ID del dispositivo
   */
  async pairWithCode(code, deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    // Simular validación del código
    device.paired = true;
    device.pairedAt = new Date().toISOString();
    
    this.emit('devicePaired', device);
    
    return {
      success: true,
      deviceId,
      paired: true
    };
  }
  
  /**
   * Crear sesión de edición móvil
   * @param {string} deviceId - ID del dispositivo
   * @param {string} projectId - ID del proyecto
   */
  async createEditSession(deviceId, projectId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      deviceId,
      projectId,
      startedAt: new Date().toISOString(),
      status: 'active',
      changes: [],
      syncedAt: null
    };
    
    this.sessions.set(sessionId, session);
    device.activeSession = sessionId;
    
    this.emit('sessionCreated', session);
    
    return {
      success: true,
      sessionId,
      session
    };
  }
  
  /**
   * Enviar cambios desde móvil
   * @param {string} sessionId - ID de la sesión
   * @param {Object} changes - Cambios a sincronizar
   */
  async pushChanges(sessionId, changes) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const changeRecord = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: changes.type || 'edit',
      data: changes.data || changes,
      status: 'pending'
    };
    
    session.changes.push(changeRecord);
    this.syncQueue.push({
      sessionId,
      changeId: changeRecord.id,
      priority: changes.priority || 'normal'
    });
    
    this.emit('changesPushed', { sessionId, change: changeRecord });
    
    return {
      success: true,
      changeId: changeRecord.id,
      queuePosition: this.syncQueue.length
    };
  }
  
  /**
   * Obtener cambios pendientes para dispositivo
   * @param {string} deviceId - ID del dispositivo
   */
  async pullChanges(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    const pending = this.pendingChanges.get(deviceId) || [];
    
    // Marcar como entregados
    this.pendingChanges.set(deviceId, []);
    
    device.lastSeen = new Date().toISOString();
    
    return {
      success: true,
      changes: pending,
      count: pending.length
    };
  }
  
  /**
   * Procesar cola de sincronización
   * @private
   */
  async _processQueue() {
    if (this.syncQueue.length === 0) return;
    
    // Ordenar por prioridad
    this.syncQueue.sort((a, b) => {
      const priorities = { high: 0, normal: 1, low: 2 };
      return priorities[a.priority] - priorities[b.priority];
    });
    
    // Procesar hasta 10 cambios
    const batch = this.syncQueue.splice(0, 10);
    
    for (const item of batch) {
      const session = this.sessions.get(item.sessionId);
      if (session) {
        const change = session.changes.find(c => c.id === item.changeId);
        if (change) {
          change.status = 'synced';
          change.syncedAt = new Date().toISOString();
        }
      }
    }
    
    this.emit('queueProcessed', { processed: batch.length });
  }
  
  /**
   * Sincronizar proyecto completo
   * @param {string} deviceId - ID del dispositivo
   * @param {Object} projectData - Datos del proyecto
   */
  async syncProject(deviceId, projectData) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    device.syncState = 'syncing';
    
    // Simular compresión y transferencia
    const compressed = this._compressData(projectData);
    
    device.syncState = 'idle';
    device.lastSync = new Date().toISOString();
    
    this.emit('projectSynced', { deviceId, projectId: projectData.id });
    
    return {
      success: true,
      deviceId,
      projectId: projectData.id,
      compressedSize: compressed.size,
      originalSize: JSON.stringify(projectData).length
    };
  }
  
  /**
   * Comprimir datos para transferencia
   * @private
   */
  _compressData(data) {
    const original = JSON.stringify(data);
    const ratios = { low: 0.8, medium: 0.5, high: 0.3 };
    const ratio = ratios[this.config.compressionLevel] || 0.5;
    
    return {
      data: original,
      size: Math.floor(original.length * ratio),
      compressionRatio: ratio
    };
  }
  
  /**
   * Enviar preview a dispositivo móvil
   * @param {string} deviceId - ID del dispositivo
   * @param {Object} previewData - Datos del preview
   */
  async sendPreview(deviceId, previewData) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    if (!device.capabilities.includes('preview')) {
      throw new Error('Device does not support preview');
    }
    
    const preview = {
      id: uuidv4(),
      deviceId,
      type: previewData.type || 'frame',
      quality: previewData.quality || 'medium',
      timestamp: previewData.timestamp || 0,
      createdAt: new Date().toISOString()
    };
    
    this.emit('previewSent', preview);
    
    return {
      success: true,
      previewId: preview.id,
      sentTo: deviceId
    };
  }
  
  /**
   * Modo offline - guardar cambios localmente
   * @param {string} deviceId - ID del dispositivo
   * @param {Object} changes - Cambios offline
   */
  async storeOfflineChanges(deviceId, changes) {
    if (!this.config.offlineMode) {
      throw new Error('Offline mode is disabled');
    }
    
    const offlineId = uuidv4();
    const offlineData = {
      id: offlineId,
      deviceId,
      changes,
      storedAt: new Date().toISOString(),
      synced: false
    };
    
    // Almacenar para sincronización posterior
    if (!this.pendingChanges.has(deviceId)) {
      this.pendingChanges.set(deviceId, []);
    }
    this.pendingChanges.get(deviceId).push(offlineData);
    
    return {
      success: true,
      offlineId,
      pendingCount: this.pendingChanges.get(deviceId).length
    };
  }
  
  /**
   * Obtener estado de dispositivo
   * @param {string} deviceId - ID del dispositivo
   */
  getDeviceStatus(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      return null;
    }
    
    return {
      ...device,
      isOnline: device.status === 'online',
      pendingChanges: (this.pendingChanges.get(deviceId) || []).length,
      activeSession: device.activeSession ? this.sessions.get(device.activeSession) : null
    };
  }
  
  /**
   * Listar dispositivos conectados
   */
  listDevices() {
    return {
      devices: Array.from(this.devices.values()),
      count: this.devices.size,
      maxDevices: this.config.maxDevices
    };
  }
  
  /**
   * Desconectar dispositivo
   * @param {string} deviceId - ID del dispositivo
   */
  async disconnectDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    // Cerrar sesión activa
    if (device.activeSession) {
      const session = this.sessions.get(device.activeSession);
      if (session) {
        session.status = 'closed';
        session.closedAt = new Date().toISOString();
      }
    }
    
    device.status = 'offline';
    device.disconnectedAt = new Date().toISOString();
    
    this.emit('deviceDisconnected', device);
    
    return {
      success: true,
      deviceId,
      status: 'offline'
    };
  }
  
  /**
   * Eliminar dispositivo
   * @param {string} deviceId - ID del dispositivo
   */
  async removeDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    // Cerrar sesiones
    for (const [sessionId, session] of this.sessions) {
      if (session.deviceId === deviceId) {
        this.sessions.delete(sessionId);
      }
    }
    
    // Limpiar cambios pendientes
    this.pendingChanges.delete(deviceId);
    
    // Eliminar dispositivo
    this.devices.delete(deviceId);
    
    this.emit('deviceRemoved', { deviceId });
    
    return {
      success: true,
      deviceId,
      removed: true
    };
  }
  
  /**
   * Obtener estadísticas de sincronización
   */
  getStats() {
    const devices = Array.from(this.devices.values());
    const sessions = Array.from(this.sessions.values());
    
    return {
      devices: {
        total: devices.length,
        online: devices.filter(d => d.status === 'online').length,
        offline: devices.filter(d => d.status === 'offline').length,
        byPlatform: {
          ios: devices.filter(d => d.platform === 'ios').length,
          android: devices.filter(d => d.platform === 'android').length
        }
      },
      sessions: {
        total: sessions.length,
        active: sessions.filter(s => s.status === 'active').length,
        totalChanges: sessions.reduce((sum, s) => sum + s.changes.length, 0)
      },
      syncQueue: {
        pending: this.syncQueue.length,
        totalPendingChanges: Array.from(this.pendingChanges.values())
          .reduce((sum, changes) => sum + changes.length, 0)
      }
    };
  }
  
  /**
   * Limpiar recursos
   */
  cleanup() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    this.devices.clear();
    this.sessions.clear();
    this.syncQueue = [];
    this.pendingChanges.clear();
    this.isInitialized = false;
    
    this.emit('cleanup');
  }
}

module.exports = MobileSync;
