/**
 * @file Colyseus Game Service for game client
 * @description Manages Colyseus connection, room state, and events.
 */

import { reactive } from 'vue'
import * as Colyseus from 'colyseus.js'

class GameService {
  constructor() {
    this.client = null
    this.room = null
    this.state = reactive({
      connected: false,
      players: new Map(),
      worldObjects: new Map(),
      chatMessages: [],
      serverState: {}
    })
  }

  async connect(projectId, token) {
    if (this.room) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const endpoint = `${protocol}//${window.location.host}`
    
    this.client = new Colyseus.Client(endpoint)

    try {
      this.room = await this.client.joinOrCreate('game_room', {
        worldId: projectId,
        token: token,
      })

      this.state.connected = true
      this.setupRoomHandlers()

    } catch (e) {
      console.error("JOIN ERROR", e)
      this.state.connected = false
    }
  }

  disconnect() {
    if (this.room) {
      this.room.leave()
      this.room = null
      this.state.connected = false
      this.state.players.clear()
    }
  }

  send(type, payload) {
    if (this.room) {
      this.room.send(type, payload)
    }
  }

  setupRoomHandlers() {
    if (!this.room) return

    this.room.onStateChange((newState) => {
      this.state.serverState = newState
      // You could sync players map here if needed, but direct binding is often easier
      this.state.players = newState.players
    })

    this.room.onMessage('chat', (message) => {
      this.state.chatMessages.push(message)
      if (this.state.chatMessages.length > 100) {
        this.state.chatMessages.shift()
      }
    })
    
    this.room.onMessage('worldData', (data) => {
      // Handle initial world data if needed
      console.log('Received world data:', data)
    })

    this.room.onError((code, message) => {
      console.error("Colyseus room error:", code, message)
    })

    this.room.onLeave((code) => {
      console.log("Left room with code:", code)
      this.state.connected = false
      this.room = null
    })
  }

  // --- Game Actions ---
  move(x, y, direction, animation) {
    this.send('move', { x, y, direction, animation })
  }

  sendChatMessage(message) {
    this.send('chat', { text: message })
  }

  interact(targetType, targetId) {
    this.send('interact', { targetType, targetId })
  }
}

export const gameService = new GameService() 