/**
 * @file Editor Pinia store
 * @description Manage editor state and project data
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useEditorStore = defineStore('editor', () => {
  // State
  const currentProject = ref(/** @type {Object|null} */ (null))
  const projectData = ref(/** @type {Object|null} */ (null))
  const isDirty = ref(false)
  const isLoading = ref(false)
  const error = ref(/** @type {string|null} */ (null))

  /**
   * Load project data
   * @param {string} projectId - Project ID
   * @returns {Promise<void>}
   */
  async function loadProject(projectId) {
    try {
      isLoading.value = true
      error.value = null

      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) {
        throw new Error(`Failed to load project: ${response.status}`)
      }

      const project = await response.json()
      currentProject.value = project
      projectData.value = project.data || getDefaultProjectData()
      isDirty.value = false

    } catch (err) {
      console.error('Error loading project:', err)
      error.value = err.message
      
      // Fallback to demo data
      currentProject.value = {
        id: projectId,
        name: 'Demo Project',
        description: 'A demo project for testing'
      }
      projectData.value = getDefaultProjectData()
      
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Save project data
   * @param {string} projectId - Project ID
   * @param {Object} data - Project data to save
   * @returns {Promise<void>}
   */
  async function saveProject(projectId, data) {
    try {
      isLoading.value = true
      error.value = null

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: data,
          updatedAt: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save project: ${response.status}`)
      }

      projectData.value = data
      isDirty.value = false

      console.log('Project saved successfully')

    } catch (err) {
      console.error('Error saving project:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create new project
   * @param {Object} projectInfo - Project information
   * @returns {Promise<Object>}
   */
  async function createProject(projectInfo) {
    try {
      isLoading.value = true
      error.value = null

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectInfo.name,
          description: projectInfo.description,
          data: getDefaultProjectData()
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create project: ${response.status}`)
      }

      const project = await response.json()
      currentProject.value = project.project
      projectData.value = getDefaultProjectData()
      isDirty.value = false

      return project

    } catch (err) {
      console.error('Error creating project:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get default project data structure
   * @returns {Object}
   */
  function getDefaultProjectData() {
    return {
      maps: [{
        id: 'main',
        name: 'Main Map',
        width: 50,
        height: 50,
        tileSize: 32,
        layers: [
          { id: 'background', name: 'Background', visible: true, tiles: [] },
          { id: 'objects', name: 'Objects', visible: true, tiles: [] },
          { id: 'collision', name: 'Collision', visible: true, tiles: [] }
        ],
        npcs: [],
        items: [],
        portals: []
      }],
      tilesets: [{
        id: 'basic',
        name: 'Basic Tileset',
        image: '/public/sprites/tileset.png',
        tileWidth: 32,
        tileHeight: 32,
        tiles: [
          { id: 'grass', x: 0, y: 0 },
          { id: 'stone', x: 32, y: 0 },
          { id: 'water', x: 64, y: 0 },
          { id: 'tree', x: 96, y: 0 }
        ]
      }],
      characters: [],
      items: [],
      scripts: [{
        id: 'welcome',
        name: 'Welcome Script',
        content: 'on playerJoin {\n  emit "chat", "Welcome to the world!";\n}'
      }],
      assets: [],
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    }
  }

  /**
   * Mark project as dirty (unsaved changes)
   */
  function markDirty() {
    isDirty.value = true
  }

  /**
   * Update map data
   * @param {string} mapId - Map ID
   * @param {Object} mapData - Updated map data
   */
  function updateMap(mapId, mapData) {
    if (!projectData.value) return

    const mapIndex = projectData.value.maps.findIndex(m => m.id === mapId)
    if (mapIndex !== -1) {
      projectData.value.maps[mapIndex] = { ...projectData.value.maps[mapIndex], ...mapData }
      markDirty()
    }
  }

  /**
   * Add script to project
   * @param {Object} script - Script data
   */
  function addScript(script) {
    if (!projectData.value) return

    script.id = script.id || `script_${Date.now()}`
    projectData.value.scripts.push(script)
    markDirty()
  }

  /**
   * Update script
   * @param {string} scriptId - Script ID
   * @param {Object} updates - Script updates
   */
  function updateScript(scriptId, updates) {
    if (!projectData.value) return

    const scriptIndex = projectData.value.scripts.findIndex(s => s.id === scriptId)
    if (scriptIndex !== -1) {
      projectData.value.scripts[scriptIndex] = { 
        ...projectData.value.scripts[scriptIndex], 
        ...updates 
      }
      markDirty()
    }
  }

  /**
   * Delete script
   * @param {string} scriptId - Script ID
   */
  function deleteScript(scriptId) {
    if (!projectData.value) return

    const scriptIndex = projectData.value.scripts.findIndex(s => s.id === scriptId)
    if (scriptIndex !== -1) {
      projectData.value.scripts.splice(scriptIndex, 1)
      markDirty()
    }
  }

  /**
   * Reset store state
   */
  function reset() {
    currentProject.value = null
    projectData.value = null
    isDirty.value = false
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    currentProject,
    projectData,
    isDirty,
    isLoading,
    error,

    // Actions
    loadProject,
    saveProject,
    createProject,
    updateMap,
    addScript,
    updateScript,
    deleteScript,
    markDirty,
    reset
  }
})