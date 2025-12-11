/**
 * @module TeamWorkspaces
 * @description Sistema de espacios de trabajo en equipo para BlackMamba Studio
 * Colaboración en tiempo real, permisos, roles
 * @version 7.0.0
 */

const { v4: uuidv4 } = require('uuid');

class TeamWorkspaces {
  constructor(options = {}) {
    this.options = {
      maxTeamMembers: options.maxTeamMembers || 50,
      maxWorkspacesPerTeam: options.maxWorkspacesPerTeam || 10,
      realTimeSync: options.realTimeSync !== false,
      auditLog: options.auditLog !== false,
      ...options
    };
    
    // Estado de autenticación
    this.authenticated = false;
    this.currentUser = null;
    
    // Almacenamiento
    this.teams = new Map();
    this.workspaces = new Map();
    this.invitations = new Map();
    this.activityLog = [];
    
    // Roles y permisos
    this.roles = {
      owner: {
        name: 'Propietario',
        permissions: ['*'], // Todos los permisos
        canDelete: true,
        canManageTeam: true,
        canManageBilling: true
      },
      admin: {
        name: 'Administrador',
        permissions: ['read', 'write', 'delete', 'invite', 'manage_workspaces'],
        canDelete: true,
        canManageTeam: true,
        canManageBilling: false
      },
      editor: {
        name: 'Editor',
        permissions: ['read', 'write', 'comment'],
        canDelete: false,
        canManageTeam: false,
        canManageBilling: false
      },
      viewer: {
        name: 'Visor',
        permissions: ['read', 'comment'],
        canDelete: false,
        canManageTeam: false,
        canManageBilling: false
      }
    };
    
    // Estados de workspace
    this.workspaceStates = new Map();
  }
  
  /**
   * Autenticar usuario
   * @param {Object} user - Datos del usuario
   * @returns {Object} Resultado
   */
  async authenticate(user) {
    if (!user || !user.id) {
      return { success: false, error: 'Usuario inválido' };
    }
    
    this.authenticated = true;
    this.currentUser = {
      id: user.id,
      email: user.email || `user_${user.id}@blackmamba.io`,
      name: user.name || 'Usuario',
      avatar: user.avatar || null
    };
    
    return {
      success: true,
      user: this.currentUser
    };
  }
  
  /**
   * Crear equipo
   * @param {Object} teamData - Datos del equipo
   * @returns {Object} Equipo creado
   */
  async createTeam(teamData) {
    if (!this.authenticated) {
      return { success: false, error: 'No autenticado' };
    }
    
    const {
      name,
      description = '',
      avatar = null,
      plan = 'team' // team, business, enterprise
    } = teamData;
    
    if (!name || name.trim().length < 2) {
      return { success: false, error: 'Nombre de equipo requerido (mínimo 2 caracteres)' };
    }
    
    const teamId = uuidv4();
    const team = {
      id: teamId,
      name: name.trim(),
      description,
      avatar,
      plan,
      
      // Propietario
      ownerId: this.currentUser.id,
      
      // Miembros
      members: [{
        userId: this.currentUser.id,
        email: this.currentUser.email,
        name: this.currentUser.name,
        role: 'owner',
        joinedAt: new Date().toISOString()
      }],
      
      // Workspaces
      workspaces: [],
      
      // Configuración
      settings: {
        allowGuestAccess: false,
        requireTwoFactor: false,
        defaultRole: 'editor',
        storageQuota: plan === 'enterprise' ? Infinity : 100 * 1024 * 1024 * 1024 // 100GB
      },
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.teams.set(teamId, team);
    this._logActivity('team_created', { teamId, teamName: name });
    
    return {
      success: true,
      teamId,
      team: this._sanitizeTeam(team),
      message: 'Equipo creado exitosamente'
    };
  }
  
  /**
   * Obtener equipo
   * @param {string} teamId - ID del equipo
   * @returns {Object} Equipo
   */
  async getTeam(teamId) {
    const team = this.teams.get(teamId);
    if (!team) {
      return { success: false, error: 'Equipo no encontrado' };
    }
    
    // Verificar acceso
    const member = team.members.find(m => m.userId === this.currentUser?.id);
    if (!member && !this._isOwner(team)) {
      return { success: false, error: 'Sin acceso al equipo' };
    }
    
    return {
      success: true,
      team: this._sanitizeTeam(team),
      userRole: member?.role || 'owner'
    };
  }
  
  /**
   * Listar equipos del usuario
   * @returns {Object} Lista de equipos
   */
  async listTeams() {
    if (!this.authenticated) {
      return { success: false, error: 'No autenticado' };
    }
    
    const userTeams = [];
    
    for (const [, team] of this.teams) {
      const member = team.members.find(m => m.userId === this.currentUser.id);
      if (member) {
        userTeams.push({
          ...this._sanitizeTeam(team),
          userRole: member.role
        });
      }
    }
    
    return {
      success: true,
      teams: userTeams,
      total: userTeams.length
    };
  }
  
  /**
   * Invitar miembro al equipo
   * @param {string} teamId - ID del equipo
   * @param {Object} inviteData - Datos de invitación
   * @returns {Object} Invitación
   */
  async inviteMember(teamId, inviteData) {
    if (!this.authenticated) {
      return { success: false, error: 'No autenticado' };
    }
    
    const team = this.teams.get(teamId);
    if (!team) {
      return { success: false, error: 'Equipo no encontrado' };
    }
    
    // Verificar permisos
    if (!this._hasPermission(team, this.currentUser.id, 'invite')) {
      return { success: false, error: 'Sin permisos para invitar' };
    }
    
    const { email, role = 'editor', message = '' } = inviteData;
    
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Email inválido' };
    }
    
    // Verificar si ya es miembro
    if (team.members.some(m => m.email === email)) {
      return { success: false, error: 'Usuario ya es miembro del equipo' };
    }
    
    // Verificar límite de miembros
    if (team.members.length >= this.options.maxTeamMembers) {
      return { success: false, error: 'Límite de miembros alcanzado' };
    }
    
    const invitationId = uuidv4();
    const invitation = {
      id: invitationId,
      teamId,
      teamName: team.name,
      email,
      role,
      message,
      invitedBy: {
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email
      },
      status: 'pending',
      token: uuidv4(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
      createdAt: new Date().toISOString()
    };
    
    this.invitations.set(invitationId, invitation);
    this._logActivity('member_invited', { teamId, email, role });
    
    return {
      success: true,
      invitationId,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        inviteLink: `https://app.blackmamba.io/invite/${invitation.token}`
      },
      message: `Invitación enviada a ${email}`
    };
  }
  
