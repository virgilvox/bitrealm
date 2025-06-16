<template>
  <div class="sprite-animation-editor">
    <h3>Sprite Animation Editor</h3>

    <!-- Upload Section -->
    <div class="upload-section" v-if="!currentSprite">
      <div class="upload-area" @drop="handleDrop" @dragover.prevent @dragenter.prevent>
        <i class="fas fa-cloud-upload-alt fa-3x"></i>
        <p>Drag & drop sprite sheet here or</p>
        <input type="file" ref="fileInput" @change="handleFileSelect" accept="image/*" hidden>
        <button @click="$refs.fileInput.click()" class="btn-primary">Browse Files</button>
      </div>
    </div>

    <!-- Editor Section -->
    <div v-else class="editor-section">
      <!-- Preview Canvas -->
      <div class="preview-panel">
        <h4>Animation Preview</h4>
        <canvas ref="previewCanvas" :width="previewSize.width" :height="previewSize.height"></canvas>
        <div class="preview-controls">
          <button @click="togglePlayback" class="btn-icon">
            <i :class="playing ? 'fas fa-pause' : 'fas fa-play'"></i>
          </button>
          <select v-model="currentAnimation" @change="selectAnimation">
            <option v-for="(anim, name) in animations" :key="name" :value="name">
              {{ name }}
            </option>
          </select>
          <label>
            Speed: 
            <input type="range" v-model="playbackSpeed" min="0.1" max="2" step="0.1">
            {{ playbackSpeed }}x
          </label>
        </div>
      </div>

      <!-- Sprite Sheet View -->
      <div class="sheet-panel">
        <h4>Sprite Sheet</h4>
        <div class="sheet-container" @click="handleSheetClick">
          <img :src="currentSprite.url" ref="sheetImage">
          <div class="grid-overlay" :style="gridStyle"></div>
          <div 
            v-for="(frame, index) in selectedFrames" 
            :key="index"
            class="frame-selection"
            :style="getFrameStyle(frame)"
          ></div>
        </div>
      </div>

      <!-- Animation Configuration -->
      <div class="config-panel">
        <h4>Animation Configuration</h4>
        
        <!-- Frame Size -->
        <div class="config-group">
          <label>Frame Size</label>
          <div class="input-group">
            <input type="number" v-model.number="frameSize.width" min="8" max="512">
            <span>×</span>
            <input type="number" v-model.number="frameSize.height" min="8" max="512">
          </div>
          <button @click="autoDetectFrameSize" class="btn-secondary">Auto Detect</button>
        </div>

        <!-- Animation List -->
        <div class="animation-list">
          <h5>Animations</h5>
          <div v-for="(anim, name) in animations" :key="name" class="animation-item">
            <input v-model="animations[name].name" @blur="renameAnimation(name, $event.target.value)">
            <span>{{ anim.frames.length }} frames</span>
            <button @click="editAnimation(name)" class="btn-icon">
              <i class="fas fa-edit"></i>
            </button>
            <button @click="deleteAnimation(name)" class="btn-icon btn-danger">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <button @click="addAnimation" class="btn-add">
            <i class="fas fa-plus"></i> Add Animation
          </button>
        </div>

        <!-- Current Animation Editor -->
        <div v-if="editingAnimation" class="animation-editor">
          <h5>Editing: {{ editingAnimation }}</h5>
          <div class="frame-selector">
            <p>Click frames on the sprite sheet to add/remove them</p>
            <div class="selected-frames">
              <div 
                v-for="(frame, index) in animations[editingAnimation].frames" 
                :key="index"
                class="frame-thumb"
                @click="removeFrame(editingAnimation, index)"
              >
                <canvas :ref="`frame-${index}`" width="32" height="32"></canvas>
                <span>{{ index + 1 }}</span>
              </div>
            </div>
          </div>
          <div class="animation-settings">
            <label>
              Frame Rate:
              <input type="number" v-model.number="animations[editingAnimation].frameRate" min="1" max="60">
              FPS
            </label>
            <label>
              <input type="checkbox" v-model="animations[editingAnimation].loop">
              Loop Animation
            </label>
          </div>
        </div>

        <!-- Save Button -->
        <button @click="saveAnimations" class="btn-primary btn-save" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Animations' }}
        </button>
      </div>
    </div>

    <!-- Animation Templates -->
    <div class="templates-section" v-if="showTemplates">
      <h4>Quick Templates</h4>
      <div class="template-grid">
        <button 
          v-for="template in animationTemplates" 
          :key="template.name"
          @click="applyTemplate(template)"
          class="template-btn"
        >
          <i :class="template.icon"></i>
          <span>{{ template.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'

export default {
  name: 'SpriteAnimationEditor',
  props: {
    sprite: Object
  },
  setup(props) {
    const currentSprite = ref(props.sprite)
    const frameSize = reactive({ width: 32, height: 32 })
    const animations = reactive({})
    const currentAnimation = ref('idle')
    const editingAnimation = ref(null)
    const selectedFrames = ref([])
    const playing = ref(false)
    const playbackSpeed = ref(1)
    const saving = ref(false)
    const showTemplates = ref(true)
    
    const previewCanvas = ref(null)
    const sheetImage = ref(null)
    const animationFrame = ref(0)
    const lastFrameTime = ref(0)

    const previewSize = computed(() => ({
      width: frameSize.width * 2,
      height: frameSize.height * 2
    }))

    const gridStyle = computed(() => ({
      backgroundSize: `${frameSize.width}px ${frameSize.height}px`,
      backgroundImage: `
        linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)
      `
    }))

    const animationTemplates = [
      {
        name: 'RPG Character',
        icon: 'fas fa-user',
        animations: {
          'idle-down': { row: 0, frames: 1 },
          'idle-left': { row: 1, frames: 1 },
          'idle-right': { row: 2, frames: 1 },
          'idle-up': { row: 3, frames: 1 },
          'walk-down': { row: 0, frames: 3 },
          'walk-left': { row: 1, frames: 3 },
          'walk-right': { row: 2, frames: 3 },
          'walk-up': { row: 3, frames: 3 }
        }
      },
      {
        name: 'Platformer',
        icon: 'fas fa-running',
        animations: {
          'idle': { row: 0, frames: 4 },
          'run': { row: 1, frames: 8 },
          'jump': { row: 2, frames: 4 },
          'fall': { row: 3, frames: 2 },
          'attack': { row: 4, frames: 6 }
        }
      }
    ]

    const handleFileSelect = (event) => {
      const file = event.target.files[0]
      if (file) {
        processFile(file)
      }
    }

    const handleDrop = (event) => {
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        processFile(file)
      }
    }

    const processFile = async (file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        currentSprite.value = {
          url: e.target.result,
          file: file
        }
        autoDetectFrameSize()
      }
      reader.readAsDataURL(file)
    }

    const autoDetectFrameSize = async () => {
      try {
        const formData = new FormData()
        formData.append('file', currentSprite.value.file)
        
        const response = await fetch('/api/sprites/detect-sprite-layout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        })
        
        const data = await response.json()
        if (data.detectedFrameSize) {
          frameSize.width = data.detectedFrameSize
          frameSize.height = data.detectedFrameSize
        }
        
        if (data.suggestions.length > 0) {
          // Apply first suggestion
          const suggestion = data.suggestions[0]
          frameSize.width = suggestion.frameSize.width
          frameSize.height = suggestion.frameSize.height
          
          // Convert suggestion to animations
          Object.entries(suggestion.animations).forEach(([name, config]) => {
            animations[name] = {
              name,
              frames: [],
              frameRate: 8,
              loop: true,
              ...config
            }
          })
        }
      } catch (error) {
        console.error('Error detecting sprite layout:', error)
      }
    }

    const handleSheetClick = (event) => {
      if (!editingAnimation.value) return
      
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      const col = Math.floor(x / frameSize.width)
      const row = Math.floor(y / frameSize.height)
      
      const frame = { row, col }
      const frameIndex = selectedFrames.value.findIndex(
        f => f.row === row && f.col === col
      )
      
      if (frameIndex >= 0) {
        selectedFrames.value.splice(frameIndex, 1)
      } else {
        selectedFrames.value.push(frame)
        animations[editingAnimation.value].frames.push(frame)
      }
    }

    const getFrameStyle = (frame) => {
      return {
        left: `${frame.col * frameSize.width}px`,
        top: `${frame.row * frameSize.height}px`,
        width: `${frameSize.width}px`,
        height: `${frameSize.height}px`
      }
    }

    const addAnimation = () => {
      const name = prompt('Animation name:')
      if (name) {
        animations[name] = {
          name,
          frames: [],
          frameRate: 8,
          loop: true
        }
        editingAnimation.value = name
      }
    }

    const editAnimation = (name) => {
      editingAnimation.value = name
      selectedFrames.value = [...animations[name].frames]
    }

    const deleteAnimation = (name) => {
      if (confirm(`Delete animation "${name}"?`)) {
        delete animations[name]
        if (editingAnimation.value === name) {
          editingAnimation.value = null
        }
      }
    }

    const renameAnimation = (oldName, newName) => {
      if (oldName !== newName && newName) {
        animations[newName] = animations[oldName]
        animations[newName].name = newName
        delete animations[oldName]
      }
    }

    const removeFrame = (animName, frameIndex) => {
      animations[animName].frames.splice(frameIndex, 1)
    }

    const togglePlayback = () => {
      playing.value = !playing.value
      if (playing.value) {
        animate()
      }
    }

    const animate = (timestamp) => {
      if (!playing.value) return
      
      const anim = animations[currentAnimation.value]
      if (!anim || anim.frames.length === 0) return
      
      const frameDelay = 1000 / (anim.frameRate * playbackSpeed.value)
      
      if (timestamp - lastFrameTime.value > frameDelay) {
        animationFrame.value = (animationFrame.value + 1) % anim.frames.length
        lastFrameTime.value = timestamp
        drawPreviewFrame()
      }
      
      requestAnimationFrame(animate)
    }

    const drawPreviewFrame = () => {
      const ctx = previewCanvas.value?.getContext('2d')
      if (!ctx || !sheetImage.value) return
      
      const anim = animations[currentAnimation.value]
      if (!anim || anim.frames.length === 0) return
      
      const frame = anim.frames[animationFrame.value]
      
      ctx.clearRect(0, 0, previewSize.value.width, previewSize.value.height)
      ctx.imageSmoothingEnabled = false
      
      ctx.drawImage(
        sheetImage.value,
        frame.col * frameSize.width,
        frame.row * frameSize.height,
        frameSize.width,
        frameSize.height,
        0,
        0,
        previewSize.value.width,
        previewSize.value.height
      )
    }

    const applyTemplate = (template) => {
      Object.entries(template.animations).forEach(([name, config]) => {
        const frames = []
        for (let i = 0; i < config.frames; i++) {
          frames.push({ row: config.row, col: i })
        }
        animations[name] = {
          name,
          frames,
          frameRate: 8,
          loop: true
        }
      })
      showTemplates.value = false
    }

    const saveAnimations = async () => {
      saving.value = true
      try {
        const formData = new FormData()
        formData.append('file', currentSprite.value.file)
        formData.append('frameWidth', frameSize.width)
        formData.append('frameHeight', frameSize.height)
        formData.append('animations', JSON.stringify(animations))
        
        const response = await fetch('/api/sprites/process-sprite', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        })
        
        const data = await response.json()
        if (data.success) {
          alert('Sprite animations saved successfully!')
        }
      } catch (error) {
        console.error('Error saving animations:', error)
        alert('Failed to save animations')
      } finally {
        saving.value = false
      }
    }

    return {
      currentSprite,
      frameSize,
      animations,
      currentAnimation,
      editingAnimation,
      selectedFrames,
      playing,
      playbackSpeed,
      saving,
      showTemplates,
      previewCanvas,
      sheetImage,
      previewSize,
      gridStyle,
      animationTemplates,
      handleFileSelect,
      handleDrop,
      autoDetectFrameSize,
      handleSheetClick,
      getFrameStyle,
      addAnimation,
      editAnimation,
      deleteAnimation,
      renameAnimation,
      removeFrame,
      togglePlayback,
      applyTemplate,
      saveAnimations
    }
  }
}
</script>

