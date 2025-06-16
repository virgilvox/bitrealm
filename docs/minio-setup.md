# MinIO Setup for Mythweaver (Bitrealm)

## Overview

Mythweaver uses MinIO as an S3-compatible object storage solution for managing game assets like sprites, tilesets, and audio files. This provides scalable, cloud-ready storage that can easily migrate to AWS S3, Google Cloud Storage, or other S3-compatible services.

## Local Development Setup

MinIO is automatically configured in the `docker-compose.yml` file:

```yaml
minio:
  image: minio/minio:latest
  ports:
    - "9000:9000"  # API endpoint
    - "9001:9001"  # Console UI
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin123
  volumes:
    - minio_data:/data
  command: server /data --console-address ":9001"
```

### Access Points

- **MinIO API**: http://localhost:9000
- **MinIO Console**: http://localhost:9001
  - Username: `minioadmin`
  - Password: `minioadmin123`

## Asset Storage Structure

Assets are organized in the `bitrealm-assets` bucket with the following structure:

```
bitrealm-assets/
├── sprite/
│   ├── {nanoid}.png
│   └── thumb_{nanoid}.png
├── tileset/
│   └── {nanoid}.png
└── audio/
    └── {nanoid}.{mp3|ogg|wav}
```

## API Integration

The MinIO integration is handled through `server/utils/minio.js` which provides:

- `initializeBucket()` - Creates the bucket and sets public read policy
- `uploadFile()` - Uploads files to MinIO
- `deleteFile()` - Removes files from MinIO
- `getPublicUrl()` - Generates public URLs for assets
- `getPresignedUrl()` - Creates temporary signed URLs
- `listObjects()` - Lists files in a directory

## Asset Upload Flow

1. Client uploads file via multipart form to `/api/assets/{type}/upload`
2. Server validates file type and size
3. File is uploaded to MinIO with metadata
4. For images, dimensions are extracted and thumbnails generated
5. Asset metadata is saved to PostgreSQL
6. Public URL is returned to client

## Production Deployment

For production, update the MinIO environment variables:

```env
MINIO_ENDPOINT=your-minio-endpoint.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET_NAME=production-assets
```

### Migration to AWS S3

To migrate from MinIO to AWS S3:

1. Update environment variables to point to S3
2. Use AWS CLI to sync existing data: `aws s3 sync minio-data/ s3://your-bucket/`
3. Update `MINIO_ENDPOINT` to `s3.amazonaws.com`
4. The same API will work with S3 due to S3-compatibility

## Security Considerations

- Always use strong credentials in production
- Enable SSL/TLS for production deployments
- Consider implementing bucket policies for access control
- Use presigned URLs for temporary access to private assets
- Implement virus scanning for user uploads (post-MVP)

## Monitoring

MinIO provides built-in metrics at `http://localhost:9000/minio/v2/metrics/cluster` which can be scraped by Prometheus for monitoring:

- Storage usage
- Request rates
- Error rates
- Bucket statistics 