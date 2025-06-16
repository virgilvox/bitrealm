import { Schema, type, ArraySchema } from '@colyseus/schema'

export class InventoryItem extends Schema {
  constructor() {
    super()
    this.slot = 0
    this.itemId = ''
    this.quantity = 1
  }
}

// Define schema after class definition
InventoryItem.defineSchema({
  slot: 'number',
  itemId: 'string',
  quantity: 'number'
})

export class Player extends Schema {
  constructor() {
    super()
    
    this.id = ''
    this.name = ''
    this.x = 0
    this.y = 0
    this.mapId = 'main'
    this.facing = 'down'
    this.moving = false
    this.level = 1
    this.health = 100
    this.maxHealth = 100
    this.mana = 50
    this.maxMana = 50
    this.experience = 0
    this.gold = 0
    this.inventory = new ArraySchema()
    this.activeQuests = new ArraySchema()
    this.completedQuests = new ArraySchema()
    this.variables = new Map()
    this.lastActivity = Date.now()
  }
}

// Define schema after class definition
Player.defineSchema({
  id: 'string',
  name: 'string',
  x: 'number',
  y: 'number',
  mapId: 'string',
  facing: 'string',
  moving: 'boolean',
  level: 'number',
  health: 'number',
  maxHealth: 'number',
  mana: 'number',
  maxMana: 'number',
  experience: 'number',
  gold: 'number',
  inventory: [InventoryItem],
  activeQuests: ['string'],
  completedQuests: ['string'],
  lastActivity: 'number'
})