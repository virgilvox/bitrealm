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

-- Link assets to packs
ALTER TABLE assets ADD COLUMN IF NOT EXISTS pack_id INTEGER REFERENCES asset_packs(id) ON DELETE SET NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS animation_data JSONB; -- For sprite animations
ALTER TABLE assets ADD COLUMN IF NOT EXISTS layer_type VARCHAR(50); -- For equipment layers

-- Project asset pack selections
CREATE TABLE IF NOT EXISTS project_asset_packs (
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    pack_id INTEGER REFERENCES asset_packs(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0, -- Higher priority packs override lower ones
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, pack_id)
);

-- Character customization layers
CREATE TABLE IF NOT EXISTS character_layers (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    layer_type VARCHAR(50) NOT NULL, -- 'base', 'hair', 'armor', 'weapon', etc.
    asset_id INTEGER REFERENCES assets(id),
    layer_order INTEGER DEFAULT 0,
    tint_color VARCHAR(7), -- Hex color for tinting
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_assets_pack_id ON assets(pack_id);
CREATE INDEX idx_project_asset_packs_project ON project_asset_packs(project_id);
CREATE INDEX idx_character_layers_character ON character_layers(character_id); 