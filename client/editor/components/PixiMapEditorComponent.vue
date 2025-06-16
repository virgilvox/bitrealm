<template>
  <div class="pixi-map-editor">
    <div ref="canvasContainer" class="canvas-container"></div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { PixiMapEditor } from './PixiMapEditor.js'

export default {
  name: 'PixiMapEditorComponent',
  props: {
    mapData: {
      type: Object,
      required: true
    }
  },
  setup(props, { emit }) {
    const canvasContainer = ref(null)
    let pixiEditor = null

    const handleTileClick = (x, y) => {
      emit('tile-click', x, y)
    }

    const handleObjectSelect = (object) => {
      emit('object-select', object)
    }

    onMounted(() => {
      if (canvasContainer.value) {
        pixiEditor = new PixiMapEditor({
          container: canvasContainer.value,
          mapData: props.mapData,
          onTileClick: handleTileClick,
          onObjectSelect: handleObjectSelect
        })
      }
    })

    onUnmounted(() => {
      if (pixiEditor) {
        pixiEditor.destroy()
      }
    })

    return {
      canvasContainer
    }
  }
}
</script>

<style scoped>
.pixi-map-editor {
  width: 100%;
  height: 100%;
}

.canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #f7fafc;
}
</style> 