import { Schema, type, MapSchema } from '@colyseus/schema'
import { Player } from './Player.js'
import { NPC } from './NPC.js'
import { Item } from './Item.js'

export class WorldState extends Schema {
  constructor() {
    super()
    
    this.worldId = ''
    this.worldName = ''
    this.players = new MapSchema()
    this.npcs = new MapSchema()
    this.worldItems = new MapSchema()
    this.globalVariables = new MapSchema()
  }
}

// Define schema types
WorldState.defineSchema({
  worldId: 'string',
  worldName: 'string',
  players: { map: Player },
  npcs: { map: NPC },
  worldItems: { map: Item },
  globalVariables: { map: 'string' }
})