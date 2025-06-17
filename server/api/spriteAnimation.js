/**
 * @file Sprite animation configuration API
 * @description Handle sprite sheet processing and animation metadata
 */

import sharp from 'sharp'
import { query } from '../database/index.js'
import { uploadFile, deleteFile, getPublicUrl, uploadProjectAsset } from '../utils/minio.js'
import { nanoid } from 'nanoid'

export async function spriteAnimationRoutes(fastify, options) {
  // Process uploaded sprite sheet
  fastify.post('/process-sprite', {
    preHandler: [
      fastify.authenticate
    ]
  }, async (request, reply) => {
    const data = await request.file()
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' })
    }

    const { 
      frameWidth, 
      frameHeight, 
      animations,
      packId,
      layerType 
    } = data.fields;
    
    try {
      const buffer = await data.toBuffer()
      const metadata = await sharp(buffer).metadata()
      
      const spriteId = nanoid()
      const filename = `sprites/${spriteId}/sheet.png`
      
      const sheetUrl = await uploadProjectAsset(
        request.user.projectId, 'sprites', filename, buffer, buffer.length, {
        'Content-Type': data.mimetype,
        'x-amz-meta-owner-id': request.user.userId.toString()
      }, true);
      
      const result = await query(
        `INSERT INTO assets (
          name, type, url, file_size, mime_type, 
          width, height, owner_id, project_id, pack_id, 
          animation_data, layer_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, name, url, animation_data`,
        [
          data.filename, 'sprite', sheetUrl, buffer.length,
          data.mimetype, metadata.width, metadata.height,
          request.user.userId, request.user.projectId, packId || null,
          JSON.stringify({
            frameSize: { width: parseInt(frameWidth), height: parseInt(frameHeight) },
            animations: JSON.parse(animations)
          }),
          layerType || null
        ]
      )
      
      return { success: true, asset: result.rows[0] }
    } catch (error) {
      console.error('Sprite processing error:', error)
      return reply.code(500).send({ error: 'Failed to process sprite sheet' })
    }
  })

  // Update animation metadata for existing sprite
  fastify.put('/sprites/:assetId/animations', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { assetId } = request.params
    const { animations } = request.body
    
    try {
      // Verify ownership
      const assetResult = await query(
        'SELECT owner_id, animation_data FROM assets WHERE id = $1 AND type = $2',
        [assetId, 'sprite']
      )
      
      if (assetResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Sprite not found' })
      }
      
      if (assetResult.rows[0].owner_id !== request.user.userId) {
        return reply.code(403).send({ error: 'Not authorized' })
      }
      
      // Merge with existing animation data
      const existingData = assetResult.rows[0].animation_data || {}
      const updatedData = {
        ...existingData,
        animations: {
          ...existingData.animations,
          ...animations
        }
      }
      
      // Update database
      await query(
        'UPDATE assets SET animation_data = $1 WHERE id = $2',
        [JSON.stringify(updatedData), assetId]
      )
      
      return {
        success: true,
        animationData: updatedData
      }
    } catch (error) {
      console.error('Error updating animations:', error)
      return reply.code(500).send({ error: 'Failed to update animations' })
    }
  })

  // Get sprite animation preview
  fastify.get('/sprites/:assetId/preview', async (request, reply) => {
    const { assetId } = request.params
    const { animation = 'idle', scale = 2 } = request.query
    
    try {
      const result = await query(
        'SELECT url, animation_data FROM assets WHERE id = $1 AND type = $2',
        [assetId, 'sprite']
      )
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Sprite not found' })
      }
      
      const asset = result.rows[0]
      const animData = asset.animation_data
      
      if (!animData || !animData.animations || !animData.animations[animation]) {
        return reply.code(400).send({ error: 'Animation not found' })
      }
      
      const anim = animData.animations[animation]
      
      // Generate animated GIF preview
      // This is a simplified example - in production you'd want more sophisticated GIF generation
      return {
        animation: animation,
        frames: anim.frameUrls,
        frameRate: anim.frameRate,
        loop: anim.loop,
        frameSize: animData.frameSize
      }
    } catch (error) {
      console.error('Error getting sprite preview:', error)
      return reply.code(500).send({ error: 'Failed to get preview' })
    }
  })

  // Auto-detect sprite sheet layout
  fastify.post('/detect-sprite-layout', {
    preHandler: [
      fastify.authenticate
    ]
  }, async (request, reply) => {
    const data = await request.file()
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' })
    }
    
    try {
      const buffer = await data.toBuffer()
      const metadata = await sharp(buffer).metadata()
      
      const commonSizes = [16, 32, 48, 64, 128]
      let detectedSize = null
      
      for (const size of commonSizes) {
        if (metadata.width % size === 0 && metadata.height % size === 0) {
          detectedSize = { width: size, height: size }
          break
        }
      }
      
      return {
        imageSize: { width: metadata.width, height: metadata.height },
        detectedFrameSize: detectedSize
      }
    } catch (error) {
      console.error('Error detecting sprite layout:', error)
      return reply.code(500).send({ error: 'Failed to detect sprite layout' })
    }
  })
} 