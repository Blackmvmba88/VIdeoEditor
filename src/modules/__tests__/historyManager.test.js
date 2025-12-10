/**
 * Tests para HistoryManager - Sistema de Undo/Redo
 */

const HistoryManager = require('../historyManager');

describe('HistoryManager', () => {
  let historyManager;
  let undoCallCount;
  let redoCallCount;

  beforeEach(() => {
    historyManager = new HistoryManager({ maxHistory: 5 });
    undoCallCount = 0;
    redoCallCount = 0;
  });

  const createTestAction = (id) => ({
    type: `action-${id}`,
    description: `Test action ${id}`,
    data: { id },
    undo: jest.fn().mockImplementation(async () => { undoCallCount++; }),
    redo: jest.fn().mockImplementation(async () => { redoCallCount++; })
  });

  describe('push', () => {
    it('debe agregar acciones al historial', () => {
      historyManager.push(createTestAction(1));
      historyManager.push(createTestAction(2));

      expect(historyManager.canUndo()).toBe(true);
      expect(historyManager.canRedo()).toBe(false);
      expect(historyManager.getState().undoCount).toBe(2);
    });

    it('debe limpiar el redo stack al agregar nueva acción', async () => {
      historyManager.push(createTestAction(1));
      historyManager.push(createTestAction(2));
      await historyManager.undo();

      expect(historyManager.canRedo()).toBe(true);

      historyManager.push(createTestAction(3));
      expect(historyManager.canRedo()).toBe(false);
      expect(historyManager.getState().redoCount).toBe(0);
    });

    it('debe respetar el límite máximo de historial', () => {
      for (let i = 0; i < 10; i++) {
        historyManager.push(createTestAction(i));
      }

      expect(historyManager.getState().undoCount).toBe(5);
    });

    it('debe rechazar acciones sin campos requeridos', () => {
      expect(() => {
        historyManager.push({ type: 'test' });
      }).toThrow(/falta campo/);

      expect(() => {
        historyManager.push({
          type: 'test',
          description: 'test',
          undo: () => {}
        });
      }).toThrow(/falta campo 'redo'/);
    });

    it('debe agregar timestamp a las acciones', () => {
      const before = Date.now();
      historyManager.push(createTestAction(1));
      const after = Date.now();

      const state = historyManager.getState();
      expect(state.lastAction.timestamp).toBeGreaterThanOrEqual(before);
      expect(state.lastAction.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('undo', () => {
    it('debe deshacer la última acción', async () => {
      const action = createTestAction(1);
      historyManager.push(action);

      const result = await historyManager.undo();

      expect(result.type).toBe('action-1');
      expect(action.undo).toHaveBeenCalledWith(action.data);
      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(true);
    });

    it('debe retornar null si no hay acciones', async () => {
      const result = await historyManager.undo();
      expect(result).toBeNull();
    });

    it('debe mover la acción al redo stack', async () => {
      historyManager.push(createTestAction(1));
      historyManager.push(createTestAction(2));

      await historyManager.undo();

      expect(historyManager.getState().undoCount).toBe(1);
      expect(historyManager.getState().redoCount).toBe(1);
    });

    it('debe emitir evento undo', async () => {
      const listener = jest.fn();
      historyManager.on('undo', listener);
      historyManager.push(createTestAction(1));

      await historyManager.undo();

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'action-1' }));
    });
  });

  describe('redo', () => {
    it('debe rehacer la última acción deshecha', async () => {
      const action = createTestAction(1);
      historyManager.push(action);
      await historyManager.undo();

      const result = await historyManager.redo();

      expect(result.type).toBe('action-1');
      expect(action.redo).toHaveBeenCalledWith(action.data);
      expect(historyManager.canUndo()).toBe(true);
      expect(historyManager.canRedo()).toBe(false);
    });

    it('debe retornar null si no hay acciones para rehacer', async () => {
      const result = await historyManager.redo();
      expect(result).toBeNull();
    });

    it('debe mover la acción de vuelta al undo stack', async () => {
      historyManager.push(createTestAction(1));
      await historyManager.undo();
      await historyManager.redo();

      expect(historyManager.getState().undoCount).toBe(1);
      expect(historyManager.getState().redoCount).toBe(0);
    });

    it('debe emitir evento redo', async () => {
      const listener = jest.fn();
      historyManager.on('redo', listener);
      historyManager.push(createTestAction(1));
      await historyManager.undo();

      await historyManager.redo();

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'action-1' }));
    });
  });

  describe('getState', () => {
    it('debe retornar estado vacío inicialmente', () => {
      const state = historyManager.getState();

      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
      expect(state.undoCount).toBe(0);
      expect(state.redoCount).toBe(0);
      expect(state.lastAction).toBeNull();
      expect(state.nextRedo).toBeNull();
    });

    it('debe reflejar el estado correctamente después de operaciones', async () => {
      historyManager.push(createTestAction(1));
      historyManager.push(createTestAction(2));
      await historyManager.undo();

      const state = historyManager.getState();

      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(true);
      expect(state.undoCount).toBe(1);
      expect(state.redoCount).toBe(1);
      expect(state.lastAction.type).toBe('action-1');
      expect(state.nextRedo.type).toBe('action-2');
    });
  });

  describe('getUndoDescription / getRedoDescription', () => {
    it('debe retornar descripciones correctas', async () => {
      historyManager.push(createTestAction(1));
      historyManager.push(createTestAction(2));
      await historyManager.undo();

      expect(historyManager.getUndoDescription()).toBe('Test action 1');
      expect(historyManager.getRedoDescription()).toBe('Test action 2');
    });

    it('debe retornar null cuando no hay acciones', () => {
      expect(historyManager.getUndoDescription()).toBeNull();
      expect(historyManager.getRedoDescription()).toBeNull();
    });
  });

  describe('clear', () => {
    it('debe limpiar todo el historial', async () => {
      historyManager.push(createTestAction(1));
      historyManager.push(createTestAction(2));
      await historyManager.undo();

      historyManager.clear();

      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(false);
      expect(historyManager.getState().undoCount).toBe(0);
      expect(historyManager.getState().redoCount).toBe(0);
    });

    it('debe emitir evento change', () => {
      const listener = jest.fn();
      historyManager.on('change', listener);
      historyManager.push(createTestAction(1));

      historyManager.clear();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('getHistorySummary', () => {
    it('debe retornar resumen del historial', async () => {
      historyManager.push(createTestAction(1));
      historyManager.push(createTestAction(2));
      await historyManager.undo();

      const summary = historyManager.getHistorySummary();

      expect(summary.undoStack).toHaveLength(1);
      expect(summary.redoStack).toHaveLength(1);
      expect(summary.undoStack[0].type).toBe('action-1');
      expect(summary.redoStack[0].type).toBe('action-2');
    });
  });

  describe('prevención de recursión', () => {
    it('no debe agregar acciones durante undo/redo', async () => {
      const action = {
        type: 'recursive',
        description: 'Recursive action',
        data: {},
        undo: jest.fn().mockImplementation(async () => {
          // Intentar agregar durante undo (debería ser ignorado)
          historyManager.push(createTestAction('nested'));
        }),
        redo: jest.fn()
      };

      historyManager.push(action);
      await historyManager.undo();

      // Solo debería haber 1 acción en redo, no la anidada
      expect(historyManager.getState().redoCount).toBe(1);
      expect(historyManager.getState().undoCount).toBe(0);
    });
  });

  describe('manejo de errores', () => {
    it('debe restaurar acción si undo falla', async () => {
      const action = {
        type: 'failing',
        description: 'Failing action',
        data: {},
        undo: jest.fn().mockRejectedValue(new Error('Undo failed')),
        redo: jest.fn()
      };

      historyManager.push(action);

      await expect(historyManager.undo()).rejects.toThrow('Undo failed');
      expect(historyManager.canUndo()).toBe(true); // Acción restaurada
    });

    it('debe restaurar acción si redo falla', async () => {
      const action = {
        type: 'failing',
        description: 'Failing action',
        data: {},
        undo: jest.fn(),
        redo: jest.fn().mockRejectedValue(new Error('Redo failed'))
      };

      historyManager.push(action);
      await historyManager.undo();

      await expect(historyManager.redo()).rejects.toThrow('Redo failed');
      expect(historyManager.canRedo()).toBe(true); // Acción restaurada
    });
  });

  describe('eventos', () => {
    it('debe emitir change en cada operación', async () => {
      const listener = jest.fn();
      historyManager.on('change', listener);

      historyManager.push(createTestAction(1));
      expect(listener).toHaveBeenCalledTimes(1);

      await historyManager.undo();
      expect(listener).toHaveBeenCalledTimes(2);

      await historyManager.redo();
      expect(listener).toHaveBeenCalledTimes(3);

      historyManager.clear();
      expect(listener).toHaveBeenCalledTimes(4);
    });
  });
});
