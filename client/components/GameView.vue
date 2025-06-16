<template>
  <div class="game-view">
    <div class="game-container" ref="gameContainer">
      <canvas ref="gameCanvas"></canvas>
    </div>
    <div class="game-ui">
      <div class="chat-box">
        <div class="messages" ref="chatMessages">
          <div v-for="(msg, index) in chatHistory" :key="index" class="message">
            <strong>{{ msg.from }}:</strong> {{ msg.message }}
          </div>
        </div>
        <input 
          v-model="chatInput" 
          @keyup.enter="sendChat"
          placeholder="Type message..."
        >
      </div>
      <div class="player-list">
        <h5>Players Online</h5>
        <ul>
          <li v-for="player in players.values()" :key="player.id">
            {{ player.name }} ({{ player.id }})
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { gameService } from '../services/gameService'
import * as PIXI from 'pixi.js'
import { Tilemap } from '../game/Tilemap.js'
import { CharacterSprite } from '../game/CharacterSprite.js'

export default {
  name: 'GameView',
  setup() {
    const route = useRoute()
    const gameCanvas = ref(null)
    const chatInput = ref('')
    const chatMessages = ref(null)
    
    let app, localPlayer, tilemap
    const remotePlayers = reactive(new Map())
    
    // Directly use the reactive state from the service
    const players = gameService.state.players
    const chatHistory = gameService.state.chatMessages

    const setupGame = () => {
      app = new PIXI.Application()
      app.init({
        view: gameCanvas.value,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x1a1a1a,
        resizeTo: window
      }).then(() => {
        tilemap = new Tilemap(app)
        
        // Create local player sprite
        localPlayer = new CharacterSprite({ id: 'local' })
        app.stage.addChild(localPlayer)
        
        // Add game loop
        app.ticker.add((ticker) => {
          localPlayer?.tick(ticker.deltaTime)
          remotePlayers.forEach(p => p.tick(ticker.deltaTime))
        })
      })
    }
    
    const handleWorldData = async (data) => {
      if (tilemap && data.maps && data.tilesets) {
        await tilemap.loadTileset(data.tilesets)
        tilemap.render(data.maps[0]) // Assuming first map for now
      }
    }

    const syncRemotePlayers = (playersState) => {
      if (!app || !app.stage) return

      playersState.forEach((player, sessionId) => {
        if (sessionId === gameService.room?.sessionId) {
          // Update local player state from server
          if(localPlayer) {
             localPlayer.x = player.x 
             localPlayer.y = player.y
             localPlayer.updateAnimation(player.animation, player.direction)
          }
          return
        }

        let remotePlayer = remotePlayers.get(sessionId)
        if (!remotePlayer) {
          remotePlayer = new CharacterSprite(player)
          app.stage.addChild(remotePlayer)
          remotePlayers.set(sessionId, remotePlayer)
        }
        
        // TODO: Interpolate for smoothness
        remotePlayer.x = player.x
        remotePlayer.y = player.y
        remotePlayer.updateAnimation(player.animation, player.direction)
      })

      remotePlayers.forEach((sprite, sessionId) => {
        if (!playersState.has(sessionId)) {
          app.stage.removeChild(sprite)
          remotePlayers.delete(sessionId)
        }
      })
    }

    const sendChat = () => {
      if(chatInput.value.trim()) {
        gameService.sendChatMessage(chatInput.value)
        chatInput.value = ''
      }
    }
    
    watch(players, (newPlayers) => {
      syncRemotePlayers(newPlayers)
    })

    watch(chatHistory, async () => {
      await nextTick()
      if (chatMessages.value) {
        chatMessages.value.scrollTop = chatMessages.value.scrollHeight
      }
    })

    onMounted(() => {
      const projectId = route.params.id
      const token = localStorage.getItem('token')
      
      setupGame()
      gameService.connect(projectId, token)
      
      // Listen for world data to render map
      gameService.room.onMessage('worldData', handleWorldData)
      
      window.addEventListener('keydown', (e) => {
        if (!localPlayer) return;
        let x = localPlayer.x
        let y = localPlayer.y
        let direction = 'down', animation = 'walk'

        switch(e.key) {
          case 'w': y -= 5; direction = 'up'; break;
          case 's': y += 5; direction = 'down'; break;
          case 'a': x -= 5; direction = 'left'; break;
          case 'd': x += 5; direction = 'right'; break;
          default: return; // No movement, no update
        }

        localPlayer.x = x
        localPlayer.y = y
        localPlayer.updateAnimation(animation, direction) // Update local animation immediately
        gameService.move(x, y, direction, animation)
      })
    })

    onUnmounted(() => {
      gameService.disconnect()
      if (tilemap) tilemap.destroy()
      if (app) {
        app.destroy(true)
      }
    })

    return {
      gameCanvas,
      chatInput,
      chatMessages,
      players,
      chatHistory,
      sendChat
    }
  }
}
</script>

<style scoped>
.game-view {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.game-container {
  width: 100%;
  height: 100%;
}

.game-ui {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.chat-box {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 350px;
  background: rgba(0,0,0,0.5);
  border-radius: 8px;
  padding: 10px;
  pointer-events: all;
}

.messages {
  height: 150px;
  overflow-y: auto;
  margin-bottom: 10px;
  color: white;
  font-size: 14px;
}

.chat-box input {
  width: 100%;
  padding: 8px;
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.4);
  color: white;
  border-radius: 4px;
}

.player-list {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 200px;
  background: rgba(0,0,0,0.5);
  border-radius: 8px;
  padding: 10px;
  color: white;
  pointer-events: all;
}

.player-list ul {
  list-style: none;
  padding: 0;
  margin: 10px 0 0 0;
}
</style> 