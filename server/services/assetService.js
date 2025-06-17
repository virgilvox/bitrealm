/**
 * @file Asset loading service for game runtime
 * @description Handles loading and caching of project assets for game rooms
 */

import { query } from '../database/index.js';
import { getProjectAssetUrl, listProjectAssets } from '../utils/minio.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In-memory cache for frequently accessed assets
const assetCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

/**
 * Clear expired cache entries
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of assetCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      assetCache.delete(key);
    }
  }
}

// Run cache cleanup every 30 minutes
setInterval(cleanupCache, 1800000);

/**
 * Get assets for a project including defaults and user uploads
 * @param {string} projectId - Project ID
 * @param {Object} options - Options for asset loading
 * @returns {Promise<Object>} Project assets organized by type
 */
export async function getProjectAssets(projectId, options = {}) {
  const cacheKey = `project:${projectId}:${JSON.stringify(options)}`;
  
  // Check cache
  const cached = assetCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    // Get project data
    const projectResult = await query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );
    
    if (projectResult.rows.length === 0) {
      throw new Error('Project not found');
    }
    
    const project = projectResult.rows[0];
    
    // Get default assets from asset packs
    const defaultAssets = await query(
      `SELECT a.*, ap.name as pack_name
       FROM assets a
       JOIN asset_packs ap ON a.pack_id = ap.id
       JOIN project_asset_packs pap ON ap.id = pap.pack_id
       WHERE pap.project_id = $1
       ORDER BY pap.priority, a.type, a.name`,
      [projectId]
    );
    
    // Get user-uploaded assets
    const userAssets = await query(
      `SELECT * FROM assets 
       WHERE project_id = $1 AND pack_id IS NULL
       ORDER BY type, name`,
      [projectId]
    );
    
    // Organize assets by type
    const assetsByType = {
      sprites: [],
      tilesets: [],
      audio: [],
      items: [],
      npcs: []
    };
    
    // Process default assets
    for (const asset of defaultAssets.rows) {
      const assetData = {
        id: asset.id,
        name: asset.name,
        url: asset.url,
        metadata: asset.metadata || {},
        source: 'pack',
        packName: asset.pack_name,
        dimensions: asset.width && asset.height ? {
          width: asset.width,
          height: asset.height
        } : null
      };
      
      switch (asset.type) {
        case 'sprite':
          assetsByType.sprites.push(assetData);
          break;
        case 'tileset':
          assetsByType.tilesets.push(assetData);
          break;
        case 'audio':
          assetsByType.audio.push(assetData);
          break;
      }
    }
    
    // Process user assets with fresh URLs
    for (const asset of userAssets.rows) {
      // Get fresh URL from MinIO
      const filename = asset.url.split('/').pop();
      const url = await getProjectAssetUrl(
        projectId,
        asset.type,
        filename,
        3600, // 1 hour expiry for game session
        asset.is_public
      );
      
      const assetData = {
        id: asset.id,
        name: asset.name,
        url: url,
        metadata: asset.metadata || {},
        source: 'user',
        dimensions: asset.width && asset.height ? {
          width: asset.width,
          height: asset.height
        } : null,
        animationData: asset.animation_data
      };
      
      // Get thumbnail URL for sprites
      if (asset.type === 'sprite') {
        try {
          const thumbUrl = await getProjectAssetUrl(
            projectId,
            'thumbnails',
            `thumb_${filename}`,
            3600,
            asset.is_public
          );
          assetData.thumbnailUrl = thumbUrl;
        } catch (err) {
          // Thumbnail might not exist
        }
      }
      
      switch (asset.type) {
        case 'sprite':
          assetsByType.sprites.push(assetData);
          break;
        case 'tileset':
          assetsByType.tilesets.push(assetData);
          break;
        case 'audio':
          assetsByType.audio.push(assetData);
          break;
      }
    }
    
    // Load default assets if no user assets exist
    if (assetsByType.sprites.length === 0) {
      assetsByType.sprites = await loadDefaultSprites();
    }
    
    if (assetsByType.tilesets.length === 0) {
      assetsByType.tilesets = await loadDefaultTilesets();
    }
    
    const result = {
      projectId,
      projectName: project.name,
      assets: assetsByType,
      timestamp: Date.now()
    };
    
    // Cache the result
    assetCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error('Error loading project assets:', error);
    throw error;
  }
}

