/**
 * @file PixiJS Map Editor
 * @description PixiJS 8 integration for map editing with real-time collaboration
 */

import * as PIXI from 'pixi.js'

export class PixiMapEditor {
  /**
   * Create PixiMapEditor instance
   * @param {Object} options - Configuration options
   * @param {HTMLElement} options.container - Container element
   * @param {Object} options.mapData - Map data
   * @param {Function} options.onTileClick - Tile click callback
   * @param {Function} options.onObjectSelect - Object select callback
   */
  constructor(options) {
    this.container = options.container
    this.mapData = options.mapData
    this.onTileClick = options.onTileClick || (() => {})
    this.onObjectSelect = options.onObjectSelect || (() => {})
    
    // PixiJS objects
    this.app = null
    this.viewport = null
    this.layers = new Map()
    this.tileSprites = new Map()
    this.grid = null
    this.cursors = new Map()
    
    // Editor state
    this.zoom = 1
    this.showGrid = true
    this.selectedTool = 'select'
    this.tileSize = this.mapData.tileSize || 32
    
    this.init()
  }

  /**
   * Initialize PixiJS application
   */
  async init() {
    try {
      // Create PixiJS application
      this.app = new PIXI.Application()
      
      await this.app.init({
        width: this.container.clientWidth,
        height: this.container.clientHeight,
        backgroundColor: 0xf7fafc,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        resizeTo: this.container
      })

      // Add canvas to container
      this.container.appendChild(this.app.canvas)

      // Setup viewport (camera/zoom system)
      this.setupViewport()
      
      // Create layers
      this.createLayers()
      
      // Create grid
      this.createGrid()
      
      // Setup interaction
      this.setupInteraction()
      
      // Load initial tiles
      this.loadTiles()
      
      console.log('PixiMapEditor initialized')
      
    } catch (error) {
      console.error('Failed to initialize PixiMapEditor:', error)
    }
  }

