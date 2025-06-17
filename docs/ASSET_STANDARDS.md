# Bitrealm Asset Standards

## Overview

Bitrealm uses a JSON-based configuration system for all game assets to ensure consistency, compatibility, and ease of management. This document outlines the standards for sprites, tilesets, and other game assets.

## Sprite Standards

### Supported Sizes
- **16x16**: Retro/minimalist style
- **32x32**: Standard pixel art (default)
- **48x48**: Higher detail sprites
- **64x64**: Maximum detail sprites

### Sprite Sheet Organization
1. **Grid Layout**: All frames must be arranged in a consistent grid
2. **Directional Order**: down, left, right, up (4 directions)
3. **Animation Order**: idle, walk, run, attack, hurt, death
4. **Frame Spacing**: 0-2 pixels between frames (configurable)

### JSON Configuration Format
```json
{
  "id": "unique-sprite-id",
  "name": "Human Readable Name",
  "image": "path/to/sprite-sheet.png",
  "frameSize": { "width": 32, "height": 32 },
  "animations": {
    "animationName": {
      "frames": [{"x": 0, "y": 0}],
      "duration": 150,
      "loop": true,
      "directions": {
        "down": [0, 1, 2, 1],
        "left": [12, 13, 14, 13],
        "right": [24, 25, 26, 25],
        "up": [36, 37, 38, 37]
      }
    }
  }
}
```

### Animation Standards
- **Idle**: 1 frame, no movement
- **Walk**: 4 frames (contact, down, contact, up)
- **Run**: 4-6 frames, faster cycle
- **Attack**: 3-5 frames, no loop
- **Hurt**: 2 frames, no loop
- **Death**: 3-4 frames, no loop

## Tileset Standards

### Tile Sizes
- **16x16**: Classic/retro games
- **32x32**: Standard modern size (default)
- **48x48**: High-detail environments

### Tileset Organization
1. **Grid Spacing**: 1 pixel between tiles (prevents bleeding)
2. **Terrain Groups**: Organize by type (grass, water, stone, etc.)
3. **Autotile Support**: 47-tile format for terrain transitions
4. **Edge Tiles**: Include corner and edge variations

### JSON Configuration Format
```json
{
  "id": "unique-tileset-id",
  "name": "Tileset Name",
  "image": "path/to/tileset.png",
  "tileSize": { "width": 32, "height": 32 },
  "spacing": 1,
  "columns": 16,
  "tiles": {
    "0": {
      "type": "passable",
      "terrain": "grass"
    }
  },
  "autotiles": {
    "grass": {
      "type": "47-tile",
      "baseTile": 0
    }
  }
}
```

### Tile Types
- **passable**: Can walk through
- **solid**: Blocks movement
- **platform**: One-way platform
- **water**: Liquid terrain
- **hazard**: Damages on contact

## File Structure

```
assets/
├── schemas/              # JSON schemas for validation
│   ├── sprite-sheet.schema.json
│   └── tileset.schema.json
├── defaults/            # Default asset packs
│   ├── character/
│   │   ├── basic-character.json
│   │   └── basic-character-32.png
│   └── tileset/
│       ├── basic-terrain.json
│       └── basic-terrain-32.png
└── user/               # User-uploaded assets
    └── [user-id]/
        ├── sprites/
        └── tilesets/
```

## Asset Validation

All assets must pass validation before being accepted:

1. **File Format**: PNG only, with transparency support
2. **Dimensions**: Must match declared size in JSON
3. **Grid Alignment**: Frames must align to declared grid
4. **Metadata**: Required fields must be present
5. **Naming**: Use kebab-case for files and IDs

## Compatibility Flags

Assets can declare compatibility with common formats:

- **LPC (Liberated Pixel Cup)**: Universal character format
- **RPG Maker**: Standard 12-frame character sheets
- **Tiled**: TMX/TSX format support

## Asset Loading

The asset loader (`server/utils/assetLoader.js`) handles:
- JSON configuration parsing
- Texture loading and caching
- Animation frame calculation
- Validation against schemas

## Best Practices

1. **Consistent Palette**: Use a limited color palette
2. **Clear Silhouettes**: Ensure sprites read well at small sizes
3. **Smooth Animations**: Test frame timing in-game
4. **Efficient Packing**: Minimize empty space in sheets
5. **Version Control**: Update version when modifying assets

## Example Usage

```javascript
// Load a sprite
const sprite = await assetLoader.loadSprite('assets/defaults/character/basic-character.json')

// Get walking animation frames for down direction
const walkFrames = assetLoader.getAnimation('basic-character-32', 'walk', 'down')

// Load a tileset
const tileset = await assetLoader.loadTileset('assets/defaults/tileset/basic-terrain.json')
```

## Future Considerations

- Support for larger sprite sizes (128x128)
- Animated tile support
- Particle effect definitions
- Sound effect associations
- Multi-layer sprite composition 