<style scoped>
.sprite-animation-editor {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.upload-section {
  text-align: center;
  margin: 40px 0;
}

.upload-area {
  border: 3px dashed #ddd;
  border-radius: 8px;
  padding: 60px;
  background: #f9f9f9;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #2196f3;
  background: #e3f2fd;
}

.upload-area i {
  color: #2196f3;
  margin-bottom: 20px;
}

.upload-area p {
  margin: 10px 0;
  color: #666;
}

.editor-section {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 20px;
}

.preview-panel {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.preview-panel canvas {
  background: #333;
  border: 1px solid #ddd;
  image-rendering: pixelated;
  margin: 10px 0;
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.sheet-panel {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.sheet-container {
  position: relative;
  overflow: auto;
  max-height: 600px;
  border: 1px solid #ddd;
  cursor: crosshair;
}

.sheet-container img {
  display: block;
  image-rendering: pixelated;
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.frame-selection {
  position: absolute;
  border: 2px solid #2196f3;
  background: rgba(33, 150, 243, 0.3);
  pointer-events: none;
}

.config-panel {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.config-group {
  margin-bottom: 20px;
}

.config-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.input-group input {
  width: 80px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.animation-list {
  margin: 20px 0;
}

.animation-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px;
  background: white;
  border-radius: 4px;
}

.animation-item input {
  flex: 1;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.animation-editor {
  margin-top: 20px;
  padding: 15px;
  background: white;
  border-radius: 4px;
}

.selected-frames {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 10px 0;
}

.frame-thumb {
  position: relative;
  cursor: pointer;
  border: 2px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.frame-thumb:hover {
  border-color: #f44336;
}

.frame-thumb canvas {
  display: block;
  image-rendering: pixelated;
}

.frame-thumb span {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 2px 5px;
  font-size: 12px;
}

.animation-settings {
  margin-top: 15px;
}

.animation-settings label {
  display: block;
  margin-bottom: 10px;
}

.templates-section {
  margin-top: 30px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.template-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: white;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.template-btn:hover {
  border-color: #2196f3;
  transform: translateY(-2px);
}

.template-btn i {
  font-size: 24px;
  color: #2196f3;
}

.btn-primary {
  background: #2196f3;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  background: #666;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-icon {
  background: none;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  color: #666;
}

.btn-icon:hover {
  color: #2196f3;
}

.btn-danger:hover {
  color: #f44336;
}

.btn-add {
  width: 100%;
  padding: 10px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-save {
  width: 100%;
  margin-top: 20px;
}

.btn-save:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style> 