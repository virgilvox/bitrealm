import { Schema, MapSchema, defineTypes } from '@colyseus/schema'
import { Player } from './Player.js'
import { NPC } from './NPC.js'
import { Item } from './Item.js'

export class WorldState extends Schema {}

defineTypes(WorldState, {
  worldId: 'string',
  worldName: 'string',
  players: { map: Player },
  npcs: { map: NPC },
  worldItems: { map: Item },
  globalVariables: { map: 'string' }
})