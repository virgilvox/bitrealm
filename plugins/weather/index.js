/**
 * @file Weather Plugin
 * @description Adds dynamic weather effects to worlds
 */

export function registerPlugin(forge) {
  // Extend map schema to include weather
  forge.hooks.extendSchema('map', {
    weather: { 
      type: 'string', 
      enum: ['sun', 'rain', 'snow', 'fog', 'storm'], 
      default: 'sun' 
    },
    weatherIntensity: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      default: 0.5
    }
  })

  // Initialize plugin
  forge.hooks.onInit(async (context) => {
    console.log('Weather plugin initialized')
    
    // Load saved weather patterns
    const patterns = await forge.storage.get('weatherPatterns')
    if (!patterns) {
      await forge.storage.set('weatherPatterns', [
        { name: 'Sunny Day', weather: 'sun', intensity: 0 },
        { name: 'Light Rain', weather: 'rain', intensity: 0.3 },
        { name: 'Heavy Storm', weather: 'storm', intensity: 0.9 }
      ])
    }
  })

  // Update weather effects on tick
  forge.hooks.onTick((context) => {
    const { map, deltaTime } = context
    
    if (!map || !map.weather) return
    
    // Simulate weather changes
    if (Math.random() < 0.001) { // 0.1% chance per tick
      const weathers = ['sun', 'rain', 'snow', 'fog', 'storm']
      const currentIndex = weathers.indexOf(map.weather)
      const nextIndex = (currentIndex + 1) % weathers.length
      
      map.weather = weathers[nextIndex]
      forge.events.emit('weatherChanged', {
        oldWeather: weathers[currentIndex],
        newWeather: map.weather,
        mapId: map.id
      })
    }
    
    // Apply weather effects
    switch (map.weather) {
      case 'rain':
        if (Math.random() < map.weatherIntensity) {
          forge.events.emit('spawnFx', {
            id: 'rainDrop',
            x: Math.random() * map.width * map.tileSize,
            y: Math.random() * map.height * map.tileSize,
            velocity: { x: -1, y: 5 }
          })
        }
        break
        
      case 'snow':
        if (Math.random() < map.weatherIntensity * 0.5) {
          forge.events.emit('spawnFx', {
            id: 'snowFlake',
            x: Math.random() * map.width * map.tileSize,
            y: 0,
            velocity: { x: Math.random() * 2 - 1, y: 1 }
          })
        }
        break
        
      case 'storm':
        if (Math.random() < 0.01) { // Lightning
          forge.events.emit('screenFlash', {
            color: '#ffffff',
            duration: 100
          })
          
          setTimeout(() => {
            forge.events.emit('playSound', {
              id: 'thunder',
              volume: map.weatherIntensity
            })
          }, Math.random() * 2000 + 500)
        }
        break
    }
  })

  // Register custom DSL commands
  forge.hooks.registerCommand('setWeather', (context, args) => {
    const { map } = context
    const [weather, intensity] = args
    
    if (map) {
      map.weather = weather || 'sun'
      map.weatherIntensity = parseFloat(intensity) || 0.5
      
      forge.events.emit('weatherChanged', {
        weather: map.weather,
        intensity: map.weatherIntensity,
        mapId: map.id
      })
    }
  })

  // Listen for player join to apply weather effects
  forge.events.on('playerJoin', (data) => {
    const { player, map } = data
    
    if (map && map.weather !== 'sun') {
      // Send current weather state to new player
      forge.events.emit('sendToPlayer', {
        playerId: player.id,
        message: 'weatherState',
        data: {
          weather: map.weather,
          intensity: map.weatherIntensity
        }
      })
    }
  })

  // Register UI component for weather control
  forge.registerUI({
    name: 'WeatherControl',
    template: `
      <div class="weather-control">
        <h3>Weather Control</h3>
        <select v-model="weather" @change="updateWeather">
          <option value="sun">Sunny</option>
          <option value="rain">Rain</option>
          <option value="snow">Snow</option>
          <option value="fog">Fog</option>
          <option value="storm">Storm</option>
        </select>
        <input 
          type="range" 
          v-model="intensity" 
          @input="updateWeather"
          min="0" 
          max="1" 
          step="0.1"
        />
      </div>
    `,
    data() {
      return {
        weather: 'sun',
        intensity: 0.5
      }
    },
    methods: {
      updateWeather() {
        this.$emit('weather-change', {
          weather: this.weather,
          intensity: this.intensity
        })
      }
    }
  })
}

// Plugin metadata
export const metadata = {
  name: 'weather',
  version: '1.0.0',
  description: 'Adds dynamic weather effects to worlds',
  author: 'bitrealm',
  category: 'environment',
  tags: ['weather', 'effects', 'atmosphere']
}