/**
 * Load default sprites from the assets folder
 * @returns {Promise<Array>} Default sprite assets
 */
async function loadDefaultSprites() {
  try {
    const defaultCharacter = JSON.parse(
      await readFile(
        join(__dirname, '../../assets/defaults/character/basic-character.json'),
        'utf8'
      )
    );
    
    return [{
      id: 'default-character',
      name: defaultCharacter.name,
      url: '/assets/defaults/character/basic-character.png',
      metadata: defaultCharacter,
      source: 'default',
      dimensions: defaultCharacter.dimensions
    }];
  } catch (error) {
    console.warn('Could not load default sprites:', error);
    return [];
  }
}

/**
 * Load default tilesets from the assets folder
 * @returns {Promise<Array>} Default tileset assets
 */
async function loadDefaultTilesets() {
  try {
    const defaultTileset = JSON.parse(
      await readFile(
        join(__dirname, '../../assets/defaults/tileset/basic-terrain.json'),
        'utf8'
      )
    );
    
    return [{
      id: defaultTileset.id,
      name: defaultTileset.name,
      url: `/assets/defaults/tileset/${defaultTileset.image}`,
      metadata: defaultTileset,
      source: 'default',
      dimensions: {
        width: (defaultTileset.tileSize.width * defaultTileset.columns) + (defaultTileset.spacing * (defaultTileset.columns -1)),
        height: (defaultTileset.tileSize.height * Math.ceil(Object.keys(defaultTileset.tiles).length / defaultTileset.columns))
      }
    }];
  } catch (error) {
    console.warn('Could not load default tilesets:', error);
    return [];
  }
}

/**
 * Get a specific asset by ID with fresh URL
 * @param {string} assetId - Asset ID
 * @param {string} projectId - Project ID (for access control)
 * @returns {Promise<Object>} Asset data with fresh URL
 */
export async function getAssetById(assetId, projectId) {
  const cacheKey = `asset:${assetId}`;
  
  // Check cache
  const cached = assetCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const result = await query(
      'SELECT * FROM assets WHERE id = $1',
      [assetId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Asset not found');
    }
    
    const asset = result.rows[0];
    
    // Verify project access
    if (asset.project_id && asset.project_id !== projectId && !asset.is_public) {
      throw new Error('Access denied');
    }
    
    // Get fresh URL from MinIO
    const filename = asset.url.split('/').pop();
    const url = await getProjectAssetUrl(
      asset.project_id,
      asset.type,
      filename,
      3600,
      asset.is_public
    );
    
    const assetData = {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      url: url,
      metadata: asset.metadata || {},
      dimensions: asset.width && asset.height ? {
        width: asset.width,
        height: asset.height
      } : null,
      animationData: asset.animation_data
    };
    
    // Cache the result
    assetCache.set(cacheKey, {
      data: assetData,
      timestamp: Date.now()
    });
    
    return assetData;
  } catch (error) {
    console.error('Error loading asset:', error);
    throw error;
  }
}

/**
 * Preload assets for a game room
 * @param {string} projectId - Project ID
 * @param {Array<string>} assetIds - Specific asset IDs to preload
 * @returns {Promise<Object>} Preloaded assets
 */
export async function preloadGameAssets(projectId, assetIds = []) {
  try {
    // Get all project assets
    const projectAssets = await getProjectAssets(projectId);
    
    // If specific assets requested, load those too
    if (assetIds.length > 0) {
      const specificAssets = await Promise.all(
        assetIds.map(id => getAssetById(id, projectId).catch(() => null))
      );
      
      // Merge specific assets into the result
      specificAssets.forEach(asset => {
        if (asset) {
          const typeKey = `${asset.type}s`;
          if (!projectAssets.assets[typeKey]) {
            projectAssets.assets[typeKey] = [];
          }
          
          // Avoid duplicates
          const exists = projectAssets.assets[typeKey].find(a => a.id === asset.id);
          if (!exists) {
            projectAssets.assets[typeKey].push(asset);
          }
        }
      });
    }
    
    return projectAssets;
  } catch (error) {
    console.error('Error preloading game assets:', error);
    throw error;
  }
}

/**
 * Clear cache for a specific project
 * @param {string} projectId - Project ID
 */
export function clearProjectCache(projectId) {
  for (const key of assetCache.keys()) {
    if (key.includes(`project:${projectId}`)) {
      assetCache.delete(key);
    }
  }
} 