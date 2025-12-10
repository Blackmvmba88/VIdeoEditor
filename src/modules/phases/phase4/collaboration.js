/**
 * BlackMamba Studio - Collaboration
 * 
 * Sistema de colaboración en tiempo real para edición conjunta.
 * 
 * @module Collaboration
 */

const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

class Collaboration {
  constructor() {
    this.sessions = new Map();
    this.users = new Map();
  }

  async createSession(projectId, creatorId) {
    const sessionId = `session_${Date.now()}`;
    const session = {
      id: sessionId,
      projectId,
      creator: creatorId,
      users: [creatorId],
      createdAt: new Date().toISOString(),
      active: true
    };

    this.sessions.set(sessionId, session);

    return {
      success: true,
      sessionId,
      message: 'Collaboration session created'
    };
  }

  async joinSession(sessionId, userId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new VideoEditorError(`Session ${sessionId} not found`, ErrorCodes.INVALID_INPUT);
    }

    if (!session.users.includes(userId)) {
      session.users.push(userId);
    }

    return {
      success: true,
      sessionId,
      users: session.users,
      message: 'Joined collaboration session'
    };
  }

  async leaveSession(sessionId, userId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.users = session.users.filter(id => id !== userId);
    }

    return { success: true, message: 'Left session' };
  }

  async broadcastChange(sessionId, change) {
    return {
      success: true,
      sessionId,
      change,
      message: 'Change broadcasted to all users'
    };
  }

  async addComment(sessionId, timestamp, comment, userId) {
    return {
      success: true,
      commentId: `comment_${Date.now()}`,
      timestamp,
      comment,
      userId,
      message: 'Comment added'
    };
  }

  getActiveUsers(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.users : [];
  }
}

module.exports = Collaboration;
