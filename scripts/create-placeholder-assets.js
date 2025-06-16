#!/usr/bin/env node

/**
 * Creates placeholder pixel art assets for Bitrealm
 * These are simple colored sprites to get started
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ASSETS_DIR = path.join(__dirname, '../public/assets');

// Ensure directories exist
function ensureDirectories() {
  ['sprites', 'tilesets', 'items', 'ui', 'audio'].forEach(dir => {
    const fullPath = path.join(ASSETS_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
}

// Create a simple pixel art sprite
async function createSprite(filename, color, size = 32) {
  const buffer = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{
    input: Buffer.from(
      `<svg width="${size}" height="${size}">
        <rect x="${size/4}" y="${size/4}" width="${size/2}" height="${size/2}" fill="${color}" />
      </svg>`
    ),
    top: 0,
    left: 0
  }])
  .png()
  .toBuffer();
  
  return buffer;
}

// Create character sprite with simple shape
async function createCharacterSprite(filename, primaryColor, secondaryColor) {
  const size = 32;
  const buffer = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{
    input: Buffer.from(
      `<svg width="${size}" height="${size}">
        <!-- Body -->
        <rect x="${size/3}" y="${size/2}" width="${size/3}" height="${size/3}" fill="${primaryColor}" />
        <!-- Head -->
        <circle cx="${size/2}" cy="${size/3}" r="${size/6}" fill="${secondaryColor}" />
        <!-- Arms -->
        <rect x="${size/4}" y="${size/2}" width="${size/2}" height="${size/12}" fill="${primaryColor}" />
      </svg>`
    ),
    top: 0,
    left: 0
  }])
  .png()
  .toBuffer();
  
  return buffer;
}

// Create tileset with multiple tiles
async function createTileset(filename, colors, tileSize = 16, gridSize = 4) {
  const totalSize = tileSize * gridSize;
  const tiles = [];
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const colorIndex = (y * gridSize + x) % colors.length;
      tiles.push({
        input: Buffer.from(
          `<svg width="${tileSize}" height="${tileSize}">
            <rect width="${tileSize}" height="${tileSize}" fill="${colors[colorIndex]}" />
            <rect x="0" y="0" width="${tileSize}" height="1" fill="rgba(0,0,0,0.2)" />
            <rect x="0" y="0" width="1" height="${tileSize}" fill="rgba(0,0,0,0.2)" />
          </svg>`
        ),
        top: y * tileSize,
        left: x * tileSize
      });
    }
  }
  
  const buffer = await sharp({
    create: {
      width: totalSize,
      height: totalSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite(tiles)
  .png()
  .toBuffer();
  
  return buffer;
}

// Create item icon
async function createItemIcon(filename, shape, color, size = 32) {
  let svgShape = '';
  
  switch (shape) {
    case 'sword':
      svgShape = `
        <rect x="${size/2-2}" y="${size/6}" width="4" height="${size*2/3}" fill="${color}" />
        <rect x="${size/3}" y="${size*2/3}" width="${size/3}" height="4" fill="${color}" />
      `;
      break;
    case 'potion':
      svgShape = `
        <circle cx="${size/2}" cy="${size*2/3}" r="${size/4}" fill="${color}" />
        <rect x="${size/2-4}" y="${size/3}" width="8" height="${size/3}" fill="${color}" />
        <rect x="${size/2-6}" y="${size/4}" width="12" height="4" fill="${color}" />
      `;
      break;
    case 'coin':
      svgShape = `
        <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="${color}" />
        <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="none" stroke="#000" stroke-width="1" />
      `;
      break;
    case 'chest':
      svgShape = `
        <rect x="${size/4}" y="${size/2}" width="${size/2}" height="${size/3}" fill="${color}" />
        <rect x="${size/4}" y="${size/3}" width="${size/2}" height="${size/4}" fill="${color}" rx="4" />
        <rect x="${size/2-2}" y="${size/2-2}" width="4" height="6" fill="#444" />
      `;
      break;
    default:
      svgShape = `<rect x="${size/4}" y="${size/4}" width="${size/2}" height="${size/2}" fill="${color}" />`;
  }
  
  const buffer = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{
    input: Buffer.from(
      `<svg width="${size}" height="${size}">${svgShape}</svg>`
    ),
    top: 0,
    left: 0
  }])
  .png()
  .toBuffer();
  
  return buffer;
}

// Create UI element
async function createUIElement(filename, type, color, width = 64, height = 32) {
  let svg = '';
  
  switch (type) {
    case 'button':
      svg = `
        <rect width="${width}" height="${height}" fill="${color}" rx="4" />
        <rect x="2" y="2" width="${width-4}" height="${height-4}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1" rx="3" />
      `;
      break;
    case 'panel':
      svg = `
        <rect width="${width}" height="${height}" fill="${color}" />
        <rect x="2" y="2" width="${width-4}" height="${height-4}" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="2" />
      `;
      break;
    case 'healthbar':
      svg = `
        <rect width="${width}" height="${height}" fill="#333" rx="2" />
        <rect x="2" y="2" width="${width-4}" height="${height-4}" fill="${color}" rx="1" />
      `;
      break;
  }
  
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{
    input: Buffer.from(`<svg width="${width}" height="${height}">${svg}</svg>`),
    top: 0,
    left: 0
  }])
  .png()
  .toBuffer();
  
  return buffer;
}

// Main function to create all assets
async function createAssets() {
  console.log('🎨 Creating placeholder assets for Bitrealm...\n');
  
  ensureDirectories();
  
  // Create sprites
  console.log('📁 Creating sprites...');
  const sprites = [
    { file: 'hero-male.png', fn: () => createCharacterSprite('hero-male.png', '#4169E1', '#FDBCB4') },
    { file: 'hero-female.png', fn: () => createCharacterSprite('hero-female.png', '#FF69B4', '#FDBCB4') },
    { file: 'npc-merchant.png', fn: () => createCharacterSprite('npc-merchant.png', '#8B4513', '#DEB887') },
    { file: 'enemy-slime.png', fn: () => createSprite('enemy-slime.png', '#32CD32') },
    { file: 'enemy-skeleton.png', fn: () => createCharacterSprite('enemy-skeleton.png', '#F5F5DC', '#F5F5DC') }
  ];
  
  for (const sprite of sprites) {
    const buffer = await sprite.fn();
    fs.writeFileSync(path.join(ASSETS_DIR, 'sprites', sprite.file), buffer);
    console.log(`✓ Created ${sprite.file}`);
  }
  
  // Create tilesets
  console.log('\n📁 Creating tilesets...');
  const tilesets = [
    { file: 'grass-tileset.png', colors: ['#228B22', '#32CD32', '#3CB371', '#2E8B57'] },
    { file: 'dungeon-tileset.png', colors: ['#696969', '#808080', '#A9A9A9', '#2F4F4F'] },
    { file: 'village-tileset.png', colors: ['#8B4513', '#D2691E', '#F4A460', '#DEB887'] }
  ];
  
  for (const tileset of tilesets) {
    const buffer = await createTileset(tileset.file, tileset.colors);
    fs.writeFileSync(path.join(ASSETS_DIR, 'tilesets', tileset.file), buffer);
    console.log(`✓ Created ${tileset.file}`);
  }
  
  // Create items
  console.log('\n📁 Creating items...');
  const items = [
    { file: 'sword-basic.png', shape: 'sword', color: '#C0C0C0' },
    { file: 'potion-health.png', shape: 'potion', color: '#DC143C' },
    { file: 'potion-mana.png', shape: 'potion', color: '#4169E1' },
    { file: 'coin-gold.png', shape: 'coin', color: '#FFD700' },
    { file: 'chest-closed.png', shape: 'chest', color: '#8B4513' }
  ];
  
  for (const item of items) {
    const buffer = await createItemIcon(item.file, item.shape, item.color);
    fs.writeFileSync(path.join(ASSETS_DIR, 'items', item.file), buffer);
    console.log(`✓ Created ${item.file}`);
  }
  
  // Create UI elements
  console.log('\n📁 Creating UI elements...');
  const uiElements = [
    { file: 'button-normal.png', type: 'button', color: '#4682B4' },
    { file: 'button-hover.png', type: 'button', color: '#5F9EA0' },
    { file: 'panel-wood.png', type: 'panel', color: '#8B4513' },
    { file: 'healthbar-bg.png', type: 'healthbar', color: '#333333' },
    { file: 'healthbar-fill.png', type: 'healthbar', color: '#DC143C' }
  ];
  
  for (const element of uiElements) {
    const buffer = await createUIElement(element.file, element.type, element.color);
    fs.writeFileSync(path.join(ASSETS_DIR, 'ui', element.file), buffer);
    console.log(`✓ Created ${element.file}`);
  }
  
  // Create asset manifest
  const manifest = {
    version: '1.0.0',
    description: 'Default placeholder assets for Bitrealm',
    license: 'CC0',
    categories: {
      sprites: sprites.map(s => s.file),
      tilesets: tilesets.map(t => t.file),
      items: items.map(i => i.file),
      ui: uiElements.map(u => u.file)
    }
  };
  
  fs.writeFileSync(
    path.join(ASSETS_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('\n✓ Created asset manifest');
  
  // Create README
  const readme = `# Bitrealm Default Assets

These are placeholder pixel art assets for Bitrealm. They are simple colored shapes to help you get started with the game builder.

## Asset Categories

- **sprites/**: Character and enemy sprites (32x32 pixels)
- **tilesets/**: Terrain tiles for maps (16x16 tiles in 64x64 sheets)
- **items/**: Item icons for inventory (32x32 pixels)
- **ui/**: User interface elements (various sizes)

## Using Custom Assets

To use your own assets:
1. Upload them through the Bitrealm editor interface
2. They will be stored in MinIO/S3 storage
3. Your custom assets will be available alongside these defaults

## License

All placeholder assets are CC0 (public domain) and can be used freely.
`;
  
  fs.writeFileSync(path.join(ASSETS_DIR, 'README.md'), readme);
  console.log('✓ Created README.md');
  
  console.log('\n🎉 Placeholder assets created successfully!');
  console.log(`📁 Location: ${ASSETS_DIR}`);
}

// Run the script
createAssets().catch(console.error); 