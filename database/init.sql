-- bitrealm Database Initialization Script
-- Creates all required tables, indexes, and triggers

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  metadata JSONB DEFAULT '{}',
  pack_id INTEGER REFERENCES asset_packs(id) ON DELETE SET NULL,
  animation_data JSONB,
  layer_type VARCHAR(50)
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

-- Plugin storage table
CREATE TABLE IF NOT EXISTS plugin_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_name VARCHAR(100) NOT NULL,
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plugin_name, key)
);

-- Asset packs/sets
CREATE TABLE IF NOT EXISTS asset_packs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    author VARCHAR(255),
    version VARCHAR(50) DEFAULT '1.0.0',
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project asset pack selections
CREATE TABLE IF NOT EXISTS project_asset_packs (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    pack_id INTEGER REFERENCES asset_packs(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, pack_id)
);

-- Character customization layers
CREATE TABLE IF NOT EXISTS character_layers (
    id SERIAL PRIMARY KEY,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    layer_type VARCHAR(50) NOT NULL,
    asset_id UUID REFERENCES assets(id),
    layer_order INTEGER DEFAULT 0,
    tint_color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Characters table (if not exists)
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    health INTEGER DEFAULT 100,
    max_health INTEGER DEFAULT 100,
    mana INTEGER DEFAULT 50,
    max_mana INTEGER DEFAULT 50,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    map_id VARCHAR(100),
    sprite_data JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory table (if not exists)
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 1,
    slot INTEGER,
    equipped BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_assets_pack_id ON assets(pack_id);
CREATE INDEX IF NOT EXISTS idx_project_asset_packs_project ON project_asset_packs(project_id);
CREATE INDEX IF NOT EXISTS idx_character_layers_character ON character_layers(character_id);
CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_character ON inventory(character_id);

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

-- Insert default data for demo
INSERT INTO users (id, username, email, password_hash, display_name, is_verified) VALUES
  ('00000000-0000-0000-0000-000000000001', 'demo', 'demo@bitrealm.local', '$2a$12$WJFqY2X6HhJPJZ8pJZ2jnOJHqZJHqZJHqZJHqZJHqZJHqZJHqZJHq', 'Demo User', true)
ON CONFLICT (username) DO NOTHING;

-- Create demo project
INSERT INTO projects (id, name, description, slug, owner_id, is_public, is_published, data) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Demo World', 'A demo world to explore bitrealm features', 'demo-world', '00000000-0000-0000-0000-000000000001', true, true, 
  '{
    "maps": [{
      "id": "main",
      "name": "Main Map",
      "width": 50,
      "height": 50,
      "tileSize": 32,
      "layers": [{
        "id": "background",
        "name": "Background",
        "tiles": [],
        "visible": true
      }],
      "npcs": [{
        "id": "guide",
        "name": "Welcome Guide",
        "x": 25,
        "y": 25,
        "dialogue": "Welcome to bitrealm! This is a demo world to show you what''s possible."
      }]
    }],
    "scripts": [{
      "id": "welcome",
      "name": "Welcome Script",
      "content": "on playerJoin {\n  emit \"chat\", \"Welcome to bitrealm demo world!\";\n}"
    }]
  }'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Insert default asset packs
INSERT INTO asset_packs (name, description, author, is_default) VALUES
('Default Sprites', 'Basic placeholder sprites for getting started', 'Bitrealm', true),
('LPC Character Sprites', 'Liberated Pixel Cup animated character sprites', 'LPC Contributors', true),
('DawnLike Tileset', 'Complete 16x16 roguelike tileset', 'DragonDePlatino', true)
ON CONFLICT DO NOTHING;

-- Grant permissions (adjust as needed for your setup)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bitrealm;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bitrealm;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO bitrealm;