/**
 * @file Project management API routes
 * @description Handle project CRUD operations and publishing
 */

import { query, cacheGet, cacheSet, cacheDel } from '../database/index.js'
import { nanoid } from 'nanoid'

export async function projectRoutes(fastify, options) {
  // Get project details
  fastify.get('/:projectId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { projectId } = request.params
    
    try {
      // Check if user has access to this project
      const result = await query(
        `SELECT p.*, 
                pc.role as user_role,
                u.username as owner_username,
                u.display_name as owner_display_name
         FROM projects p
         LEFT JOIN users u ON p.owner_id = u.id
         LEFT JOIN project_collaborators pc ON p.id = pc.project_id AND pc.user_id = $2
         WHERE p.id = $1 AND (p.owner_id = $2 OR pc.user_id = $2)`,
        [projectId, request.user.userId]
      )
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Project not found or access denied' })
      }
      
      const project = result.rows[0]
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        slug: project.slug,
        owner: {
          id: project.owner_id,
          username: project.owner_username,
          displayName: project.owner_display_name || project.owner_username
        },
        isPublic: project.is_public,
        isPublished: project.is_published,
        thumbnail: project.thumbnail_url,
        data: project.data,
        version: project.version,
        userRole: project.user_role || (project.owner_id === request.user.userId ? 'owner' : null),
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        publishedAt: project.published_at,
        metadata: project.metadata || {}
      }
    } catch (error) {
      console.error('Error fetching project:', error)
      return reply.code(500).send({ error: 'Failed to fetch project' })
    }
  })

  // Update project
  fastify.put('/:projectId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { projectId } = request.params
    const { name, description, data, isPublic, thumbnail } = request.body
    
    try {
      // Check ownership or editor role
      const accessCheck = await query(
        `SELECT p.owner_id, pc.role 
         FROM projects p
         LEFT JOIN project_collaborators pc ON p.id = pc.project_id AND pc.user_id = $2
         WHERE p.id = $1`,
        [projectId, request.user.userId]
      )
      
      if (accessCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'Project not found' })
      }
      
      const access = accessCheck.rows[0]
      const isOwner = access.owner_id === request.user.userId
      const isEditor = access.role === 'editor'
      
      if (!isOwner && !isEditor) {
        return reply.code(403).send({ error: 'Not authorized to update this project' })
      }
      
      // Build update query
      const updates = []
      const params = []
      let paramIndex = 1
      
      if (name !== undefined && isOwner) {
        updates.push(`name = $${paramIndex}`)
        params.push(name)
        paramIndex++
      }
      
      if (description !== undefined) {
        updates.push(`description = $${paramIndex}`)
        params.push(description)
        paramIndex++
      }
      
      if (data !== undefined) {
        updates.push(`data = $${paramIndex}`)
        params.push(JSON.stringify(data))
        paramIndex++
        
        // Increment version for data changes
        updates.push(`version = version + 1`)
      }
      
      if (isPublic !== undefined && isOwner) {
        updates.push(`is_public = $${paramIndex}`)
        params.push(isPublic)
        paramIndex++
      }
      
      if (thumbnail !== undefined) {
        updates.push(`thumbnail_url = $${paramIndex}`)
        params.push(thumbnail)
        paramIndex++
      }
      
      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No valid fields to update' })
      }
      
      params.push(projectId)
      
      const result = await query(
        `UPDATE projects 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING id, name, slug, version, updated_at`,
        params
      )
      
      // Clear cache
      await cacheDel(`world:${result.rows[0].slug}`)
      
      return {
        success: true,
        project: {
          id: result.rows[0].id,
          name: result.rows[0].name,
          slug: result.rows[0].slug,
          version: result.rows[0].version,
          updatedAt: result.rows[0].updated_at
        }
      }
    } catch (error) {
      console.error('Error updating project:', error)
      return reply.code(500).send({ error: 'Failed to update project' })
    }
  })

  // Publish project
  fastify.put('/:projectId/publish', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { projectId } = request.params
    const { versionNotes = '' } = request.body
    
    try {
      // Check ownership
      const ownerCheck = await query(
        'SELECT owner_id, name, slug FROM projects WHERE id = $1',
        [projectId]
      )
      
      if (ownerCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'Project not found' })
      }
      
      const project = ownerCheck.rows[0]
      
      if (project.owner_id !== request.user.userId) {
        return reply.code(403).send({ error: 'Only the owner can publish a project' })
      }
      
      // Update project
      const result = await query(
        `UPDATE projects 
         SET is_published = true, 
             published_at = NOW(),
             metadata = jsonb_set(
               COALESCE(metadata, '{}'), 
               '{versionNotes}', 
               $2::jsonb
             )
         WHERE id = $1
         RETURNING id, slug, published_at`,
        [projectId, JSON.stringify(versionNotes)]
      )
      
      // Clear cache
      await cacheDel(`world:${project.slug}`)
      
      return {
        success: true,
        message: 'Project published successfully',
        playUrl: `/play/${project.slug}`,
        publishedAt: result.rows[0].published_at
      }
    } catch (error) {
      console.error('Error publishing project:', error)
      return reply.code(500).send({ error: 'Failed to publish project' })
    }
  })

  // Delete project
  fastify.delete('/:projectId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { projectId } = request.params
    
    try {
      // Check ownership
      const ownerCheck = await query(
        'SELECT owner_id FROM projects WHERE id = $1',
        [projectId]
      )
      
      if (ownerCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'Project not found' })
      }
      
      if (ownerCheck.rows[0].owner_id !== request.user.userId) {
        return reply.code(403).send({ error: 'Only the owner can delete a project' })
      }
      
      // Delete project (cascades to related tables)
      await query('DELETE FROM projects WHERE id = $1', [projectId])
      
      return { success: true, message: 'Project deleted successfully' }
    } catch (error) {
      console.error('Error deleting project:', error)
      return reply.code(500).send({ error: 'Failed to delete project' })
    }
  })

  // Get project collaborators
  fastify.get('/:projectId/collaborators', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { projectId } = request.params
    
    try {
      // Check if user has access
      const accessCheck = await query(
        `SELECT COUNT(*) as has_access
         FROM projects p
         LEFT JOIN project_collaborators pc ON p.id = pc.project_id
         WHERE p.id = $1 AND (p.owner_id = $2 OR pc.user_id = $2)`,
        [projectId, request.user.userId]
      )
      
      if (accessCheck.rows[0].has_access === '0') {
        return reply.code(403).send({ error: 'Access denied' })
      }
      
      // Get collaborators
      const result = await query(
        `SELECT 
           pc.id,
           pc.user_id,
           pc.role,
           pc.invited_at,
           pc.accepted_at,
           u.username,
           u.display_name,
           u.avatar_url,
           iu.username as invited_by_username
         FROM project_collaborators pc
         JOIN users u ON pc.user_id = u.id
         LEFT JOIN users iu ON pc.invited_by = iu.id
         WHERE pc.project_id = $1
         ORDER BY pc.invited_at DESC`,
        [projectId]
      )
      
      return {
        collaborators: result.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          username: row.username,
          displayName: row.display_name || row.username,
          avatar: row.avatar_url,
          role: row.role,
          invitedBy: row.invited_by_username,
          invitedAt: row.invited_at,
          acceptedAt: row.accepted_at
        }))
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error)
      return reply.code(500).send({ error: 'Failed to fetch collaborators' })
    }
  })

  // Add collaborator
  fastify.post('/:projectId/collaborators', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { projectId } = request.params
    const { username, role = 'editor' } = request.body
    
    if (!username) {
      return reply.code(400).send({ error: 'Username is required' })
    }
    
    if (!['editor', 'viewer'].includes(role)) {
      return reply.code(400).send({ error: 'Invalid role' })
    }
    
    try {
      // Check ownership
      const ownerCheck = await query(
        'SELECT owner_id FROM projects WHERE id = $1',
        [projectId]
      )
      
      if (ownerCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'Project not found' })
      }
      
      if (ownerCheck.rows[0].owner_id !== request.user.userId) {
        return reply.code(403).send({ error: 'Only the owner can add collaborators' })
      }
      
      // Find user by username
      const userResult = await query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      )
      
      if (userResult.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' })
      }
      
      const invitedUserId = userResult.rows[0].id
      
      // Check if already a collaborator
      const existingCheck = await query(
        'SELECT id FROM project_collaborators WHERE project_id = $1 AND user_id = $2',
        [projectId, invitedUserId]
      )
      
      if (existingCheck.rows.length > 0) {
        return reply.code(409).send({ error: 'User is already a collaborator' })
      }
      
      // Add collaborator
      const result = await query(
        `INSERT INTO project_collaborators (project_id, user_id, role, invited_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id, invited_at`,
        [projectId, invitedUserId, role, request.user.userId]
      )
      
      return {
        success: true,
        collaborator: {
          id: result.rows[0].id,
          userId: invitedUserId,
          username: username,
          role: role,
          invitedAt: result.rows[0].invited_at
        }
      }
    } catch (error) {
      console.error('Error adding collaborator:', error)
      return reply.code(500).send({ error: 'Failed to add collaborator' })
    }
  })

  // Remove collaborator
  fastify.delete('/:projectId/collaborators/:userId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { projectId, userId } = request.params
    
    try {
      // Check ownership
      const ownerCheck = await query(
        'SELECT owner_id FROM projects WHERE id = $1',
        [projectId]
      )
      
      if (ownerCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'Project not found' })
      }
      
      const isOwner = ownerCheck.rows[0].owner_id === request.user.userId
      const isSelf = userId === request.user.userId
      
      if (!isOwner && !isSelf) {
        return reply.code(403).send({ error: 'Not authorized' })
      }
      
      // Remove collaborator
      const result = await query(
        'DELETE FROM project_collaborators WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      )
      
      if (result.rowCount === 0) {
        return reply.code(404).send({ error: 'Collaborator not found' })
      }
      
      return { success: true, message: 'Collaborator removed' }
    } catch (error) {
      console.error('Error removing collaborator:', error)
      return reply.code(500).send({ error: 'Failed to remove collaborator' })
    }
  })
}