  /**
   * Aceptar invitación
   * @param {string} token - Token de invitación
   * @param {Object} userData - Datos del usuario
   * @returns {Object} Resultado
   */
  async acceptInvitation(token, userData = {}) {
    // Buscar invitación por token
    let invitation = null;
    for (const [, inv] of this.invitations) {
      if (inv.token === token) {
        invitation = inv;
        break;
      }
    }
    
    if (!invitation) {
      return { success: false, error: 'Invitación no encontrada' };
    }
    
    if (invitation.status !== 'pending') {
      return { success: false, error: 'Invitación ya procesada' };
    }
    
    if (new Date(invitation.expiresAt) < new Date()) {
      return { success: false, error: 'Invitación expirada' };
    }
    
    const team = this.teams.get(invitation.teamId);
    if (!team) {
      return { success: false, error: 'Equipo no encontrado' };
    }
    
    // Agregar miembro
    const newMember = {
      userId: userData.id || uuidv4(),
      email: invitation.email,
      name: userData.name || invitation.email.split('@')[0],
      role: invitation.role,
      joinedAt: new Date().toISOString()
    };
    
    team.members.push(newMember);
    team.updatedAt = new Date().toISOString();
    
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date().toISOString();
    
    this._logActivity('member_joined', { 
      teamId: team.id, 
      userId: newMember.userId, 
      role: newMember.role 
    });
    
    return {
      success: true,
      team: this._sanitizeTeam(team),
      role: newMember.role,
      message: `Te has unido al equipo "${team.name}"`
    };
  }
  
  /**
   * Cambiar rol de miembro
   * @param {string} teamId - ID del equipo
   * @param {string} userId - ID del usuario
   * @param {string} newRole - Nuevo rol
   * @returns {Object} Resultado
   */
  async changeMemberRole(teamId, userId, newRole) {
    if (!this.authenticated) {
      return { success: false, error: 'No autenticado' };
    }
    
    const team = this.teams.get(teamId);
    if (!team) {
      return { success: false, error: 'Equipo no encontrado' };
    }
    
    // Solo owner y admin pueden cambiar roles
    if (!this._hasPermission(team, this.currentUser.id, 'manage_workspaces')) {
      return { success: false, error: 'Sin permisos' };
    }
    
    if (!this.roles[newRole]) {
      return { success: false, error: 'Rol inválido' };
    }
    
    const member = team.members.find(m => m.userId === userId);
    if (!member) {
      return { success: false, error: 'Miembro no encontrado' };
    }
    
    // No se puede cambiar rol del owner
    if (member.role === 'owner') {
      return { success: false, error: 'No se puede cambiar rol del propietario' };
    }
    
    // No se puede asignar owner
    if (newRole === 'owner') {
      return { success: false, error: 'Use transferOwnership para transferir propiedad' };
    }
    
    const oldRole = member.role;
    member.role = newRole;
    team.updatedAt = new Date().toISOString();
    
    this._logActivity('role_changed', { teamId, userId, oldRole, newRole });
    
    return {
      success: true,
      userId,
      oldRole,
      newRole,
      message: `Rol cambiado a ${this.roles[newRole].name}`
    };
  }
  
