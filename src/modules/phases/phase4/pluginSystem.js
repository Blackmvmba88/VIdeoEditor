/**
 * BlackMamba Studio - Plugin System
 * 
 * Sistema de arquitectura de plugins que permite extender funcionalidad.
 * 
 * @module PluginSystem
 */

const { VideoEditorError, ErrorCodes } = require('../../errorHandler');

class PluginSystem {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
    this.initializeHooks();
  }

  initializeHooks() {
    const hookPoints = [
      'pre-render',
      'post-render',
      'pre-export',
      'post-export',
      'timeline-update',
      'effect-apply',
      'import-file'
    ];
    
    for (const hook of hookPoints) {
      this.hooks.set(hook, []);
    }
  }

  registerPlugin(pluginId, plugin) {
    if (this.plugins.has(pluginId)) {
      throw new VideoEditorError(`Plugin ${pluginId} already registered`, ErrorCodes.INVALID_INPUT);
    }

    if (!plugin.name || !plugin.version || !plugin.init) {
      throw new VideoEditorError('Invalid plugin structure', ErrorCodes.INVALID_INPUT);
    }

    this.plugins.set(pluginId, {
      ...plugin,
      active: false,
      initialized: false
    });

    return { success: true, message: `Plugin ${pluginId} registered` };
  }

  async activatePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new VideoEditorError(`Plugin ${pluginId} not found`, ErrorCodes.INVALID_INPUT);
    }

    if (!plugin.initialized) {
      await plugin.init();
      plugin.initialized = true;
    }

    plugin.active = true;
    return { success: true, message: `Plugin ${pluginId} activated` };
  }

  deactivatePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.active = false;
    }
    return { success: true, message: `Plugin ${pluginId} deactivated` };
  }

  registerHook(hookName, callback, pluginId) {
    if (!this.hooks.has(hookName)) {
      throw new VideoEditorError(`Hook ${hookName} not found`, ErrorCodes.INVALID_INPUT);
    }

    this.hooks.get(hookName).push({ callback, pluginId });
    return { success: true };
  }

  async executeHook(hookName, data) {
    const callbacks = this.hooks.get(hookName) || [];
    let result = data;

    for (const { callback, pluginId } of callbacks) {
      const plugin = this.plugins.get(pluginId);
      if (plugin && plugin.active) {
        result = await callback(result);
      }
    }

    return result;
  }

  getPlugins() {
    return Array.from(this.plugins.entries()).map(([id, plugin]) => ({
      id,
      name: plugin.name,
      version: plugin.version,
      active: plugin.active,
      description: plugin.description
    }));
  }

  getPluginInfo(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new VideoEditorError(`Plugin ${pluginId} not found`, ErrorCodes.INVALID_INPUT);
    }
    return plugin;
  }
}

module.exports = PluginSystem;
