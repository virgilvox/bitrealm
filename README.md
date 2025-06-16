# bitrealm

**Browser-native, plugin-ready, open-source MMORPG builder**

*formerly "Mythweaver" – renamed to bitrealm*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## Overview

bitrealm is a complete MMORPG creation platform that runs entirely in the browser. Build multiplayer worlds with visual editors, script game logic with a custom DSL, and publish instantly without downloads or complex deployments.

### Key Features

- **🎨 Visual Map Editor**: Multi-layer PixiJS painter with real-time collaboration
- **⚡ Live Scripting**: Custom DSL with JavaScript integration and hot-reload
- **👥 Multiplayer Core**: Built on Colyseus with auto-scaling and presence
- **🎭 Rich Content**: NPCs, quests, dialogue trees, and inventory systems
- **🔧 Plugin Architecture**: Extensible with hot-loadable community plugins
- **📱 Universal Publishing**: Export to web, desktop, mobile, or self-host

## Architecture

```
Browser Clients ──WebSocket──▶ NGINX (HTTP/WS)
                                 │
         REST ────────────────▶ │
                                 ▼
                      ┌────────────────┐
                      │  Colyseus ★    │   rooms = "game servers"
                      └────────────────┘
                                 │ pub/sub
                                 ▼
      Postgres ◀─── Fastify/tRPC ───▶ Redis
                                 │    (matchmaking,
                                 │     room discovery,
                                 ▼     presence)
           Cloudflare R2/S3 (sprites, audio, CDN)
```

### Technology Stack

- **Backend**: Fastify, Colyseus, tRPC, PostgreSQL, Redis
- **Frontend**: Vanilla JavaScript, PixiJS, CSS3
- **Real-time**: WebSocket, Colyseus state synchronization
- **Deployment**: Docker, NGINX, Kubernetes/Fly.io scaling

## Quick Start

### Prerequisites

- Node.js 16+ 
- PostgreSQL 12+
- Redis 6+
- Docker (optional)

### Installation

```bash
git clone https://github.com/bitrealm/bitrealm.git
cd bitrealm

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database and Redis settings

# Initialize database
npm run db:init

# Start development servers
npm run dev
```

This starts:
- Frontend dev server: http://localhost:3000
- Backend API: http://localhost:3001
- Colyseus monitor: http://localhost:3001/monitor

### Docker Setup

```bash
# Quick start with Docker Compose
docker-compose up -d

# Or build custom image
docker build -t bitrealm .
docker run -p 3000:3000 -p 3001:3001 bitrealm
```

## Development Workflow

### Creating Your First World

1. **Open Editor**: Navigate to http://localhost:3000/editor/
2. **Map Design**: Use the tile editor to create terrain and objects
3. **Add Characters**: Place NPCs and define their behaviors
4. **Script Logic**: Write DSL scripts for quests, events, and interactions
5. **Test Multiplayer**: Click "Preview" to spawn a test room
6. **Publish**: Make your world public for others to play

### DSL Scripting Example

```dsl
// Welcome new players
on playerJoin {
  if (player.level == 1) {
    give player "Wooden Sword" 1;
    give player "Health Potion" 5;
    emit "chat", "🗡️ $playerName just started their adventure!";
  }
}

// NPC interaction with JavaScript block
on npcInteract {
  script {
    /** @type {Player} */
    const p = player;
    /** @type {NPC} */
    const merchant = npc;
    
    if (p.gold >= 50) {
      p.gold -= 50;
      giveItem(p, "Magic Map");
      whisper(p, "You purchased a Magic Map!");
    } else {
      whisper(p, "You need 50 gold for this map.");
    }
  }
}
```

### Plugin Development

