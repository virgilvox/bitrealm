/**
 * @file Sprite animation configuration API
 * @description Handle sprite sheet processing and animation metadata
 */

import sharp from 'sharp'
import { query } from '../database/index.js'
import { uploadFile, deleteFile, getPublicUrl } from '../utils/minio.js'
import { nanoid } from 'nanoid'

export async function spriteAnimationRoutes(fastify, options) {
  // Process uploaded sprite sheet
  fastify.post('/process-sprite', {
    preHandler: [
      fastify.authenticate,
      async (request, reply) => {
        const data = await request.file()
        if (!data) {
          return reply.code(400).send({ error: 'No file uploaded' })
        }
        request.uploadedFile = data
      }
    ]
  }, async (request, reply) => {
    const { 
      frameWidth, 
      frameHeight, 
      animations,
      packId,
      layerType 
    } = request.body
    
    const file = request.uploadedFile
    
    try {
      // Get file buffer
      const buffer = await file.toBuffer()
      
      // Get image metadata
      const metadata = await sharp(buffer).metadata()
      
      // Calculate grid dimensions
      const cols = Math.floor(metadata.width / frameWidth)
      const rows = Math.floor(metadata.height / frameHeight)
      
      // Generate unique filename
      const spriteId = nanoid()
      const filename = `sprites/${spriteId}/sheet.png`
      
      // Upload original sprite sheet
      await uploadFile(filename, buffer, buffer.length, {
        'Content-Type': file.mimetype,
        'x-amz-meta-frame-width': frameWidth.toString(),
        'x-amz-meta-frame-height': frameHeight.toString(),
        'x-amz-meta-owner-id': request.user.userId.toString()
      })
      
      const sheetUrl = getPublicUrl(filename)
      
      // Process animations and extract frames
      const processedAnimations = {}
      const extractedFrames = []
      
      for (const [animName, animData] of Object.entries(animations)) {
        const frames = []
        
        for (let frame = 0; frame < animData.frames; frame++) {
          const x = (animData.startCol + frame) * frameWidth
          const y = animData.row * frameHeight
          
          // Extract frame
          const frameBuffer = await sharp(buffer)
            .extract({
              left: x,
              top: y,
              width: frameWidth,
              height: frameHeight
            })
            .png()
            .toBuffer()
          
          const frameFilename = `sprites/${spriteId}/frames/${animName}-${frame}.png`
          
          // Upload frame
          await uploadFile(frameFilename, frameBuffer, frameBuffer.length, {
            'Content-Type': 'image/png'
          })
          
          frames.push({
            index: frame,
            url: getPublicUrl(frameFilename)
          })
          
          extractedFrames.push({
            animation: animName,
            frame: frame,
            url: getPublicUrl(frameFilename)
          })
        }
        
        processedAnimations[animName] = {
          frames: frames.length,
          frameUrls: frames.map(f => f.url),
          frameRate: animData.frameRate || 8,
          loop: animData.loop !== false
        }
      }
      
      // Save to database
      const result = await query(
        `INSERT INTO assets (
          name, type, url, file_size, mime_type, 
          width, height, owner_id, pack_id, 
          animation_data, layer_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, name, url, animation_data`,
        [
          file.filename,
          'sprite',
          sheetUrl,
          buffer.length,
          file.mimetype,
          metadata.width,
          metadata.height,
          request.user.userId,
          packId || null,
          JSON.stringify({
            frameSize: { width: frameWidth, height: frameHeight },
            gridSize: { cols, rows },
            animations: processedAnimations
          }),
          layerType || null
        ]
      )
      
      const asset = result.rows[0]
      
      return {
        success: true,
        asset: {
          id: asset.id,
          name: asset.name,
          url: asset.url,
          animationData: asset.animation_data,
          frames: extractedFrames
        }
      }
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
      fastify.authenticate,
      async (request, reply) => {
        const data = await request.file()
        if (!data) {
          return reply.code(400).send({ error: 'No file uploaded' })
        }
        request.uploadedFile = data
      }
    ]
  }, async (request, reply) => {
    const file = request.uploadedFile
    
    try {
      const buffer = await file.toBuffer()
      const metadata = await sharp(buffer).metadata()
      
      // Common sprite sheet patterns
      const commonSizes = [16, 32, 48, 64, 128]
      let detectedSize = null
      
      // Try to detect frame size based on common patterns
      for (const size of commonSizes) {
        if (metadata.width % size === 0 && metadata.height % size === 0) {
          detectedSize = size
          break
        }
      }
      
      if (!detectedSize) {
        // Fallback: assume square frames
        detectedSize = Math.min(metadata.width, metadata.height)
      }
      
      const cols = Math.floor(metadata.width / detectedSize)
      const rows = Math.floor(metadata.height / detectedSize)
      
      // Common animation patterns
      const suggestions = []
      
      // RPG Maker style (3 frames per direction, 4 directions)
      if (cols >= 3 && rows >= 4) {
        suggestions.push({
          pattern: 'rpg-maker',
          frameSize: { width: detectedSize, height: detectedSize },
          animations: {
            'idle-down': { row: 0, startCol: 0, frames: 1 },
            'idle-left': { row: 1, startCol: 0, frames: 1 },
            'idle-right': { row: 2, startCol: 0, frames: 1 },
            'idle-up': { row: 3, startCol: 0, frames: 1 },
            'walk-down': { row: 0, startCol: 0, frames: 3 },
            'walk-left': { row: 1, startCol: 0, frames: 3 },
            'walk-right': { row: 2, startCol: 0, frames: 3 },
            'walk-up': { row: 3, startCol: 0, frames: 3 }
          }
        })
      }
      
      // LPC style (8 frames per animation)
      if (cols >= 8) {
        suggestions.push({
          pattern: 'lpc',
          frameSize: { width: 64, height: 64 },
          animations: {
            'walk-up': { row: 0, startCol: 0, frames: 8 },
            'walk-left': { row: 1, startCol: 0, frames: 8 },
            'walk-down': { row: 2, startCol: 0, frames: 8 },
            'walk-right': { row: 3, startCol: 0, frames: 8 }
          }
        })
      }
      
      return {
        imageSize: { width: metadata.width, height: metadata.height },
        detectedFrameSize: detectedSize,
        gridSize: { cols, rows },
        totalFrames: cols * rows,
        suggestions
      }
    } catch (error) {
      console.error('Error detecting sprite layout:', error)
      return reply.code(500).send({ error: 'Failed to detect sprite layout' })
    }
  })
} 