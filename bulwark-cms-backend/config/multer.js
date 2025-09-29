import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import fs from 'fs';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import B2 from 'backblaze-b2';

dotenv.config();

// Support multiple env var names (B2_* and B2_S3_*). Prefer B2 native if FILE_STORAGE=b2
const resolvedKeyId = process.env.B2_S3_KEY_ID || process.env.B2_KEY_ID;
const resolvedSecret = process.env.B2_S3_SECRET || process.env.B2_APP_KEY;
const resolvedBucket = (process.env.B2_S3_BUCKET || process.env.B2_BUCKET || '').toLowerCase();
const resolvedEndpoint = process.env.B2_S3_ENDPOINT || process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';
const resolvedRegion = process.env.B2_S3_REGION || process.env.B2_REGION || 'us-east-005';
const storageMode = (process.env.FILE_STORAGE || '').toLowerCase();

// Determine storage modes (prefer native B2 when available or explicitly selected)
const isNativeB2Enabled = storageMode === 'b2' || Boolean(process.env.B2_KEY_ID && process.env.B2_APP_KEY && (process.env.B2_BUCKET_ID || resolvedBucket) && (process.env.B2_BUCKET_NAME || resolvedBucket));
// Only enable S3 if explicitly selected or if B2 native is NOT enabled
const isS3Enabled = !isNativeB2Enabled && (storageMode === 's3' || Boolean(resolvedBucket && resolvedKeyId && resolvedSecret && resolvedEndpoint && resolvedRegion));

// Ensure local upload directories exist (fallback mode)
const ensureUploadDirs = () => {
  const dirs = ['./uploads/temp/', './uploads/avatars/', './uploads/content/'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created upload directory: ${dir}`);
    }
  });
};

if (!isS3Enabled) {
  ensureUploadDirs();
}

// Configure S3 client when enabled
let s3Client = null;
let s3Bucket = null;
let s3PublicBaseUrl = null;
let b2Client = null;
let b2BucketId = process.env.B2_BUCKET_ID || null;

if (isS3Enabled) {
  s3Client = new S3Client({
    region: resolvedRegion,
    endpoint: `https://${resolvedEndpoint}`,
    credentials: {
      accessKeyId: resolvedKeyId,
      secretAccessKey: resolvedSecret
    },
    forcePathStyle: true
  });
  s3Bucket = resolvedBucket;
  // Construct a public base URL (without signing). Customize if using CDN/domain.
  s3PublicBaseUrl = `https://${resolvedEndpoint}/${s3Bucket}`;
}

// Configure native Backblaze B2 client (optional alternative path)
if (isNativeB2Enabled) {
  b2Client = new B2({
    applicationKeyId: process.env.B2_KEY_ID,
    applicationKey: process.env.B2_APP_KEY
  });
  // Prefer B2_BUCKET_ID if provided; otherwise we cannot use native API reliably
  b2BucketId = process.env.B2_BUCKET_ID || null;
}

// Local disk storage (fallback)
const localDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = './uploads/temp/';
    if (file.fieldname === 'avatar') {
      uploadPath = './uploads/avatars/';
    } else if (file.fieldname === 'content' || file.fieldname === 'file') {
      uploadPath = './uploads/content/';
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
  };

  // Check if file type is allowed
  const isAllowed = Object.values(allowedTypes).flat().includes(file.mimetype);
  
  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer (generic)
const upload = multer({
  storage: localDiskStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    files: 5
  }
});

// Specific upload configurations
export const avatarUpload = isS3Enabled
  ? multer({
      storage: multerS3({
        s3: s3Client,
        bucket: s3Bucket,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        key: (req, file, cb) => {
          const key = `avatars/${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
          cb(null, key);
        }
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed for avatars'), false);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }
    })
  : multer({
      storage: multer.diskStorage({
        destination: './uploads/avatars/',
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        }
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed for avatars'), false);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }
    });

export const contentUpload = isNativeB2Enabled
  ? multer({
      storage: multer.memoryStorage(),
      fileFilter: fileFilter,
      limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 }
    })
  : isS3Enabled
  ? multer({
      storage: multerS3({
        s3: s3Client,
        bucket: s3Bucket,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        key: (req, file, cb) => {
          const key = `content/${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
          cb(null, key);
        }
      }),
      fileFilter: fileFilter,
      limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 }
    })
  : multer({
      storage: multer.diskStorage({
        destination: './uploads/content/',
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        }
      }),
      fileFilter: fileFilter,
      limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 }
    });

export const bulkUpload = isS3Enabled
  ? multer({
      storage: multerS3({
        s3: s3Client,
        bucket: s3Bucket,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        key: (req, file, cb) => {
          const key = `temp/${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
          cb(null, key);
        }
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV and Excel files are allowed for bulk uploads'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 }
    })
  : multer({
      storage: multer.diskStorage({
        destination: './uploads/temp/',
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        }
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV and Excel files are allowed for bulk uploads'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 }
    });

export default upload;

// Export helpers for S3 public URL construction (used by routes)
export const getS3PublicUrl = (key) => {
  if (!isS3Enabled) return null;
  return `${s3PublicBaseUrl}/${key}`;
};
export const getIsS3Enabled = () => isS3Enabled;
