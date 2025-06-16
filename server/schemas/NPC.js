import { Schema } from '@colyseus/schema'

export class NPC extends Schema {
  constructor() {
    super()
    
    this.id = ''
    this.name = ''
    this.x = 0
    this.y = 0
    this.mapId = 'main'
    this.spriteId = ''
    this.facing = 'down'
    this.moving = false
    this.health = 100
    this.maxHealth = 100
    this.level = 1
    this.hostile = false
    this.aiType = 'static' // static, wander, guard, patrol
    this.dialogue = null
    this.questId = null
    this.respawnTime = 0
    this.lastInteraction = 0
    this.variables = new Map()
  }
}

NPC.defineSchema({
  id: 'string',
  name: 'string',
  x: 'number',
  y: 'number',
  mapId: 'string',
  spriteId: 'string',
  facing: 'string',
  moving: 'boolean',
  health: 'number',
  maxHealth: 'number',
  level: 'number',
  hostile: 'boolean',
  aiType: 'string',
  dialogue: 'string',
  questId: 'string',
  respawnTime: 'number',
  lastInteraction: 'number'
})