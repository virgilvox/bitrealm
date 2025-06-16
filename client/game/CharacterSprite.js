/**
 * @file CharacterSprite for PIXI.js
 * @description Renders a layered, animated character.
 */

import * as PIXI from 'pixi.js'

export class CharacterSprite extends PIXI.Container {
  constructor(characterData) {
    super()
    this.characterData = characterData
    this.textures = new Map() // To store loaded textures
    this.animationData = null
    this.skinTone = characterData.skinTone || 'tan' // Default skin tone
    
    // Animation state
    this.currentAnimation = 'idle-down'
    this.currentFrame = 0
    this.animationSpeed = 0.15 // frames per tick
    this.lastFrameUpdate = 0
    
    this.sortableChildren = true
    this.loadCharacterAssets()
  }

  async loadCharacterAssets() {
    const packPath = '/assets/packs/lpc-character-sprites/'
    
    try {
      // Load the master animation data
      const response = await fetch(`${packPath}animations.json`)
      const allAnimData = await response.json()
      this.animationData = allAnimData[this.skinTone]

      if (!this.animationData) {
        throw new Error(`Animation data for skin tone "${this.skinTone}" not found.`)
      }

      // Pre-load all necessary sprite sheets for this skin tone
      const requiredFiles = new Set(Object.values(this.animationData.animations).map(a => a.file))
      for (const file of requiredFiles) {
        if (!this.textures.has(file)) {
          const texture = await PIXI.Assets.load(`${packPath}${file}`)
          this.textures.set(file, texture.baseTexture)
        }
      }
      
      // Create the main sprite layer
      this.sprite = new PIXI.Sprite()
      this.addChild(this.sprite)
      
      this.updateAnimation('idle', 'down')

    } catch(e) {
      console.error("Failed to load character assets:", e)
    }
  }

  updateAnimation(animation, direction) {
    const animName = `${animation}-${direction}`
    if (this.currentAnimation === animName) return

    if (this.animationData?.animations[animName]) {
      this.currentAnimation = animName
      this.currentFrame = 0
    } else {
      // Fallback to idle
      this.currentAnimation = 'idle-down'
      this.currentFrame = 0
    }
  }

  tick(delta) {
    if (!this.animationData || !this.sprite) return
    this.lastFrameUpdate += delta
    
    const animInfo = this.animationData.animations[this.currentAnimation]
    if (!animInfo) return

    // Use a higher speed for running
    const speed = this.currentAnimation.includes('run') ? this.animationSpeed * 1.5 : this.animationSpeed

    if (this.lastFrameUpdate > 1 / speed) {
      this.lastFrameUpdate = 0
      this.currentFrame = (this.currentFrame + 1) % animInfo.frames
      
      const frameX = this.currentFrame * this.animationData.frameSize.width
      const frameY = animInfo.row * this.animationData.frameSize.height
      
      const sheetTexture = this.textures.get(animInfo.file)
      if (sheetTexture) {
        this.sprite.texture = new PIXI.Texture(
          sheetTexture, 
          new PIXI.Rectangle(
            frameX, 
            frameY, 
            this.animationData.frameSize.width, 
            this.animationData.frameSize.height
          )
        )
      }
    }
  }
} 