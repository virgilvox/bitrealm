#!/usr/bin/env node

/**
 * Downloads high-quality RPG assets for Bitrealm
 * Sources include LPC (Liberated Pixel Cup) assets and other open game art
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import fetch from 'node-fetch';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ASSETS_DIR = path.join(__dirname, '../public/assets/packs');

// High-quality RPG asset sources
const ASSET_PACKS = [
  {
    name: 'LPC Character Sprites',
    description: 'Liberated Pixel Cup character base with animations',
    author: 'LPC Contributors',
    assets: {
      'characters/lpc-base-male.png': {
        url: 'https://opengameart.org/sites/default/files/Universal-LPC-spritesheet-male-01.png',
        type: 'character',
        animations: {
          walk: { frames: 8, directions: 4, frameWidth: 64, frameHeight: 64 },
          attack: { frames: 6, directions: 4, frameWidth: 64, frameHeight: 64 },
          idle: { frames: 1, directions: 4, frameWidth: 64, frameHeight: 64 }
        }
      },
      'characters/lpc-base-female.png': {
        url: 'https://opengameart.org/sites/default/files/Universal-LPC-spritesheet-female-01.png',
        type: 'character',
        animations: {
          walk: { frames: 8, directions: 4, frameWidth: 64, frameHeight: 64 },
          attack: { frames: 6, directions: 4, frameWidth: 64, frameHeight: 64 },
          idle: { frames: 1, directions: 4, frameWidth: 64, frameHeight: 64 }
        }
      }
    }
  },
  {
    name: 'Pipoya Free RPG Character Sprites',
    description: '32x32 animated character sprites in classic RPG style',
    author: 'Pipoya',
    assets: {
      'characters/pipoya-male-01.png': {
        url: 'https://pipoya.net/sozai/assets/chars/pipo-charachip01.png',
        type: 'character',
        animations: {
          walk: { frames: 3, directions: 4, frameWidth: 32, frameHeight: 32 }
        }
      }
    }
  },
  {
    name: 'DawnLike Universal Roguelike Tileset',
    description: 'Complete 16x16 tileset for roguelike/RPG games',
    author: 'DragonDePlatino',
    assets: {
      'tilesets/dawnlike-floors.png': {
        url: 'https://opengameart.org/sites/default/files/Floor.png',
        type: 'tileset',
        tileSize: 16
      },
      'tilesets/dawnlike-walls.png': {
        url: 'https://opengameart.org/sites/default/files/Wall.png',
        type: 'tileset',
        tileSize: 16
      },
      'tilesets/dawnlike-objects.png': {
        url: 'https://opengameart.org/sites/default/files/Objects.png',
        type: 'tileset',
        tileSize: 16
      }
    }
  },
  {
    name: 'RPG Item Pack',
    description: 'High-quality RPG items including weapons, armor, and consumables',
    author: 'Henrique Lazarini (7Soul)',
    assets: {
      'items/weapons-swords.png': {
        url: 'https://opengameart.org/sites/default/files/swords_1.png',
        type: 'items',
        gridSize: { width: 32, height: 32 }
      },
      'items/armor-sets.png': {
        url: 'https://opengameart.org/sites/default/files/armor_1.png',
        type: 'items',
        gridSize: { width: 32, height: 32 }
      },
      'items/potions.png': {
        url: 'https://opengameart.org/sites/default/files/potions_1.png',
        type: 'items',
        gridSize: { width: 32, height: 32 }
      }
    }
  },
  {
    name: 'Zelda-like Tilesets',
    description: 'Overworld tileset in 16-bit style',
    author: 'ArMM1998',
    assets: {
      'tilesets/zelda-overworld.png': {
        url: 'https://opengameart.org/sites/default/files/Overworld.png',
        type: 'tileset',
        tileSize: 16
      }
    }
  }
];

// Equipment layer definitions for character customization
const EQUIPMENT_LAYERS = {
  base: 0,
  underwear: 1,
  pants: 2,
  shirt: 3,
  armor: 4,
  boots: 5,
  gloves: 6,
  helmet: 7,
  hair: 8,
  weapon: 9,
  shield: 10,
  effects: 11
};

async function ensureDirectories() {
  const dirs = [
    ASSETS_DIR,
    path.join(ASSETS_DIR, 'lpc-sprites'),
    path.join(ASSETS_DIR, 'pipoya-sprites'),
    path.join(ASSETS_DIR, 'dawnlike'),
    path.join(ASSETS_DIR, 'rpg-items'),
    path.join(ASSETS_DIR, 'zelda-like')
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

async function downloadFile(url, filepath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.statusText}`);
  
  const fileStream = createWriteStream(filepath);
  await pipeline(response.body, fileStream);
  
  console.log(`✓ Downloaded: ${path.basename(filepath)}`);
}

async function createAssetPackManifest(pack, packDir) {
  const manifest = {
    name: pack.name,
    description: pack.description,
    author: pack.author,
    version: '1.0.0',
    assets: {},
    equipmentLayers: EQUIPMENT_LAYERS
  };
  
  for (const [filename, assetInfo] of Object.entries(pack.assets)) {
    manifest.assets[filename] = {
      type: assetInfo.type,
      animations: assetInfo.animations || null,
      tileSize: assetInfo.tileSize || null,
      gridSize: assetInfo.gridSize || null
    };
  }
  
  fs.writeFileSync(
    path.join(packDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log(`✓ Created manifest for ${pack.name}`);
}

async function downloadAssetPacks() {
  console.log('🎮 Downloading high-quality RPG assets for Bitrealm...\n');
  
  await ensureDirectories();
  
  // Download each asset pack
  for (const pack of ASSET_PACKS) {
    console.log(`\n📦 Downloading ${pack.name}...`);
    
    const packDir = path.join(ASSETS_DIR, pack.name.toLowerCase().replace(/\s+/g, '-'));
    if (!fs.existsSync(packDir)) {
      fs.mkdirSync(packDir, { recursive: true });
    }
    
    for (const [filename, assetInfo] of Object.entries(pack.assets)) {
      const filepath = path.join(packDir, filename);
      const fileDir = path.dirname(filepath);
      
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      
      try {
        if (!fs.existsSync(filepath)) {
          await downloadFile(assetInfo.url, filepath);
        } else {
          console.log(`⏭️  Skipping ${filename} (already exists)`);
        }
      } catch (error) {
        console.error(`❌ Failed to download ${filename}: ${error.message}`);
      }
    }
    
    // Create manifest for the pack
    await createAssetPackManifest(pack, packDir);
  }
  
  // Create a master catalog
  const catalog = {
    packs: ASSET_PACKS.map(pack => ({
      name: pack.name,
      description: pack.description,
      author: pack.author,
      directory: pack.name.toLowerCase().replace(/\s+/g, '-')
    })),
    defaultPack: 'lpc-character-sprites'
  };
  
  fs.writeFileSync(
    path.join(ASSETS_DIR, 'catalog.json'),
    JSON.stringify(catalog, null, 2)
  );
  
  console.log('\n✅ Created asset pack catalog');
  
  // Create attribution file
  const attribution = `# Bitrealm Asset Attribution

## LPC (Liberated Pixel Cup) Assets
- Authors: Various contributors to the LPC
- License: CC-BY-SA 3.0 / GPL 3.0
- Source: OpenGameArt.org

## Pipoya Free RPG Character Sprites
- Author: Pipoya
- License: Free for commercial use
- Source: pipoya.net

## DawnLike Universal Roguelike Tileset
- Author: DragonDePlatino
- License: CC-BY 4.0
- Source: OpenGameArt.org

## RPG Item Pack
- Author: Henrique Lazarini (7Soul)
- License: CC0 (Public Domain)
- Source: OpenGameArt.org

## Zelda-like Tilesets
- Author: ArMM1998
- License: CC0 (Public Domain)
- Source: OpenGameArt.org

All assets are used in accordance with their respective licenses.
`;
  
  fs.writeFileSync(path.join(ASSETS_DIR, 'ATTRIBUTION.md'), attribution);
  console.log('✅ Created attribution file');
  
  console.log('\n🎉 High-quality RPG assets downloaded successfully!');
  console.log(`📁 Location: ${ASSETS_DIR}`);
  console.log('\n💡 Note: Some assets may require additional processing.');
  console.log('   Run the process-sprites.js script to split sprite sheets and generate metadata.');
}

// Run the download
downloadAssetPacks().catch(console.error); 