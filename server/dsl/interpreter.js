import { DSLParser } from './parser.js'

/**
 * DSL Interpreter for bitrealm game logic
 * Executes the custom domain-specific language for game events
 */
export class DSLInterpreter {
  constructor(room) {
    this.room = room
    this.parser = new DSLParser()
    this.eventHandlers = new Map()
    this.variables = new Map()
    this.functions = new Map()
    
    // Initialize built-in functions
    this.initBuiltinFunctions()
  }

  initBuiltinFunctions() {
    // Player functions
    this.functions.set('giveItem', (player, itemId, quantity = 1) => {
      return this.giveItem(player, itemId, quantity)
    })

    this.functions.set('warp', (player, mapId, x, y) => {
      return this.warp(player, mapId, x, y)
    })

    this.functions.set('heal', (player, amount) => {
      player.health = Math.min(player.maxHealth, player.health + amount)
      return true
    })

    this.functions.set('damage', (player, amount) => {
      player.health = Math.max(0, player.health - amount)
      return true
    })

    this.functions.set('giveExp', (player, amount) => {
      player.experience += amount
      this.checkLevelUp(player)
      return true
    })

    this.functions.set('giveGold', (player, amount) => {
      player.gold = (player.gold || 0) + amount
      return true
    })

    // Communication functions
    this.functions.set('emit', (channel, message, data = {}) => {
      if (channel === 'chat') {
        this.room.broadcast('chat', {
          playerId: 'system',
          playerName: 'System',
          message: message.replace(/\$playerName/g, data.playerName || ''),
          timestamp: Date.now(),
          type: 'system'
        })
      } else {
        this.room.broadcast(channel, { message, ...data })
      }
      return true
    })

    this.functions.set('whisper', (player, message) => {
      const client = this.room.clients.find(c => c.sessionId === player.id)
      if (client) {
        client.send('whisper', { message })
      }
      return true
    })

    // World functions
    this.functions.set('spawnNPC', (npcId, x, y, data = {}) => {
      return this.spawnNPC(npcId, x, y, data)
    })

    this.functions.set('spawnItem', (itemId, x, y, data = {}) => {
      return this.spawnItem(itemId, x, y, data)
    })

    this.functions.set('removeNPC', (npcId) => {
      this.room.state.npcs.delete(npcId)
      return true
    })

    // Quest functions
    this.functions.set('startQuest', (player, questId) => {
      return this.startQuest(player, questId)
    })

    this.functions.set('completeQuest', (player, questId) => {
      return this.completeQuest(player, questId)
    })

    // Utility functions
    this.functions.set('wait', async (duration) => {
      return new Promise(resolve => {
        setTimeout(resolve, duration * 1000)
      })
    })

    this.functions.set('random', (min, max) => {
      return Math.floor(Math.random() * (max - min + 1)) + min
    })

    this.functions.set('distance', (entity1, entity2) => {
      return Math.sqrt(
        Math.pow(entity1.x - entity2.x, 2) + 
        Math.pow(entity1.y - entity2.y, 2)
      )
    })
  }

  loadScript(scriptData) {
    try {
      const ast = this.parser.parse(scriptData.content)
      
      for (const eventBlock of ast.events) {
        if (!this.eventHandlers.has(eventBlock.event)) {
          this.eventHandlers.set(eventBlock.event, [])
        }
        
        this.eventHandlers.get(eventBlock.event).push({
          id: scriptData.id,
          statements: eventBlock.statements,
          conditions: eventBlock.conditions || []
        })
      }
      
      console.log(`Loaded script: ${scriptData.id}`)
    } catch (error) {
      console.error(`Error loading script ${scriptData.id}:`, error)
    }
  }

  fireEvent(eventName, context) {
    const handlers = this.eventHandlers.get(eventName)
    if (!handlers) return

    for (const handler of handlers) {
      try {
        // Check conditions
        if (handler.conditions.length > 0) {
          const conditionsMet = handler.conditions.every(condition => 
            this.evaluateCondition(condition, context)
          )
          if (!conditionsMet) continue
        }

        // Execute statements
        this.executeStatements(handler.statements, context)
      } catch (error) {
        console.error(`Error executing ${eventName} handler:`, error)
      }
    }
  }

  executeStatements(statements, context) {
    for (const statement of statements) {
      this.executeStatement(statement, context)
    }
  }

  executeStatement(statement, context) {
    switch (statement.type) {
      case 'assignment':
        this.executeAssignment(statement, context)
        break
      
      case 'if':
        this.executeIf(statement, context)
        break
      
      case 'give':
        this.executeGive(statement, context)
        break
      
      case 'warp':
        this.executeWarp(statement, context)
        break
      
      case 'emit':
        this.executeEmit(statement, context)
        break
      
      case 'wait':
        this.executeWait(statement, context)
        break
      
      case 'script':
        this.executeScript(statement, context)
        break
      
      default:
        console.warn(`Unknown statement type: ${statement.type}`)
    }
  }

  executeAssignment(statement, context) {
    const value = this.evaluateExpression(statement.value, context)
    this.variables.set(statement.variable, value)
  }

  executeIf(statement, context) {
    const condition = this.evaluateCondition(statement.condition, context)
    if (condition) {
      this.executeStatements(statement.thenStatements, context)
    } else if (statement.elseStatements) {
      this.executeStatements(statement.elseStatements, context)
    }
  }

  executeGive(statement, context) {
    const player = this.resolvePlayerRef(statement.player, context)
    const itemId = this.evaluateExpression(statement.item, context)
    const quantity = this.evaluateExpression(statement.quantity, context)
    
    if (player) {
      this.giveItem(player, itemId, quantity)
    }
  }

