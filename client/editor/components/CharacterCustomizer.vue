<template>
  <div class="character-customizer">
    <h3>Character Customization</h3>

    <div class="customizer-layout">
      <!-- Character Preview -->
      <div class="preview-section">
        <h4>Character Preview</h4>
        <div class="character-preview">
          <canvas ref="characterCanvas" :width="canvasSize" :height="canvasSize"></canvas>
          <div class="animation-controls">
            <button 
              v-for="anim in availableAnimations" 
              :key="anim"
              @click="setAnimation(anim)"
              :class="{ active: currentAnimation === anim }"
              class="anim-btn"
            >
              {{ anim }}
            </button>
          </div>
          <div class="direction-controls">
            <button 
              v-for="dir in directions" 
              :key="dir"
              @click="setDirection(dir)"
              :class="{ active: currentDirection === dir }"
              class="dir-btn"
            >
              <i :class="getDirectionIcon(dir)"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Equipment Slots -->
      <div class="equipment-section">
        <h4>Equipment</h4>
        <div class="equipment-slots">
          <div 
            v-for="slot in equipmentSlots" 
            :key="slot.type"
            class="equipment-slot"
            :class="{ equipped: character.equipment[slot.type] }"
            @drop="handleEquipmentDrop($event, slot.type)"
            @dragover.prevent
            @dragenter.prevent
          >
            <div class="slot-icon">
              <i :class="slot.icon"></i>
            </div>
            <div class="slot-info">
              <h5>{{ slot.name }}</h5>
              <p v-if="character.equipment[slot.type]">
                {{ character.equipment[slot.type].name }}
              </p>
              <p v-else class="empty">Empty</p>
            </div>
            <button 
              v-if="character.equipment[slot.type]"
              @click="unequip(slot.type)"
              class="btn-unequip"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Inventory -->
      <div class="inventory-section">
        <h4>Inventory</h4>
        <div class="inventory-filters">
          <button 
            v-for="filter in itemFilters" 
            :key="filter.type"
            @click="currentFilter = filter.type"
            :class="{ active: currentFilter === filter.type }"
            class="filter-btn"
          >
            <i :class="filter.icon"></i>
            {{ filter.name }}
          </button>
        </div>
        <div class="inventory-grid">
          <div 
            v-for="item in filteredInventory" 
            :key="item.id"
            class="inventory-item"
            :draggable="true"
            @dragstart="handleDragStart($event, item)"
            @click="quickEquip(item)"
          >
            <img :src="item.iconUrl" :alt="item.name">
            <div class="item-tooltip">
              <h5>{{ item.name }}</h5>
              <p>{{ item.description }}</p>
              <div class="item-stats">
                <span v-for="(value, stat) in item.stats" :key="stat">
                  {{ stat }}: +{{ value }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Color Customization -->
      <div class="color-section">
        <h4>Colors</h4>
        <div class="color-options">
          <div v-for="layer in colorableLayers" :key="layer.type" class="color-option">
            <label>{{ layer.name }}</label>
            <div class="color-controls">
              <input 
                type="color" 
                v-model="character.colors[layer.type]"
                @change="updateColors"
              >
              <button @click="resetColor(layer.type)" class="btn-reset">
                <i class="fas fa-undo"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Save/Load Controls -->
    <div class="character-controls">
      <button @click="saveCharacter" class="btn-primary">
        <i class="fas fa-save"></i> Save Character
      </button>
      <button @click="loadCharacter" class="btn-secondary">
        <i class="fas fa-folder-open"></i> Load Character
      </button>
      <button @click="exportCharacter" class="btn-secondary">
        <i class="fas fa-download"></i> Export
      </button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useProjectStore } from '../../stores/project'

