import { query, cacheGet, cacheSet } from '../database/index.js'
import { nanoid } from 'nanoid'

export async function apiRoutes(fastify, options) {
  // Get public worlds/projects
  fastify.get('/worlds', async (request, reply) => {
    const { page = 1, limit = 12, search = '', tags = '' } = request.query
    const offset = (page - 1) * limit

    try {
      // Try cache first
      const cacheKey = `worlds:${page}:${limit}:${search}:${tags}`
      const cached = await cacheGet(cacheKey)
      
      if (cached) {
        return JSON.parse(cached)
      }

      let whereClause = 'WHERE p.is_public = true AND p.is_published = true'
      const params = [limit, offset]
      let paramIndex = 3

      if (search) {
        whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`
        params.push(`%${search}%`)
        paramIndex++
      }

      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim())
        whereClause += ` AND p.metadata->>'tags' && $${paramIndex}::text[]`
        params.push(tagArray)
        paramIndex++
      }

      const worldsQuery = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.slug,
          p.thumbnail_url,
          p.created_at,
          p.updated_at,
          p.metadata,
          u.username as author,
          u.display_name as author_display_name,
          COUNT(DISTINCT gs.id) as play_count,
          COUNT(DISTINCT pc.id) as collaborator_count
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN game_sessions gs ON p.id = gs.project_id
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        ${whereClause}
        GROUP BY p.id, u.username, u.display_name
        ORDER BY p.updated_at DESC
        LIMIT $1 OFFSET $2
      `

      const countQuery = `
        SELECT COUNT(*) as total
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        ${whereClause.replace('LIMIT $1 OFFSET $2', '')}
      `

      const [worldsResult, countResult] = await Promise.all([
        query(worldsQuery, params),
        query(countQuery, params.slice(2)) // Remove limit and offset for count
      ])

      const response = {
        worlds: worldsResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          slug: row.slug,
          thumbnail: row.thumbnail_url,
          author: row.author_display_name || row.author,
          playCount: parseInt(row.play_count) || 0,
          collaborators: parseInt(row.collaborator_count) || 0,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          tags: row.metadata?.tags || []
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0]?.total || 0),
          totalPages: Math.ceil((countResult.rows[0]?.total || 0) / limit)
        }
      }

      // Cache for 5 minutes
      await cacheSet(cacheKey, response, 300)

      return response
    } catch (error) {
      console.error('Error fetching worlds:', error)
      return reply.code(500).send({ error: 'Failed to fetch worlds' })
    }
  })

  // Get world details by slug
  fastify.get('/worlds/:slug', async (request, reply) => {
    const { slug } = request.params

    try {
      const cacheKey = `world:${slug}`
      const cached = await cacheGet(cacheKey)
      
      if (cached) {
        return JSON.parse(cached)
      }

      const worldQuery = `
        SELECT 
          p.*,
          u.username as author,
          u.display_name as author_display_name,
          u.avatar_url as author_avatar
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE p.slug = $1 AND p.is_public = true AND p.is_published = true
      `

      const result = await query(worldQuery, [slug])
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'World not found' })
      }

      const world = result.rows[0]
      const response = {
        id: world.id,
        name: world.name,
        description: world.description,
        slug: world.slug,
        thumbnail: world.thumbnail_url,
        author: {
          username: world.author,
          displayName: world.author_display_name || world.author,
          avatar: world.author_avatar
        },
        data: world.data,
        version: world.version,
        createdAt: world.created_at,
        updatedAt: world.updated_at,
        publishedAt: world.published_at,
        metadata: world.metadata
      }

      // Cache for 10 minutes
      await cacheSet(cacheKey, response, 600)

      return response
    } catch (error) {
      console.error('Error fetching world:', error)
      return reply.code(500).send({ error: 'Failed to fetch world details' })
    }
  })

  // Search assets
  fastify.get('/assets', async (request, reply) => {
    const { type = '', search = '', page = 1, limit = 20 } = request.query
    const offset = (page - 1) * limit

    try {
      let whereClause = 'WHERE a.is_public = true'
      const params = [limit, offset]
      let paramIndex = 3

      if (type) {
        whereClause += ` AND a.type = $${paramIndex}`
        params.push(type)
        paramIndex++
      }

      if (search) {
        whereClause += ` AND a.name ILIKE $${paramIndex}`
        params.push(`%${search}%`)
        paramIndex++
      }

      const assetsQuery = `
        SELECT 
          a.id,
          a.name,
          a.type,
          a.url,
          a.width,
          a.height,
          a.license,
          a.attribution,
          a.tags,
          a.created_at,
          u.username as author
        FROM assets a
        LEFT JOIN users u ON a.owner_id = u.id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT $1 OFFSET $2
      `

      const result = await query(assetsQuery, params)
      
      return {
        assets: result.rows.map(row => ({
          id: row.id,
          name: row.name,
          type: row.type,
          url: row.url,
          dimensions: row.width && row.height ? { width: row.width, height: row.height } : null,
          license: row.license,
          attribution: row.attribution,
          tags: row.tags || [],
          author: row.author,
          createdAt: row.created_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: result.rows.length === parseInt(limit)
        }
      }
    } catch (error) {
      console.error('Error fetching assets:', error)
      return reply.code(500).send({ error: 'Failed to fetch assets' })
    }
  })

  // Get featured/trending content
  fastify.get('/featured', async (request, reply) => {
    try {
      const cacheKey = 'featured-content'
      const cached = await cacheGet(cacheKey)
      
      if (cached) {
        return JSON.parse(cached)
      }

      // Get trending worlds (most played in last 7 days)
      const trendingQuery = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.slug,
          p.thumbnail_url,
          u.username as author,
          u.display_name as author_display_name,
          COUNT(gs.id) as recent_plays
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN game_sessions gs ON p.id = gs.project_id 
          AND gs.started_at > NOW() - INTERVAL '7 days'
        WHERE p.is_public = true AND p.is_published = true
        GROUP BY p.id, u.username, u.display_name
        ORDER BY recent_plays DESC, p.updated_at DESC
        LIMIT 6
      `

      // Get newest worlds
      const newestQuery = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.slug,
          p.thumbnail_url,
          u.username as author,
          u.display_name as author_display_name,
          p.published_at
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE p.is_public = true AND p.is_published = true
        ORDER BY p.published_at DESC
        LIMIT 6
      `

      const [trendingResult, newestResult] = await Promise.all([
        query(trendingQuery),
        query(newestQuery)
      ])

      const response = {
        trending: trendingResult.rows.map(formatWorldCard),
        newest: newestResult.rows.map(formatWorldCard)
      }

      // Cache for 15 minutes
      await cacheSet(cacheKey, response, 900)

      return response
    } catch (error) {
      console.error('Error fetching featured content:', error)
      return reply.code(500).send({ error: 'Failed to fetch featured content' })
    }
  })

  // Create a new demo project (for testing)
  fastify.post('/demo', async (request, reply) => {
    try {
      const demoId = nanoid()
      const demoData = {
        id: demoId,
        name: 'Demo World',
        maps: [{
          id: 'main',
          width: 50,
          height: 50,
          tileSize: 32,
          layers: [{
            id: 'background',
            tiles: [],
            visible: true,
            opacity: 1
          }],
          npcs: [{
            id: 'demo-npc',
            name: 'Friendly NPC',
            x: 25,
            y: 25,
            spriteId: 'npc-basic',
            dialogue: 'Hello! Welcome to bitrealm!'
          }],
          items: [],
          scripts: [{
            id: 'welcome-script',
            content: `
              on playerJoin {
                give player "Welcome Gift" 1;
                emit "chat", "🎉 Welcome to the demo world!";
              }
            `
          }]
        }],
        characters: [],
        items: [{
          id: 'welcome-gift',
          name: 'Welcome Gift',
          description: 'A special gift for new players',
          type: 'misc',
          spriteId: 'item-gift'
        }],
        scripts: [],
        assets: []
      }

      return {
        success: true,
        projectId: demoId,
        data: demoData,
        joinUrl: `/play/demo-${demoId}`
      }
    } catch (error) {
      console.error('Error creating demo:', error)
      return reply.code(500).send({ error: 'Failed to create demo' })
    }
  })

  // Plugin registry endpoints
  fastify.get('/plugins', async (request, reply) => {
    const { search = '', category = '', page = 1, limit = 20 } = request.query

    try {
      let whereClause = 'WHERE is_active = true AND is_verified = true'
      const params = [limit, (page - 1) * limit]
      let paramIndex = 3

      if (search) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
        params.push(`%${search}%`)
        paramIndex++
      }

      if (category) {
        whereClause += ` AND manifest->>'category' = $${paramIndex}`
        params.push(category)
        paramIndex++
      }

      const pluginsQuery = `
        SELECT 
          id,
          name,
          version,
          description,
          author,
          manifest,
          download_count,
          created_at,
          updated_at
        FROM plugins
        ${whereClause}
        ORDER BY download_count DESC, updated_at DESC
        LIMIT $1 OFFSET $2
      `

      const result = await query(pluginsQuery, params)
      
      return {
        plugins: result.rows.map(row => ({
          id: row.id,
          name: row.name,
          version: row.version,
          description: row.description,
          author: row.author,
          category: row.manifest?.category || 'misc',
          tags: row.manifest?.tags || [],
          downloadCount: row.download_count,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: result.rows.length === parseInt(limit)
        }
      }
    } catch (error) {
      console.error('Error fetching plugins:', error)
      return reply.code(500).send({ error: 'Failed to fetch plugins' })
    }
  })
}

function formatWorldCard(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    slug: row.slug,
    thumbnail: row.thumbnail_url,
    author: row.author_display_name || row.author,
    playCount: parseInt(row.recent_plays) || 0,
    publishedAt: row.published_at
  }
}