  /**
   * Setup viewport for panning and zooming
   */
  setupViewport() {
    // Create viewport container
    this.viewport = new PIXI.Container()
    this.app.stage.addChild(this.viewport)
    
    // Enable interaction
    this.viewport.interactive = true
    this.viewport.interactiveChildren = true
    
    // Pan and zoom functionality
    let isDragging = false
    let dragStart = { x: 0, y: 0 }
    
    this.viewport.on('pointerdown', (event) => {
      if (event.data.button === 1 || event.data.originalEvent.ctrlKey) { // Middle mouse or Ctrl+click
        isDragging = true
        dragStart = { x: event.data.global.x, y: event.data.global.y }
        this.app.canvas.style.cursor = 'grabbing'
      }
    })
    
    this.viewport.on('pointermove', (event) => {
      if (isDragging) {
        const dx = event.data.global.x - dragStart.x
        const dy = event.data.global.y - dragStart.y
        
        this.viewport.x += dx
        this.viewport.y += dy
        
        dragStart = { x: event.data.global.x, y: event.data.global.y }
      }
    })
    
    this.viewport.on('pointerup', () => {
      isDragging = false
      this.app.canvas.style.cursor = 'default'
    })
    
    // Zoom with mouse wheel
    this.container.addEventListener('wheel', (event) => {
      event.preventDefault()
      
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(3, this.zoom * zoomFactor))
      
      if (newZoom !== this.zoom) {
        const mousePos = { x: event.offsetX, y: event.offsetY }
        this.setZoom(newZoom, mousePos)
      }
    })
  }

  /**
   * Create layer containers
   */
  createLayers() {
    this.mapData.layers.forEach(layerData => {
      const layer = new PIXI.Container()
      layer.name = layerData.id
      layer.visible = layerData.visible
      layer.alpha = layerData.opacity || 1
      
      this.layers.set(layerData.id, layer)
      this.viewport.addChild(layer)
    })
  }

  /**
   * Create grid overlay
   */
  createGrid() {
    this.grid = new PIXI.Graphics()
    this.grid.name = 'grid'
    this.grid.alpha = 0.3
    
    this.drawGrid()
    this.viewport.addChild(this.grid)
  }

  /**
   * Draw grid lines
   */
  drawGrid() {
    if (!this.grid) return
    
    this.grid.clear()
    this.grid.lineStyle(1, 0x4299e1, 0.5)
    
    const mapWidth = this.mapData.width * this.tileSize
    const mapHeight = this.mapData.height * this.tileSize
    
    // Vertical lines
    for (let x = 0; x <= mapWidth; x += this.tileSize) {
      this.grid.moveTo(x, 0)
      this.grid.lineTo(x, mapHeight)
    }
    
    // Horizontal lines
    for (let y = 0; y <= mapHeight; y += this.tileSize) {
      this.grid.moveTo(0, y)
      this.grid.lineTo(mapWidth, y)
    }
  }

  /**
   * Setup interaction handlers
   */
  setupInteraction() {
    this.viewport.on('pointerdown', (event) => {
      if (event.data.button === 0) { // Left click
        this.handleCanvasClick(event)
      }
    })
  }

  /**
   * Handle canvas click
   * @param {PIXI.FederatedPointerEvent} event - Click event
   */
  handleCanvasClick(event) {
    const localPos = event.data.getLocalPosition(this.viewport)
    const tileX = Math.floor(localPos.x / this.tileSize)
    const tileY = Math.floor(localPos.y / this.tileSize)
    
    // Check bounds
    if (tileX >= 0 && tileX < this.mapData.width && tileY >= 0 && tileY < this.mapData.height) {
      this.onTileClick(tileX, tileY)
    }
  }

  /**
   * Load and display tiles
   */
  async loadTiles() {
    try {
      // For now, use colored rectangles as placeholders for tiles
      this.mapData.layers.forEach(layerData => {
        const layer = this.layers.get(layerData.id)
        if (!layer) return
        
        layerData.tiles.forEach(tile => {
          this.createTileSprite(layerData.id, tile.x, tile.y, tile.tileId)
        })
      })
      
    } catch (error) {
      console.error('Error loading tiles:', error)
    }
  }

  /**
   * Create tile sprite
   * @param {string} layerId - Layer ID
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {string} tileId - Tile ID
   */
  createTileSprite(layerId, x, y, tileId) {
    const layer = this.layers.get(layerId)
    if (!layer) return
    
    // Remove existing tile at this position
    this.removeTileSprite(layerId, x, y)
    
    // Create colored rectangle as tile placeholder
    const graphics = new PIXI.Graphics()
    const color = this.getTileColor(tileId)
    
    graphics.beginFill(color)
    graphics.drawRect(0, 0, this.tileSize, this.tileSize)
    graphics.endFill()
    
    graphics.x = x * this.tileSize
    graphics.y = y * this.tileSize
    
    // Store reference
    const tileKey = `${layerId}_${x}_${y}`
    this.tileSprites.set(tileKey, graphics)
    
    layer.addChild(graphics)
  }

  /**
   * Remove tile sprite
   * @param {string} layerId - Layer ID
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   */
  removeTileSprite(layerId, x, y) {
    const tileKey = `${layerId}_${x}_${y}`
    const sprite = this.tileSprites.get(tileKey)
    
    if (sprite && sprite.parent) {
      sprite.parent.removeChild(sprite)
      this.tileSprites.delete(tileKey)
    }
  }

  /**
   * Get color for tile type (placeholder)
   * @param {string} tileId - Tile ID
   * @returns {number} Color value
   */
  getTileColor(tileId) {
    const colors = {
      grass: 0x4ade80,
      stone: 0x64748b,
      water: 0x3b82f6,
      tree: 0x22c55e,
      dirt: 0xa3a3a3,
      sand: 0xfbbf24
    }
    
    return colors[tileId] || 0xe2e8f0
  }

  /**
   * Update tile
   * @param {string} layerId - Layer ID
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {string} tileId - Tile ID
   */
  updateTile(layerId, x, y, tileId) {
    this.createTileSprite(layerId, x, y, tileId)
  }

  /**
   * Set layer visibility
   * @param {string} layerId - Layer ID
   * @param {boolean} visible - Visibility state
   */
  setLayerVisibility(layerId, visible) {
    const layer = this.layers.get(layerId)
    if (layer) {
      layer.visible = visible
    }
  }

  /**
   * Set zoom level
   * @param {number} zoom - Zoom level
   * @param {Object} center - Center point for zoom
   */
  setZoom(zoom, center = null) {
    if (!center) {
      center = {
        x: this.container.clientWidth / 2,
        y: this.container.clientHeight / 2
      }
    }
    
    // Calculate zoom point in world coordinates
    const worldPos = {
      x: (center.x - this.viewport.x) / this.zoom,
      y: (center.y - this.viewport.y) / this.zoom
    }
    
    this.zoom = zoom
    this.viewport.scale.set(zoom)
    
    // Adjust position to keep zoom point fixed
    this.viewport.x = center.x - worldPos.x * zoom
    this.viewport.y = center.y - worldPos.y * zoom
  }

  /**
   * Set grid visibility
   * @param {boolean} visible - Grid visibility
   */
  setGridVisibility(visible) {
    this.showGrid = visible
    if (this.grid) {
      this.grid.visible = visible
    }
  }

  /**
   * Add collaborator cursor
   * @param {string} userId - User ID
   * @param {Object} userInfo - User information
   */
  addCollaboratorCursor(userId, userInfo) {
    if (this.cursors.has(userId)) {
      this.removeCollaboratorCursor(userId)
    }
    
    const cursor = new PIXI.Graphics()
    cursor.beginFill(parseInt(userInfo.color.replace('#', ''), 16))
    cursor.drawCircle(0, 0, 4)
    cursor.endFill()
    
    cursor.x = userInfo.cursorX || 0
    cursor.y = userInfo.cursorY || 0
    
    this.cursors.set(userId, cursor)
    this.viewport.addChild(cursor)
  }

  /**
   * Update collaborator cursor
   * @param {string} userId - User ID
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  updateCollaboratorCursor(userId, x, y) {
    const cursor = this.cursors.get(userId)
    if (cursor) {
      cursor.x = x
      cursor.y = y
    }
  }

  /**
   * Remove collaborator cursor
   * @param {string} userId - User ID
   */
  removeCollaboratorCursor(userId) {
    const cursor = this.cursors.get(userId)
    if (cursor && cursor.parent) {
      cursor.parent.removeChild(cursor)
      this.cursors.delete(userId)
    }
  }

  /**
   * Update object
   * @param {Object} object - Object to update
   */
  updateObject(object) {
    // Implementation for updating game objects
    console.log('Update object:', object)
  }

  /**
   * Resize canvas
   */
  resize() {
    if (this.app) {
      this.app.renderer.resize(this.container.clientWidth, this.container.clientHeight)
    }
  }

  /**
   * Destroy the editor
   */
  destroy() {
    if (this.app) {
      // Clear all references
      this.layers.clear()
      this.tileSprites.clear()
      this.cursors.clear()
      
      // Destroy PIXI app
      this.app.destroy(true, true)
      this.app = null
    }
  }
}