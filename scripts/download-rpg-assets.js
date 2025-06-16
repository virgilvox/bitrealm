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
// Note: URLs have been updated to more stable sources.
const ASSET_PACKS = [
  {
    name: 'lpc-character-sprites',
    type: 'zip',
    description: 'Liberated Pixel Cup Revised character base with animations',
    author: 'Eliza Wyatt, Stephen Challener, et al.',
    url: 'https://opengameart.org/sites/default/files/lpc_revised_character_basics.zip',
    // We will process the contents of the zip after download
    assets: {} 
  },
  {
    name: 'pipoya-rpg-sprites',
    type: 'zip',
    description: '32x32 animated character sprites in classic RPG style',
    author: 'Pipoya',
    // Itch.io download is behind a JS gateway, so we link to a mirror.
    // In a real scenario, manual download might be required or using an API.
    url: 'https://archive.org/download/pipoya-free-rpg-character-sprites-32x32/PIPOYA%20FREE%20RPG%20Character%20Sprites%2032x32.zip',
    assets: {}
  },
  {
    name: 'dawnlike-tileset',
    type: 'zip',
    description: 'Complete 16x16 tileset for roguelike/RPG games',
    author: 'DragonDePlatino & DawnBringer',
    url: 'https://opengameart.org/sites/default/files/DawnLike_1.zip',
    assets: {}
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

async function processZip(filepath, packDir) {
  try {
    const zip = new AdmZip(filepath);
    zip.extractAllTo(packDir, /*overwrite*/ true);
    console.log(`✓ Extracted: ${path.basename(filepath)}`);
    fs.unlinkSync(filepath); // Clean up zip file
  } catch (e) {
    console.error(`❌ Failed to extract zip file: ${filepath}`, e);
  }
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
  
  // For non-zip packs, the asset list is predefined.
  if (pack.type !== 'zip') {
    for (const [filename, assetInfo] of Object.entries(pack.assets)) {
      manifest.assets[filename] = {
        type: assetInfo.type,
        animations: assetInfo.animations || null,
        tileSize: assetInfo.tileSize || null,
        gridSize: assetInfo.gridSize || null
      };
    }
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
    
    const packDir = path.join(ASSETS_DIR, pack.name);
    if (!fs.existsSync(packDir)) {
      fs.mkdirSync(packDir, { recursive: true });
    }
    
    if (pack.type === 'zip') {
      const zipPath = path.join(packDir, `${pack.name}.zip`);
      try {
        if (!fs.existsSync(zipPath)) { // Simple check, could be more robust
          await downloadFile(pack.url, zipPath);
          await processZip(zipPath, packDir);
        } else {
          console.log(`⏭️  Skipping download for ${pack.name} (zip exists)`);
          await processZip(zipPath, packDir); // Still process it
        }
      } catch (error) {
        console.error(`❌ Failed to download or process ${pack.name}: ${error.message}`);
      }
    } else {
      // Handle individual file downloads (if any)
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