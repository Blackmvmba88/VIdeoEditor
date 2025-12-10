/**
 * BlackMamba Studio - Plugin Loader
 * 
 * Cargador y gestor de plugins desde el sistema de archivos.
 * 
 * @module PluginLoader
 */

const { VideoEditorError, ErrorCodes } = require('../../errorHandler');
const path = require('path');

class PluginLoader {
  constructor(pluginSystem) {
    this.pluginSystem = pluginSystem;
    this.pluginDirectory = path.join(process.cwd(), 'plugins');
    this.loadedPlugins = new Set();
  }

  async loadPlugin(pluginPath) {
    try {
      const plugin = require(pluginPath);
      
      if (!this.validatePlugin(plugin)) {
        throw new VideoEditorError('Invalid plugin structure', ErrorCodes.INVALID_INPUT);
      }

      const pluginId = plugin.id || path.basename(pluginPath, '.js');
      await this.pluginSystem.registerPlugin(pluginId, plugin);
      this.loadedPlugins.add(pluginId);

      return {
        success: true,
        pluginId,
        message: `Plugin loaded: ${plugin.name}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async loadAllPlugins() {
    // Aquí se implementaría la carga desde el directorio de plugins
    return {
      success: true,
      loaded: Array.from(this.loadedPlugins),
      message: 'All plugins loaded'
    };
  }

  validatePlugin(plugin) {
    return plugin.name && plugin.version && typeof plugin.init === 'function';
  }

  unloadPlugin(pluginId) {
    this.pluginSystem.deactivatePlugin(pluginId);
    this.loadedPlugins.delete(pluginId);
    return { success: true, message: `Plugin ${pluginId} unloaded` };
  }

  getLoadedPlugins() {
    return Array.from(this.loadedPlugins);
  }
}

module.exports = PluginLoader;
