import pg from 'pg'
import { createClient } from 'redis'

const { Pool } = pg

// PostgreSQL connection
let pool = null

export async function initDatabase() {
  try {
    // Initialize PostgreSQL
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    // Test database connection
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()

    console.log('✅ PostgreSQL connected successfully')

    // Initialize Redis
    await initRedis()

    // Create tables if they don't exist
    await createTables()

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  }
}

let redisClient = null

async function initRedis() {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL
    })

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err)
    })

    await redisClient.connect()
    console.log('✅ Redis connected successfully')
  } catch (error) {
    console.error('❌ Redis connection failed:', error)
    throw error
  }
}

async function createTables() {
  const createTablesSQL = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(100),
      avatar_url VARCHAR(500),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_login TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT true,
      is_verified BOOLEAN DEFAULT false,
      metadata JSONB DEFAULT '{}'
    );

    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      slug VARCHAR(100) UNIQUE NOT NULL,
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      is_public BOOLEAN DEFAULT false,
      is_published BOOLEAN DEFAULT false,
      thumbnail_url VARCHAR(500),
      data JSONB NOT NULL DEFAULT '{}',
      version INTEGER DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      published_at TIMESTAMP WITH TIME ZONE,
      metadata JSONB DEFAULT '{}'
    );

    -- Assets table
    CREATE TABLE IF NOT EXISTS assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL, -- sprite, audio, tileset, etc.
      url VARCHAR(500) NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type VARCHAR(100),
      width INTEGER,
      height INTEGER,
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      is_public BOOLEAN DEFAULT false,
      license VARCHAR(50) DEFAULT 'custom',
      attribution TEXT,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'
    );

    -- Project collaborators table
    CREATE TABLE IF NOT EXISTS project_collaborators (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL DEFAULT 'editor', -- owner, editor, viewer
      invited_by UUID REFERENCES users(id),
      invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      accepted_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(project_id, user_id)
    );

    -- Game sessions table (for analytics)
    CREATE TABLE IF NOT EXISTS game_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      session_id VARCHAR(255) NOT NULL,
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ended_at TIMESTAMP WITH TIME ZONE,
      duration_seconds INTEGER,
      events_count INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}'
    );

    -- World saves table (for persistent game state)
    CREATE TABLE IF NOT EXISTS world_saves (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      save_name VARCHAR(100) NOT NULL,
      world_data JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(project_id, user_id, save_name)
    );

    -- Plugins table
    CREATE TABLE IF NOT EXISTS plugins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      version VARCHAR(20) NOT NULL,
      description TEXT,
      author VARCHAR(100) NOT NULL,
      repository_url VARCHAR(500),
      download_url VARCHAR(500),
      manifest JSONB NOT NULL,
      is_verified BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      download_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(name, version)
    );

    -- Indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
    CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
    CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(is_public) WHERE is_public = true;
    CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_id);
    CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
    CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
    CREATE INDEX IF NOT EXISTS idx_assets_public ON assets(is_public) WHERE is_public = true;
    CREATE INDEX IF NOT EXISTS idx_collaborators_project ON project_collaborators(project_id);
    CREATE INDEX IF NOT EXISTS idx_collaborators_user ON project_collaborators(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_project ON game_sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON game_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_world_saves_project_user ON world_saves(project_id, user_id);

    -- Updated at trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Apply updated_at triggers
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
    CREATE TRIGGER update_projects_updated_at 
      BEFORE UPDATE ON projects 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_plugins_updated_at ON plugins;
    CREATE TRIGGER update_plugins_updated_at 
      BEFORE UPDATE ON plugins 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `

  try {
    await pool.query(createTablesSQL)
    console.log('✅ Database tables initialized successfully')
  } catch (error) {
    console.error('❌ Error creating database tables:', error)
    throw error
  }
}

// Database query helpers
export async function query(text, params) {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Executed query', { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

export async function getClient() {
  return pool.connect()
}

// Redis helpers
export function getRedisClient() {
  return redisClient
}

export async function cacheGet(key) {
  try {
    return await redisClient.get(key)
  } catch (error) {
    console.error('Redis GET error:', error)
    return null
  }
}

export async function cacheSet(key, value, expireSeconds = 3600) {
  try {
    return await redisClient.setEx(key, expireSeconds, JSON.stringify(value))
  } catch (error) {
    console.error('Redis SET error:', error)
    return false
  }
}

export async function cacheDel(key) {
  try {
    return await redisClient.del(key)
  } catch (error) {
    console.error('Redis DEL error:', error)
    return false
  }
}

// Graceful shutdown
export async function closeDatabase() {
  try {
    if (pool) {
      await pool.end()
      console.log('✅ PostgreSQL connection closed')
    }
    if (redisClient) {
      await redisClient.quit()
      console.log('✅ Redis connection closed')
    }
  } catch (error) {
    console.error('❌ Error closing database connections:', error)
  }
}