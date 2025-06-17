/**
 * @file Asset management API routes
 * @description Handle asset uploads, storage, and retrieval
 */

import sharp from 'sharp'
import { nanoid } from 'nanoid'
import { query } from '../database/index.js'
import { 
  uploadProjectAsset, 
  deleteProjectAsset, 
  getProjectAssetUrl, 
  listProjectAssets,
  getObjectPath 
} from '../utils/minio.js'
import { 
  validateAssetMetadata, 
  extractAssetMetadata, 
  formatValidationErrors 
} from '../utils/assetValidator.js'

export async function assetRoutes(fastify, options) {
  // Upload asset with validation
  fastify.post('/:type/upload', {
    preHandler: [
      fastify.authenticate,
      async (request, reply) => {
        // Handle multipart upload
        const data = await request.file()
        if (!data) {
          return reply.code(400).send({ error: 'No file uploaded' })
        }
        
        request.uploadedFile = data
      }
    ]
  }, async (request, reply) => {
    const { type } = request.params
    const { projectId, name, license, attribution, tags, isPublic, ...metadata } = request.body
    const file = request.uploadedFile

    try {
      // Validate file type
      const allowedTypes = {
        sprite: /\.(png|jpg|jpeg|gif)$/i,
        audio: /\.(mp3|ogg|wav)$/i,
        tileset: /\.(png|jpg|jpeg)$/i
      }
      
      if (!allowedTypes[type] || !allowedTypes[type].test(file.filename)) {
        return reply.code(400).send({ error: `Invalid file type for ${type}` })
      }

      // Verify project ownership if projectId provided
      if (projectId) {
        const projectResult = await query(
          'SELECT owner_id FROM projects WHERE id = $1',
          [projectId]
        )
        
        if (projectResult.rows.length === 0) {
          return reply.code(404).send({ error: 'Project not found' })
        }
        
        if (projectResult.rows[0].owner_id !== request.user.userId) {
          return reply.code(403).send({ error: 'Not authorized to upload assets to this project' })
        }
      }

      // Generate unique filename
      const uniqueId = nanoid()
      const ext = file.filename.match(/\.[^.]+$/)?.[0] || '.png'
      const filename = `${uniqueId}${ext}`
      
      // Get file buffer
      const buffer = await file.toBuffer()
      
      // Process images to get dimensions and metadata
      let imageMetadata = null;
      
      if (type === 'sprite' || type === 'tileset') {
        try {
          imageMetadata = await sharp(buffer).metadata()
        } catch (err) {
          console.error('Error processing image:', err)
          return reply.code(400).send({ error: 'Invalid image file' })
        }
      }
      
      // Additional validation for grid alignment
      if (type === 'sprite' || type === 'tileset') {
        const frameWidth = parseInt(metadata.frameWidth || metadata.tileWidth);
        const frameHeight = parseInt(metadata.frameHeight || metadata.tileHeight);
        const spacing = parseInt(metadata.spacing) || 0;
        const margin = parseInt(metadata.margin) || 0;

        if ((imageMetadata.width - margin * 2 + spacing) % (frameWidth + spacing) !== 0 ||
            (imageMetadata.height - margin * 2 + spacing) % (frameHeight + spacing) !== 0) {
          return reply.code(400).send({
            error: 'Image dimensions do not align with frame size, spacing, and margin.'
          });
        }
      }
      
      // Extract metadata from request body and image
      const assetMetadata = extractAssetMetadata(type, {
        name,
        license,
        attribution,
        tags,
        ...metadata
      }, imageMetadata);
      
      // Validate metadata against schema
      const { valid, errors } = validateAssetMetadata(type, assetMetadata);
      if (!valid) {
        return reply.code(400).send({
          error: 'Asset metadata validation failed',
          details: formatValidationErrors(errors)
        });
      }
      
      // Upload to MinIO with project organization
      const uploadResult = await uploadProjectAsset(
        projectId,
        type,
        filename,
        buffer,
        buffer.length,
        {
          'Content-Type': file.mimetype,
          'x-amz-meta-original-name': file.filename,
          'x-amz-meta-owner-id': request.user.userId.toString(),
          'x-amz-meta-asset-metadata': JSON.stringify(assetMetadata)
        },
        isPublic === 'true' || isPublic === true
      );
      
      // Get asset URL
      const url = await getProjectAssetUrl(
        projectId, 
        type, 
        filename, 
        undefined, 
        isPublic === 'true' || isPublic === true
      );
      
      // Create thumbnail for sprites
      let thumbnailUrl = null;
      if (type === 'sprite') {
        try {
          const thumbnailBuffer = await sharp(buffer)
            .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer()
          
          const thumbFilename = `thumb_${filename}`;
          await uploadProjectAsset(
            projectId,
            'thumbnails',
            thumbFilename,
            thumbnailBuffer,
            thumbnailBuffer.length,
            {
              'Content-Type': 'image/png',
              'x-amz-meta-is-thumbnail': 'true',
              'x-amz-meta-original-asset': uploadResult.objectPath
            },
            isPublic === 'true' || isPublic === true
          );
          
          thumbnailUrl = await getProjectAssetUrl(
            projectId,
            'thumbnails',
            thumbFilename,
            undefined,
            isPublic === 'true' || isPublic === true
          );
        } catch (err) {
          console.error('Error creating thumbnail:', err)
        }
      }
      
      // Save to database with full metadata
      const result = await query(
        `INSERT INTO assets (
          name, type, url, file_size, mime_type, width, height, 
          owner_id, project_id, is_public, license, attribution, tags, metadata, animation_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, name, type, url, created_at`,
        [
          assetMetadata.name,
          type,
          url,
          buffer.length,
          file.mimetype,
          imageMetadata?.width || null,
          imageMetadata?.height || null,
          request.user.userId,
          projectId || null,
          isPublic === 'true' || isPublic === true,
          assetMetadata.license,
          assetMetadata.attribution,
          assetMetadata.tags || [],
          assetMetadata,
          type === 'sprite' ? assetMetadata.animations : null
        ]
      )
      
      const asset = result.rows[0]
      return {
        success: true,
        asset: {
          id: asset.id,
          name: asset.name,
          type: asset.type,
          url: asset.url,
          thumbnailUrl,
          dimensions: imageMetadata ? { 
            width: imageMetadata.width, 
            height: imageMetadata.height 
          } : null,
          metadata: assetMetadata,
          createdAt: asset.created_at
        }
      }
    } catch (error) {
      console.error('Asset upload error:', error)
      return reply.code(500).send({ error: 'Failed to upload asset' })
    }
  })

  // Get user's assets
  fastify.get('/my', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { type, projectId, page = 1, limit = 20 } = request.query
    const offset = (page - 1) * limit
    
    try {
      let whereClause = 'WHERE owner_id = $3'
      const params = [limit, offset, request.user.userId]
      let paramIndex = 4
      
      if (type) {
        whereClause += ` AND type = $${paramIndex}`
        params.push(type)
        paramIndex++
      }
      
      if (projectId) {
        whereClause += ` AND (project_id = $${paramIndex} OR project_id IS NULL)`
        params.push(projectId)
        paramIndex++
      }
      
      const result = await query(
        `SELECT id, name, type, url, file_size, width, height, 
                is_public, license, attribution, tags, metadata, created_at
         FROM assets
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      )
      
      // Get thumbnail URLs for sprites
      const assets = await Promise.all(result.rows.map(async (row) => {
        let thumbnailUrl = null;
        
        if (row.type === 'sprite' && row.metadata?.type === 'sprite-sheet') {
          try {
            // Extract filename from URL or metadata
            const objectPath = row.metadata['x-amz-meta-object-path'] || 
                             getObjectPath(row.project_id, row.type, 'thumb_' + row.id);
            
            thumbnailUrl = await getProjectAssetUrl(
              row.project_id,
              'thumbnails',
              'thumb_' + row.id,
              undefined,
              row.is_public
            ).catch(() => null);
          } catch (err) {
            // Thumbnail might not exist
          }
        }
        
        return {
          id: row.id,
          name: row.name,
          type: row.type,
          url: row.url,
          thumbnailUrl,
          fileSize: row.file_size,
          dimensions: row.width && row.height ? { width: row.width, height: row.height } : null,
          isPublic: row.is_public,
          license: row.license,
          attribution: row.attribution,
          tags: row.tags || [],
          metadata: row.metadata,
          createdAt: row.created_at
        };
      }));
      
      return {
        assets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: result.rows.length === parseInt(limit)
        }
      }
    } catch (error) {
      console.error('Error fetching user assets:', error)
      return reply.code(500).send({ error: 'Failed to fetch assets' })
    }
  })

  // Get project assets (including from asset packs)
  fastify.get('/project/:projectId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { projectId } = request.params;
    const { type, includeDefaults = true, page = 1, limit = 50 } = request.query;
    
    try {
      // Verify project access
      const projectResult = await query(
        `SELECT p.*, 
                CASE 
                  WHEN p.owner_id = $2 THEN 'owner'
                  WHEN pc.user_id IS NOT NULL THEN pc.role
                  WHEN p.is_public THEN 'viewer'
                  ELSE NULL
                END as user_role
         FROM projects p
         LEFT JOIN project_collaborators pc ON p.id = pc.project_id AND pc.user_id = $2
         WHERE p.id = $1`,
        [projectId, request.user.userId]
      );
      
      if (projectResult.rows.length === 0 || !projectResult.rows[0].user_role) {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Get project-specific assets from MinIO
      const projectAssets = await listProjectAssets(projectId, type, {
        maxKeys: limit,
        marker: page > 1 ? `page-${page}` : ''
      });
      
      // Get assets from selected asset packs
      const packAssets = includeDefaults === 'true' ? await query(
        `SELECT a.* 
         FROM assets a
         JOIN asset_packs ap ON a.pack_id = ap.id
         JOIN project_asset_packs pap ON ap.id = pap.pack_id
         WHERE pap.project_id = $1 ${type ? 'AND a.type = $2' : ''}
         ORDER BY pap.priority, a.name
         LIMIT $${type ? 3 : 2} OFFSET $${type ? 4 : 3}`,
        type ? [projectId, type, limit, (page - 1) * limit] : [projectId, limit, (page - 1) * limit]
      ) : { rows: [] };
      
      // Combine and format results
      const assets = [
        ...projectAssets.objects.map(obj => ({
          id: obj.etag,
          name: obj.name.split('/').pop(),
          type: obj.name.split('/')[2], // Extract type from path
          url: getProjectAssetUrl(projectId, type, obj.name.split('/').pop(), undefined, false),
          fileSize: obj.size,
          source: 'project',
          lastModified: obj.lastModified
        })),
        ...packAssets.rows.map(row => ({
          id: row.id,
          name: row.name,
          type: row.type,
          url: row.url,
          fileSize: row.file_size,
          dimensions: row.width && row.height ? { width: row.width, height: row.height } : null,
          source: 'pack',
          packId: row.pack_id,
          metadata: row.metadata
        }))
      ];
      
      return {
        projectId,
        assets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: projectAssets.isTruncated || packAssets.rows.length === parseInt(limit)
        }
      };
    } catch (error) {
      console.error('Error fetching project assets:', error);
      return reply.code(500).send({ error: 'Failed to fetch project assets' });
    }
  });

  // Delete asset
  fastify.delete('/:assetId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { assetId } = request.params
    
    try {
      // Get asset info
      const assetResult = await query(
        'SELECT * FROM assets WHERE id = $1',
        [assetId]
      )
      
      if (assetResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Asset not found' })
      }
      
      const asset = assetResult.rows[0]
      
      // Check ownership
      if (asset.owner_id !== request.user.userId) {
        return reply.code(403).send({ error: 'Not authorized to delete this asset' })
      }
      
      // Delete from database
      await query('DELETE FROM assets WHERE id = $1', [assetId])
      
      // Delete from MinIO
      try {
        // Extract filename from metadata or URL
        const urlParts = asset.url.split('/')
        const filename = urlParts[urlParts.length - 1]
        
        await deleteProjectAsset(
          asset.project_id, 
          asset.type, 
          filename, 
          asset.is_public
        )
        
        // Also try to delete thumbnail if it's a sprite
        if (asset.type === 'sprite') {
          await deleteProjectAsset(
            asset.project_id,
            'thumbnails',
            `thumb_${filename}`,
            asset.is_public
          ).catch(() => {}) // Ignore if doesn't exist
        }
      } catch (err) {
        console.error('Error deleting file from MinIO:', err)
      }
      
      return { success: true, message: 'Asset deleted' }
    } catch (error) {
      console.error('Error deleting asset:', error)
      return reply.code(500).send({ error: 'Failed to delete asset' })
    }
  })

  // Generate AI sprite (mock implementation)
  fastify.post('/generate/sprite', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { prompt, style = 'pixel-art', size = '32x32' } = request.body
    
    if (!prompt) {
      return reply.code(400).send({ error: 'Prompt is required' })
    }
    
    try {
      // In a real implementation, this would call an AI service
      // For now, we'll create a placeholder colored square
      const [width, height] = size.split('x').map(Number)
      const color = `hsl(${Math.random() * 360}, 70%, 50%)`
      
      // Create a simple colored square with sharp
      const filename = `ai_${nanoid()}.png`
      const objectName = `sprite/${filename}`
      
      const buffer = await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: color
        }
      })
      .png()
      .toBuffer()
      
      // Upload to MinIO
      await uploadFile(objectName, buffer, buffer.length, {
        'Content-Type': 'image/png',
        'x-amz-meta-generated': 'true',
        'x-amz-meta-prompt': prompt
      })
      
      const url = getPublicUrl(objectName)
      
      // Save to database
      const result = await query(
        `INSERT INTO assets (name, type, url, file_size, width, height, owner_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, name, url, created_at`,
        [
          `AI: ${prompt.slice(0, 50)}`,
          'sprite',
          url,
          buffer.length,
          width,
          height,
          request.user.userId,
          JSON.stringify({ prompt, style, generated: true })
        ]
      )
      
      const asset = result.rows[0]
      return {
        success: true,
        asset: {
          id: asset.id,
          name: asset.name,
          url: asset.url,
          dimensions: { width, height },
          createdAt: asset.created_at
        }
      }
    } catch (error) {
      console.error('Error generating sprite:', error)
      return reply.code(500).send({ error: 'Failed to generate sprite' })
    }
  })
}