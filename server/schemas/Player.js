import { Schema, ArraySchema, defineTypes } from '@colyseus/schema'

export class InventoryItem extends Schema {}

defineTypes(InventoryItem, {
  slot: 'number',
  itemId: 'string',
  quantity: 'number'
})

export class Player extends Schema {
  // Runtime-only properties that shouldn't be synchronised
  variables = new Map()

  constructor() {
    super();
    this.inventory = new ArraySchema();
    this.activeQuests = new ArraySchema();
    this.completedQuests = new ArraySchema();
    this.lastActivity = Date.now();
    this.variables = new Map();
  }
}

defineTypes(Player, {
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
  inventory: [ InventoryItem ],
  activeQuests: [ 'string' ],
  completedQuests: [ 'string' ],
  lastActivity: 'number',
  spriteUrl: 'string',
  spriteMetadata: 'string'
})