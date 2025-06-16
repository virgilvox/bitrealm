/**
 * @file Tilemap renderer for PIXI.js
 * @description Loads tilesets and renders map layers.
 */

import * as PIXI from 'pixi.js'

export class Tilemap {
  constructor(app) {
    this.app = app
    this.container = new PIXI.Container()
    this.container.sortableChildren = true
    this.app.stage.addChild(this.container)
    this.textures = new Map()
  }

  async loadTileset(tilesetData) {
    for (const tileset of tilesetData) {
      if (!this.textures.has(tileset.name)) {
        const texture = await PIXI.Assets.load(tileset.image)
        this.textures.set(tileset.name, {
          baseTexture: texture.baseTexture,
          tileWidth: tileset.tileWidth,
          tileHeight: tileset.tileHeight,
          tiles: tileset.tiles
        })
      }
    }
  }

  render(mapData) {
    this.container.removeChildren()
    
    mapData.layers.forEach((layerData, index) => {
      if (!layerData.visible) return;

      const layerContainer = new PIXI.Container()
      layerContainer.zIndex = index
      
      layerData.tiles.forEach(tile => {
        const tileset = this.findTilesetFor(tile.tileId)
        if (!tileset) {
          console.warn(`Tileset not found for tileId: ${tile.tileId}`)
          return
        }
        
        const tileInfo = tileset.tiles.find(t => t.id === tile.tileId)
        if (!tileInfo) return
        
        const rect = new PIXI.Rectangle(tileInfo.x, tileInfo.y, tileset.tileWidth, tileset.tileHeight)
        const texture = new PIXI.Texture(tileset.baseTexture, rect)
        
        const sprite = new PIXI.Sprite(texture)
        sprite.x = tile.x * mapData.tileSize
        sprite.y = tile.y * mapData.tileSize
        sprite.width = mapData.tileSize
        sprite.height = mapData.tileSize
        
        layerContainer.addChild(sprite)
      })
      
      this.container.addChild(layerContainer)
    })
  }

  findTilesetFor(tileId) {
    for (const tileset of this.textures.values()) {
      if (tileset.tiles.some(t => t.id === tileId)) {
        return tileset
      }
    }
    return null
  }

  destroy() {
    this.container.destroy({ children: true })
  }
} 