#!/usr/bin/env node

/**
 * Process sprite sheets to extract individual frames and generate animation metadata
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ASSETS_DIR = path.join(__dirname, '../public/assets/packs');

// Sprite sheet configurations
const SPRITE_CONFIGS = {
  'lpc-character-sprites': {
    'characters/lpc-base-male.png': {
      frameWidth: 64,
      frameHeight: 64,
      animations: {
        'idle-down': { row: 0, frames: 1 },
        'idle-left': { row: 1, frames: 1 },
        'idle-right': { row: 2, frames: 1 },
        'idle-up': { row: 3, frames: 1 },
        'walk-down': { row: 4, frames: 8 },
        'walk-left': { row: 5, frames: 8 },
        'walk-right': { row: 6, frames: 8 },
        'walk-up': { row: 7, frames: 8 },
        'attack-down': { row: 8, frames: 6 },
        'attack-left': { row: 9, frames: 6 },
        'attack-right': { row: 10, frames: 6 },
        'attack-up': { row: 11, frames: 6 },
        'death': { row: 12, frames: 6 }
      }
    }
  }
};

async function extractFrames(imagePath, config, outputDir) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  
  const animations = {};
  
  for (const [animName, animConfig] of Object.entries(config.animations)) {
    const frames = [];
    
    for (let frame = 0; frame < animConfig.frames; frame++) {
      const x = frame * config.frameWidth;
      const y = animConfig.row * config.frameHeight;
      
      const frameFilename = `${animName}-${frame}.png`;
      const framePath = path.join(outputDir, frameFilename);
      
      // Extract frame
      await image
        .extract({
          left: x,
          top: y,
          width: config.frameWidth,
          height: config.frameHeight
        })
        .toFile(framePath);
      
      frames.push(frameFilename);
    }
    
    animations[animName] = {
      frames,
      frameRate: animName.includes('walk') ? 8 : 6,
      loop: !animName.includes('death')
    };
  }
  
  return animations;
}

async function processSpritePacks() {
  console.log('🎮 Processing sprite sheets...\n');
  
  for (const [packName, packConfig] of Object.entries(SPRITE_CONFIGS)) {
    console.log(`📦 Processing ${packName}...`);
    
    const packDir = path.join(ASSETS_DIR, packName);
    
    for (const [spritePath, config] of Object.entries(packConfig)) {
      const fullPath = path.join(packDir, spritePath);
      
      if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  Skipping ${spritePath} (not found)`);
        continue;
      }
      
      const baseName = path.basename(spritePath, '.png');
      const outputDir = path.join(packDir, 'frames', baseName);
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      try {
        const animations = await extractFrames(fullPath, config, outputDir);
        
        // Save animation metadata
        const metadataPath = path.join(outputDir, 'animations.json');
        fs.writeFileSync(metadataPath, JSON.stringify({
          source: spritePath,
          frameSize: {
            width: config.frameWidth,
            height: config.frameHeight
          },
          animations
        }, null, 2));
        
        console.log(`✓ Processed ${baseName} - ${Object.keys(animations).length} animations`);
      } catch (error) {
        console.error(`❌ Error processing ${spritePath}:`, error.message);
      }
    }
  }
  
  console.log('\n✅ Sprite processing complete!');
}

// Equipment layer composite example
async function createCharacterComposite(layers) {
  const baseWidth = 64;
  const baseHeight = 64;
  
  const composite = sharp({
    create: {
      width: baseWidth,
      height: baseHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });
  
  const compositeInputs = [];
  
  for (const layer of layers) {
    if (layer.assetPath && fs.existsSync(layer.assetPath)) {
      const input = {
        input: layer.assetPath,
        top: 0,
        left: 0
      };
      
      // Apply tint if specified
      if (layer.tintColor) {
        // This would require preprocessing the image with the tint
        // For now, we'll skip tinting in this example
      }
      
      compositeInputs.push(input);
    }
  }
  
  if (compositeInputs.length > 0) {
    return composite.composite(compositeInputs);
  }
  
  return composite;
}

// Run the processor
processSpritePacks().catch(console.error); 