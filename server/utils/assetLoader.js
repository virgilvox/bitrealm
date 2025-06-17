import fs from 'fs/promises'
import path from 'path'
import * as PIXI from 'pixi.js'
import { validateSpriteSheetMetadata, validateTilesetMetadata } from './assetValidator.js'

/**
 * Asset Loader for managing sprites and tilesets based on JSON configurations
 */
export class AssetLoader {
  constructor() {
    this.sprites = new Map()
    this.tilesets = new Map()
    this.loadedTextures = new Map()
  }

  /**
   * Load a sprite sheet configuration
   * @param {string} configPath - Path to the JSON configuration
   * @returns {Promise<Object>} Loaded sprite configuration
   */
  async loadSprite(configPath) {
    try {
      const configData = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configData)
      
      // Validate against schema
      const { valid, errors } = validateSpriteSheetMetadata(config);
      if (!valid) {
        console.error('Invalid sprite configuration:', errors);
        throw new Error('Invalid sprite configuration');
      }

      // Load texture if not already loaded
      const textureKey = path.resolve(path.dirname(configPath), config.image)
      if (!this.loadedTextures.has(textureKey)) {
        const texture = await PIXI.Texture.from(textureKey)
        this.loadedTextures.set(textureKey, texture)
      }

      // Parse animations
      const animations = this.parseSpriteAnimations(config)
      
      // Store in cache
      this.sprites.set(config.id, {
        config,
        animations,
        texture: this.loadedTextures.get(textureKey)
      })

      return this.sprites.get(config.id)
    } catch (error) {
      console.error(`Failed to load sprite: ${configPath}`, error)
      throw error
    }
  }

  /**
   * Load a tileset configuration
   * @param {string} configPath - Path to the JSON configuration
   * @returns {Promise<Object>} Loaded tileset configuration
   */
  async loadTileset(configPath) {
    try {
      const configData = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configData)
      
      // Validate against schema
      const { valid, errors } = validateTilesetMetadata(config);
      if (!valid) {
        console.error('Invalid tileset configuration:', errors);
        throw new Error('Invalid tileset configuration');
      }

      // Load texture
      const textureKey = path.resolve(path.dirname(configPath), config.image)
      if (!this.loadedTextures.has(textureKey)) {
        const texture = await PIXI.Texture.from(textureKey)
        this.loadedTextures.set(textureKey, texture)
      }

      // Parse tiles
      const tiles = this.parseTilesetTiles(config)
      
      // Store in cache
      this.tilesets.set(config.id, {
        config,
        tiles,
        texture: this.loadedTextures.get(textureKey)
      })

      return this.tilesets.get(config.id)
    } catch (error) {
      console.error(`Failed to load tileset: ${configPath}`, error)
      throw error
    }
  }

  /**
   * Parse sprite animations from configuration
   */
  parseSpriteAnimations(config) {
    const animations = {}
    const { frameSize, spacing = 0, margin = 0 } = config

    for (const [animName, animData] of Object.entries(config.animations)) {
      animations[animName] = {
        frames: [],
        duration: animData.duration,
        loop: animData.loop !== false
      }

      // Calculate frame positions
      for (const frame of animData.frames) {
        const x = margin + (frame.x * (frameSize.width + spacing))
        const y = margin + (frame.y * (frameSize.height + spacing))
        
        animations[animName].frames.push({
          x,
          y,
          width: frameSize.width,
          height: frameSize.height,
          duration: frame.duration || animData.duration
        })
      }

      // Add directional data if present
      if (animData.directions) {
        animations[animName].directions = animData.directions
      }
    }

    return animations
  }

  /**
   * Parse tileset tiles from configuration
   */
  parseTilesetTiles(config) {
    const tiles = new Map()
    const { tileSize, spacing = 0, margin = 0, columns } = config

    // Calculate tile positions
    let tileId = 0
    for (const [id, tileData] of Object.entries(config.tiles || {})) {
      const numericId = parseInt(id)
      const col = numericId % columns
      const row = Math.floor(numericId / columns)
      
      const x = margin + (col * (tileSize.width + spacing))
      const y = margin + (row * (tileSize.height + spacing))
      
      tiles.set(numericId, {
        ...tileData,
        x,
        y,
        width: tileSize.width,
        height: tileSize.height
      })
    }

    return tiles
  }

  /**
   * Get animation frames for a sprite
   */
  getAnimation(spriteId, animationName, direction = 'down') {
    const sprite = this.sprites.get(spriteId)
    if (!sprite) return null

    const animation = sprite.animations[animationName]
    if (!animation) return null

    // Handle directional animations
    if (animation.directions && animation.directions[direction]) {
      const frameIndices = animation.directions[direction]
      return {
        ...animation,
        frames: frameIndices.map(index => animation.frames[index])
      }
    }

    return animation
  }

  /**
   * Validate sprite configuration
   */
  validateSpriteConfig(config) {
    // Basic validation - in production, use a JSON schema validator
    const { valid } = validateSpriteSheetMetadata(config)
    return valid
  }

  /**
   * Validate tileset configuration
   */
  validateTilesetConfig(config) {
    // Basic validation - in production, use a JSON schema validator
    const { valid } = validateTilesetMetadata(config)
    return valid
  }

  /**
   * Create texture from loaded sprite/tileset
   */
  createTexture(assetId, frameRect) {
    const asset = this.sprites.get(assetId) || this.tilesets.get(assetId)
    if (!asset) return null

    const baseTexture = asset.texture
    return new PIXI.Texture(
      baseTexture,
      new PIXI.Rectangle(
        frameRect.x,
        frameRect.y,
        frameRect.width,
        frameRect.height
      )
    )
  }
}

// Singleton instance
export const assetLoader = new AssetLoader() 