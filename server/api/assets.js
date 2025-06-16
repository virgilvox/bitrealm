/**
 * @file Asset management API routes
 * @description Handle asset uploads, storage, and retrieval
 */

import multer from 'multer'
import sharp from 'sharp'
import { nanoid } from 'nanoid'
import { query } from '../database/index.js'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads', req.params.type || 'misc')
    await fs.mkdir(uploadDir, { recursive: true })
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueId = nanoid()
    const ext = path.extname(file.originalname)
    cb(null, `${uniqueId}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      sprite: /\.(png|jpg|jpeg|gif)$/i,
      audio: /\.(mp3|ogg|wav)$/i,
      tileset: /\.(png|jpg|jpeg)$/i
    }
    
    const type = req.params.type || 'sprite'
    if (allowedTypes[type] && allowedTypes[type].test(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error(`Invalid file type for ${type}`))
    }
  }
})

export async function assetRoutes(fastify, options) {
  // Upload asset
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
    const { projectId, name, license, attribution, tags } = request.body
    const file = request.uploadedFile

    try {
      // Generate unique filename
      const uniqueId = nanoid()
      const ext = path.extname(file.filename)
      const filename = `${uniqueId}${ext}`
      const uploadDir = path.join(__dirname, '../../uploads', type)
      const filepath = path.join(uploadDir, filename)
      
      // Ensure upload directory exists
      await fs.mkdir(uploadDir, { recursive: true })
      
      // Save file
      const buffer = await file.toBuffer()
      await fs.writeFile(filepath, buffer)
      
      // Get file info
      const stats = await fs.stat(filepath)
      const url = `/uploads/${type}/${filename}`
      
      // Process images to get dimensions
      let width = null
      let height = null
      
      if (type === 'sprite' || type === 'tileset') {
        try {
          const metadata = await sharp(filepath).metadata()
          width = metadata.width
          height = metadata.height
          
          // Create thumbnail for sprites
          if (type === 'sprite') {
            const thumbnailPath = path.join(uploadDir, `thumb_${filename}`)
            await sharp(filepath)
              .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .toFile(thumbnailPath)
          }
        } catch (err) {
          console.error('Error processing image:', err)
        }
      }
      
      // Save to database
      const result = await query(
        `INSERT INTO assets (name, type, url, file_size, mime_type, width, height, 
         owner_id, project_id, license, attribution, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, name, type, url, created_at`,
        [
          name || file.filename,
          type,
          url,
          stats.size,
          file.mimetype,
          width,
          height,
          request.user.userId,
          projectId || null,
          license || 'custom',
          attribution || '',
          tags ? tags.split(',').map(t => t.trim()) : []
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
          dimensions: width && height ? { width, height } : null,
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
        `SELECT id, name, type, url, file_size, width, height, license, attribution, tags, created_at
         FROM assets
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      )
      
      return {
        assets: result.rows.map(row => ({
          id: row.id,
          name: row.name,
          type: row.type,
          url: row.url,
          fileSize: row.file_size,
          dimensions: row.width && row.height ? { width: row.width, height: row.height } : null,
          license: row.license,
          attribution: row.attribution,
          tags: row.tags || [],
          createdAt: row.created_at
        })),
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

  // Delete asset
  fastify.delete('/:assetId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { assetId } = request.params
    
    try {
      // Get asset info
      const assetResult = await query(
        'SELECT url, owner_id FROM assets WHERE id = $1',
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
      
      // Delete file from disk
      try {
        const filepath = path.join(__dirname, '../..', asset.url)
        await fs.unlink(filepath)
        
        // Also try to delete thumbnail if it exists
        const dir = path.dirname(filepath)
        const filename = path.basename(filepath)
        const thumbPath = path.join(dir, `thumb_${filename}`)
        await fs.unlink(thumbPath).catch(() => {}) // Ignore if doesn't exist
      } catch (err) {
        console.error('Error deleting file:', err)
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
      const filepath = path.join(__dirname, '../../uploads/sprite', filename)
      
      await fs.mkdir(path.dirname(filepath), { recursive: true })
      
      await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: color
        }
      })
      .png()
      .toFile(filepath)
      
      // Save to database
      const result = await query(
        `INSERT INTO assets (name, type, url, file_size, width, height, owner_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, name, url, created_at`,
        [
          `AI: ${prompt.slice(0, 50)}`,
          'sprite',
          `/uploads/sprite/${filename}`,
          1024, // Approximate
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