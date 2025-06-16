#!/usr/bin/env node

/**
 * Process modular LPC Revised sprite sheets to generate animation metadata.
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ASSETS_DIR = path.join(__dirname, '../public/assets/packs');

// Configuration for the LPC Revised modular sprites
const LPC_REVISED_CONFIG = {
  packName: 'lpc-character-sprites',
  basePath: 'Body/Masculine, Thin',
  frameWidth: 64,
  frameHeight: 64,
  animations: {
    'walk-up': { file: 'Walk.png', row: 0, frames: 9 },
    'walk-left': { file: 'Walk.png', row: 1, frames: 9 },
    'walk-down': { file: 'Walk.png', row: 2, frames: 9 },
    'walk-right': { file: 'Walk.png', row: 3, frames: 9 },
    
    'run-up': { file: 'Run.png', row: 0, frames: 8 },
    'run-left': { file: 'Run.png', row: 1, frames: 8 },
    'run-down': { file: 'Run.png', row: 2, frames: 8 },
    'run-right': { file: 'Run.png', row: 3, frames: 8 },

    'idle-up': { file: 'Idle.png', row: 0, frames: 6 },
    'idle-left': { file: 'Idle.png', row: 1, frames: 6 },
    'idle-down': { file: 'Idle.png', row: 2, frames: 6 },
    'idle-right': { file: 'Idle.png', row: 3, frames: 6 },
  }
};

async function processLpcRevisedPack() {
  console.log('🎮 Processing LPC Revised sprite sheets...\n');
  
  const config = LPC_REVISED_CONFIG;
  const packDir = path.join(ASSETS_DIR, config.packName);
  const sourceDir = path.join(packDir, config.basePath);

  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source directory not found: ${sourceDir}`);
    return;
  }
  
  const skinTones = fs.readdirSync(sourceDir).filter(d => 
    fs.statSync(path.join(sourceDir, d)).isDirectory() && !d.startsWith('_')
  );

  console.log(`🎨 Found ${skinTones.length} skin tones: ${skinTones.join(', ')}`);

  const allAnimationsData = {};

  for (const tone of skinTones) {
    const toneDir = path.join(sourceDir, tone);
    const animationDataForTone = {
        frameSize: { width: config.frameWidth, height: config.frameHeight },
        animations: {}
    };

    console.log(`\nProcessing skin tone: ${tone}`);

    for (const [animName, animConfig] of Object.entries(config.animations)) {
      let finalSpriteSheetPath = path.join(toneDir, animConfig.file);
      
      if (!fs.existsSync(finalSpriteSheetPath)) {
        const parentSpriteSheetPath = path.join(sourceDir, animConfig.file);
        if(!fs.existsSync(parentSpriteSheetPath)) {
            console.warn(`-  Skipping animation '${animName}': file not found for tone ${tone}.`);
            continue;
        }
        finalSpriteSheetPath = parentSpriteSheetPath;
      }

      animationDataForTone.animations[animName] = {
        file: path.relative(packDir, finalSpriteSheetPath).replace(/\\/g, '/'),
        row: animConfig.row,
        frames: animConfig.frames,
        frameRate: animName.includes('walk') ? 9 : (animName.includes('run') ? 12 : 6),
        loop: true,
      };
    }
    allAnimationsData[tone.toLowerCase()] = animationDataForTone;
  }

  // Save the master animation metadata file
  const metadataPath = path.join(packDir, 'animations.json');
  fs.writeFileSync(metadataPath, JSON.stringify(allAnimationsData, null, 2));
  
  console.log(`\n✅ Master animation metadata created at: ${metadataPath}`);
  console.log('\n🎉 LPC Revised processing complete!');
}

processLpcRevisedPack().catch(console.error); 