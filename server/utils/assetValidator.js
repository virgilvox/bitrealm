import Ajv from 'ajv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize AJV validator
const ajv = new Ajv({ allErrors: true, verbose: true });

// Load schemas
const spriteSheetSchema = JSON.parse(
  readFileSync(join(__dirname, '../../assets/schemas/sprite-sheet.schema.json'), 'utf8')
);

const tilesetSchema = JSON.parse(
  readFileSync(join(__dirname, '../../assets/schemas/tileset.schema.json'), 'utf8')
);

// Compile validators
const validateSpriteSheet = ajv.compile(spriteSheetSchema);
const validateTileset = ajv.compile(tilesetSchema);

/**
 * Validate sprite sheet metadata against schema
 * @param {Object} metadata - Sprite sheet metadata
 * @returns {Object} { valid: boolean, errors?: Array }
 */
export function validateSpriteSheetMetadata(metadata) {
  const valid = validateSpriteSheet(metadata);
  return {
    valid,
    errors: valid ? undefined : validateSpriteSheet.errors
  };
}

/**
 * Validate tileset metadata against schema
 * @param {Object} metadata - Tileset metadata
 * @returns {Object} { valid: boolean, errors?: Array }
 */
export function validateTilesetMetadata(metadata) {
  const valid = validateTileset(metadata);
  return {
    valid,
    errors: valid ? undefined : validateTileset.errors
  };
}

/**
 * Validate asset metadata based on type
 * @param {string} assetType - Asset type (sprite, tileset, etc.)
 * @param {Object} metadata - Asset metadata
 * @returns {Object} { valid: boolean, errors?: Array }
 */
export function validateAssetMetadata(assetType, metadata) {
  switch (assetType) {
    case 'sprite':
      return validateSpriteSheetMetadata(metadata);
    case 'tileset':
      return validateTilesetMetadata(metadata);
    case 'audio':
      // Audio doesn't require special validation yet
      return { valid: true };
    default:
      return {
        valid: false,
        errors: [{ message: `Unknown asset type: ${assetType}` }]
      };
  }
}

/**
 * Extract metadata from uploaded asset
 * @param {string} assetType - Asset type
 * @param {Object} uploadData - Upload request data
 * @param {Object} imageMetadata - Image metadata from sharp (if applicable)
 * @returns {Object} Structured metadata
 */
export function extractAssetMetadata(assetType, uploadData, imageMetadata = null) {
  const baseMetadata = {
    name: uploadData.name || 'Untitled Asset',
    version: uploadData.version || '1.0.0',
    author: uploadData.author || 'Unknown',
    license: uploadData.license || 'custom',
    attribution: uploadData.attribution || '',
    tags: uploadData.tags ? uploadData.tags.split(',').map(t => t.trim()) : []
  };

  if (assetType === 'sprite' && imageMetadata) {
    // Extract sprite sheet specific metadata
    const spriteMetadata = {
      ...baseMetadata,
      type: 'sprite-sheet',
      format: imageMetadata.format || 'png',
      dimensions: {
        width: imageMetadata.width,
        height: imageMetadata.height
      },
      frameSize: {
        width: parseInt(uploadData.frameWidth) || 32,
        height: parseInt(uploadData.frameHeight) || 32
      },
      animations: []
    };

    // Parse animations if provided
    if (uploadData.animations) {
      try {
        const animations = JSON.parse(uploadData.animations);
        spriteMetadata.animations = animations;
      } catch (e) {
        console.warn('Failed to parse animations:', e);
      }
    }

    return spriteMetadata;
  }

  if (assetType === 'tileset' && imageMetadata) {
    // Extract tileset specific metadata
    const tilesetMetadata = {
      ...baseMetadata,
      type: 'tileset',
      format: imageMetadata.format || 'png',
      dimensions: {
        width: imageMetadata.width,
        height: imageMetadata.height
      },
      tileSize: {
        width: parseInt(uploadData.tileWidth) || 32,
        height: parseInt(uploadData.tileHeight) || 32
      },
      spacing: parseInt(uploadData.spacing) || 0,
      margin: parseInt(uploadData.margin) || 0,
      tiles: []
    };

    // Calculate tile count
    const cols = Math.floor(
      (imageMetadata.width - tilesetMetadata.margin * 2 + tilesetMetadata.spacing) /
      (tilesetMetadata.tileSize.width + tilesetMetadata.spacing)
    );
    const rows = Math.floor(
      (imageMetadata.height - tilesetMetadata.margin * 2 + tilesetMetadata.spacing) /
      (tilesetMetadata.tileSize.height + tilesetMetadata.spacing)
    );

    // Parse tiles metadata if provided
    if (uploadData.tiles) {
      try {
        const tiles = JSON.parse(uploadData.tiles);
        tilesetMetadata.tiles = tiles;
      } catch (e) {
        console.warn('Failed to parse tiles metadata:', e);
      }
    }

    tilesetMetadata.tileCount = cols * rows;

    return tilesetMetadata;
  }

  // Default metadata for other asset types
  return baseMetadata;
}

/**
 * Format validation errors for response
 * @param {Array} errors - AJV validation errors
 * @returns {Array} Formatted error messages
 */
export function formatValidationErrors(errors) {
  return errors.map(error => {
    const field = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
    const message = error.message;
    
    if (error.keyword === 'required') {
      return `Missing required field: ${error.params.missingProperty}`;
    }
    
    if (error.keyword === 'type') {
      return `${field || 'Value'} ${message}`;
    }
    
    if (error.keyword === 'enum') {
      return `${field || 'Value'} must be one of: ${error.params.allowedValues.join(', ')}`;
    }
    
    return `${field ? field + ': ' : ''}${message}`;
  });
} 