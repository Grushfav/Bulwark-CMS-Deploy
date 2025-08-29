import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../config/database.js';
import { content, users } from '../models/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireManager } from '../middleware/roleCheck.js';
import { eq, and, like, desc, asc, or, sql, count, sum } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'content');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only documents and images are allowed.'), false);
    }
  }
});

// Validation middleware
const validateFileUpload = [
  body('title').isLength({ min: 1, max: 255 }).withMessage('Title is required (1-255 characters)'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('contentType').isIn(['knowledge_base', 'policy_update', 'event', 'announcement', 'training']).withMessage('Valid content type is required'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
];

// GET / - Get files (filtered by user role)
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['knowledge_base', 'policy_update', 'event', 'announcement', 'training']).withMessage('Valid content type is required'),
  query('search').optional().isLength({ min: 1 }).withMessage('Search term is required if provided'),
  query('fileType').optional().isLength({ min: 1 }).withMessage('File type is required if provided')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { page = 1, limit = 20, type, search, fileType } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where conditions
    let whereConditions = [];

    // Role-based filtering
    if (userRole === 'manager') {
      // Managers can see all files
      if (type) {
        whereConditions.push(eq(content.contentType, type));
      }
      if (fileType) {
        whereConditions.push(eq(content.fileType, fileType));
      }
    } else {
      // Regular agents can only see public files and their own files
      whereConditions.push(
        or(
          eq(content.isPublic, true),
          eq(content.authorId, userId)
        )
      );
      if (type) {
        whereConditions.push(eq(content.contentType, type));
      }
      if (fileType) {
        whereConditions.push(eq(content.fileType, fileType));
      }
    }

    // Search filter
    if (search) {
      whereConditions.push(
        or(
          like(content.title, `%${search}%`),
          like(content.description, `%${search}%`),
          like(content.fileName, `%${search}%`)
        )
      );
    }

    // Only show content with files
    whereConditions.push(eq(content.filePath, sql`IS NOT NULL`));

    // Build query
    let query = db.select({
      id: content.id,
      title: content.title,
      contentType: content.contentType,
      description: content.description,
      filePath: content.filePath,
      fileName: content.fileName,
      fileSize: content.fileSize,
      fileType: content.fileType,
      fileExtension: content.fileExtension,
      mimeType: content.mimeType,
      isPublic: content.isPublic,
      downloadCount: content.downloadCount,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      author: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      }
    })
    .from(content)
    .leftJoin(users, eq(content.authorId, users.id));

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Get total count for pagination
    const countQuery = db.select({ count: content.id }).from(content);
    if (whereConditions.length > 0) {
      countQuery.where(and(...whereConditions));
    }
    const totalResult = await countQuery;
    const total = totalResult[0]?.count || 0;

    // Get paginated results
    const results = await query
      .orderBy(desc(content.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    res.json({
      message: 'Files retrieved successfully',
      files: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /upload - Upload new file
router.post('/upload', authenticateToken, upload.single('file'), validateFileUpload, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    const userId = req.user.id;
    const {
      title,
      description,
      contentType,
      isPublic = true,
      tags = []
    } = req.body;

    // Create content record with file information
    const newContent = await db.insert(content).values({
      title,
      contentType,
      description,
      filePath: req.file.path.replace(process.cwd(), '').replace(/\\/g, '/'),
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      fileExtension: path.extname(req.file.originalname),
      mimeType: req.file.mimetype,
      authorId: userId,
      isPublic: isPublic === 'true' || isPublic === true,
      isActive: true,
      isPublished: true,
      status: 'published',
      publishedAt: new Date(),
      tags: JSON.stringify(tags),
      viewCount: 0,
      downloadCount: 0,
      shareCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    res.status(201).json({
      message: 'File uploaded successfully',
      content: newContent[0]
    });

  } catch (error) {
    console.error('Upload file error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /:id/download - Download file
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const contentId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get content with file information
    const contentItem = await db.select({
      id: content.id,
      fileName: content.fileName,
      filePath: content.filePath,
      fileType: content.fileType,
      mimeType: content.mimeType,
      isPublic: content.isPublic,
      authorId: content.authorId
    })
    .from(content)
    .where(eq(content.id, contentId))
    .limit(1);

    if (!contentItem || contentItem.length === 0) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    const item = contentItem[0];

    // Check access permissions
    if (!item.isPublic && item.authorId !== userId && userRole !== 'manager') {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    if (!item.filePath) {
      return res.status(404).json({
        error: 'No file associated with this content',
        code: 'NO_FILE'
      });
    }

    const fullPath = path.join(process.cwd(), item.filePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        error: 'File not found on disk',
        code: 'FILE_NOT_FOUND_ON_DISK'
      });
    }

    // Increment download count
    await db.update(content)
      .set({ 
        downloadCount: (item.downloadCount || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(content.id, contentId));

    // Set headers for file download
    res.setHeader('Content-Type', item.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${item.fileName}"`);

    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /:id - Delete file
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const contentId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if content exists and user has permission to delete
    const existingContent = await db.select({
      id: content.id,
      authorId: content.authorId,
      filePath: content.filePath
    })
    .from(content)
    .where(eq(content.id, contentId))
    .limit(1);

    if (!existingContent || existingContent.length === 0) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    const item = existingContent[0];

    // Check delete permissions
    if (item.authorId !== userId && userRole !== 'manager') {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Delete file from disk
    if (item.filePath) {
      const fullPath = path.join(process.cwd(), item.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Delete content from database
    await db.delete(content).where(eq(content.id, contentId));

    res.json({
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /stats - Get file statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereConditions = [];

    // Role-based filtering
    if (userRole !== 'manager') {
      whereConditions.push(eq(content.authorId, userId));
    }

    // Only count content with files
    whereConditions.push(eq(content.filePath, sql`IS NOT NULL`));

    // Get file statistics
    const stats = await db.select({
      totalFiles: count(content.id),
      totalSize: sum(content.fileSize),
      averageFileSize: sql`AVG(${content.fileSize})`,
      totalDownloads: sum(content.downloadCount),
      fileTypes: sql`COUNT(DISTINCT ${content.fileType})`
    })
    .from(content)
    .where(and(...whereConditions));

    // Get file type breakdown
    const fileTypeBreakdown = await db.select({
      fileType: content.fileType,
      count: count(content.id),
      totalSize: sum(content.fileSize)
    })
    .from(content)
    .where(and(...whereConditions))
    .groupBy(content.fileType)
    .orderBy(desc(count(content.id)));

    res.json({
      message: 'File statistics retrieved successfully',
      stats: {
        overview: stats[0] || {
          totalFiles: 0,
          totalSize: 0,
          averageFileSize: 0,
          totalDownloads: 0,
          fileTypes: 0
        },
        fileTypeBreakdown
      }
    });

  } catch (error) {
    console.error('Get file stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
