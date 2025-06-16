# Bitrealm Quick Start Guide

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Git

## Quick Start with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bitrealm.git
   cd bitrealm
   ```

2. **Create environment file**
   ```bash
   cat > .env << EOF
   NODE_ENV=development
   PORT=3001
   HOST=localhost
   DATABASE_URL=postgresql://bitrealm:password@postgres:5432/bitrealm
   REDIS_URL=redis://redis:6379
   JWT_SECRET=dev-secret-key-change-in-production
   UPLOAD_SECRET=dev-upload-secret-change-in-production
   MINIO_ENDPOINT=minio
   MINIO_PORT=9000
   MINIO_USE_SSL=false
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin123
   MINIO_BUCKET_NAME=bitrealm-assets
   EOF
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Main app: http://localhost:80
   - API: http://localhost:3001
   - MinIO Console: http://localhost:9001 (admin/minioadmin123)
   - Colyseus Monitor: http://localhost:3001/monitor

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start required services**
   ```bash
   docker-compose up -d postgres redis minio
   ```

3. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - Backend server on http://localhost:3001
   - Frontend dev server on http://localhost:5173

## Default Assets

The project includes placeholder pixel art assets in `/public/assets/`:
- Character sprites
- Terrain tilesets
- Item icons
- UI elements

Users can upload their own assets through the editor interface.

## First Steps

1. **Create an account** - Click "Sign Up" on the landing page
2. **Create a project** - Click "New Project" in your dashboard
3. **Design your world** - Use the map editor to create your game world
4. **Add NPCs and items** - Populate your world with interactive elements
5. **Write game logic** - Use the DSL editor to add game mechanics
6. **Publish** - Make your game public for others to play

## Troubleshooting

### Port conflicts
If you get port conflicts, you can change the ports in `docker-compose.yml` or use:
```bash
docker-compose down
docker-compose up -d
```

### Database issues
Reset the database:
```bash
docker-compose down -v
docker-compose up -d
```

### MinIO issues
Access MinIO console at http://localhost:9001 to verify bucket creation.

## Architecture Overview

- **Frontend**: Vue 3 + PixiJS for game rendering
- **Backend**: Fastify + Colyseus for real-time multiplayer
- **Database**: PostgreSQL for persistent data
- **Cache**: Redis for sessions and real-time state
- **Storage**: MinIO (S3-compatible) for assets
- **Proxy**: NGINX for routing and static files

## Next Steps

- Read the [full documentation](./README.md)
- Check the [PRD](./Bitrealm_PRD_v2.md) for feature details
- Join our community Discord (coming soon)
- Contribute on GitHub 