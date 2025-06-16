# Bitrealm Asset Pack System

## Overview

Bitrealm uses an advanced asset pack system that allows users to:
- Select from multiple asset packs without overriding defaults
- Mix and match assets from different packs
- Create layered character customization with equipment
- Use professional animated sprites and tilesets

## Asset Pack Structure

```
public/assets/packs/
├── lpc-character-sprites/
│   ├── manifest.json
│   ├── characters/
│   │   ├── lpc-base-male.png (full sprite sheet)
│   │   └── lpc-base-female.png
│   └── frames/ (extracted animation frames)
├── dawnlike/
│   ├── manifest.json
│   └── tilesets/
│       ├── floors.png
│       ├── walls.png
│       └── objects.png
└── catalog.json (master catalog)
```

## Character Customization System

### Equipment Layers (in rendering order)
1. **Base** - Character body/skin
2. **Underwear** - Base clothing layer
3. **Pants** - Lower body clothing
4. **Shirt** - Upper body clothing
5. **Armor** - Chest armor/robes
6. **Boots** - Footwear
7. **Gloves** - Hand equipment
8. **Helmet** - Headgear
9. **Hair** - Hair styles (can be tinted)
10. **Weapon** - Held weapons
11. **Shield** - Off-hand equipment
12. **Effects** - Magical effects/auras

### Character Animation States
- **Idle** (4 directions)
- **Walk** (4 directions, 8 frames each)
- **Attack** (4 directions, 6 frames each)
- **Death** (6 frames)
- **Cast** (optional, for magic users)
- **Hurt** (optional, damage animation)

## API Usage

### List Available Asset Packs
```javascript
GET /api/assets/packs
Response: {
  packs: [{
    id: 1,
    name: "LPC Character Sprites",
    description: "Liberated Pixel Cup character base",
    author: "LPC Contributors",
    version: "1.0.0",
    isDefault: true,
    thumbnailUrl: "/assets/packs/lpc/thumb.png"
  }]
}
```

### Add Asset Pack to Project
```javascript
POST /api/assets/projects/:projectId/packs
Body: {
  packId: 1,
  priority: 100  // Higher priority overrides lower
}
```

### Update Character Equipment
```javascript
PUT /api/assets/characters/:characterId/equip
Body: {
  layerType: "armor",
  assetId: 123,
  tintColor: "#FF0000"  // Optional color tint
}
```

## Asset Pack Manifest Format

```json
{
  "name": "LPC Character Sprites",
  "description": "High-quality animated character sprites",
  "author": "LPC Contributors",
  "version": "1.0.0",
  "assets": {
    "characters/lpc-base-male.png": {
      "type": "character",
      "animations": {
        "walk": {
          "frames": 8,
          "directions": 4,
          "frameWidth": 64,
          "frameHeight": 64
        }
      }
    }
  },
  "equipmentLayers": {
    "base": 0,
    "armor": 4,
    "weapon": 9
  }
}
```

## Creating Custom Asset Packs

1. **Prepare Your Assets**
   - Character sprites: 64x64 per frame recommended
   - Tilesets: 16x16 or 32x32 tiles
   - Items: 32x32 icons

2. **Create Manifest**
   - Define all assets with proper metadata
   - Specify animation frames and dimensions
   - Set equipment layer mappings

3. **Upload Pack**
   - Use the asset pack upload API
   - Assets are stored in MinIO
   - Pack becomes available to all projects

## Best Practices

1. **Consistent Art Style**
   - Keep pixel density consistent within a pack
   - Use similar color palettes
   - Match perspective (top-down, isometric, etc.)

2. **Performance**
   - Use sprite sheets instead of individual frames
   - Optimize PNG files (use tools like pngquant)
   - Limit animation frame counts

3. **Layering**
   - Design equipment to work with base sprites
   - Use transparency for proper layering
   - Test different combinations

## Default Asset Packs

### LPC (Liberated Pixel Cup)
- **Style**: Classic 64x64 pixel art
- **Content**: Base characters, clothing, weapons
- **License**: CC-BY-SA 3.0 / GPL 3.0

### DawnLike
- **Style**: 16x16 roguelike tiles
- **Content**: Dungeon tiles, objects, UI elements
- **License**: CC-BY 4.0

### Pipoya RPG
- **Style**: 32x32 JRPG style
- **Content**: Characters, monsters, effects
- **License**: Free for commercial use

## Troubleshooting

### Assets Not Showing
- Check pack is added to project
- Verify asset URLs in browser console
- Ensure MinIO is running and accessible

### Animation Issues
- Verify frame dimensions match manifest
- Check animation metadata is correct
- Use process-sprites.js to extract frames

### Layering Problems
- Check layer order values
- Ensure transparent backgrounds
- Verify equipment fits base sprite dimensions 