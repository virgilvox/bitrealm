/**
 * @file Collaboration Pinia store
 * @description Manage real-time collaboration with Colyseus
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Client } from 'colyseus.js'

export const useCollaborationStore = defineStore('collaboration', () => {
  // State
  const client = ref(/** @type {Client|null} */ (null))
  const room = ref(/** @type {Room|null} */ (null))
  const isConnected = ref(false)
  const collaborators = ref(/** @type {Array} */ ([]))
  const currentUser = ref(/** @type {Object|null} */ (null))
  const error = ref(/** @type {string|null} */ (null))

  // Event callbacks
  const editCallbacks = ref(/** @type {Array<Function>} */ ([]))
  const collaboratorCallbacks = ref(/** @type {Array<Function>} */ ([]))

  /**
   * Connect to collaboration room
   * @param {string} projectId - Project ID
   * @param {Object} userInfo - User information
   * @returns {Promise<void>}
   */
  async function connect(projectId, userInfo = {}) {
    try {
      if (isConnected.value) {
        disconnect()
      }

      error.value = null
      
      // Create Colyseus client
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const endpoint = `${protocol}//${window.location.host}`
      
      client.value = new Client(endpoint)

      // Set current user info
      currentUser.value = {
        id: userInfo.id || `user_${Date.now()}`,
        name: userInfo.name || `Editor_${Math.random().toString(36).slice(2, 8)}`,
        color: userInfo.color || generateRandomColor()
      }

      // Join editor room
      room.value = await client.value.joinOrCreate('editor_room', {
        projectId: projectId,
        userName: currentUser.value.name,
        userColor: currentUser.value.color
      })

      isConnected.value = true
      
      setupRoomHandlers()
      
      console.log('Connected to collaboration room:', projectId)

    } catch (err) {
      console.error('Failed to connect to collaboration room:', err)
      error.value = err.message
      
      // Mock collaboration for development
      setupMockCollaboration()
    }
  }

  /**
   * Disconnect from collaboration room
   */
  function disconnect() {
    if (room.value) {
      room.value.leave()
      room.value = null
    }
    
    if (client.value) {
      client.value = null
    }
    
    isConnected.value = false
    collaborators.value = []
    currentUser.value = null
  }

  /**
   * Send edit operation
   * @param {Object} edit - Edit operation
   */
  function sendEdit(edit) {
    if (room.value && isConnected.value) {
      room.value.send('edit', {
        operation: edit,
        userId: currentUser.value?.id,
        timestamp: Date.now()
      })
    } else {
      console.log('Mock edit sent:', edit)
    }
  }

  /**
   * Send cursor position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  function sendCursor(x, y) {
    if (room.value && isConnected.value) {
      room.value.send('cursor', { x, y })
    }
  }

  /**
   * Register edit callback
   * @param {Function} callback - Edit callback function
   */
  function onEdit(callback) {
    editCallbacks.value.push(callback)
  }

  /**
   * Register collaborator update callback
   * @param {Function} callback - Collaborator callback function
   */
  function onCollaboratorUpdate(callback) {
    collaboratorCallbacks.value.push(callback)
  }

  /**
   * Setup room event handlers
   */
  function setupRoomHandlers() {
    if (!room.value) return

    // Handle state changes
    room.value.onStateChange((state) => {
      const newCollaborators = []
      
      if (state.users) {
        state.users.forEach((user, sessionId) => {
          if (sessionId !== room.value.sessionId) {
            newCollaborators.push({
              id: sessionId,
              name: user.name,
              color: user.color,
              cursorX: user.cursorX,
              cursorY: user.cursorY,
              isActive: user.isActive
            })
          }
        })
      }
      
      collaborators.value = newCollaborators
      
      // Notify callbacks
      collaboratorCallbacks.value.forEach(callback => {
        callback(collaborators.value)
      })
    })

    // Handle edit operations
    room.value.onMessage('edit', (message) => {
      if (message.userId !== currentUser.value?.id) {
        editCallbacks.value.forEach(callback => {
          callback(message.operation)
        })
      }
    })

    // Handle cursor updates
    room.value.onMessage('cursor', (message) => {
      const collaborator = collaborators.value.find(c => c.id === message.userId)
      if (collaborator) {
        collaborator.cursorX = message.x
        collaborator.cursorY = message.y
      }
    })

    // Handle user join/leave
    room.value.onMessage('userJoined', (message) => {
      console.log('User joined:', message.userName)
    })

    room.value.onMessage('userLeft', (message) => {
      console.log('User left:', message.userName)
    })

    // Handle errors
    room.value.onError((code, message) => {
      console.error('Room error:', code, message)
      error.value = `Room error: ${message}`
    })

    // Handle disconnect
    room.value.onLeave((code) => {
      console.log('Left room with code:', code)
      isConnected.value = false
    })
  }

  /**
   * Setup mock collaboration for development
   */
  function setupMockCollaboration() {
    isConnected.value = true
    
    // Add mock collaborators
    collaborators.value = [
      {
        id: 'mock_user_1',
        name: 'Alice',
        color: '#ff6b6b',
        cursorX: 100,
        cursorY: 100,
        isActive: true
      }
    ]
    
    // Simulate collaborator updates
    setInterval(() => {
      if (collaborators.value.length > 0) {
        collaborators.value[0].cursorX = Math.random() * 500
        collaborators.value[0].cursorY = Math.random() * 300
        
        collaboratorCallbacks.value.forEach(callback => {
          callback(collaborators.value)
        })
      }
    }, 2000)
    
    console.log('Mock collaboration active')
  }

  /**
   * Generate random color for user
   * @returns {string} Hex color
   */
  function generateRandomColor() {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#feca57', 
      '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3',
      '#ff9f43', '#ee5a24', '#0fb9b1', '#ee5253'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  /**
   * Get current room state
   * @returns {Object}
   */
  function getRoomState() {
    return {
      isConnected: isConnected.value,
      collaborators: collaborators.value,
      currentUser: currentUser.value,
      error: error.value
    }
  }

  /**
   * Reset store state
   */
  function reset() {
    disconnect()
    editCallbacks.value = []
    collaboratorCallbacks.value = []
    error.value = null
  }

  return {
    // State
    isConnected,
    collaborators,
    currentUser,
    error,

    // Actions
    connect,
    disconnect,
    sendEdit,
    sendCursor,
    onEdit,
    onCollaboratorUpdate,
    getRoomState,
    reset
  }
})