export default {
  name: 'CharacterCustomizer',
  setup() {
    const projectStore = useProjectStore()
    const characterCanvas = ref(null)
    const canvasSize = ref(256)
    const currentAnimation = ref('idle')
    const currentDirection = ref('down')
    const currentFilter = ref('all')
    const animationFrame = ref(0)
    const isAnimating = ref(true)
    
    const character = reactive({
      id: null,
      name: 'My Character',
      baseSprite: null,
      equipment: {
        weapon: null,
        armor: null,
        helmet: null,
        boots: null,
        gloves: null,
        accessory: null
      },
      colors: {
        skin: '#fdbcb4',
        hair: '#8b4513',
        eyes: '#4169e1',
        clothes: '#ff0000'
      }
    })

    const inventory = ref([])
    const layerCache = ref({})

    const equipmentSlots = [
      { type: 'helmet', name: 'Helmet', icon: 'fas fa-hard-hat' },
      { type: 'armor', name: 'Armor', icon: 'fas fa-vest' },
      { type: 'weapon', name: 'Weapon', icon: 'fas fa-sword' },
      { type: 'gloves', name: 'Gloves', icon: 'fas fa-mitten' },
      { type: 'boots', name: 'Boots', icon: 'fas fa-boot' },
      { type: 'accessory', name: 'Accessory', icon: 'fas fa-gem' }
    ]

    const itemFilters = [
      { type: 'all', name: 'All', icon: 'fas fa-th' },
      { type: 'weapon', name: 'Weapons', icon: 'fas fa-sword' },
      { type: 'armor', name: 'Armor', icon: 'fas fa-shield-alt' },
      { type: 'accessory', name: 'Accessories', icon: 'fas fa-ring' }
    ]

    const colorableLayers = [
      { type: 'skin', name: 'Skin Tone' },
      { type: 'hair', name: 'Hair Color' },
      { type: 'eyes', name: 'Eye Color' },
      { type: 'clothes', name: 'Clothing Tint' }
    ]

    const availableAnimations = ['idle', 'walk', 'attack', 'cast', 'hurt']
    const directions = ['up', 'down', 'left', 'right']

    const filteredInventory = computed(() => {
      if (currentFilter.value === 'all') return inventory.value
      return inventory.value.filter(item => item.type === currentFilter.value)
    })

    const getDirectionIcon = (dir) => {
      const icons = {
        up: 'fas fa-arrow-up',
        down: 'fas fa-arrow-down',
        left: 'fas fa-arrow-left',
        right: 'fas fa-arrow-right'
      }
      return icons[dir]
    }

    const loadCharacterData = async () => {
      try {
        // Load character data
        const response = await fetch(`/api/characters/${character.id || 'default'}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          Object.assign(character, data.character)
        }

        // Load inventory
        const invResponse = await fetch('/api/inventory', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (invResponse.ok) {
          const invData = await invResponse.json()
          inventory.value = invData.items
        }
      } catch (error) {
        console.error('Error loading character data:', error)
      }
    }

    const renderCharacter = async () => {
      const ctx = characterCanvas.value?.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvasSize.value, canvasSize.value)
      ctx.imageSmoothingEnabled = false

      // Get character layers
      try {
        const response = await fetch(
          `/api/assets/characters/${character.id}/layers?animation=${currentAnimation.value}&direction=${currentDirection.value}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          const layers = data.layers

          // Draw each layer in order
          for (const layer of layers) {
            if (layer.url) {
              await drawLayer(ctx, layer)
            }
          }
        }
      } catch (error) {
        console.error('Error rendering character:', error)
      }
    }

    const drawLayer = async (ctx, layer) => {
      const cacheKey = `${layer.url}-${layer.tint || 'none'}`
      
      if (!layerCache.value[cacheKey]) {
        const img = new Image()
        img.src = layer.url
        await new Promise(resolve => img.onload = resolve)
        
        if (layer.tint && character.colors[layer.colorType]) {
          // Apply color tinting
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = img.width
          tempCanvas.height = img.height
          const tempCtx = tempCanvas.getContext('2d')
          
          tempCtx.drawImage(img, 0, 0)
          
          // Apply tint
          tempCtx.globalCompositeOperation = 'source-atop'
          tempCtx.fillStyle = character.colors[layer.colorType]
          tempCtx.fillRect(0, 0, img.width, img.height)
          
          layerCache.value[cacheKey] = tempCanvas
        } else {
          layerCache.value[cacheKey] = img
        }
      }

      const source = layerCache.value[cacheKey]
      const frameWidth = layer.frameWidth || 64
      const frameHeight = layer.frameHeight || 64
      const frame = animationFrame.value % (layer.frameCount || 1)
      
      ctx.drawImage(
        source,
        frame * frameWidth,
        0,
        frameWidth,
        frameHeight,
        (canvasSize.value - frameWidth * 2) / 2,
        (canvasSize.value - frameHeight * 2) / 2,
        frameWidth * 2,
        frameHeight * 2
      )
    }

    const handleDragStart = (event, item) => {
      event.dataTransfer.setData('item', JSON.stringify(item))
    }

    const handleEquipmentDrop = async (event, slotType) => {
      event.preventDefault()
      const item = JSON.parse(event.dataTransfer.getData('item'))
      
      if (item.type === slotType || 
          (slotType === 'accessory' && ['ring', 'necklace', 'trinket'].includes(item.type))) {
        await equipItem(item, slotType)
      }
    }

    const equipItem = async (item, slotType) => {
      try {
        const response = await fetch(
          `/api/assets/characters/${character.id}/equip`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              slotType,
              itemId: item.id
            })
          }
        )

        if (response.ok) {
          character.equipment[slotType] = item
          renderCharacter()
        }
      } catch (error) {
        console.error('Error equipping item:', error)
      }
    }

    const unequip = async (slotType) => {
      try {
        const response = await fetch(
          `/api/assets/characters/${character.id}/equip`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              slotType,
              itemId: null
            })
          }
        )

        if (response.ok) {
          character.equipment[slotType] = null
          renderCharacter()
        }
      } catch (error) {
        console.error('Error unequipping item:', error)
      }
    }

    const quickEquip = (item) => {
      const slotType = item.type === 'ring' || item.type === 'necklace' || item.type === 'trinket' 
        ? 'accessory' 
        : item.type
      
      if (equipmentSlots.some(slot => slot.type === slotType)) {
        equipItem(item, slotType)
      }
    }

    const setAnimation = (anim) => {
      currentAnimation.value = anim
      animationFrame.value = 0
      renderCharacter()
    }

    const setDirection = (dir) => {
      currentDirection.value = dir
      renderCharacter()
    }

    const updateColors = () => {
      layerCache.value = {} // Clear cache to force re-tinting
      renderCharacter()
    }

    const resetColor = (colorType) => {
      const defaults = {
        skin: '#fdbcb4',
        hair: '#8b4513',
        eyes: '#4169e1',
        clothes: '#ff0000'
      }
      character.colors[colorType] = defaults[colorType]
      updateColors()
    }

    const saveCharacter = async () => {
      try {
        const response = await fetch(
          `/api/characters/${character.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(character)
          }
        )

        if (response.ok) {
          alert('Character saved!')
        }
      } catch (error) {
        console.error('Error saving character:', error)
      }
    }

    const loadCharacter = () => {
      // Show character selection dialog
      console.log('Load character dialog')
    }

    const exportCharacter = async () => {
      const canvas = characterCanvas.value
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${character.name}.png`
        a.click()
        URL.revokeObjectURL(url)
      })
    }

    // Animation loop
    const animate = () => {
      if (isAnimating.value) {
        animationFrame.value = (animationFrame.value + 1) % 8
        renderCharacter()
      }
      setTimeout(animate, 125) // 8 FPS
    }

    onMounted(() => {
      loadCharacterData()
      animate()
    })

    return {
      characterCanvas,
      canvasSize,
      character,
      currentAnimation,
      currentDirection,
      currentFilter,
      equipmentSlots,
      itemFilters,
      colorableLayers,
      availableAnimations,
      directions,
      inventory,
      filteredInventory,
      getDirectionIcon,
      handleDragStart,
      handleEquipmentDrop,
      unequip,
      quickEquip,
      setAnimation,
      setDirection,
      updateColors,
      resetColor,
      saveCharacter,
      loadCharacter,
      exportCharacter
    }
  }
}
</script>

