#!/usr/bin/env node

/**
 * Downloads and organizes free pixel art assets for Bitrealm
 * All assets are CC0 (public domain) or have permissive licenses
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ASSETS_DIR = path.join(__dirname, '../public/assets');

// Asset sources - all CC0 or permissive licenses
const ASSET_SOURCES = {
  sprites: {
    // Pixel art character sprites
    'hero-male.png': 'https://opengameart.org/sites/default/files/Green-Cap-Character-16x18.png',
    'hero-female.png': 'https://opengameart.org/sites/default/files/Red-Cap-Character-16x18.png',
    'npc-merchant.png': 'https://opengameart.org/sites/default/files/Old%20heroCC0.png',
    'enemy-slime.png': 'https://opengameart.org/sites/default/files/Slime-Sheet.png',
    'enemy-skeleton.png': 'https://opengameart.org/sites/default/files/skeleton-NESW.png'
  },
  tilesets: {
    // Basic terrain tileset
    'grass-tileset.png': 'https://opengameart.org/sites/default/files/grass_tileset_16x16_0.png',
    'dungeon-tileset.png': 'https://opengameart.org/sites/default/files/dungeon_sheet.png',
    'village-tileset.png': 'https://opengameart.org/sites/default/files/tileset_town_multi_v002_0.png'
  },
  items: {
    // Item icons
    'sword-basic.png': 'https://opengameart.org/sites/default/files/styles/medium/public/Sword.png',
    'potion-health.png': 'https://opengameart.org/sites/default/files/styles/medium/public/PotionRed.png',
    'potion-mana.png': 'https://opengameart.org/sites/default/files/styles/medium/public/PotionBlue.png',
    'coin-gold.png': 'https://opengameart.org/sites/default/files/styles/medium/public/Coin.png',
    'chest-closed.png': 'https://opengameart.org/sites/default/files/styles/medium/public/Chest0.png'
  },
  ui: {
    // UI elements
    'button-normal.png': 'https://opengameart.org/sites/default/files/styles/medium/public/button_normal.png',
    'button-hover.png': 'https://opengameart.org/sites/default/files/styles/medium/public/button_hover.png',
    'panel-wood.png': 'https://opengameart.org/sites/default/files/styles/medium/public/panel_wood.png',
    'healthbar-bg.png': 'https://opengameart.org/sites/default/files/styles/medium/public/bar_background.png',
    'healthbar-fill.png': 'https://opengameart.org/sites/default/files/styles/medium/public/bar_fill_red.png'
  }
};

// Create directories if they don't exist
function ensureDirectories() {
  Object.keys(ASSET_SOURCES).forEach(category => {
    const dir = path.join(ASSETS_DIR, category);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Download a single file
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded: ${path.basename(filepath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

// Create placeholder assets as fallback
function createPlaceholderAsset(filepath, type) {
  // For now, create a simple JSON file indicating this is a placeholder
  const placeholder = {
    type: 'placeholder',
    category: type,
    message: 'Default asset - replace with actual sprite',
    license: 'CC0',
    dimensions: { width: 32, height: 32 }
  };
  
  fs.writeFileSync(filepath + '.json', JSON.stringify(placeholder, null, 2));
  console.log(`✓ Created placeholder metadata: ${path.basename(filepath)}.json`);
}

// Main download function
async function downloadAssets() {
  console.log('🎮 Downloading starter assets for Bitrealm...\n');
  
  ensureDirectories();
  
  for (const [category, assets] of Object.entries(ASSET_SOURCES)) {
    console.log(`\n📁 Downloading ${category}...`);
    
    for (const [filename, url] of Object.entries(assets)) {
      const filepath = path.join(ASSETS_DIR, category, filename);
      
      try {
        // Skip if file already exists
        if (fs.existsSync(filepath)) {
          console.log(`⏭️  Skipping ${filename} (already exists)`);
          continue;
        }
        
        // Try to download the file
        await downloadFile(url, filepath);
        
        // Create metadata file
        createPlaceholderAsset(filepath, category);
        
      } catch (error) {
        console.error(`❌ Failed to download ${filename}: ${error.message}`);
        // Create placeholder on failure
        createPlaceholderAsset(filepath, category);
      }
    }
  }
  
  // Create a README for the assets
  const readmeContent = `# Bitrealm Default Assets

These are starter assets for Bitrealm. All assets are either CC0 (public domain) or have permissive licenses suitable for use in open-source projects.

## Asset Categories

- **sprites/**: Character and NPC sprites
- **tilesets/**: Terrain and building tiles for map creation
- **items/**: Item icons for inventory
- **ui/**: User interface elements
- **audio/**: Sound effects and background music (to be added)

## Replacing Assets

To replace these default assets:
1. Upload your own assets through the Bitrealm editor
2. Assets will be stored in MinIO/S3 storage
3. Your custom assets will override these defaults

## License Information

All default assets are sourced from:
- OpenGameArt.org (CC0 licensed content)
- Other public domain sources

## Adding Custom Assets

Users can upload their own assets through the web interface at:
- /api/assets/sprite/upload
- /api/assets/tileset/upload
- /api/assets/audio/upload

Custom assets are stored separately and won't affect these defaults.
`;
  
  fs.writeFileSync(path.join(ASSETS_DIR, 'README.md'), readmeContent);
  console.log('\n✅ Created assets README.md');
  
  console.log('\n🎉 Asset download complete!');
  console.log(`📁 Assets location: ${ASSETS_DIR}`);
}

// Run the download
downloadAssets().catch(console.error); 