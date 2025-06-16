import { Room } from '@colyseus/core'
import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema'

class EditorUser extends Schema {
  constructor() {
    super()
    this.id = ''
    this.name = ''
    this.color = '#ff0000'
    this.cursorX = 0
    this.cursorY = 0
    this.selectedTool = 'select'
    this.selectedLayer = null
    this.isActive = true
  }
}

EditorUser.defineSchema({
  id: 'string',
  name: 'string',
  color: 'string',
  cursorX: 'number',
  cursorY: 'number',
  selectedTool: 'string',
  selectedLayer: 'string',
  isActive: 'boolean'
})

class EditorState extends Schema {
  constructor() {
    super()
    this.projectId = ''
    this.projectName = ''
    this.users = new MapSchema()
    this.version = 0
    this.locked = false
    this.lockedBy = null
  }
}

EditorState.defineSchema({
  projectId: 'string',
  projectName: 'string',
  users: { map: EditorUser },
  version: 'number',
  locked: 'boolean',
  lockedBy: 'string'
})

export class EditorRoom extends Room {
  maxClients = 10 // Limit concurrent editors
  
  onCreate(options) {
    console.log('EditorRoom created for project:', options.projectId)
    
    this.setState(new EditorState())
    this.state.projectId = options.projectId || 'default'
    this.state.projectName = options.projectName || 'Untitled Project'
    
    // Load project data
    this.loadProject(this.state.projectId)
    
    // Set up message handlers
    this.onMessage('cursor', this.onCursorMove.bind(this))
    this.onMessage('tool', this.onToolChange.bind(this))
    this.onMessage('edit', this.onEdit.bind(this))
    this.onMessage('save', this.onSave.bind(this))
    this.onMessage('lock', this.onLock.bind(this))
    this.onMessage('unlock', this.onUnlock.bind(this))
    this.onMessage('chat', this.onChat.bind(this))

    // Auto-save interval (every 2 minutes)
    this.autoSaveInterval = this.clock.setInterval(() => {
      this.autoSave()
    }, 120000)
  }

  async loadProject(projectId) {
    try {
      // TODO: Load from database
      this.projectData = {
        id: projectId,
        name: this.state.projectName,
        maps: [],
        characters: [],
        items: [],
        scripts: [],
        assets: [],
        version: 0
      }
      
      console.log(`Project ${projectId} loaded for editing`)
    } catch (error) {
      console.error('Error loading project:', error)
    }
  }

  onJoin(client, options) {
    console.log(`Editor ${client.sessionId} joined project ${this.state.projectId}`)
    
    // Generate a unique color for this user
    const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff']
    const color = colors[Object.keys(this.state.users).length % colors.length]
    
    // Create editor user
    const user = new EditorUser()
    user.id = client.sessionId
    user.name = options.userName || `Editor_${client.sessionId.slice(0, 6)}`
    user.color = color
    
    this.state.users.set(client.sessionId, user)
    
    // Send current project state to the new user
    client.send('projectData', {
      project: this.projectData,
      version: this.state.version,
      isReadOnly: this.state.locked && this.state.lockedBy !== client.sessionId
    })
    
    // Notify other users
    this.broadcast('userJoined', {
      userId: client.sessionId,
      userName: user.name,
      color: user.color
    }, { except: client })
  }

  onLeave(client, consented) {
    console.log(`Editor ${client.sessionId} left project ${this.state.projectId}`)
    
    const user = this.state.users.get(client.sessionId)
    if (user) {
      // If this user had the project locked, unlock it
      if (this.state.locked && this.state.lockedBy === client.sessionId) {
        this.state.locked = false
        this.state.lockedBy = null
        this.broadcast('unlocked', {})
      }
      
      this.state.users.delete(client.sessionId)
      
      // Notify other users
      this.broadcast('userLeft', {
        userId: client.sessionId,
        userName: user.name
      })
    }
  }

  onCursorMove(client, message) {
    const user = this.state.users.get(client.sessionId)
    if (user) {
      user.cursorX = message.x
      user.cursorY = message.y
      
      // Broadcast cursor position to other users
      this.broadcast('cursor', {
        userId: client.sessionId,
        x: message.x,
        y: message.y
      }, { except: client })
    }
  }

  onToolChange(client, message) {
    const user = this.state.users.get(client.sessionId)
    if (user) {
      user.selectedTool = message.tool
      user.selectedLayer = message.layer || null
      
      // Broadcast tool change
      this.broadcast('toolChanged', {
        userId: client.sessionId,
        tool: message.tool,
        layer: message.layer
      }, { except: client })
    }
  }

  onEdit(client, message) {
    // Check if project is locked by someone else
    if (this.state.locked && this.state.lockedBy !== client.sessionId) {
      client.send('error', { message: 'Project is locked by another user' })
      return
    }

    const user = this.state.users.get(client.sessionId)
    if (!user) return

    try {
      // Apply the edit operation
      this.applyEdit(message.operation, client.sessionId)
      
      // Increment version
      this.state.version++
      
      // Broadcast edit to all other users
      this.broadcast('edit', {
        operation: message.operation,
        userId: client.sessionId,
        userName: user.name,
        version: this.state.version
      }, { except: client })
      
      // Mark project as dirty for auto-save
      this.isDirty = true
      
    } catch (error) {
      console.error('Error applying edit:', error)
      client.send('error', { message: 'Failed to apply edit operation' })
    }
  }

