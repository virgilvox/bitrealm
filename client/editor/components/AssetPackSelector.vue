<template>
  <div class="asset-pack-selector">
    <h3>Asset Packs</h3>
    
    <!-- Selected Packs -->
    <div class="selected-packs">
      <h4>Active Packs</h4>
      <draggable 
        v-model="selectedPacks" 
        @change="updatePackPriority"
        item-key="id"
        class="pack-list"
      >
        <template #item="{element}">
          <div class="pack-item selected">
            <img :src="element.thumbnailUrl || '/default-pack-thumb.png'" :alt="element.name">
            <div class="pack-info">
              <h5>{{ element.name }}</h5>
              <p>{{ element.description }}</p>
              <small>by {{ element.author }}</small>
            </div>
            <div class="pack-actions">
              <span class="priority">Priority: {{ element.priority }}</span>
              <button @click="removePack(element.id)" class="btn-remove">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </template>
      </draggable>
    </div>

    <!-- Available Packs -->
    <div class="available-packs">
      <h4>Available Packs</h4>
      <div class="pack-grid">
        <div 
          v-for="pack in availablePacks" 
          :key="pack.id"
          class="pack-card"
          :class="{ disabled: isPackSelected(pack.id) }"
        >
          <img :src="pack.thumbnailUrl || '/default-pack-thumb.png'" :alt="pack.name">
          <h5>{{ pack.name }}</h5>
          <p>{{ pack.description }}</p>
          <small>{{ pack.author }} • v{{ pack.version }}</small>
          <button 
            @click="addPack(pack)" 
            :disabled="isPackSelected(pack.id)"
            class="btn-add"
          >
            {{ isPackSelected(pack.id) ? 'Already Added' : 'Add to Project' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Custom Pack Upload -->
    <div class="custom-pack-upload">
      <h4>Upload Custom Pack</h4>
      <button @click="showUploadDialog = true" class="btn-upload">
        <i class="fas fa-upload"></i> Upload Asset Pack
      </button>
    </div>

    <!-- Upload Dialog -->
    <dialog v-if="showUploadDialog" @close="showUploadDialog = false" class="upload-dialog" ref="uploadDialogEl">
      <div class="dialog-content">
        <h3>Upload Asset Pack</h3>
        <form @submit.prevent="uploadPack">
          <div class="form-group">
            <label for="packName">Pack Name</label>
            <input id="packName" v-model="newPack.name" required>
          </div>
          <div class="form-group">
            <label for="packDesc">Description</label>
            <textarea id="packDesc" v-model="newPack.description" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label for="packAuthor">Author</label>
            <input id="packAuthor" v-model="newPack.author" required>
          </div>
          <div class="form-group">
            <label for="packFile">Pack ZIP File</label>
            <input id="packFile" type="file" @change="handleFileSelect" accept=".zip" required>
          </div>
          <div class="dialog-actions">
            <button type="button" @click="closeUploadDialog" class="btn-secondary">Cancel</button>
            <button type="submit" :disabled="uploading" class="btn-primary">
              {{ uploading ? 'Uploading...' : 'Upload Pack' }}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useProjectStore } from '../../stores/project'
import draggable from 'vuedraggable'

export default {
  name: 'AssetPackSelector',
  components: {
    draggable
  },
  setup() {
    const projectStore = useProjectStore()
    const selectedPacks = ref([])
    const availablePacks = ref([])
    const showUploadDialog = ref(false)
    const uploading = ref(false)
    const uploadDialogEl = ref(null);

    const newPack = ref({
      name: '',
      description: '',
      author: '',
      file: null
    })

    const isPackSelected = (packId) => {
      return selectedPacks.value.some(p => p.id === packId)
    }

    const loadPacks = async () => {
      try {
        // Load available packs
        const response = await fetch('/api/assets/packs')
        const data = await response.json()
        availablePacks.value = data.packs

        // Load project's selected packs
        if (projectStore.currentProject?.id) {
          const projectResponse = await fetch(
            `/api/assets/projects/${projectStore.currentProject.id}/packs`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          )
          const projectData = await projectResponse.json()
          selectedPacks.value = projectData.packs
        }
      } catch (error) {
        console.error('Error loading packs:', error)
      }
    }

    const addPack = async (pack) => {
      try {
        const response = await fetch(
          `/api/assets/projects/${projectStore.currentProject.id}/packs`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              packId: pack.id,
              priority: selectedPacks.value.length * 10
            })
          }
        )

        if (response.ok) {
          selectedPacks.value.push({
            ...pack,
            priority: selectedPacks.value.length * 10
          })
        }
      } catch (error) {
        console.error('Error adding pack:', error)
      }
    }

    const removePack = async (packId) => {
      try {
        const response = await fetch(
          `/api/assets/projects/${projectStore.currentProject.id}/packs/${packId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        )

        if (response.ok) {
          selectedPacks.value = selectedPacks.value.filter(p => p.id !== packId)
        }
      } catch (error) {
        console.error('Error removing pack:', error)
      }
    }

    const updatePackPriority = async () => {
      // Update priorities based on new order
      selectedPacks.value.forEach((pack, index) => {
        pack.priority = (selectedPacks.value.length - index) * 10
      })

      // Send updates to server
      for (const pack of selectedPacks.value) {
        await fetch(
          `/api/assets/projects/${projectStore.currentProject.id}/packs`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              packId: pack.id,
              priority: pack.priority
            })
          }
        )
      }
    }

    const handleFileSelect = (event) => {
      newPack.value.file = event.target.files[0]
    }

    const uploadPack = async () => {
      if (!newPack.value.file) {
        alert('Please select a file to upload.')
        return
      }

      uploading.value = true
      try {
        const formData = new FormData()
        formData.append('pack', newPack.value.file)
        formData.append('name', newPack.value.name)
        formData.append('description', newPack.value.description)
        formData.append('author', newPack.value.author)

        const response = await fetch('/api/assets/packs/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        })

        if (response.ok) {
          alert('Asset pack uploaded successfully!')
          closeUploadDialog()
          await loadPacks()
        } else {
          const errorData = await response.json()
          alert(`Error uploading pack: ${errorData.error}`)
        }
      } catch (error) {
        console.error('Error uploading pack:', error)
        alert('An unexpected error occurred.')
      } finally {
        uploading.value = false
      }
    }
    
    const closeUploadDialog = () => {
      showUploadDialog.value = false
      newPack.value = { name: '', description: '', author: '', file: null }
    }
    
    watch(showUploadDialog, (newValue) => {
      if (newValue) {
        nextTick(() => {
          uploadDialogEl.value?.showModal()
        })
      } else {
        uploadDialogEl.value?.close()
      }
    });

    onMounted(() => {
      loadPacks()
    })

    return {
      selectedPacks,
      availablePacks,
      showUploadDialog,
      uploadDialogEl,
      uploading,
      newPack,
      isPackSelected,
      addPack,
      removePack,
      updatePackPriority,
      handleFileSelect,
      uploadPack,
      closeUploadDialog
    }
  }
}
</script>

<style scoped>
.asset-pack-selector {
  padding: 20px;
}

.selected-packs {
  margin-bottom: 30px;
}

.pack-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pack-item {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: move;
}

.pack-item.selected {
  background: #e3f2fd;
  border: 2px solid #2196f3;
}

.pack-item img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 15px;
}

.pack-info {
  flex: 1;
}

.pack-info h5 {
  margin: 0 0 5px 0;
}

.pack-info p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.pack-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.priority {
  font-size: 14px;
  color: #666;
}

.btn-remove {
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
}

.pack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.pack-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  transition: transform 0.2s;
}

.pack-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.pack-card.disabled {
  opacity: 0.6;
}

.pack-card img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 10px;
}

.pack-card h5 {
  margin: 10px 0 5px 0;
}

.pack-card p {
  font-size: 14px;
  color: #666;
  margin: 5px 0;
}

.pack-card small {
  color: #999;
}

.btn-add {
  margin-top: 10px;
  width: 100%;
  padding: 8px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-add:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.custom-pack-upload {
  margin-top: 30px;
  text-align: center;
}

.btn-upload {
  padding: 12px 24px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.upload-dialog {
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  padding: 0;
  max-width: 500px;
  width: 100%;
}
.upload-dialog::backdrop {
  background: rgba(0,0,0,0.5);
}
.dialog-content {
  padding: 2rem;
}
.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
</style> 