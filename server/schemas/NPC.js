import { Schema, defineTypes } from '@colyseus/schema'

export class NPC extends Schema {
  variables = new Map()
}

defineTypes(NPC, {
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