```javascript
// plugins/weather/index.js
export function registerPlugin(forge) {
  forge.hooks.extendSchema("map", {
    weather: { type: "string", enum: ["sun", "rain", "snow"], default: "sun" }
  });

  forge.hooks.onTick((ctx) => {
    if (ctx.map.weather === "rain") {
      forge.events.emit("spawnFx", { 
        id: "rainDrop", 
        x: ctx.randX(), 
        y: ctx.randY() 
      });
    }
  });
}
```

## Project Structure

```
bitrealm/
├── server/                 # Backend services
│   ├── index.js           # Main Fastify server
│   ├── rooms/             # Colyseus room handlers
│   │   ├── GameRoom.js    # Gameplay logic
│   │   └── EditorRoom.js  # Collaborative editing
│   ├── dsl/               # Domain Specific Language
│   │   ├── parser.js      # DSL parser
│   │   └── interpreter.js # DSL execution engine
│   ├── schemas/           # Colyseus state schemas
│   ├── api/               # REST API routes
│   └── database/          # Database models
├── client/                # Frontend application
│   ├── index.html         # Landing page
│   ├── editor/            # Map editor interface
│   ├── js/                # Client-side logic
│   └── styles/            # CSS stylesheets
├── plugins/               # Plugin system
├── public/                # Static assets
│   ├── sprites/           # Game sprites
│   ├── audio/             # Sound effects
│   └── tilesets/          # Tile graphics
└── docker-compose.yml     # Container orchestration
```

## Features & Roadmap

### ✅ Core Features (v1.0)
- [x] Multi-layer map editor with PixiJS
- [x] Real-time collaborative editing
- [x] Custom DSL with JavaScript integration
- [x] Colyseus multiplayer rooms
- [x] Asset management system
- [x] NPC and quest systems
- [x] Plugin architecture
- [x] Docker deployment

### 🚧 In Development (v1.1)
- [ ] Visual quest flow editor
- [ ] Inline pixel art editor
- [ ] Audio mixer interface
- [ ] Live debug overlay
- [ ] Plugin marketplace

### 🔮 Future Plans (v2.0+)
- [ ] Terrain auto-tiler
- [ ] GPT-powered dynamic NPCs
- [ ] Mobile editor app
- [ ] Visual scripting nodes
- [ ] Advanced analytics dashboard

## Asset Credits

This project includes assets from generous open-source contributors:

### Sprites & Graphics
- **LPC (Liberated Pixel Cup)** - Character and tile sprites
  - License: CC-BY-SA 3.0
  - Source: https://opengameart.org/content/lpc-collection
- **Kenney Game Assets** - UI elements and icons
  - License: CC0 1.0 Universal
  - Source: https://kenney.nl/assets
- **16x16 Dungeon Tileset** by 0x72
  - License: CC0 1.0 Universal
  - Source: https://0x72.itch.io/dungeontileset-ii

### Audio
- **RPG Audio Pack** by SubspaceAudio
  - License: CC0 1.0 Universal
  - Source: https://opengameart.org/content/rpg-sound-pack
- **8-bit Sound Effects** by Juhani Junkala
  - License: CC0 1.0 Universal
  - Source: https://opengameart.org/content/512-sound-effects-8-bit-style

### Fonts
- **m5x7** by Daniel Linssen
  - License: Custom (free for personal and commercial use)
  - Source: https://managore.itch.io/m5x7

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Run linting: `npm run lint`
5. Submit a pull request

### Bug Reports

Please use the [GitHub Issues](https://github.com/bitrealm/bitrealm/issues) page to report bugs or request features.

## Community

- **Discord**: [Join our community](https://discord.gg/bitrealm)
- **Forum**: [Community discussions](https://github.com/bitrealm/bitrealm/discussions)
- **Twitter**: [@bitrealmengine](https://twitter.com/bitrealmengine)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- The Colyseus team for the amazing multiplayer framework
- PixiJS contributors for the powerful 2D renderer
- The entire open-source gamedev community
- All asset creators who made their work freely available

---

**bitrealm** - Build worlds, not barriers. 🌍✨