  /**
   * Remover miembro del equipo
   * @param {string} teamId - ID del equipo
   * @param {string} userId - ID del usuario
   * @returns {Object} Resultado
   */
  async removeMember(teamId, userId) {
    if (!this.authenticated) {
      return { success: false, error: 'No autenticado' };
    }
    
    const team = this.teams.get(teamId);
    if (!team) {
      return { success: false, error: 'Equipo no encontrado' };
    }
    
    // Verificar permisos
    const canRemove = this._hasPermission(team, this.currentUser.id, 'manage_workspaces') ||
                      this.currentUser.id === userId; // Puede removerse a sí mismo
    
    if (!canRemove) {
      return { success: false, error: 'Sin permisos' };
    }
    
    const memberIndex = team.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) {
      return { success: false, error: 'Miembro no encontrado' };
    }
    
    const member = team.members[memberIndex];
    
    // No se puede remover al owner
    if (member.role === 'owner') {
      return { success: false, error: 'No se puede remover al propietario' };
    }
    
    team.members.splice(memberIndex, 1);
    team.updatedAt = new Date().toISOString();
    
    this._logActivity('member_removed', { teamId, userId });
    
    return {
      success: true,
      userId,
      message: 'Miembro removido del equipo'
    };
  }
  
  /**
   * Crear workspace
   * @param {string} teamId - ID del equipo
   * @param {Object} workspaceData - Datos del workspace
   * @returns {Object} Workspace creado
   */
  async createWorkspace(teamId, workspaceData) {
    if (!this.authenticated) {
      return { success: false, error: 'No autenticado' };
    }
    
    const team = this.teams.get(teamId);
    if (!team) {
      return { success: false, error: 'Equipo no encontrado' };
    }
    
    // Verificar permisos
    if (!this._hasPermission(team, this.currentUser.id, 'manage_workspaces')) {
      return { success: false, error: 'Sin permisos para crear workspaces' };
    }
    
    // Verificar límite
    if (team.workspaces.length >= this.options.maxWorkspacesPerTeam) {
      return { success: false, error: 'Límite de workspaces alcanzado' };
    }
    
    const {
      name,
      description = '',
      color = '#6366f1',
      icon = '📁'
    } = workspaceData;
    
    if (!name || name.trim().length < 2) {
      return { success: false, error: 'Nombre requerido (mínimo 2 caracteres)' };
    }
    
    const workspaceId = uuidv4();
    const workspace = {
      id: workspaceId,
      teamId,
      name: name.trim(),
      description,
      color,
      icon,
      
      // Proyectos
      projects: [],
      
      // Acceso
      accessList: team.members.map(m => ({
        userId: m.userId,
        role: m.role
      })),
      
      // Estado
      status: 'active',
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: this.currentUser.id
    };
    
    this.workspaces.set(workspaceId, workspace);
    team.workspaces.push(workspaceId);
    
    this._logActivity('workspace_created', { teamId, workspaceId, name });
    
    return {
      success: true,
      workspaceId,
      workspace,
      message: 'Workspace creado'
    };
  }
  
  /**
   * Listar workspaces de un equipo
   * @param {string} teamId - ID del equipo
   * @returns {Object} Lista de workspaces
   */
  async listWorkspaces(teamId) {
    if (!this.authenticated) {
      return { success: false, error: 'No autenticado' };
    }
    
    const team = this.teams.get(teamId);
    if (!team) {
      return { success: false, error: 'Equipo no encontrado' };
    }
    
    // Verificar acceso
    if (!team.members.some(m => m.userId === this.currentUser.id)) {
      return { success: false, error: 'Sin acceso al equipo' };
    }
    
    const workspaces = team.workspaces
      .map(wId => this.workspaces.get(wId))
      .filter(Boolean);
    
    return {
      success: true,
      workspaces,
      total: workspaces.length
    };
  }
  
  /**
   * Agregar proyecto a workspace
   * @param {string} workspaceId - ID del workspace
   * @param {Object} projectData - Datos del proyecto
   * @returns {Object} Resultado
   */
  async addProject(workspaceId, projectData) {
    if (!this.authenticated) {
      return { success: false, error: 'No autenticado' };
    }
    
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return { success: false, error: 'Workspace no encontrado' };
    }
    
    // Verificar permisos
    const access = workspace.accessList.find(a => a.userId === this.currentUser.id);
    if (!access || !['owner', 'admin', 'editor'].includes(access.role)) {
      return { success: false, error: 'Sin permisos de escritura' };
    }
    
    const {
      projectId,
      name,
      thumbnail = null,
      metadata = {}
    } = projectData;
    
    const project = {
      id: projectId || uuidv4(),
      name,
      thumbnail,
      metadata,
      addedBy: this.currentUser.id,
      addedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: 1
    };
    
    workspace.projects.push(project);
    workspace.updatedAt = new Date().toISOString();
    
    this._logActivity('project_added', { workspaceId, projectId: project.id });
    
    return {
      success: true,
      project,
      message: 'Proyecto agregado al workspace'
    };
  }
  
  /**
   * Obtener actividad del equipo
   * @param {string} teamId - ID del equipo
   * @param {Object} options - Opciones
   * @returns {Object} Actividad
   */
  async getActivity(teamId, options = {}) {
    if (!this.authenticated) {
      return { success: false, error: 'No autenticado' };
    }
    
    const { limit = 50, offset = 0 } = options;
    
    const team = this.teams.get(teamId);
    if (!team) {
      return { success: false, error: 'Equipo no encontrado' };
    }
    
    const teamActivity = this.activityLog
      .filter(log => log.data?.teamId === teamId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(offset, offset + limit);
    
    return {
      success: true,
      activity: teamActivity,
      total: teamActivity.length
    };
  }
  
  /**
   * Obtener roles disponibles
   * @returns {Object} Roles
   */
  getRoles() {
    return {
      success: true,
      roles: Object.entries(this.roles).map(([key, role]) => ({
        id: key,
        ...role
      }))
    };
  }
  
  /**
   * Eliminar equipo
   * @param {string} teamId - ID del equipo
   * @returns {Object} Resultado
   */
  async deleteTeam(teamId) {
    if (!this.authenticated) {
      return { success: false, error: 'No autenticado' };
    }
    
    const team = this.teams.get(teamId);
    if (!team) {
      return { success: false, error: 'Equipo no encontrado' };
    }
    
    // Solo el owner puede eliminar
    if (team.ownerId !== this.currentUser.id) {
      return { success: false, error: 'Solo el propietario puede eliminar el equipo' };
    }
    
    // Eliminar workspaces asociados
    for (const wsId of team.workspaces) {
      this.workspaces.delete(wsId);
    }
    
    this.teams.delete(teamId);
    this._logActivity('team_deleted', { teamId, teamName: team.name });
    
    return {
      success: true,
      teamId,
      message: 'Equipo eliminado'
    };
  }
  
  // Métodos auxiliares privados
  
  _hasPermission(team, userId, permission) {
    if (team.ownerId === userId) return true;
    
    const member = team.members.find(m => m.userId === userId);
    if (!member) return false;
    
    const role = this.roles[member.role];
    if (!role) return false;
    
    return role.permissions.includes('*') || role.permissions.includes(permission);
  }
  
  _isOwner(team) {
    return team.ownerId === this.currentUser?.id;
  }
  
  _sanitizeTeam(team) {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      avatar: team.avatar,
      plan: team.plan,
      memberCount: team.members.length,
      workspaceCount: team.workspaces.length,
      createdAt: team.createdAt
    };
  }
  
  _logActivity(action, data) {
    if (!this.options.auditLog) return;
    
    this.activityLog.push({
      id: uuidv4(),
      action,
      data,
      userId: this.currentUser?.id,
      userName: this.currentUser?.name,
      timestamp: new Date().toISOString()
    });
    
    // Limitar log a 1000 entradas
    if (this.activityLog.length > 1000) {
      this.activityLog = this.activityLog.slice(-1000);
    }
  }
  
  /**
   * Limpiar recursos
   */
  cleanup() {
    this.teams.clear();
    this.workspaces.clear();
    this.invitations.clear();
    this.activityLog = [];
    this.workspaceStates.clear();
  }
}

module.exports = TeamWorkspaces;
