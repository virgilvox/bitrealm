import { Room } from '@colyseus/core'
import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema'
import { DSLInterpreter } from '../dsl/interpreter.js'
import { WorldState } from '../schemas/WorldState.js'
import { Player } from '../schemas/Player.js'
import { NPC } from '../schemas/NPC.js'
import { Item } from '../schemas/Item.js'

export class GameRoom extends Room {
  maxClients = 100
  
  onCreate(options) {
    console.log('GameRoom created with options:', options)
    
    // Initialize world state
    this.setState(new WorldState())
    
    // Load world data from database
    this.loadWorld(options.worldId || 'default')
    
    // Initialize DSL interpreter
    this.dslInterpreter = new DSLInterpreter(this)
    
    // Set up tick rate (60 FPS)
    this.setSimulationInterval(() => this.update(), 1000 / 60)
    
    // Set up autosave interval (every 30 seconds)
    this.autoSaveInterval = this.clock.setInterval(() => {
      this.saveWorldState()
    }, 30000)

    // Message handlers
    this.onMessage('move', this.onPlayerMove.bind(this))
    this.onMessage('chat', this.onPlayerChat.bind(this))
    this.onMessage('interact', this.onPlayerInteract.bind(this))
    this.onMessage('useItem', this.onPlayerUseItem.bind(this))
    this.onMessage('pickupItem', this.onPlayerPickupItem.bind(this))
    this.onMessage('attack', this.onPlayerAttack.bind(this))
  }

  async loadWorld(worldId) {
    try {
      // TODO: Load from database
      const worldData = {
        id: worldId,
        name: 'Default World',
        maps: [{
          id: 'main',
          width: 100,
          height: 100,
          tileSize: 32,
          layers: [],
          npcs: [],
          items: [],
          scripts: []
        }]
      }

      this.worldData = worldData
      this.state.worldId = worldId
      this.state.worldName = worldData.name

      // Load NPCs
      for (const npcData of worldData.maps[0].npcs) {
        const npc = new NPC()
        Object.assign(npc, npcData)
        this.state.npcs.set(npc.id, npc)
      }

      // Load items
      for (const itemData of worldData.maps[0].items) {
        const item = new Item()
        Object.assign(item, itemData)
        this.state.worldItems.set(item.id, item)
      }

      // Load and compile DSL scripts
      for (const script of worldData.maps[0].scripts) {
        this.dslInterpreter.loadScript(script)
      }

      console.log(`World ${worldId} loaded successfully`)
    } catch (error) {
      console.error('Error loading world:', error)
    }
  }

  onJoin(client, options) {
    console.log(`Player ${client.sessionId} joined`)
    
    // Create player
    const player = new Player()
    player.id = client.sessionId
    player.name = options.playerName || `Player_${client.sessionId.slice(0, 6)}`
    player.x = 50 // Spawn position
    player.y = 50
    player.level = 1
    player.health = 100
    player.maxHealth = 100
    player.experience = 0

    this.state.players.set(client.sessionId, player)

    // Fire playerJoin event in DSL
    this.dslInterpreter.fireEvent('playerJoin', {
      player: player,
      client: client
    })

    // Send initial world data to client
    client.send('worldData', {
      maps: this.worldData.maps,
      npcs: Array.from(this.state.npcs.values()),
      items: Array.from(this.state.worldItems.values())
    })
  }

  onLeave(client, consented) {
    console.log(`Player ${client.sessionId} left`)
    
    const player = this.state.players.get(client.sessionId)
    if (player) {
      // Fire playerLeave event in DSL
      this.dslInterpreter.fireEvent('playerLeave', {
        player: player,
        client: client
      })

      this.state.players.delete(client.sessionId)
    }
  }

  onPlayerMove(client, message) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    const { x, y } = message
    
    // Basic bounds checking
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      const oldX = player.x
      const oldY = player.y
      
      player.x = x
      player.y = y

      // Check for region enter/exit events
      this.checkRegionEvents(player, oldX, oldY, x, y)

