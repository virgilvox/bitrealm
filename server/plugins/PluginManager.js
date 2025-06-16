/**
 * @file Plugin Manager
 * @description Manages plugin loading, lifecycle, and hooks
 */

import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { query } from '../database/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class PluginManager {
  constructor() {
    this.plugins = new Map()
    this.hooks = new Map()
    this.pluginDir = path.join(__dirname, '../../plugins')
  }

  /**
   * Initialize plugin system
   */
  async initialize() {
    try {
      // Ensure plugins directory exists
      await fs.mkdir(this.pluginDir, { recursive: true })
      
      // Load installed plugins from database
      const installedPlugins = await this.getInstalledPlugins()
      
      // Load each plugin
      for (const plugin of installedPlugins) {
        try {
          await this.loadPlugin(plugin.name, plugin.version)
        } catch (error) {
          console.error(`Failed to load plugin ${plugin.name}:`, error)
        }
      }
      
      console.log(`✅ Loaded ${this.plugins.size} plugins`)
    } catch (error) {
      console.error('Failed to initialize plugin system:', error)
    }
  }

  /**
   * Get installed plugins from database
   */
  async getInstalledPlugins() {
    try {
      const result = await query(
        'SELECT name, version, manifest FROM plugins WHERE is_active = true',
        []
      )
      return result.rows
    } catch (error) {
      console.error('Error loading installed plugins:', error)
      return []
    }
  }

  /**
   * Load a plugin
   * @param {string} pluginName - Plugin name
   * @param {string} version - Plugin version
   */
  async loadPlugin(pluginName, version) {
    const pluginPath = path.join(this.pluginDir, pluginName, 'index.js')
    
    try {
      // Check if plugin file exists
      await fs.access(pluginPath)
      
      // Import plugin module
      const pluginModule = await import(pluginPath)
      
      if (!pluginModule.registerPlugin || typeof pluginModule.registerPlugin !== 'function') {
        throw new Error('Plugin must export a registerPlugin function')
      }
      
      // Create plugin API
      const pluginAPI = this.createPluginAPI(pluginName)
      
      // Register plugin
      pluginModule.registerPlugin(pluginAPI)
      
      // Store plugin info
      this.plugins.set(pluginName, {
        name: pluginName,
        version: version,
        module: pluginModule,
        enabled: true
      })
      
      console.log(`Loaded plugin: ${pluginName} v${version}`)
    } catch (error) {
      throw new Error(`Failed to load plugin ${pluginName}: ${error.message}`)
    }
  }

  /**
   * Create plugin API for a specific plugin
   * @param {string} pluginName - Plugin name
   */
  createPluginAPI(pluginName) {
    const self = this
    
    return {
      hooks: {
        /**
         * Extend schema for an entity
         * @param {string} entity - Entity type (map, item, etc.)
         * @param {object} schemaExtension - JSON Schema extension
         */
        extendSchema(entity, schemaExtension) {
          self.registerHook('schema.extend', {
            plugin: pluginName,
            entity: entity,
            extension: schemaExtension
          })
        },
        
        /**
         * Register initialization hook
         * @param {Function} callback - Initialization callback
         */
        onInit(callback) {
          self.registerHook('plugin.init', {
            plugin: pluginName,
            callback: callback
          })
        },
        
        /**
         * Register tick hook (called every game tick)
         * @param {Function} callback - Tick callback
         */
        onTick(callback) {
          self.registerHook('game.tick', {
            plugin: pluginName,
            callback: callback
          })
        },
        
        /**
         * Register action hook
         * @param {string} action - Action name
         * @param {Function} callback - Action callback
         */
        onAction(action, callback) {
          self.registerHook(`action.${action}`, {
            plugin: pluginName,
            callback: callback
          })
        },
        
        /**
         * Register render hook (client-side)
         * @param {Function} callback - Render callback
         */
        onRender(callback) {
          self.registerHook('render', {
            plugin: pluginName,
            callback: callback
          })
        },
        
        /**
         * Register custom DSL command
         * @param {string} command - Command name
         * @param {Function} handler - Command handler
         */
        registerCommand(command, handler) {
          self.registerHook(`dsl.command.${command}`, {
            plugin: pluginName,
            handler: handler
          })
        }
      },
      
      events: {
        /**
         * Emit an event
         * @param {string} event - Event name
         * @param {object} data - Event data
         */
        emit(event, data) {
          self.emitEvent(event, data, pluginName)
        },
        
        /**
         * Listen for an event
         * @param {string} event - Event name
         * @param {Function} callback - Event callback
         */
        on(event, callback) {
          self.registerHook(`event.${event}`, {
            plugin: pluginName,
            callback: callback
          })
        }
      },
      
      storage: {
        /**
         * Get plugin storage
         * @param {string} key - Storage key
         * @returns {Promise<any>} Stored value
         */
        async get(key) {
          return self.getPluginStorage(pluginName, key)
        },
        
        /**
         * Set plugin storage
         * @param {string} key - Storage key
         * @param {any} value - Value to store
         */
        async set(key, value) {
          return self.setPluginStorage(pluginName, key, value)
        }
      },
      
      /**
       * Register UI component (client-side)
       * @param {object} component - Vue component
       */
      registerUI(component) {
        self.registerHook('ui.component', {
          plugin: pluginName,
          component: component
        })
      }
    }
  }

  /**
   * Register a hook
   * @param {string} hookName - Hook name
   * @param {object} hookData - Hook data
   */
  registerHook(hookName, hookData) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, [])
    }
    
    this.hooks.get(hookName).push(hookData)
  }

  /**
   * Execute hooks for a given hook name
   * @param {string} hookName - Hook name
   * @param {object} context - Hook context
   * @returns {Promise<any[]>} Hook results
   */
  async executeHooks(hookName, context = {}) {
    const hooks = this.hooks.get(hookName) || []
    const results = []
    
    for (const hook of hooks) {
      try {
        const plugin = this.plugins.get(hook.plugin)
        if (plugin && plugin.enabled) {
          const result = await (hook.callback || hook.handler)(context)
          results.push(result)
        }
      } catch (error) {
        console.error(`Error executing hook ${hookName} from plugin ${hook.plugin}:`, error)
      }
    }
    
    return results
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {object} data - Event data
   * @param {string} source - Event source plugin
   */
  emitEvent(event, data, source) {
    this.executeHooks(`event.${event}`, {
      ...data,
      _source: source,
      _timestamp: Date.now()
    })
  }

  /**
   * Get plugin storage
   * @param {string} pluginName - Plugin name
   * @param {string} key - Storage key
   * @returns {Promise<any>} Stored value
   */
  async getPluginStorage(pluginName, key) {
    try {
      const result = await query(
        `SELECT value FROM plugin_storage WHERE plugin_name = $1 AND key = $2`,
        [pluginName, key]
      )
      
      if (result.rows.length > 0) {
        return JSON.parse(result.rows[0].value)
      }
      
      return null
    } catch (error) {
      console.error('Error getting plugin storage:', error)
      return null
    }
  }

  /**
   * Set plugin storage
   * @param {string} pluginName - Plugin name
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  async setPluginStorage(pluginName, key, value) {
    try {
      await query(
        `INSERT INTO plugin_storage (plugin_name, key, value)
         VALUES ($1, $2, $3)
         ON CONFLICT (plugin_name, key)
         DO UPDATE SET value = $3, updated_at = NOW()`,
        [pluginName, key, JSON.stringify(value)]
      )
    } catch (error) {
      console.error('Error setting plugin storage:', error)
    }
  }

  /**
   * Unload a plugin
   * @param {string} pluginName - Plugin name
   */
  async unloadPlugin(pluginName) {
    const plugin = this.plugins.get(pluginName)
    if (!plugin) return
    
    // Execute cleanup hooks
    await this.executeHooks('plugin.cleanup', { plugin: pluginName })
    
    // Remove all hooks from this plugin
    for (const [hookName, hooks] of this.hooks.entries()) {
      this.hooks.set(
        hookName, 
        hooks.filter(hook => hook.plugin !== pluginName)
      )
    }
    
    // Remove plugin
    this.plugins.delete(pluginName)
    
    console.log(`Unloaded plugin: ${pluginName}`)
  }

  /**
   * Get loaded plugins
   * @returns {Array} List of loaded plugins
   */
  getLoadedPlugins() {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      enabled: plugin.enabled
    }))
  }

  /**
   * Enable/disable a plugin
   * @param {string} pluginName - Plugin name
   * @param {boolean} enabled - Enable state
   */
  setPluginEnabled(pluginName, enabled) {
    const plugin = this.plugins.get(pluginName)
    if (plugin) {
      plugin.enabled = enabled
      console.log(`Plugin ${pluginName} ${enabled ? 'enabled' : 'disabled'}`)
    }
  }
}

// Singleton instance
export const pluginManager = new PluginManager()