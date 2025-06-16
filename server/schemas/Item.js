import { Schema } from '@colyseus/schema'

export class Item extends Schema {
  constructor() {
    super()
    
    this.id = ''
    this.itemId = '' // Template ID
    this.name = ''
    this.description = ''
    this.x = 0
    this.y = 0
    this.mapId = 'main'
    this.spriteId = ''
    this.type = 'misc' // weapon, armor, consumable, quest, misc
    this.rarity = 'common' // common, uncommon, rare, epic, legendary
    this.stackable = true
    this.quantity = 1
    this.value = 0
    this.stats = '' // JSON string of stats
    this.requirements = '' // JSON string of requirements
    this.effects = '' // JSON string of effects
    this.respawnTime = 0
    this.respawnTimer = 0
  }
}

Item.defineSchema({
  id: 'string',
  itemId: 'string',
  name: 'string',
  description: 'string',
  x: 'number',
  y: 'number',
  mapId: 'string',
  spriteId: 'string',
  type: 'string',
  rarity: 'string',
  stackable: 'boolean',
  quantity: 'number',
  value: 'number',
  stats: 'string',
  requirements: 'string',
  effects: 'string',
  respawnTime: 'number',
  respawnTimer: 'number'
})