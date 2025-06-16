# Sprite Animation System

## Overview

Bitrealm includes a comprehensive sprite animation system that allows users to upload sprite sheets, define animations, and use them in their games. The system supports both pre-made asset packs and custom user uploads.

## Features

### 1. Sprite Sheet Processing
- Upload sprite sheets in common formats (PNG, JPG, GIF)
- Auto-detect frame sizes and animation patterns
- Extract individual frames for use in animations
- Support for multiple animation states (idle, walk, attack, etc.)

### 2. Animation Configuration
- Define multiple animations per sprite sheet
- Set frame rates and looping behavior
- Preview animations in real-time
- Support for directional animations (up, down, left, right)

### 3. Character Customization
- Layer-based character system with 12 equipment slots
- Real-time equipment preview
- Color customization for skin, hair, eyes, and clothing
- Export customized characters as images

## API Endpoints

### Sprite Processing

#### Process Sprite Sheet
```
POST /api/sprites/process-sprite
```

Upload and process a sprite sheet with animation definitions.

**Request:**
- `file`: The sprite sheet image file
- `frameWidth`: Width of each frame in pixels
- `frameHeight`: Height of each frame in pixels
- `animations`: JSON object defining animations
- `packId` (optional): Associated asset pack ID
- `layerType` (optional): Layer type for equipment system

**Example animations object:**
```json
{
  "idle": {
    "row": 0,
    "startCol": 0,
    "frames": 1,
    "frameRate": 8,
    "loop": false
  },
  "walk": {
    "row": 1,
    "startCol": 0,
    "frames": 8,
    "frameRate": 8,
    "loop": true
  }
}
```

#### Auto-Detect Sprite Layout
```
POST /api/sprites/detect-sprite-layout
```

Analyze a sprite sheet to detect frame size and suggest animation patterns.

**Response:**
```json
{
  "imageSize": { "width": 512, "height": 512 },
  "detectedFrameSize": 64,
  "gridSize": { "cols": 8, "rows": 8 },
  "totalFrames": 64,
  "suggestions": [
    {
      "pattern": "lpc",
      "frameSize": { "width": 64, "height": 64 },
      "animations": {
        "walk-up": { "row": 0, "startCol": 0, "frames": 8 },
        "walk-left": { "row": 1, "startCol": 0, "frames": 8 }
      }
    }
  ]
}
```

#### Update Animation Metadata
```
PUT /api/sprites/:assetId/animations
```

Update animation definitions for an existing sprite.

#### Get Animation Preview
```
GET /api/sprites/:assetId/preview?animation=walk&scale=2
```

Get animation preview data including frame URLs and timing.

### Character System

#### Get Character Layers
```
GET /api/assets/characters/:characterId/layers?animation=idle&direction=down
```

Get all visual layers for a character in the correct rendering order.

#### Update Character Equipment
```
PUT /api/assets/characters/:characterId/equip
```

Equip or unequip items on a character.

**Request:**
```json
{
  "slotType": "weapon",
  "itemId": 123
}
```

## Sprite Sheet Formats

### RPG Maker Format
- 3 frames per direction for walking
- 4 directions (down, left, right, up)
- Common frame sizes: 32x32, 48x48

### LPC (Liberated Pixel Cup) Format
- 8 frames per animation
- Multiple animation states per sheet
- Standard frame size: 64x64
- Supports equipment layering

### Custom Format
Users can define their own animation layouts by specifying:
- Frame dimensions
- Animation names and positions
- Frame counts and rates

## Equipment Layer System

The character system uses a 12-layer rendering order:

1. **shadow** - Drop shadow
2. **base** - Base character sprite
3. **skin** - Skin overlays
4. **hair_back** - Back portion of hair
5. **armor** - Body armor
6. **clothes** - Clothing layer
7. **boots** - Footwear
8. **gloves** - Hand equipment
9. **weapon_back** - Weapons rendered behind character
10. **hair_front** - Front portion of hair
11. **helmet** - Head equipment
12. **weapon_front** - Weapons rendered in front

## Best Practices

### Sprite Sheet Guidelines
1. Use consistent frame sizes throughout the sheet
2. Align frames to a grid for easier processing
3. Use transparent backgrounds (PNG format)
4. Keep related animations on the same row
5. Name files descriptively (e.g., "knight-walk-cycle.png")

### Performance Tips
1. Limit sprite sheet size to 2048x2048 or smaller
2. Use power-of-two dimensions when possible
3. Combine related sprites into single sheets
4. Cache processed animations on the client side

### Animation Design
1. Keep frame counts reasonable (4-8 frames for most animations)
2. Use appropriate frame rates (8-12 FPS for pixel art)
3. Include transition frames for smooth motion
4. Design animations to loop seamlessly

## Example: Creating a Custom Character

```javascript
// 1. Upload base sprite
const formData = new FormData()
formData.append('file', spriteSheetFile)
formData.append('frameWidth', '64')
formData.append('frameHeight', '64')
formData.append('animations', JSON.stringify({
  'idle-down': { row: 0, startCol: 0, frames: 1 },
  'walk-down': { row: 0, startCol: 0, frames: 8 },
  'idle-up': { row: 1, startCol: 0, frames: 1 },
  'walk-up': { row: 1, startCol: 0, frames: 8 }
}))

const response = await fetch('/api/sprites/process-sprite', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
})

// 2. Create character with base sprite
const character = await fetch('/api/characters', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Hero',
    baseSpriteId: response.asset.id
  })
})

// 3. Equip items
await fetch(`/api/assets/characters/${character.id}/equip`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    slotType: 'weapon',
    itemId: swordId
  })
})
```

## Troubleshooting

### Common Issues

1. **Animation not playing smoothly**
   - Check frame rate settings
   - Ensure all frames are the same size
   - Verify frame order in sprite sheet

2. **Layers rendering incorrectly**
   - Check layer type assignments
   - Verify z-order in equipment configuration
   - Ensure transparent backgrounds

3. **Performance issues**
   - Reduce sprite sheet dimensions
   - Lower frame counts for complex animations
   - Enable hardware acceleration in browser

### Debug Mode

Enable debug mode to visualize:
- Frame boundaries
- Animation timing
- Layer composition
- Performance metrics

```javascript
// Enable debug overlay
window.SPRITE_DEBUG = true
``` 