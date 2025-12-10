/**
 * HistoryManager - Sistema de Undo/Redo para el editor de video
 * 
 * Gestiona el historial de acciones con una pila de estados.
 * Soporta límite de historial configurable para optimizar memoria.
 */

const { EventEmitter } = require('events');

class HistoryManager extends EventEmitter {
  /**
   * @param {Object} options - Opciones de configuración
   * @param {number} [options.maxHistory=50] - Máximo de acciones en el historial
   */
  constructor(options = {}) {
    super();
    this.maxHistory = options.maxHistory || 50;
    this.undoStack = [];
    this.redoStack = [];
    this.isPerformingAction = false; // Previene recursión
  }

  /**
   * Registra una nueva acción en el historial
   * @param {Object} action - Acción a registrar
   * @param {string} action.type - Tipo de acción (ej: 'add-clip', 'cut', 'delete', 'reorder')
   * @param {string} action.description - Descripción legible para el usuario
   * @param {Object} action.data - Datos necesarios para undo/redo
   * @param {Function} action.undo - Función para deshacer la acción
   * @param {Function} action.redo - Función para rehacer la acción
   */
  push(action) {
    if (this.isPerformingAction) {
      return; // Ignorar acciones durante undo/redo
    }

    const requiredFields = ['type', 'description', 'undo', 'redo'];
    for (const field of requiredFields) {
      if (!action[field]) {
        throw new Error(`Acción inválida: falta campo '${field}'`);
      }
    }

    this.undoStack.push({
      ...action,
      timestamp: Date.now()
    });

    // Limpiar redo stack cuando se hace una nueva acción
    this.redoStack = [];

    // Limitar tamaño del historial
    while (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.emit('change', this.getState());
  }

  /**
   * Deshace la última acción
   * @returns {Promise<Object|null>} Acción deshecha o null si no hay acciones
   */
  async undo() {
    if (!this.canUndo()) {
      return null;
    }

    const action = this.undoStack.pop();
    this.isPerformingAction = true;

    try {
      await action.undo(action.data);
      this.redoStack.push(action);
      this.emit('undo', action);
      this.emit('change', this.getState());
      return action;
    } catch (error) {
      // Restaurar la acción si falla
      this.undoStack.push(action);
      throw error;
    } finally {
      this.isPerformingAction = false;
    }
  }

  /**
   * Rehace la última acción deshecha
   * @returns {Promise<Object|null>} Acción rehecha o null si no hay acciones
   */
  async redo() {
    if (!this.canRedo()) {
      return null;
    }

    const action = this.redoStack.pop();
    this.isPerformingAction = true;

    try {
      await action.redo(action.data);
      this.undoStack.push(action);
      this.emit('redo', action);
      this.emit('change', this.getState());
      return action;
    } catch (error) {
      // Restaurar la acción si falla
      this.redoStack.push(action);
      throw error;
    } finally {
      this.isPerformingAction = false;
    }
  }

  /**
   * @returns {boolean} Si hay acciones para deshacer
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * @returns {boolean} Si hay acciones para rehacer
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Obtiene el estado actual del historial
   * @returns {Object} Estado del historial
   */
  getState() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      lastAction: this.undoStack[this.undoStack.length - 1] || null,
      nextRedo: this.redoStack[this.redoStack.length - 1] || null
    };
  }

  /**
   * Obtiene la descripción de la siguiente acción a deshacer
   * @returns {string|null}
   */
  getUndoDescription() {
    const last = this.undoStack[this.undoStack.length - 1];
    return last ? last.description : null;
  }

  /**
   * Obtiene la descripción de la siguiente acción a rehacer
   * @returns {string|null}
   */
  getRedoDescription() {
    const next = this.redoStack[this.redoStack.length - 1];
    return next ? next.description : null;
  }

  /**
   * Limpia todo el historial
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.emit('change', this.getState());
  }

  /**
   * Obtiene un resumen del historial para debugging
   * @returns {Object}
   */
  getHistorySummary() {
    return {
      undoStack: this.undoStack.map(a => ({
        type: a.type,
        description: a.description,
        timestamp: a.timestamp
      })),
      redoStack: this.redoStack.map(a => ({
        type: a.type,
        description: a.description,
        timestamp: a.timestamp
      }))
    };
  }
}

module.exports = HistoryManager;