  executeWarp(statement, context) {
    const player = this.resolvePlayerRef(statement.player, context)
    const mapId = this.evaluateExpression(statement.mapId, context)
    const x = this.evaluateExpression(statement.x, context)
    const y = this.evaluateExpression(statement.y, context)
    
    if (player) {
      this.warp(player, mapId, x, y)
    }
  }

  executeEmit(statement, context) {
    const channel = this.evaluateExpression(statement.channel, context)
    const message = this.evaluateExpression(statement.message, context)
    
    this.functions.get('emit')(channel, message, context)
  }

  executeWait(statement, context) {
    const duration = this.evaluateExpression(statement.duration, context)
    return this.functions.get('wait')(duration)
  }

  executeScript(statement, context) {
    // Execute JavaScript block with JSDoc types
    try {
      // Create a safe execution context
      const safeContext = {
        player: context.player,
        npc: context.npc,
        item: context.item,
        client: context.client,
        room: this.room,
        ...Object.fromEntries(this.functions),
        console: {
          log: (...args) => console.log('[DSL Script]', ...args)
        }
      }

      // Execute the JavaScript code
      const fn = new Function(...Object.keys(safeContext), statement.code)
      fn(...Object.values(safeContext))
    } catch (error) {
      console.error('Error executing script block:', error)
    }
  }

  evaluateCondition(condition, context) {
    const left = this.evaluateExpression(condition.left, context)
    const right = this.evaluateExpression(condition.right, context)
    
    switch (condition.operator) {
      case '==': return left == right
      case '!=': return left != right
      case '>': return left > right
      case '<': return left < right
      case '>=': return left >= right
      case '<=': return left <= right
      default: return false
    }
  }

  evaluateExpression(expression, context) {
    if (typeof expression === 'string') {
      // Check if it's a variable reference
      if (expression.startsWith('$')) {
        const varName = expression.slice(1)
        return this.variables.get(varName) || context[varName]
      }
      // Check if it's a property access
      if (expression.includes('.')) {
        const parts = expression.split('.')
        let value = context[parts[0]]
        for (let i = 1; i < parts.length; i++) {
          value = value?.[parts[i]]
        }
        return value
      }
      return expression
    }
    
    if (typeof expression === 'number') {
      return expression
    }
    
    return expression
  }

  resolvePlayerRef(playerRef, context) {
    if (playerRef === 'player') {
      return context.player
    }
    
    // Could be extended to support other player references
    return context.player
  }

  // Built-in function implementations
  giveItem(player, itemId, quantity) {
    // Add item to player inventory
    const existingItem = player.inventory.find(item => item.itemId === itemId)
    
    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      // Find empty slot
      let emptySlot = -1
      for (let i = 0; i < 20; i++) {
        if (!player.inventory.find(item => item.slot === i)) {
          emptySlot = i
          break
        }
      }
      
      if (emptySlot !== -1) {
        player.inventory.push({
          slot: emptySlot,
          itemId: itemId,
          quantity: quantity
        })
      }
    }
    
    // Notify client
    const client = this.room.clients.find(c => c.sessionId === player.id)
    if (client) {
      client.send('itemReceived', { itemId, quantity })
    }
    
    return true
  }

  warp(player, mapId, x, y) {
    // Update player position
    player.x = x
    player.y = y
    player.mapId = mapId
    
    // Notify client
    const client = this.room.clients.find(c => c.sessionId === player.id)
    if (client) {
      client.send('warp', { mapId, x, y })
    }
    
    return true
  }

  spawnNPC(npcId, x, y, data) {
    // Create NPC instance
    const npc = {
      id: npcId,
      x: x,
      y: y,
      health: 100,
      maxHealth: 100,
      ...data
    }
    
    this.room.state.npcs.set(npcId, npc)
    return true
  }

  spawnItem(itemId, x, y, data) {
    // Create world item instance
    const item = {
      id: `${itemId}_${Date.now()}`,
      itemId: itemId,
      x: x,
      y: y,
      ...data
    }
    
    this.room.state.worldItems.set(item.id, item)
    return true
  }

  startQuest(player, questId) {
    if (!player.activeQuests) {
      player.activeQuests = []
    }
    
    if (!player.activeQuests.includes(questId)) {
      player.activeQuests.push(questId)
      
      // Notify client
      const client = this.room.clients.find(c => c.sessionId === player.id)
      if (client) {
        client.send('questStarted', { questId })
      }
    }
    
    return true
  }

  completeQuest(player, questId) {
    if (player.activeQuests) {
      const index = player.activeQuests.indexOf(questId)
      if (index !== -1) {
        player.activeQuests.splice(index, 1)
        
        if (!player.completedQuests) {
          player.completedQuests = []
        }
        player.completedQuests.push(questId)
        
        // Notify client
        const client = this.room.clients.find(c => c.sessionId === player.id)
        if (client) {
          client.send('questCompleted', { questId })
        }
        
        // Fire questComplete event
        this.fireEvent('questComplete', {
          player: player,
          questId: questId
        })
      }
    }
    
    return true
  }

  checkLevelUp(player) {
    const expNeeded = player.level * 100 // Simple formula
    if (player.experience >= expNeeded) {
      player.level++
      player.experience -= expNeeded
      player.maxHealth += 10
      player.health = player.maxHealth // Full heal on level up
      
      // Notify client
      const client = this.room.clients.find(c => c.sessionId === player.id)
      if (client) {
        client.send('levelUp', { 
          level: player.level,
          health: player.health,
          maxHealth: player.maxHealth
        })
      }
      
      // Fire levelUp event
      this.fireEvent('levelUp', {
        player: player,
        newLevel: player.level
      })
    }
  }
}