<style scoped>
.character-customizer {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

.customizer-layout {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

/* Preview Section */
.preview-section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.character-preview {
  text-align: center;
}

.character-preview canvas {
  background: #333;
  border: 2px solid #ddd;
  border-radius: 8px;
  image-rendering: pixelated;
  margin: 10px 0;
}

.animation-controls {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin: 10px 0;
}

.anim-btn {
  padding: 5px 10px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.anim-btn.active {
  background: #2196f3;
  color: white;
}

.direction-controls {
  display: grid;
  grid-template-columns: repeat(3, 40px);
  gap: 5px;
  justify-content: center;
  margin-top: 10px;
}

.dir-btn {
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.dir-btn.active {
  background: #2196f3;
  color: white;
}

.dir-btn:nth-child(1) { grid-column: 2; }
.dir-btn:nth-child(2) { grid-column: 2; grid-row: 2; }
.dir-btn:nth-child(3) { grid-column: 1; grid-row: 2; }
.dir-btn:nth-child(4) { grid-column: 3; grid-row: 2; }

/* Equipment Section */
.equipment-section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.equipment-slots {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.equipment-slot {
  display: flex;
  align-items: center;
  padding: 15px;
  background: white;
  border: 2px dashed #ddd;
  border-radius: 8px;
  transition: all 0.3s;
}

.equipment-slot.equipped {
  border-style: solid;
  border-color: #4caf50;
  background: #f1f8e9;
}

.slot-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 4px;
  margin-right: 15px;
}

.slot-icon i {
  font-size: 20px;
  color: #666;
}

.slot-info {
  flex: 1;
}

.slot-info h5 {
  margin: 0 0 5px 0;
}

.slot-info p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.slot-info .empty {
  font-style: italic;
  color: #999;
}

.btn-unequip {
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
}

/* Inventory Section */
.inventory-section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.inventory-filters {
  display: flex;
  gap: 5px;
  margin-bottom: 15px;
}

.filter-btn {
  padding: 8px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.filter-btn.active {
  background: #2196f3;
  color: white;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.inventory-item {
  position: relative;
  width: 50px;
  height: 50px;
  background: white;
  border: 2px solid #ddd;
  border-radius: 4px;
  cursor: grab;
  overflow: hidden;
}

.inventory-item:hover {
  border-color: #2196f3;
}

.inventory-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
}

.item-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.9);
  color: white;
  padding: 10px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  z-index: 10;
}

.inventory-item:hover .item-tooltip {
  opacity: 1;
}

.item-tooltip h5 {
  margin: 0 0 5px 0;
  color: #ffd700;
}

.item-tooltip p {
  margin: 0 0 5px 0;
  font-size: 12px;
}

.item-stats {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: #4caf50;
}

/* Color Section */
.color-section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.color-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.color-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.color-option label {
  font-weight: bold;
}

.color-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-controls input[type="color"] {
  width: 50px;
  height: 30px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-reset {
  background: #666;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
}

/* Character Controls */
.character-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 30px;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.btn-primary {
  background: #2196f3;
  color: white;
}

.btn-secondary {
  background: #666;
  color: white;
}

.btn-primary:hover,
.btn-secondary:hover {
  opacity: 0.9;
}
</style> 