  applyEdit(operation, userId) {
    switch (operation.type) {
      case 'map.tile.set':
        this.setMapTile(operation)
        break
      
      case 'map.tile.erase':
        this.eraseMapTile(operation)
        break
      
      case 'map.object.add':
        this.addMapObject(operation)
        break
      
      case 'map.object.move':
        this.moveMapObject(operation)
        break
      
      case 'map.object.delete':
        this.deleteMapObject(operation)
        break
      
      case 'character.add':
        this.addCharacter(operation)
        break
      
      case 'character.update':
        this.updateCharacter(operation)
        break
      
      case 'character.delete':
        this.deleteCharacter(operation)
        break
      
      case 'script.update':
        this.updateScript(operation)
        break
      
      default:
        throw new Error(`Unknown operation type: ${operation.type}`)
    }
  }

  setMapTile(operation) {
    const { mapId, layerId, x, y, tileId } = operation.data
    
    // Find or create map
    let map = this.projectData.maps.find(m => m.id === mapId)
    if (!map) {
      map = { id: mapId, layers: [], width: 100, height: 100, tileSize: 32 }
      this.projectData.maps.push(map)
    }
    
    // Find or create layer
    let layer = map.layers.find(l => l.id === layerId)
    if (!layer) {
      layer = { id: layerId, tiles: [], visible: true, opacity: 1 }
      map.layers.push(layer)
    }
    
    // Set tile
    const existingTileIndex = layer.tiles.findIndex(t => t.x === x && t.y === y)
    if (existingTileIndex !== -1) {
      layer.tiles[existingTileIndex].tileId = tileId
    } else {
      layer.tiles.push({ x, y, tileId })
    }
  }

  eraseMapTile(operation) {
    const { mapId, layerId, x, y } = operation.data
    
    const map = this.projectData.maps.find(m => m.id === mapId)
    if (!map) return
    
    const layer = map.layers.find(l => l.id === layerId)
    if (!layer) return
    
    // Remove tile
    layer.tiles = layer.tiles.filter(t => !(t.x === x && t.y === y))
  }

  addMapObject(operation) {
    const { mapId, object } = operation.data
    
    let map = this.projectData.maps.find(m => m.id === mapId)
    if (!map) {
      map = { id: mapId, layers: [], objects: [], width: 100, height: 100, tileSize: 32 }
      this.projectData.maps.push(map)
    }
    
    if (!map.objects) {
      map.objects = []
    }
    
    map.objects.push(object)
  }

  moveMapObject(operation) {
    const { mapId, objectId, x, y } = operation.data
    
    const map = this.projectData.maps.find(m => m.id === mapId)
    if (!map || !map.objects) return
    
    const object = map.objects.find(o => o.id === objectId)
    if (object) {
      object.x = x
      object.y = y
    }
  }

  deleteMapObject(operation) {
    const { mapId, objectId } = operation.data
    
    const map = this.projectData.maps.find(m => m.id === mapId)
    if (!map || !map.objects) return
    
    map.objects = map.objects.filter(o => o.id !== objectId)
  }

  addCharacter(operation) {
    const { character } = operation.data
    this.projectData.characters.push(character)
  }

  updateCharacter(operation) {
    const { characterId, updates } = operation.data
    
    const character = this.projectData.characters.find(c => c.id === characterId)
    if (character) {
      Object.assign(character, updates)
    }
  }

  deleteCharacter(operation) {
    const { characterId } = operation.data
    this.projectData.characters = this.projectData.characters.filter(c => c.id !== characterId)
  }

  updateScript(operation) {
    const { scriptId, content } = operation.data
    
    let script = this.projectData.scripts.find(s => s.id === scriptId)
    if (!script) {
      script = { id: scriptId, content: '', type: 'dsl' }
      this.projectData.scripts.push(script)
    }
    
    script.content = content
    script.updatedAt = new Date()
  }

  onSave(client, message) {
    this.saveProject()
    client.send('saved', { version: this.state.version })
  }

  onLock(client, message) {
    if (!this.state.locked) {
      this.state.locked = true
      this.state.lockedBy = client.sessionId
      
      const user = this.state.users.get(client.sessionId)
      this.broadcast('locked', {
        userId: client.sessionId,
        userName: user?.name || 'Unknown'
      })
    }
  }

  onUnlock(client, message) {
    if (this.state.locked && this.state.lockedBy === client.sessionId) {
      this.state.locked = false
      this.state.lockedBy = null
      
      this.broadcast('unlocked', {})
    }
  }

  onChat(client, message) {
    const user = this.state.users.get(client.sessionId)
    if (user) {
      this.broadcast('chat', {
        userId: client.sessionId,
        userName: user.name,
        message: message.text,
        timestamp: Date.now()
      })
    }
  }

  async saveProject() {
    try {
      console.log(`Saving project ${this.state.projectId}...`)
      // TODO: Save to database
      this.isDirty = false
      console.log('Project saved successfully')
    } catch (error) {
      console.error('Error saving project:', error)
    }
  }

  async autoSave() {
    if (this.isDirty) {
      console.log('Auto-saving project...')
      await this.saveProject()
    }
  }

  onDispose() {
    console.log('EditorRoom disposed')
    
    if (this.autoSaveInterval) {
      this.autoSaveInterval.clear()
    }
    
    // Final save
    if (this.isDirty) {
      this.saveProject()
    }
  }
}