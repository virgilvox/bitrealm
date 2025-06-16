<template>
  <div id="editor-app" class="editor-layout">
    <!-- Top Toolbar -->
    <header class="editor-header">
      <div class="header-left">
        <a href="../" class="logo-link">
          <span class="bit">bit</span><span class="realm">realm</span>
        </a>
        <span class="project-name">{{ project.name || 'Untitled Project' }}</span>
      </div>
      
      <div class="header-center">
        <div class="tool-group">
          <button 
            v-for="tool in tools" 
            :key="tool.id"
            :class="['tool-btn', { active: selectedTool === tool.id }]"
            @click="selectTool(tool.id)"
            :title="tool.name"
          >
            {{ tool.icon }}
          </button>
        </div>
      </div>
      
      <div class="header-right">
        <div class="collaborators" v-if="collaborators.length">
          <div 
            v-for="collaborator in collaborators" 
            :key="collaborator.id"
            class="collaborator-avatar"
            :style="{ backgroundColor: collaborator.color }"
            :title="collaborator.name"
          >
            {{ collaborator.name.charAt(0) }}
          </div>
        </div>
        
        <button @click="saveProject" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
        
        <button @click="testPlay" class="btn btn-secondary">
          Test Play
        </button>
      </div>
    </header>

    <!-- Main Editor -->
    <main class="editor-main">
      <!-- Left Sidebar for navigation -->
      <aside class="editor-sidebar left-nav">
        <nav class="sidebar-nav">
          <button 
            v-for="view in editorViews" 
            :key="view.id"
            @click="activeView = view.id"
            :class="{ active: activeView === view.id }"
            class="nav-btn"
          >
            <i :class="view.icon"></i>
            <span>{{ view.name }}</span>
          </button>
        </nav>
      </aside>

      <!-- Main Content Area -->
      <div class="editor-content-area">
        <keep-alive>
          <component 
            :is="activeComponent"
            :map-data="mapData"
            @tile-click="handleTileClick"
            @object-select="handleObjectSelect"
          />
        </keep-alive>
      </div>
    </main>

    <!-- Script Editor Modal -->
    <div v-if="showScriptEditor" class="modal-overlay" @click="closeScriptEditor">
      <div class="modal-content script-editor-modal" @click.stop>
        <header class="modal-header">
          <h3>{{ currentScript.name || 'New Script' }}</h3>
          <button @click="closeScriptEditor" class="close-btn">&times;</button>
        </header>
        <div class="modal-body">
          <div class="script-editor">
            <textarea 
              v-model="currentScript.content"
              placeholder="Enter DSL script here..."
              class="script-textarea"
            ></textarea>
          </div>
        </div>
        <footer class="modal-footer">
          <button @click="saveScript" class="btn btn-primary">Save Script</button>
          <button @click="closeScriptEditor" class="btn btn-secondary">Cancel</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * @file EditorApp main component
 * @description PixiJS-based map editor with real-time collaboration
 */

import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useEditorStore } from './stores/editor'
import { useCollaborationStore } from './stores/collaboration'
import PixiMapEditorComponent from './components/PixiMapEditorComponent.vue'
import AssetPackSelector from './components/AssetPackSelector.vue'
import SpriteAnimationEditor from './components/SpriteAnimationEditor.vue'
import CharacterCustomizer from './components/CharacterCustomizer.vue'

