/**
 * @file EnterpriseAuth - Autenticación empresarial
 * @description SSO, LDAP, SAML, OAuth para organizaciones
 * @module phases/phase8/EnterpriseAuth
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * Clase para autenticación empresarial
 */
class EnterpriseAuth extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      sessionTimeout: options.sessionTimeout || 8 * 60 * 60 * 1000, // 8 horas
      maxSessions: options.maxSessions || 3,
      mfaRequired: options.mfaRequired || false,
      passwordPolicy: options.passwordPolicy || {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecial: true,
        maxAge: 90 // días
      },
      ...options
    };
    
    // Estado
    this.organizations = new Map();
    this.users = new Map();
    this.sessions = new Map();
    this.ssoProviders = new Map();
    this.mfaSecrets = new Map();
    this.auditLog = [];
  }
  
  /**
   * Crear organización
   * @param {Object} orgData - Datos de la organización
   */
  async createOrganization(orgData) {
    if (!orgData || !orgData.name) {
      throw new Error('Organization name is required');
    }
    
    const orgId = uuidv4();
    const organization = {
      id: orgId,
      name: orgData.name,
      domain: orgData.domain || null,
      plan: orgData.plan || 'enterprise',
      settings: {
        ssoEnabled: orgData.ssoEnabled || false,
        mfaRequired: orgData.mfaRequired || this.config.mfaRequired,
        allowedDomains: orgData.allowedDomains || [],
        ipWhitelist: orgData.ipWhitelist || [],
        ...orgData.settings
      },
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    this.organizations.set(orgId, organization);
    this._log('org_created', { orgId, name: organization.name });
    
    return {
      success: true,
      organizationId: orgId,
      organization
    };
  }
  
  /**
   * Configurar proveedor SSO
   * @param {string} orgId - ID de la organización
   * @param {Object} ssoConfig - Configuración SSO
   */
  async configureSSOProvider(orgId, ssoConfig) {
    const org = this.organizations.get(orgId);
    if (!org) {
      throw new Error('Organization not found');
    }
    
    if (!ssoConfig || !ssoConfig.type) {
      throw new Error('SSO type is required (saml, oauth, ldap)');
    }
    
    const providerId = uuidv4();
    const provider = {
      id: providerId,
      orgId,
      type: ssoConfig.type, // 'saml' | 'oauth' | 'ldap' | 'oidc'
      name: ssoConfig.name || `${ssoConfig.type.toUpperCase()} Provider`,
      config: this._sanitizeSSOConfig(ssoConfig),
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    this.ssoProviders.set(providerId, provider);
    org.settings.ssoEnabled = true;
    org.settings.ssoProviderId = providerId;
    
    this._log('sso_configured', { orgId, providerId, type: ssoConfig.type });
    
    return {
      success: true,
      providerId,
      provider: { ...provider, config: '[REDACTED]' }
    };
  }
  
  /**
   * Sanitizar configuración SSO (ocultar secretos)
   * @private
   */
  _sanitizeSSOConfig(config) {
    return {
      ...config,
      clientSecret: config.clientSecret ? this._hashSecret(config.clientSecret) : null,
      privateKey: config.privateKey ? '[STORED]' : null
    };
  }
  
  /**
   * Hash de secreto
   * @private
   */
  _hashSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }
  
  /**
   * Crear usuario empresarial
   * @param {string} orgId - ID de la organización
   * @param {Object} userData - Datos del usuario
   */
  async createUser(orgId, userData) {
    const org = this.organizations.get(orgId);
    if (!org) {
      throw new Error('Organization not found');
    }
    
    if (!userData || !userData.email) {
      throw new Error('User email is required');
    }
    
    // Validar dominio si está configurado
    if (org.settings.allowedDomains.length > 0) {
      const domain = userData.email.split('@')[1];
      if (!org.settings.allowedDomains.includes(domain)) {
        throw new Error('Email domain not allowed');
      }
    }
    
    const userId = uuidv4();
    const user = {
      id: userId,
      orgId,
      email: userData.email,
      name: userData.name || userData.email.split('@')[0],
      role: userData.role || 'member',
      permissions: this._getDefaultPermissions(userData.role || 'member'),
      status: 'active',
      mfaEnabled: false,
      passwordHash: userData.password ? this._hashSecret(userData.password) : null,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    
    this.users.set(userId, user);
    this._log('user_created', { orgId, userId, email: user.email });
    
    return {
      success: true,
      userId,
      user: { ...user, passwordHash: undefined }
    };
  }
  
  /**
   * Obtener permisos por defecto según rol
   * @private
   */
  _getDefaultPermissions(role) {
    const permissionSets = {
      admin: ['*'],
      manager: ['projects.*', 'users.read', 'reports.*'],
      editor: ['projects.edit', 'projects.read', 'assets.*'],
      viewer: ['projects.read', 'assets.read'],
      member: ['projects.read', 'projects.edit']
    };
    
    return permissionSets[role] || permissionSets.member;
  }
  
  /**
   * Autenticar usuario con credenciales
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña
   * @param {Object} context - Contexto de login (IP, device, etc)
   */
  async authenticate(email, password, context = {}) {
    // Buscar usuario
    let user = null;
    for (const u of this.users.values()) {
      if (u.email === email) {
        user = u;
        break;
      }
    }
    
    if (!user) {
      this._log('auth_failed', { email, reason: 'user_not_found' });
      throw new Error('Invalid credentials');
    }
    
    // Verificar contraseña
    const passwordHash = this._hashSecret(password);
    if (user.passwordHash !== passwordHash) {
      this._log('auth_failed', { userId: user.id, reason: 'invalid_password' });
      throw new Error('Invalid credentials');
    }
    
    // Verificar IP whitelist
    const org = this.organizations.get(user.orgId);
    if (org && org.settings.ipWhitelist.length > 0 && context.ip) {
      if (!org.settings.ipWhitelist.includes(context.ip)) {
        this._log('auth_failed', { userId: user.id, reason: 'ip_not_allowed' });
        throw new Error('Access denied from this IP');
      }
    }
    
    // Verificar MFA si está requerido
    if (user.mfaEnabled || (org && org.settings.mfaRequired)) {
      return {
        success: false,
        mfaRequired: true,
        userId: user.id,
        message: 'MFA verification required'
      };
    }
    
    // Crear sesión
    return this._createSession(user, context);
  }
  
  /**
   * Crear sesión de usuario
   * @private
   */
  async _createSession(user, context) {
    // Verificar límite de sesiones
    const userSessions = Array.from(this.sessions.values())
      .filter(s => s.userId === user.id && s.status === 'active');
    
    if (userSessions.length >= this.config.maxSessions) {
      // Cerrar sesión más antigua
      const oldest = userSessions.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      )[0];
      oldest.status = 'expired';
    }
    
    const sessionId = uuidv4();
    const token = this._generateToken();
    
    const session = {
      id: sessionId,
      userId: user.id,
      orgId: user.orgId,
      token,
      ip: context.ip || 'unknown',
      userAgent: context.userAgent || 'unknown',
      device: context.device || 'unknown',
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.config.sessionTimeout).toISOString()
    };
    
    this.sessions.set(sessionId, session);
    
    // Actualizar último login
    user.lastLogin = new Date().toISOString();
    
    this._log('login_success', { userId: user.id, sessionId });
    this.emit('login', { userId: user.id, sessionId });
    
    return {
      success: true,
      sessionId,
      token,
      user: { ...user, passwordHash: undefined },
      expiresAt: session.expiresAt
    };
  }
  
  /**
   * Generar token de sesión
   * @private
   */
  _generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Autenticar con SSO
   * @param {string} providerId - ID del proveedor SSO
   * @param {Object} ssoData - Datos del SSO (token, assertion, etc)
   */
  async authenticateSSO(providerId, ssoData) {
    const provider = this.ssoProviders.get(providerId);
    if (!provider) {
      throw new Error('SSO provider not found');
    }
    
    // Simular validación SSO
    const email = ssoData.email || ssoData.nameId;
    if (!email) {
      throw new Error('SSO response missing email');
    }
    
    // Buscar o crear usuario
    let user = null;
    for (const u of this.users.values()) {
      if (u.email === email && u.orgId === provider.orgId) {
        user = u;
        break;
      }
    }
    
    if (!user) {
      // Provisioning automático
      const result = await this.createUser(provider.orgId, {
        email,
        name: ssoData.displayName || email.split('@')[0],
        role: 'member'
      });
      user = this.users.get(result.userId);
    }
    
    return this._createSession(user, { ssoProvider: providerId });
  }
  
  /**
   * Configurar MFA para usuario
   * @param {string} userId - ID del usuario
   */
  async setupMFA(userId) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generar secreto TOTP
    const secret = crypto.randomBytes(20).toString('hex');
    this.mfaSecrets.set(userId, secret);
    
    return {
      success: true,
      secret,
      qrCodeUrl: `otpauth://totp/BlackMamba:${user.email}?secret=${secret}&issuer=BlackMamba`,
      backupCodes: this._generateBackupCodes()
    };
  }
  
  /**
   * Generar códigos de respaldo
   * @private
   */
  _generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
  
  /**
   * Verificar código MFA
   * @param {string} userId - ID del usuario
   * @param {string} code - Código TOTP
   * @param {Object} context - Contexto de login
   */
  async verifyMFA(userId, code, context = {}) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Simular verificación TOTP (en producción usar librería como speakeasy)
    if (!code || code.length !== 6) {
      this._log('mfa_failed', { userId, reason: 'invalid_code' });
      throw new Error('Invalid MFA code');
    }
    
    // Activar MFA si es primera vez
    if (!user.mfaEnabled) {
      user.mfaEnabled = true;
    }
    
    this._log('mfa_success', { userId });
    
    return this._createSession(user, context);
  }
  
  /**
   * Validar sesión
   * @param {string} token - Token de sesión
   */
  async validateSession(token) {
    for (const session of this.sessions.values()) {
      if (session.token === token) {
        if (session.status !== 'active') {
          return { valid: false, reason: 'session_inactive' };
        }
        
        if (new Date(session.expiresAt) < new Date()) {
          session.status = 'expired';
          return { valid: false, reason: 'session_expired' };
        }
        
        const user = this.users.get(session.userId);
        return {
          valid: true,
          session,
          user: user ? { ...user, passwordHash: undefined } : null
        };
      }
    }
    
    return { valid: false, reason: 'session_not_found' };
  }
  
  /**
   * Cerrar sesión
   * @param {string} sessionId - ID de la sesión
   */
  async logout(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    session.status = 'logged_out';
    session.loggedOutAt = new Date().toISOString();
    
    this._log('logout', { userId: session.userId, sessionId });
    this.emit('logout', { userId: session.userId, sessionId });
    
    return { success: true };
  }
  
  /**
   * Cerrar todas las sesiones de usuario
   * @param {string} userId - ID del usuario
   */
  async logoutAll(userId) {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.status === 'active') {
        session.status = 'logged_out';
        count++;
      }
    }
    
    this._log('logout_all', { userId, sessionsTerminated: count });
    
    return { success: true, sessionsTerminated: count };
  }
  
  /**
   * Cambiar contraseña
   * @param {string} userId - ID del usuario
   * @param {string} currentPassword - Contraseña actual
   * @param {string} newPassword - Nueva contraseña
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verificar contraseña actual
    if (user.passwordHash !== this._hashSecret(currentPassword)) {
      throw new Error('Current password is incorrect');
    }
    
    // Validar nueva contraseña
    this._validatePassword(newPassword);
    
    user.passwordHash = this._hashSecret(newPassword);
    user.passwordChangedAt = new Date().toISOString();
    
    // Cerrar otras sesiones
    await this.logoutAll(userId);
    
    this._log('password_changed', { userId });
    
    return { success: true };
  }
  
  /**
   * Validar política de contraseña
   * @private
   */
  _validatePassword(password) {
    const policy = this.config.passwordPolicy;
    
    if (password.length < policy.minLength) {
      throw new Error(`Password must be at least ${policy.minLength} characters`);
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      throw new Error('Password must contain uppercase letter');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      throw new Error('Password must contain lowercase letter');
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      throw new Error('Password must contain number');
    }
    if (policy.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain special character');
    }
    
    return true;
  }
  
  /**
   * Verificar permiso
   * @param {string} userId - ID del usuario
   * @param {string} permission - Permiso a verificar
   */
  hasPermission(userId, permission) {
    const user = this.users.get(userId);
    if (!user) return false;
    
    // Admin tiene todos los permisos
    if (user.permissions.includes('*')) return true;
    
    // Verificar permiso exacto
    if (user.permissions.includes(permission)) return true;
    
    // Verificar wildcard (ej: projects.* incluye projects.read)
    const [category] = permission.split('.');
    if (user.permissions.includes(`${category}.*`)) return true;
    
    return false;
  }
  
  /**
   * Agregar entrada al log de auditoría
   * @private
   */
  _log(action, details) {
    this.auditLog.push({
      id: uuidv4(),
      action,
      details,
      timestamp: new Date().toISOString()
    });
    
    // Mantener últimas 10000 entradas
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
  }
  
  /**
   * Obtener log de auditoría
   * @param {Object} filters - Filtros
   */
  getAuditLog(filters = {}) {
    let logs = [...this.auditLog];
    
    if (filters.action) {
      logs = logs.filter(l => l.action === filters.action);
    }
    if (filters.userId) {
      logs = logs.filter(l => l.details.userId === filters.userId);
    }
    if (filters.since) {
      logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.since));
    }
    
    return {
      logs: logs.slice(-(filters.limit || 100)),
      total: logs.length
    };
  }
  
  /**
   * Obtener estadísticas
   */
  getStats() {
    const users = Array.from(this.users.values());
    const sessions = Array.from(this.sessions.values());
    
    return {
      organizations: this.organizations.size,
      users: {
        total: users.length,
        byRole: {
          admin: users.filter(u => u.role === 'admin').length,
          manager: users.filter(u => u.role === 'manager').length,
          editor: users.filter(u => u.role === 'editor').length,
          member: users.filter(u => u.role === 'member').length
        },
        mfaEnabled: users.filter(u => u.mfaEnabled).length
      },
      sessions: {
        total: sessions.length,
        active: sessions.filter(s => s.status === 'active').length
      },
      ssoProviders: this.ssoProviders.size,
      auditLogEntries: this.auditLog.length
    };
  }
  
  /**
   * Limpiar recursos
   */
  cleanup() {
    this.organizations.clear();
    this.users.clear();
    this.sessions.clear();
    this.ssoProviders.clear();
    this.mfaSecrets.clear();
    this.auditLog = [];
  }
}

module.exports = EnterpriseAuth;
