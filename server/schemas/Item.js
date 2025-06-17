import { Schema, defineTypes } from '@colyseus/schema'

export class Item extends Schema {}

defineTypes(Item, {
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