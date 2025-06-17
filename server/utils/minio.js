import { Client } from 'minio';

/**
 * MinIO client instance for S3-compatible storage
 * @type {Client}
 */
export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123'
});

// Bucket configuration
const BASE_BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'bitrealm-assets';
const PUBLIC_BUCKET_NAME = process.env.MINIO_PUBLIC_BUCKET || 'bitrealm-public';

/**
 * Get bucket name for a project
 * We use a single bucket with project prefixes for better scalability
 * @param {string} projectId - Project ID
 * @param {boolean} isPublic - Whether the asset is public
 * @returns {string}
 */
function getBucketName(projectId, isPublic = false) {
  return isPublic ? PUBLIC_BUCKET_NAME : BASE_BUCKET_NAME;
}

/**
 * Get object path with project prefix
 * @param {string} projectId - Project ID
 * @param {string} assetType - Asset type (sprite, tileset, audio, etc.)
 * @param {string} filename - File name
 * @returns {string}
 */
export function getObjectPath(projectId, assetType, filename) {
  if (projectId) {
    return `projects/${projectId}/${assetType}/${filename}`;
  }
  return `defaults/${assetType}/${filename}`;
}

/**
 * Initialize MinIO buckets if they don't exist
 */
export async function initializeBuckets() {
  try {
    // Initialize private bucket
    const privateExists = await minioClient.bucketExists(BASE_BUCKET_NAME);
    if (!privateExists) {
      await minioClient.makeBucket(BASE_BUCKET_NAME, 'us-east-1');
      console.log(`Bucket ${BASE_BUCKET_NAME} created successfully`);
    }

    // Initialize public bucket
    const publicExists = await minioClient.bucketExists(PUBLIC_BUCKET_NAME);
    if (!publicExists) {
      await minioClient.makeBucket(PUBLIC_BUCKET_NAME, 'us-east-1');
      console.log(`Bucket ${PUBLIC_BUCKET_NAME} created successfully`);
      
      // Set bucket policy to allow public read access
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${PUBLIC_BUCKET_NAME}/*`]
          }
        ]
      };
      
      await minioClient.setBucketPolicy(PUBLIC_BUCKET_NAME, JSON.stringify(policy));
    }

    // Set up lifecycle rules for temp uploads (optional)
    const lifecycleConfig = {
      Rule: [{
        ID: 'delete-temp-uploads',
        Status: 'Enabled',
        Prefix: 'temp/',
        Expiration: {
          Days: 1
        }
      }]
    };
    
    try {
      await minioClient.setBucketLifecycle(BASE_BUCKET_NAME, lifecycleConfig);
    } catch (err) {
      // Lifecycle might not be supported in all MinIO versions
      console.log('Lifecycle configuration not set:', err.message);
    }
  } catch (error) {
    console.error('Error initializing MinIO buckets:', error);
    throw error;
  }
}

/**
 * Upload a file to MinIO with project organization
 * @param {string} projectId - Project ID (null for default assets)
 * @param {string} assetType - Asset type (sprite, tileset, audio, etc.)
 * @param {string} filename - File name
 * @param {Buffer|Stream} stream - File data
 * @param {number} size - File size
 * @param {Object} metadata - Additional metadata
 * @param {boolean} isPublic - Whether the asset should be publicly accessible
 * @returns {Promise<{etag: string, versionId: string, objectPath: string}>}
 */
export async function uploadProjectAsset(projectId, assetType, filename, stream, size, metadata = {}, isPublic = false) {
  try {
    const bucketName = getBucketName(projectId, isPublic);
    const objectPath = getObjectPath(projectId, assetType, filename);
    
    // Add project metadata
    const enrichedMetadata = {
      ...metadata,
      'x-amz-meta-project-id': projectId || 'default',
      'x-amz-meta-asset-type': assetType,
      'x-amz-meta-uploaded-at': new Date().toISOString()
    };

    // Set cache control for CDN
    if (isPublic) {
      enrichedMetadata['Cache-Control'] = 'public, max-age=31536000'; // 1 year
    } else {
      enrichedMetadata['Cache-Control'] = 'private, max-age=3600'; // 1 hour
    }
    
    const result = await minioClient.putObject(
      bucketName,
      objectPath,
      stream,
      size,
      enrichedMetadata
    );
    
    return { ...result, objectPath };
  } catch (error) {
    console.error('Error uploading project asset to MinIO:', error);
    throw error;
  }
}

// Keep backward compatibility
export async function uploadFile(objectName, stream, size, metadata = {}) {
  console.warn('uploadFile is deprecated. Use uploadProjectAsset instead.');
  return uploadProjectAsset(null, 'legacy', objectName, stream, size, metadata);
}

/**
 * Get a presigned URL for downloading a project asset
 * @param {string} projectId - Project ID
 * @param {string} assetType - Asset type
 * @param {string} filename - File name
 * @param {number} expiry - URL expiry time in seconds (default: 7 days)
 * @param {boolean} isPublic - Whether to get from public bucket
 * @returns {Promise<string>}
 */
export async function getProjectAssetUrl(projectId, assetType, filename, expiry = 7 * 24 * 60 * 60, isPublic = false) {
  try {
    const bucketName = getBucketName(projectId, isPublic);
    const objectPath = getObjectPath(projectId, assetType, filename);
    
    if (isPublic) {
      // For public assets, return direct URL
      return getPublicUrl(objectPath, true);
    }
    
    // For private assets, return presigned URL
    return await minioClient.presignedGetObject(bucketName, objectPath, expiry);
  } catch (error) {
    console.error('Error generating project asset URL:', error);
    throw error;
  }
}

// Keep backward compatibility
export async function getPresignedUrl(objectName, expiry = 7 * 24 * 60 * 60) {
  console.warn('getPresignedUrl is deprecated. Use getProjectAssetUrl instead.');
  return minioClient.presignedGetObject(BASE_BUCKET_NAME, objectName, expiry);
}

/**
 * Delete a project asset from MinIO
 * @param {string} projectId - Project ID
 * @param {string} assetType - Asset type
 * @param {string} filename - File name
 * @param {boolean} isPublic - Whether the asset is in public bucket
 * @returns {Promise<void>}
 */
export async function deleteProjectAsset(projectId, assetType, filename, isPublic = false) {
  try {
    const bucketName = getBucketName(projectId, isPublic);
    const objectPath = getObjectPath(projectId, assetType, filename);
    
    await minioClient.removeObject(bucketName, objectPath);
  } catch (error) {
    console.error('Error deleting project asset from MinIO:', error);
    throw error;
  }
}

// Keep backward compatibility
export async function deleteFile(objectName) {
  console.warn('deleteFile is deprecated. Use deleteProjectAsset instead.');
  await minioClient.removeObject(BASE_BUCKET_NAME, objectName);
}

/**
 * List project assets with pagination
 * @param {string} projectId - Project ID
 * @param {string} assetType - Asset type filter (optional)
 * @param {Object} options - List options
 * @returns {Promise<{objects: Array, isTruncated: boolean, nextMarker: string}>}
 */
export async function listProjectAssets(projectId, assetType = '', options = {}) {
  try {
    const { maxKeys = 100, marker = '', isPublic = false } = options;
    const bucketName = getBucketName(projectId, isPublic);
    const prefix = projectId 
      ? `projects/${projectId}/${assetType}`
      : `defaults/${assetType}`;
    
    const objects = [];
    const stream = minioClient.listObjectsV2(bucketName, prefix, true, marker);
    
    return new Promise((resolve, reject) => {
      let count = 0;
      let lastKey = '';
      
      stream.on('data', obj => {
        if (count < maxKeys) {
          objects.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            etag: obj.etag
          });
          lastKey = obj.name;
          count++;
        }
      });
      
      stream.on('error', reject);
      
      stream.on('end', () => {
        resolve({
          objects,
          isTruncated: count >= maxKeys,
          nextMarker: lastKey
        });
      });
    });
  } catch (error) {
    console.error('Error listing project assets from MinIO:', error);
    throw error;
  }
}

// Keep backward compatibility
export async function listObjects(prefix = '') {
  console.warn('listObjects is deprecated. Use listProjectAssets instead.');
  const objects = [];
  const stream = minioClient.listObjectsV2(BASE_BUCKET_NAME, prefix, true);
  
  return new Promise((resolve, reject) => {
    stream.on('data', obj => objects.push(obj));
    stream.on('error', reject);
    stream.on('end', () => resolve(objects));
  });
}

/**
 * Get public URL for an asset
 * @param {string} objectPath - Object path in bucket
 * @param {boolean} fromPublicBucket - Whether to get from public bucket
 * @returns {string}
 */
export function getPublicUrl(objectPath, fromPublicBucket = false) {
  const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = process.env.MINIO_PORT || '9000';
  const bucket = fromPublicBucket ? PUBLIC_BUCKET_NAME : BASE_BUCKET_NAME;
  
  // Support CDN URL if configured
  const cdnUrl = process.env.MINIO_CDN_URL;
  if (cdnUrl && fromPublicBucket) {
    return `${cdnUrl}/${objectPath}`;
  }
  
  return `${protocol}://${endpoint}:${port}/${bucket}/${objectPath}`;
}

/**
 * Copy asset between projects or buckets
 * @param {Object} source - Source asset info
 * @param {Object} dest - Destination asset info
 * @returns {Promise<void>}
 */
export async function copyAsset(source, dest) {
  try {
    const sourceBucket = getBucketName(source.projectId, source.isPublic);
    const sourcePath = getObjectPath(source.projectId, source.assetType, source.filename);
    
    const destBucket = getBucketName(dest.projectId, dest.isPublic);
    const destPath = getObjectPath(dest.projectId, dest.assetType, dest.filename);
    
    await minioClient.copyObject(
      destBucket,
      destPath,
      `${sourceBucket}/${sourcePath}`
    );
  } catch (error) {
    console.error('Error copying asset:', error);
    throw error;
  }
}

/**
 * Generate thumbnail for an image asset
 * @param {string} projectId - Project ID
 * @param {string} filename - Original filename
 * @param {Buffer} imageBuffer - Image data
 * @returns {Promise<{buffer: Buffer, filename: string}>}
 */
export async function generateThumbnail(projectId, filename, imageBuffer) {
  // This would integrate with sharp or another image processing library
  // Placeholder for now - actual implementation would resize the image
  const thumbFilename = `thumb_${filename}`;
  return {
    buffer: imageBuffer, // In reality, this would be resized
    filename: thumbFilename
  };
} 