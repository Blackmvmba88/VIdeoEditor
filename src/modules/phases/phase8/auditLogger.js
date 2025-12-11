/**
 * @file AuditLogger - Sistema de auditoría y compliance
 * @description Logging de acciones, compliance, retención de datos
 * @module phases/phase8/AuditLogger
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * Clase para auditoría y compliance
 */
class AuditLogger extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      retentionDays: options.retentionDays || 365,
      maxEntries: options.maxEntries || 1000000,
      hashAlgorithm: options.hashAlgorithm || 'sha256',
      complianceMode: options.complianceMode || 'standard', // 'standard' | 'hipaa' | 'gdpr' | 'sox'
      realTimeAlerts: options.realTimeAlerts !== false,
      encryptPII: options.encryptPII !== false,
      ...options
    };
    
    // Estado
    this.entries = [];
    this.alerts = [];
    this.policies = new Map();
    this.subscribers = new Map();
    this.chainHash = null; // Para integridad de la cadena
  }
  
  /**
   * Registrar evento de auditoría
   * @param {Object} event - Evento a registrar
   */
  async log(event) {
    if (!event || !event.action) {
      throw new Error('Event action is required');
    }
    
    const entry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      action: event.action,
      category: event.category || this._categorizeAction(event.action),
      actor: this._sanitizeActor(event.actor),
      resource: event.resource || null,
      resourceType: event.resourceType || null,
      details: this._sanitizeDetails(event.details),
      outcome: event.outcome || 'success',
      severity: event.severity || 'info',
      ip: event.ip || null,
      userAgent: event.userAgent || null,
      sessionId: event.sessionId || null,
      previousHash: this.chainHash,
      hash: null
    };
    
    // Calcular hash para integridad
    entry.hash = this._calculateHash(entry);
    this.chainHash = entry.hash;
    
    this.entries.push(entry);
    
    // Verificar políticas de alerta
    await this._checkAlertPolicies(entry);
    
    // Aplicar retención
    this._enforceRetention();
    
    this.emit('logged', entry);
    
    return {
      success: true,
      entryId: entry.id,
      hash: entry.hash
    };
  }
  
  /**
   * Categorizar acción automáticamente
   * @private
   */
  _categorizeAction(action) {
    const categories = {
      login: 'authentication',
      logout: 'authentication',
      mfa: 'authentication',
      password: 'authentication',
      create: 'data_modification',
      update: 'data_modification',
      delete: 'data_modification',
      read: 'data_access',
      view: 'data_access',
      export: 'data_export',
      download: 'data_export',
      share: 'data_sharing',
      permission: 'access_control',
      role: 'access_control',
      config: 'system',
      settings: 'system'
    };
    
    for (const [keyword, category] of Object.entries(categories)) {
      if (action.toLowerCase().includes(keyword)) {
        return category;
      }
    }
    
    return 'general';
  }
  
  /**
   * Sanitizar información del actor
   * @private
   */
  _sanitizeActor(actor) {
    if (!actor) return { type: 'system' };
    
    const sanitized = {
      type: actor.type || 'user',
      id: actor.id || null,
      name: actor.name || null
    };
    
    // Encriptar PII si está configurado
    if (this.config.encryptPII && actor.email) {
      sanitized.emailHash = this._hashPII(actor.email);
    }
    
    return sanitized;
  }
  
  /**
   * Sanitizar detalles del evento
   * @private
   */
  _sanitizeDetails(details) {
    if (!details) return {};
    
    const sanitized = { ...details };
    
    // Campos sensibles a ocultar
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential', 'ssn', 'creditCard'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  /**
   * Hash de PII
   * @private
   */
  _hashPII(value) {
    return crypto
      .createHash(this.config.hashAlgorithm)
      .update(value.toLowerCase())
      .digest('hex');
  }
  
  /**
   * Calcular hash de entrada
   * @private
   */
  _calculateHash(entry) {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      action: entry.action,
      actor: entry.actor,
      previousHash: entry.previousHash
    });
    
    return crypto
      .createHash(this.config.hashAlgorithm)
      .update(data)
      .digest('hex');
  }
  
  /**
   * Crear política de alerta
   * @param {Object} policy - Definición de la política
   */
  async createAlertPolicy(policy) {
    if (!policy || !policy.name || !policy.condition) {
      throw new Error('Policy name and condition are required');
    }
    
    const policyId = uuidv4();
    const alertPolicy = {
      id: policyId,
      name: policy.name,
      description: policy.description || '',
      condition: policy.condition, // { action: 'login_failed', threshold: 5, window: 300 }
      severity: policy.severity || 'warning',
      actions: policy.actions || ['notify'], // ['notify', 'block', 'escalate']
      enabled: policy.enabled !== false,
      createdAt: new Date().toISOString()
    };
    
    this.policies.set(policyId, alertPolicy);
    
    return {
      success: true,
      policyId,
      policy: alertPolicy
    };
  }
  
  /**
   * Verificar políticas de alerta
   * @private
   */
  async _checkAlertPolicies(entry) {
    if (!this.config.realTimeAlerts) return;
    
    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;
      
      if (this._matchesCondition(entry, policy.condition)) {
        await this._triggerAlert(entry, policy);
      }
    }
  }
  
  /**
   * Verificar si entrada coincide con condición
   * @private
   */
  _matchesCondition(entry, condition) {
    // Verificar acción
    if (condition.action && entry.action !== condition.action) {
      return false;
    }
    
    // Verificar categoría
    if (condition.category && entry.category !== condition.category) {
      return false;
    }
    
    // Verificar severidad
    if (condition.severity && entry.severity !== condition.severity) {
      return false;
    }
    
    // Verificar umbral (rate limiting)
    if (condition.threshold && condition.window) {
      const windowStart = Date.now() - (condition.window * 1000);
      const recentEntries = this.entries.filter(e => 
        e.action === entry.action &&
        e.actor?.id === entry.actor?.id &&
        new Date(e.timestamp).getTime() >= windowStart
      );
      
      if (recentEntries.length < condition.threshold) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Disparar alerta
   * @private
   */
  async _triggerAlert(entry, policy) {
    const alert = {
      id: uuidv4(),
      policyId: policy.id,
      policyName: policy.name,
      entryId: entry.id,
      severity: policy.severity,
      message: `Alert: ${policy.name} triggered by ${entry.action}`,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    
    this.alerts.push(alert);
    
    // Notificar subscribers
    for (const [subscriberId, callback] of this.subscribers) {
      try {
        await callback(alert);
      } catch (error) {
        console.error(`Alert notification failed for ${subscriberId}:`, error);
      }
    }
    
    this.emit('alert', alert);
    
    return alert;
  }
  
  /**
   * Suscribirse a alertas
   * @param {string} subscriberId - ID del suscriptor
   * @param {Function} callback - Callback para alertas
   */
  subscribeToAlerts(subscriberId, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    this.subscribers.set(subscriberId, callback);
    
    return {
      success: true,
      subscriberId,
      unsubscribe: () => this.subscribers.delete(subscriberId)
    };
  }
  
  /**
   * Reconocer alerta
   * @param {string} alertId - ID de la alerta
   * @param {Object} acknowledgedBy - Usuario que reconoce
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }
    
    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();
    
    return {
      success: true,
      alert
    };
  }
  
  /**
   * Buscar en el log de auditoría
   * @param {Object} query - Parámetros de búsqueda
   */
  async search(query = {}) {
    let results = [...this.entries];
    
    // Filtrar por rango de fechas
    if (query.startDate) {
      results = results.filter(e => 
        new Date(e.timestamp) >= new Date(query.startDate)
      );
    }
    if (query.endDate) {
      results = results.filter(e => 
        new Date(e.timestamp) <= new Date(query.endDate)
      );
    }
    
    // Filtrar por acción
    if (query.action) {
      results = results.filter(e => e.action === query.action);
    }
    
    // Filtrar por categoría
    if (query.category) {
      results = results.filter(e => e.category === query.category);
    }
    
    // Filtrar por actor
    if (query.actorId) {
      results = results.filter(e => e.actor?.id === query.actorId);
    }
    
    // Filtrar por severidad
    if (query.severity) {
      results = results.filter(e => e.severity === query.severity);
    }
    
    // Filtrar por resultado
    if (query.outcome) {
      results = results.filter(e => e.outcome === query.outcome);
    }
    
    // Búsqueda de texto libre
    if (query.text) {
      const searchText = query.text.toLowerCase();
      results = results.filter(e => 
        JSON.stringify(e).toLowerCase().includes(searchText)
      );
    }
    
    // Ordenar
    const sortField = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    results.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    // Paginar
    const page = query.page || 1;
    const limit = query.limit || 100;
    const start = (page - 1) * limit;
    const paginatedResults = results.slice(start, start + limit);
    
    return {
      entries: paginatedResults,
      total: results.length,
      page,
      limit,
      totalPages: Math.ceil(results.length / limit)
    };
  }
  
  /**
   * Verificar integridad del log
   */
  async verifyIntegrity() {
    let previousHash = null;
    const issues = [];
    
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      
      // Verificar hash previo
      if (entry.previousHash !== previousHash) {
        issues.push({
          entryId: entry.id,
          index: i,
          issue: 'previous_hash_mismatch',
          expected: previousHash,
          found: entry.previousHash
        });
      }
      
      // Verificar hash propio
      const calculatedHash = this._calculateHash({
        ...entry,
        hash: null
      });
      
      if (entry.hash !== calculatedHash) {
        issues.push({
          entryId: entry.id,
          index: i,
          issue: 'hash_mismatch',
          expected: calculatedHash,
          found: entry.hash
        });
      }
      
      previousHash = entry.hash;
    }
    
    return {
      valid: issues.length === 0,
      entriesChecked: this.entries.length,
      issues
    };
  }
  
  /**
   * Exportar log para compliance
   * @param {Object} options - Opciones de exportación
   */
  async exportForCompliance(options = {}) {
    const searchResults = await this.search({
      startDate: options.startDate,
      endDate: options.endDate,
      limit: this.entries.length
    });
    
    const exportData = {
      exportId: uuidv4(),
      exportedAt: new Date().toISOString(),
      complianceMode: this.config.complianceMode,
      dateRange: {
        start: options.startDate || this.entries[0]?.timestamp,
        end: options.endDate || this.entries[this.entries.length - 1]?.timestamp
      },
      totalEntries: searchResults.total,
      entries: searchResults.entries,
      integrityCheck: await this.verifyIntegrity(),
      exportHash: null
    };
    
    // Calcular hash del export
    exportData.exportHash = crypto
      .createHash(this.config.hashAlgorithm)
      .update(JSON.stringify(exportData.entries))
      .digest('hex');
    
    return exportData;
  }
  
  /**
   * Generar reporte de compliance
   * @param {string} standard - Estándar de compliance
   */
  async generateComplianceReport(standard = 'gdpr') {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    
    const recentEntries = await this.search({
      startDate: thirtyDaysAgo.toISOString(),
      limit: this.entries.length
    });
    
    const report = {
      id: uuidv4(),
      standard,
      generatedAt: now.toISOString(),
      period: {
        start: thirtyDaysAgo.toISOString(),
        end: now.toISOString()
      },
      summary: {
        totalEvents: recentEntries.total,
        byCategory: this._countByField(recentEntries.entries, 'category'),
        bySeverity: this._countByField(recentEntries.entries, 'severity'),
        byOutcome: this._countByField(recentEntries.entries, 'outcome')
      },
      alerts: {
        total: this.alerts.length,
        unacknowledged: this.alerts.filter(a => !a.acknowledged).length,
        bySeverity: this._countByField(this.alerts, 'severity')
      },
      dataAccess: {
        reads: recentEntries.entries.filter(e => e.category === 'data_access').length,
        exports: recentEntries.entries.filter(e => e.category === 'data_export').length,
        modifications: recentEntries.entries.filter(e => e.category === 'data_modification').length
      },
      authentication: {
        logins: recentEntries.entries.filter(e => e.action.includes('login')).length,
        failures: recentEntries.entries.filter(e => 
          e.action.includes('login') && e.outcome === 'failure'
        ).length
      },
      integrityStatus: await this.verifyIntegrity(),
      recommendations: this._generateRecommendations(recentEntries.entries, standard)
    };
    
    return report;
  }
  
  /**
   * Contar por campo
   * @private
   */
  _countByField(entries, field) {
    const counts = {};
    for (const entry of entries) {
      const value = entry[field] || 'unknown';
      counts[value] = (counts[value] || 0) + 1;
    }
    return counts;
  }
  
  /**
   * Generar recomendaciones
   * @private
   */
  _generateRecommendations(entries, standard) {
    const recommendations = [];
    
    // Verificar intentos de login fallidos
    const failedLogins = entries.filter(e => 
      e.action.includes('login') && e.outcome === 'failure'
    );
    if (failedLogins.length > 100) {
      recommendations.push({
        severity: 'high',
        title: 'High number of failed logins',
        description: `${failedLogins.length} failed login attempts detected`,
        action: 'Review authentication security measures'
      });
    }
    
    // Verificar exportaciones de datos
    const exports = entries.filter(e => e.category === 'data_export');
    if (exports.length > 50) {
      recommendations.push({
        severity: 'medium',
        title: 'Significant data exports',
        description: `${exports.length} data export events detected`,
        action: 'Verify data export policies and authorization'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Aplicar retención de datos
   * @private
   */
  _enforceRetention() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    const originalCount = this.entries.length;
    this.entries = this.entries.filter(e => 
      new Date(e.timestamp) >= cutoffDate
    );
    
    // También limitar por cantidad máxima
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }
    
    const removed = originalCount - this.entries.length;
    if (removed > 0) {
      this.emit('retention_applied', { removed });
    }
  }
  
  /**
   * Obtener estadísticas
   */
  getStats() {
    return {
      entries: {
        total: this.entries.length,
        byCategory: this._countByField(this.entries, 'category'),
        bySeverity: this._countByField(this.entries, 'severity')
      },
      alerts: {
        total: this.alerts.length,
        unacknowledged: this.alerts.filter(a => !a.acknowledged).length
      },
      policies: this.policies.size,
      subscribers: this.subscribers.size,
      config: {
        retentionDays: this.config.retentionDays,
        complianceMode: this.config.complianceMode
      }
    };
  }
  
  /**
   * Limpiar recursos
   */
  cleanup() {
    this.entries = [];
    this.alerts = [];
    this.policies.clear();
    this.subscribers.clear();
    this.chainHash = null;
  }
}

module.exports = AuditLogger;
