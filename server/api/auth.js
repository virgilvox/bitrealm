import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../database/index.js'
import { nanoid } from 'nanoid'

export async function authRoutes(fastify, options) {
  // Register new user
  fastify.post('/register', async (request, reply) => {
    const { username, email, password, displayName } = request.body

    if (!username || !email || !password) {
      return reply.code(400).send({ error: 'Username, email, and password are required' })
    }

    try {
      // Check if user already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      )

      if (existingUser.rows.length > 0) {
        return reply.code(409).send({ error: 'Username or email already exists' })
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
      const passwordHash = await bcryptjs.hash(password, saltRounds)

      // Create user
      const result = await query(
        `INSERT INTO users (username, email, password_hash, display_name) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, username, email, display_name, created_at`,
        [username, email, passwordHash, displayName || username]
      )

      const user = result.rows[0]

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      )

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          createdAt: user.created_at
        },
        token
      }
    } catch (error) {
      console.error('Registration error:', error)
      return reply.code(500).send({ error: 'Failed to create user account' })
    }
  })

  // Login user
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body

    if (!username || !password) {
      return reply.code(400).send({ error: 'Username and password are required' })
    }

    try {
      // Find user by username or email
      const result = await query(
        `SELECT id, username, email, password_hash, display_name, avatar_url, is_active 
         FROM users 
         WHERE (username = $1 OR email = $1) AND is_active = true`,
        [username]
      )

      if (result.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const user = result.rows[0]

      // Verify password
      const isValidPassword = await bcryptjs.compare(password, user.password_hash)
      if (!isValidPassword) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      // Update last login
      await query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      )

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      )

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          avatar: user.avatar_url
        },
        token
      }
    } catch (error) {
      console.error('Login error:', error)
      return reply.code(500).send({ error: 'Login failed' })
    }
  })

  // Get current user profile
  fastify.get('/profile', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const result = await query(
        `SELECT id, username, email, display_name, avatar_url, created_at, last_login, metadata
         FROM users 
         WHERE id = $1`,
        [request.user.userId]
      )

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' })
      }

      const user = result.rows[0]
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatar: user.avatar_url,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        metadata: user.metadata || {}
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
      return reply.code(500).send({ error: 'Failed to fetch user profile' })
    }
  })

  // Update user profile
  fastify.put('/profile', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { displayName, email, metadata } = request.body

    try {
      const updates = []
      const params = []
      let paramIndex = 1

      if (displayName !== undefined) {
        updates.push(`display_name = $${paramIndex}`)
        params.push(displayName)
        paramIndex++
      }

      if (email !== undefined) {
        // Check if email is already taken by another user
        const existingUser = await query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, request.user.userId]
        )

        if (existingUser.rows.length > 0) {
          return reply.code(409).send({ error: 'Email already in use' })
        }

        updates.push(`email = $${paramIndex}`)
        params.push(email)
        paramIndex++
      }

      if (metadata !== undefined) {
        updates.push(`metadata = $${paramIndex}`)
        params.push(JSON.stringify(metadata))
        paramIndex++
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No valid fields to update' })
      }

      params.push(request.user.userId)

      const result = await query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() 
         WHERE id = $${paramIndex} 
         RETURNING id, username, email, display_name, avatar_url, updated_at`,
        params
      )

      const user = result.rows[0]
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          avatar: user.avatar_url,
          updatedAt: user.updated_at
        }
      }
    } catch (error) {
      console.error('Profile update error:', error)
      return reply.code(500).send({ error: 'Failed to update profile' })
    }
  })

  // Get user's projects
  fastify.get('/projects', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const result = await query(
        `SELECT p.id, p.name, p.description, p.slug, p.thumbnail_url, 
                p.is_public, p.is_published, p.created_at, p.updated_at,
                COUNT(DISTINCT gs.id) as play_count,
                COUNT(DISTINCT pc.id) as collaborator_count
         FROM projects p
         LEFT JOIN game_sessions gs ON p.id = gs.project_id
         LEFT JOIN project_collaborators pc ON p.id = pc.project_id
         WHERE p.owner_id = $1
         GROUP BY p.id
         ORDER BY p.updated_at DESC`,
        [request.user.userId]
      )

      return {
        projects: result.rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          slug: row.slug,
          thumbnail: row.thumbnail_url,
          isPublic: row.is_public,
          isPublished: row.is_published,
          playCount: parseInt(row.play_count) || 0,
          collaborators: parseInt(row.collaborator_count) || 0,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      }
    } catch (error) {
      console.error('Projects fetch error:', error)
      return reply.code(500).send({ error: 'Failed to fetch projects' })
    }
  })

  // Create new project
  fastify.post('/projects', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { name, description } = request.body

    if (!name) {
      return reply.code(400).send({ error: 'Project name is required' })
    }

    try {
      // Generate unique slug
      const baseSlug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      
      let slug = baseSlug
      let counter = 1

      while (true) {
        const existing = await query('SELECT id FROM projects WHERE slug = $1', [slug])
        if (existing.rows.length === 0) break
        
        slug = `${baseSlug}-${counter}`
        counter++
      }

      // Create project with default data
      const defaultData = {
        maps: [{
          id: 'main',
          name: 'Main Map',
          width: 50,
          height: 50,
          tileSize: 32,
          layers: [{
            id: 'background',
            name: 'Background',
            tiles: [],
            visible: true,
            opacity: 1
          }],
          objects: [],
          scripts: []
        }],
        characters: [],
        items: [],
        scripts: [],
        assets: []
      }

      const result = await query(
        `INSERT INTO projects (name, description, slug, owner_id, data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, description, slug, created_at`,
        [name, description || '', slug, request.user.userId, JSON.stringify(defaultData)]
      )

      const project = result.rows[0]
      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          slug: project.slug,
          createdAt: project.created_at,
          editorUrl: `/editor/?project=${project.id}`
        }
      }
    } catch (error) {
      console.error('Project creation error:', error)
      return reply.code(500).send({ error: 'Failed to create project' })
    }
  })

  // Logout (client-side token removal, but we can blacklist tokens if needed)
  fastify.post('/logout', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    // In a more complex setup, you might want to blacklist the token
    // For now, we just return success and let the client remove the token
    return { success: true, message: 'Logged out successfully' }
  })
}

// Authentication middleware
async function authenticate(request, reply) {
  try {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header')
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // You could add additional checks here (token blacklist, user status, etc.)
    request.user = decoded
  } catch (error) {
    reply.code(401).send({ error: 'Invalid or expired token' })
  }
}

// Register the middleware
export function registerAuthMiddleware(fastify) {
  fastify.decorate('authenticate', authenticate)
}