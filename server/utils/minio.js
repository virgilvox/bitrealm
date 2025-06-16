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

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'bitrealm-assets';

/**
 * Initialize MinIO bucket if it doesn't exist
 */
export async function initializeBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`Bucket ${BUCKET_NAME} created successfully`);
      
      // Set bucket policy to allow public read access
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
          }
        ]
      };
      
      await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
    }
  } catch (error) {
    console.error('Error initializing MinIO bucket:', error);
    throw error;
  }
}

/**
 * Upload a file to MinIO
 * @param {string} objectName - Name of the object in the bucket
 * @param {Buffer|Stream} stream - File data
 * @param {number} size - File size
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<{etag: string, versionId: string}>}
 */
export async function uploadFile(objectName, stream, size, metadata = {}) {
  try {
    const result = await minioClient.putObject(
      BUCKET_NAME,
      objectName,
      stream,
      size,
      metadata
    );
    return result;
  } catch (error) {
    console.error('Error uploading file to MinIO:', error);
    throw error;
  }
}

/**
 * Get a presigned URL for downloading a file
 * @param {string} objectName - Name of the object in the bucket
 * @param {number} expiry - URL expiry time in seconds (default: 7 days)
 * @returns {Promise<string>}
 */
export async function getPresignedUrl(objectName, expiry = 7 * 24 * 60 * 60) {
  try {
    return await minioClient.presignedGetObject(BUCKET_NAME, objectName, expiry);
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
}

/**
 * Delete a file from MinIO
 * @param {string} objectName - Name of the object to delete
 * @returns {Promise<void>}
 */
export async function deleteFile(objectName) {
  try {
    await minioClient.removeObject(BUCKET_NAME, objectName);
  } catch (error) {
    console.error('Error deleting file from MinIO:', error);
    throw error;
  }
}

/**
 * List objects in a specific prefix
 * @param {string} prefix - Prefix to filter objects
 * @returns {Promise<Array>}
 */
export async function listObjects(prefix = '') {
  try {
    const objects = [];
    const stream = minioClient.listObjectsV2(BUCKET_NAME, prefix, true);
    
    return new Promise((resolve, reject) => {
      stream.on('data', obj => objects.push(obj));
      stream.on('error', reject);
      stream.on('end', () => resolve(objects));
    });
  } catch (error) {
    console.error('Error listing objects from MinIO:', error);
    throw error;
  }
}

/**
 * Get public URL for an object
 * @param {string} objectName - Name of the object
 * @returns {string}
 */
export function getPublicUrl(objectName) {
  const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = process.env.MINIO_PORT || '9000';
  return `${protocol}://${endpoint}:${port}/${BUCKET_NAME}/${objectName}`;
} 