export default {
  name: 'EditorApp',
  components: {
    PixiMapEditorComponent,
    AssetPackSelector,
    SpriteAnimationEditor,
    CharacterCustomizer
  },
  setup() {
    const editorStore = useEditorStore()
    const collaborationStore = useCollaborationStore()
    
    // Refs
    
    // State
    const selectedTool = ref('select')
    const selectedLayer = ref(null)
    const selectedTile = ref(null)
    const selectedObject = ref(null)
    const zoom = ref(1)
    const showGrid = ref(true)
    const saving = ref(false)
    const showScriptEditor = ref(false)
    const currentScript = ref({ id: null, name: '', content: '' })
    const activeView = ref('map')

    // Mock data for proof of concept
    const project = ref({
      id: 'demo-project',
      name: 'Demo World'
    })

    const tools = ref([
      { id: 'select', name: 'Select', icon: '🔍' },
      { id: 'paint', name: 'Paint', icon: '🖌️' },
      { id: 'erase', name: 'Erase', icon: '🧽' },
      { id: 'fill', name: 'Fill', icon: '🪣' },
      { id: 'npc', name: 'Place NPC', icon: '🧙' },
      { id: 'item', name: 'Place Item', icon: '📦' }
    ])

    const mapData = ref({
      width: 50,
      height: 50,
      tileSize: 32,
      layers: [
        { id: 'background', name: 'Background', visible: true, tiles: [] },
        { id: 'objects', name: 'Objects', visible: true, tiles: [] },
        { id: 'collision', name: 'Collision', visible: true, tiles: [] }
      ]
    })

    const currentTileset = ref({
      name: 'Basic Tiles',
      tiles: [
        { id: 'grass', image: '/public/sprites/grass.png' },
        { id: 'stone', image: '/public/sprites/stone.png' },
        { id: 'water', image: '/public/sprites/water.png' },
        { id: 'tree', image: '/public/sprites/tree.png' }
      ]
    })

    const scripts = ref([
      { id: 'welcome', name: 'Welcome Script', content: 'on playerJoin {\n  emit "chat", "Welcome to the world!";\n}' }
    ])

    const collaborators = ref([])

    const editorViews = [
      { id: 'map', name: 'Map Editor', icon: 'fas fa-map', component: 'PixiMapEditorComponent' },
      { id: 'assets', name: 'Asset Packs', icon: 'fas fa-box-open', component: 'AssetPackSelector' },
      { id: 'animations', name: 'Animation Editor', icon: 'fas fa-running', component: 'SpriteAnimationEditor' },
      { id: 'characters', name: 'Character Creator', icon: 'fas fa-user-edit', component: 'CharacterCustomizer' },
    ]

    const activeComponent = computed(() => {
      const view = editorViews.find(v => v.id === activeView.value)
      return view ? view.component : 'PixiMapEditorComponent'
    })



    /**
     * Handle tile click based on selected tool
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate  
     */
    const handleTileClick = (x, y) => {
      if (!selectedLayer.value || !selectedTile.value) return

      const edit = {
        type: 'map.tile.set',
        data: {
          mapId: 'main',
          layerId: selectedLayer.value,
          x: x,
          y: y,
          tileId: selectedTile.value
        }
      }

      // Apply edit locally
      applyEdit(edit)
      
      // Send to collaboration store
      collaborationStore.sendEdit(edit)
    }

    /**
     * Handle object selection
     * @param {Object} object - Selected object
     */
    const handleObjectSelect = (object) => {
      selectedObject.value = object
    }

    /**
     * Apply edit operation
     * @param {Object} edit - Edit operation
     */
    const applyEdit = (edit) => {
      switch (edit.type) {
        case 'map.tile.set':
          setMapTile(edit.data)
          break
        // Add more edit types as needed
      }
    }

    /**
     * Set map tile
     * @param {Object} data - Tile data
     */
    const setMapTile = (data) => {
      const layer = mapData.value.layers.find(l => l.id === data.layerId)
      if (!layer) return

      const existingTileIndex = layer.tiles.findIndex(t => t.x === data.x && t.y === data.y)
      if (existingTileIndex !== -1) {
        layer.tiles[existingTileIndex].tileId = data.tileId
      } else {
        layer.tiles.push({ x: data.x, y: data.y, tileId: data.tileId })
      }

      // The PixiMapEditorComponent will update automatically through Vue reactivity
    }

    /**
     * Select tool
     * @param {string} toolId - Tool identifier
     */
    const selectTool = (toolId) => {
      selectedTool.value = toolId
    }

    /**
     * Select layer
     * @param {string} layerId - Layer identifier
     */
    const selectLayer = (layerId) => {
      selectedLayer.value = layerId
    }

    /**
     * Select tile
     * @param {string} tileId - Tile identifier
     */
    const selectTile = (tileId) => {
      selectedTile.value = tileId
    }

    /**
     * Toggle layer visibility
     * @param {string} layerId - Layer identifier
     */
    const toggleLayerVisibility = (layerId) => {
      const layer = mapData.value.layers.find(l => l.id === layerId)
      if (layer) {
        layer.visible = !layer.visible
        // Layer visibility will update through Vue reactivity
      }
    }

    /**
     * Add new layer
     */
    const addLayer = () => {
      const newLayer = {
        id: `layer_${Date.now()}`,
        name: `Layer ${mapData.value.layers.length + 1}`,
        visible: true,
        tiles: []
      }
      mapData.value.layers.push(newLayer)
    }

    /**
     * Zoom in
     */
    const zoomIn = () => {
      zoom.value = Math.min(zoom.value * 1.2, 3)
      // Zoom will be handled by the component through props
    }

    /**
     * Zoom out
     */
    const zoomOut = () => {
      zoom.value = Math.max(zoom.value / 1.2, 0.1)
      // Zoom will be handled by the component through props
    }

    /**
     * Update object property
     */
    const updateObjectProperty = () => {
      // Object updates will be handled through the component
    }

    /**
     * Save project
     */
    const saveProject = async () => {
      saving.value = true
      try {
        await editorStore.saveProject(project.value.id, {
          mapData: mapData.value,
          scripts: scripts.value
        })
        console.log('Project saved successfully')
      } catch (error) {
        console.error('Failed to save project:', error)
      } finally {
        saving.value = false
      }
    }

    /**
     * Test play
     */
    const testPlay = () => {
      window.open(`/play/${project.value.id}?test=true`, '_blank')
    }

    /**
     * Edit script
     * @param {Object} script - Script object
     */
    const editScript = (script) => {
      currentScript.value = { ...script }
      showScriptEditor.value = true
    }

    /**
     * Create new script
     */
    const createScript = () => {
      currentScript.value = {
        id: null,
        name: 'New Script',
        content: '// Enter your DSL code here\non playerJoin {\n  // Welcome logic\n}'
      }
      showScriptEditor.value = true
    }

    /**
     * Save script
     */
    const saveScript = () => {
      if (currentScript.value.id) {
        // Update existing script
        const index = scripts.value.findIndex(s => s.id === currentScript.value.id)
        if (index !== -1) {
          scripts.value[index] = { ...currentScript.value }
        }
      } else {
        // Add new script
        currentScript.value.id = `script_${Date.now()}`
        scripts.value.push({ ...currentScript.value })
      }
      showScriptEditor.value = false
    }

    /**
     * Close script editor
     */
    const closeScriptEditor = () => {
      showScriptEditor.value = false
    }

    // Initialize on mount
    onMounted(() => {
      // Initialize collaboration
      collaborationStore.connect(project.value.id)
      collaborationStore.onEdit(applyEdit)
      collaborationStore.onCollaboratorUpdate((colabs) => {
        collaborators.value = colabs
      })

      // Set initial layer selection
      if (mapData.value.layers.length > 0) {
        selectedLayer.value = mapData.value.layers[0].id
      }
    })

    // Cleanup on unmount
    onUnmounted(() => {
      collaborationStore.disconnect()
    })

    return {
      // State
      project,
      tools,
      mapData,
      currentTileset,
      scripts,
      collaborators,
      selectedTool,
      selectedLayer,
      selectedTile,
      selectedObject,
      zoom,
      showGrid,
      saving,
      showScriptEditor,
      currentScript,
      activeView,
      editorViews,
      activeComponent,
      
      // Methods
      selectTool,
      selectLayer,
      selectTile,
      toggleLayerVisibility,
      addLayer,
      zoomIn,
      zoomOut,
      updateObjectProperty,
      saveProject,
      testPlay,
      editScript,
      createScript,
      saveScript,
      closeScriptEditor,
      handleTileClick,
      handleObjectSelect
    }
  }
}
</script>

<style scoped>
.editor-main {
  grid-template-columns: 200px 1fr; /* Changed from three columns to two */
}

.left-nav {
  padding: 1rem 0;
  border-right: 1px solid #e2e8f0;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-size: 1rem;
  color: #4a5568;
  border-left: 3px solid transparent;
}

.nav-btn:hover {
  background: #f7fafc;
}

.nav-btn.active {
  background: #e6fffa;
  color: #2d3748;
  font-weight: 600;
  border-left-color: #38b2ac;
}

.nav-btn i {
  width: 20px;
  text-align: center;
}

.editor-content-area {
  overflow: auto;
  padding: 20px;
}
</style>