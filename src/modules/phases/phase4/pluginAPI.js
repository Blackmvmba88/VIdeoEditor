/**
 * BlackMamba Studio - Plugin API
 * 
 * API pública para desarrollo de plugins.
 * 
 * @module PluginAPI
 */

class PluginAPI {
  constructor() {
    this.version = '1.0.0';
  }

  createPlugin(config) {
    const {
      id,
      name,
      version,
      description,
      author,
      init,
      hooks = {},
      commands = {},
      ui = null
    } = config;

    return {
      id,
      name,
      version,
      description,
      author,
      init: async function() {
        if (init) await init();
        return { success: true };
      },
      hooks,
      commands,
      ui,
      api: this.getAPIInterface()
    };
  }

  getAPIInterface() {
    return {
      registerEffect: (effectId, effect) => ({
        success: true,
        effectId,
        message: 'Effect registered'
      }),
      registerFilter: (filterId, filter) => ({
        success: true,
        filterId,
        message: 'Filter registered'
      }),
      registerExporter: (exporterId, exporter) => ({
        success: true,
        exporterId,
        message: 'Exporter registered'
      }),
      getProjectInfo: () => ({
        name: 'Current Project',
        duration: 120,
        tracks: 3
      }),
      showNotification: (message, type = 'info') => ({
        success: true,
        message,
        type
      })
    };
  }

  getDocumentation() {
    return {
      version: this.version,
      hooks: [
        'pre-render',
        'post-render',
        'pre-export',
        'post-export',
        'timeline-update',
        'effect-apply',
        'import-file'
      ],
      api: {
        registerEffect: 'Register a custom video effect',
        registerFilter: 'Register a custom filter',
        registerExporter: 'Register a custom export format',
        getProjectInfo: 'Get current project information',
        showNotification: 'Show a notification to the user'
      }
    };
  }
}

module.exports = PluginAPI;