      // Check for NPC proximity
      this.checkNPCProximity(player)
    }
  }

  onPlayerChat(client, message) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    const chatMessage = {
      playerId: client.sessionId,
      playerName: player.name,
      message: message.text,
      timestamp: Date.now()
    }

    // Broadcast to all players
    this.broadcast('chat', chatMessage)

    // Fire chat event in DSL
    this.dslInterpreter.fireEvent('playerChat', {
      player: player,
      message: message.text,
      client: client
    })
  }

  onPlayerInteract(client, message) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    const { targetType, targetId } = message

    if (targetType === 'npc') {
      const npc = this.state.npcs.get(targetId)
      if (npc && this.isInRange(player, npc, 2)) {
        // Fire npcInteract event in DSL
        this.dslInterpreter.fireEvent('npcInteract', {
          player: player,
          npc: npc,
          client: client
        })
      }
    }
  }

  onPlayerUseItem(client, message) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    const { itemId, slot } = message
    const inventoryItem = player.inventory.find(item => item.slot === slot)
    
    if (inventoryItem && inventoryItem.itemId === itemId) {
      // Fire itemUse event in DSL
      this.dslInterpreter.fireEvent('itemUse', {
        player: player,
        item: inventoryItem,
        client: client
      })
    }
  }

  onPlayerPickupItem(client, message) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    const { itemId } = message
    const worldItem = this.state.worldItems.get(itemId)
    
    if (worldItem && this.isInRange(player, worldItem, 1)) {
      // Add to player inventory
      this.addItemToInventory(player, worldItem)
      
      // Remove from world
      this.state.worldItems.delete(itemId)
      
      // Notify client
      client.send('itemPickedUp', { itemId })
    }
  }

  onPlayerAttack(client, message) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    const { targetId } = message
    const target = this.state.npcs.get(targetId)
    
    if (target && this.isInRange(player, target, 2)) {
      // Calculate damage
      const damage = Math.floor(Math.random() * 20) + 10
      target.health -= damage
      
      // Broadcast attack animation
      this.broadcast('attack', {
        attackerId: client.sessionId,
        targetId: targetId,
        damage: damage
      })

      // Check if target is defeated
      if (target.health <= 0) {
        this.dslInterpreter.fireEvent('npcDefeated', {
          player: player,
          npc: target,
          client: client
        })
        
        // Remove NPC (respawn logic can be in DSL)
        this.state.npcs.delete(targetId)
      }
    }
  }

  update() {
    // Game loop updates
    this.dslInterpreter.fireEvent('tick', {
      deltaTime: this.clock.deltaTime
    })

    // Update NPCs
    for (const npc of this.state.npcs.values()) {
      this.updateNPC(npc)
    }

    // Update items
    for (const item of this.state.worldItems.values()) {
      this.updateItem(item)
    }
  }

  updateNPC(npc) {
    // Basic NPC AI - can be extended with DSL scripts
    if (npc.aiType === 'wander') {
      if (Math.random() < 0.01) { // 1% chance per frame
        npc.x += (Math.random() - 0.5) * 2
        npc.y += (Math.random() - 0.5) * 2
        
        // Keep in bounds
        npc.x = Math.max(0, Math.min(100, npc.x))
        npc.y = Math.max(0, Math.min(100, npc.y))
      }
    }
  }

  updateItem(item) {
    // Item update logic (animations, respawn timers, etc.)
  }

  checkRegionEvents(player, oldX, oldY, newX, newY) {
    // Check if player entered or exited any regions
    // This would check against defined regions in the world data
    // and fire playerEnter/playerExit events
  }

  checkNPCProximity(player) {
    // Check if player is near any NPCs for interaction hints
    for (const npc of this.state.npcs.values()) {
      const distance = Math.sqrt(
        Math.pow(player.x - npc.x, 2) + Math.pow(player.y - npc.y, 2)
      )
      
      if (distance <= 2) {
        // Player is near NPC
        // Could send interaction prompt to client
      }
    }
  }

  isInRange(entity1, entity2, range) {
    const distance = Math.sqrt(
      Math.pow(entity1.x - entity2.x, 2) + Math.pow(entity1.y - entity2.y, 2)
    )
    return distance <= range
  }

  addItemToInventory(player, item) {
    // Find empty slot
    let emptySlot = -1
    for (let i = 0; i < 20; i++) { // 20 inventory slots
      if (!player.inventory.find(inv => inv.slot === i)) {
        emptySlot = i
        break
      }
    }

    if (emptySlot !== -1) {
      player.inventory.push({
        slot: emptySlot,
        itemId: item.id,
        quantity: 1
      })
      return true
    }
    return false
  }

  async saveWorldState() {
    // Save player data and world state to database
    try {
      console.log('Auto-saving world state...')
      // TODO: Implement database save
    } catch (error) {
      console.error('Error saving world state:', error)
    }
  }

  onDispose() {
    console.log('GameRoom disposed')
    if (this.autoSaveInterval) {
      this.autoSaveInterval.clear()
    }
    this.saveWorldState()
  }
}