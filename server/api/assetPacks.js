/**
 * @file Asset pack management API routes
 * @description Handle asset pack selection and management for projects
 */

import { query } from '../database/index.js'
import { nanoid } from 'nanoid'
import { uploadProjectAsset } from '../utils/minio.js'

export async function assetPackRoutes(fastify, options) {
  // Get all available asset packs
  fastify.get('/packs', async (request, reply) => {
    try {
      const result = await query(
        `SELECT id, name, description, author, version, is_default, is_public, thumbnail_url
         FROM asset_packs
         WHERE is_public = true OR owner_id = $1
         ORDER BY is_default DESC, name ASC`,
        [request.user?.userId || null]
      )
      
      return {
        packs: result.rows.map(pack => ({
          id: pack.id,
          name: pack.name,
          description: pack.description,
          author: pack.author,
          version: pack.version,
          isDefault: pack.is_default,
          isPublic: pack.is_public,
          thumbnailUrl: pack.thumbnail_url
        }))
      }
    } catch (error) {
      console.error('Error fetching asset packs:', error)
      return reply.code(500).send({ error: 'Failed to fetch asset packs' })
    }
  })

  // Get asset pack details with assets
  fastify.get('/packs/:packId', async (request, reply) => {
    const { packId } = request.params
    
    try {
      // Get pack info
      const packResult = await query(
        'SELECT * FROM asset_packs WHERE id = $1',
        [packId]
      )
      
      if (packResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Asset pack not found' })
      }
      
      const pack = packResult.rows[0]
      
      // Get assets in this pack
      const assetsResult = await query(
        `SELECT id, name, type, url, animation_data, layer_type, width, height
         FROM assets
         WHERE pack_id = $1
         ORDER BY type, name`,
        [packId]
      )
      
      return {
        pack: {
          id: pack.id,
          name: pack.name,
          description: pack.description,
          author: pack.author,
          version: pack.version,
          isDefault: pack.is_default,
          isPublic: pack.is_public,
          metadata: pack.metadata,
          assets: assetsResult.rows.map(asset => ({
            id: asset.id,
            name: asset.name,
            type: asset.type,
            url: asset.url,
            animationData: asset.animation_data,
            layerType: asset.layer_type,
            dimensions: asset.width && asset.height ? 
              { width: asset.width, height: asset.height } : null
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching asset pack details:', error)
      return reply.code(500).send({ error: 'Failed to fetch asset pack details' })
    }
  })

  // Get project's selected asset packs
  fastify.get('/projects/:projectId/packs', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { projectId } = request.params
    
    try {
      // Verify project ownership
      const projectResult = await query(
        'SELECT owner_id FROM projects WHERE id = $1',
        [projectId]
      )
      
      if (projectResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Project not found' })
      }
      
      if (projectResult.rows[0].owner_id !== request.user.userId) {
        return reply.code(403).send({ error: 'Not authorized' })
      }
      
      // Get selected packs
      const result = await query(
        `SELECT ap.*, pap.priority
         FROM asset_packs ap
         JOIN project_asset_packs pap ON ap.id = pap.pack_id
         WHERE pap.project_id = $1
         ORDER BY pap.priority DESC`,
        [projectId]
      )
      
      return {
        packs: result.rows.map(pack => ({
          id: pack.id,
          name: pack.name,
          description: pack.description,
          author: pack.author,
          version: pack.version,
          priority: pack.priority,
          thumbnailUrl: pack.thumbnail_url
        }))
      }
    } catch (error) {
      console.error('Error fetching project asset packs:', error)
      return reply.code(500).send({ error: 'Failed to fetch project asset packs' })
    }
  })

  // Add asset pack to project
  fastify.post('/projects/:projectId/packs', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { projectId } = request.params
    const { packId, priority = 0 } = request.body
    
    try {
      // Verify project ownership
      const projectResult = await query(
        'SELECT owner_id FROM projects WHERE id = $1',
        [projectId]
      )
      
      if (projectResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Project not found' })
      }
      
      if (projectResult.rows[0].owner_id !== request.user.userId) {
        return reply.code(403).send({ error: 'Not authorized' })
      }
      
      // Add pack to project
      await query(
        `INSERT INTO project_asset_packs (project_id, pack_id, priority)
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id, pack_id) 
         DO UPDATE SET priority = $3`,
        [projectId, packId, priority]
      )
      
      return { success: true, message: 'Asset pack added to project' }
    } catch (error) {
      console.error('Error adding asset pack to project:', error)
      return reply.code(500).send({ error: 'Failed to add asset pack' })
    }
  })

  // Remove asset pack from project
  fastify.delete('/projects/:projectId/packs/:packId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { projectId, packId } = request.params
    
    try {
      // Verify project ownership
      const projectResult = await query(
        'SELECT owner_id FROM projects WHERE id = $1',
        [projectId]
      )
      
      if (projectResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Project not found' })
      }
      
      if (projectResult.rows[0].owner_id !== request.user.userId) {
        return reply.code(403).send({ error: 'Not authorized' })
      }
      
      // Remove pack from project
      await query(
        'DELETE FROM project_asset_packs WHERE project_id = $1 AND pack_id = $2',
        [projectId, packId]
      )
      
      return { success: true, message: 'Asset pack removed from project' }
    } catch (error) {
      console.error('Error removing asset pack:', error)
      return reply.code(500).send({ error: 'Failed to remove asset pack' })
    }
  })

  // Upload a new asset pack
  fastify.post('/packs/upload', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const data = await request.file()
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' })
      }

      const { name, description, author } = data.fields
      const file = data.file
      
      // Process zip file
      // Unzip and process assets
      // For now, just save the pack metadata
      const packResult = await query(
        `INSERT INTO asset_packs (name, description, author, owner_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name`,
        [name, description, author, request.user.userId]
      )
      
      const newPack = packResult.rows[0]
      
      // Handle file storage (e.g., save zip to MinIO)
      const zipBuffer = await data.toBuffer()
      const zipFilename = `packs/${newPack.id}.zip`
      await uploadProjectAsset(null, 'packs', zipFilename, zipBuffer, zipBuffer.length, {}, true)

      return {
        success: true,
        pack: newPack
      }

    } catch (error) {
      console.error('Error uploading asset pack:', error)
      return reply.code(500).send({ error: 'Failed to upload asset pack' })
    }
  })

  // Get character customization layers
  fastify.get('/characters/:characterId/layers', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { characterId } = request.params
    
    try {
      const result = await query(
        `SELECT cl.*, a.url, a.animation_data
         FROM character_layers cl
         JOIN assets a ON cl.asset_id = a.id
         WHERE cl.character_id = $1
         ORDER BY cl.layer_order`,
        [characterId]
      )
      
      return {
        layers: result.rows.map(layer => ({
          id: layer.id,
          layerType: layer.layer_type,
          assetId: layer.asset_id,
          assetUrl: layer.url,
          animationData: layer.animation_data,
          layerOrder: layer.layer_order,
          tintColor: layer.tint_color
        }))
      }
    } catch (error) {
      console.error('Error fetching character layers:', error)
      return reply.code(500).send({ error: 'Failed to fetch character layers' })
    }
  })

  // Update character equipment
  fastify.put('/characters/:characterId/equip', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { characterId } = request.params
    const { layerType, assetId, tintColor } = request.body
    
    try {
      // Verify character ownership
      const charResult = await query(
        'SELECT user_id FROM characters WHERE id = $1',
        [characterId]
      )
      
      if (charResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Character not found' })
      }
      
      if (charResult.rows[0].user_id !== request.user.userId) {
        return reply.code(403).send({ error: 'Not authorized' })
      }
      
      // Update or insert layer
      if (assetId) {
        await query(
          `INSERT INTO character_layers (character_id, layer_type, asset_id, tint_color)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (character_id, layer_type)
           DO UPDATE SET asset_id = $3, tint_color = $4`,
          [characterId, layerType, assetId, tintColor]
        )
      } else {
        // Remove layer if no asset specified
        await query(
          'DELETE FROM character_layers WHERE character_id = $1 AND layer_type = $2',
          [characterId, layerType]
        )
      }
      
      return { success: true, message: 'Character equipment updated' }
    } catch (error) {
      console.error('Error updating character equipment:', error)
      return reply.code(500).send({ error: 'Failed to update equipment' })
    }
  })
} 