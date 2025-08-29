import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../config/database.js';
import { content, users } from '../models/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireManager } from '../middleware/roleCheck.js';
import { eq, and, like, desc, asc, or, gte, lte } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import { contentUpload } from '../config/multer.js';

const router = express.Router();

// Validation middleware
const validateContent = [
  body('title').isLength({ min: 1, max: 255 }).withMessage('Title is required (1-255 characters)'),
  // Support both field name formats
  body('contentType').optional().isIn(['knowledge_base', 'policy_update', 'event', 'announcement', 'training']).withMessage('Valid content type is required'),
  body('content_type').optional().isIn(['knowledge_base', 'policy_update', 'event', 'announcement', 'training']).withMessage('Valid content type is required'),
  body('contentText').optional().isLength({ max: 10000 }).withMessage('Content text must be less than 10000 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  // Support both field name formats and handle string boolean values
  body('isPublic').optional().custom((value) => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'string') {
      return ['true', 'false', '1', '0'].includes(value.toLowerCase());
    }
    return false;
  }).withMessage('isPublic must be a boolean or valid string representation'),
  body('is_public').optional().custom((value) => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'string') {
      return ['true', 'false', '1', '0'].includes(value.toLowerCase());
    }
    return false;
  }).withMessage('isPublic must be a boolean or valid string representation'),
  body('isActive').optional().custom((value) => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'string') {
      return ['true', 'false', '1', '0'].includes(value.toLowerCase());
    }
    return false;
  }).withMessage('isActive must be a boolean or valid string representation'),
  body('isPublished').optional().custom((value) => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'string') {
      return ['true', 'false', '1', '0'].includes(value.toLowerCase());
    }
    return false;
  }).withMessage('isPublished must be a boolean or valid string representation')
];

// GET /content - Get content (filtered by user role)
router.get('/content', authenticateToken, [
  // Add debugging for received query parameters
  (req, res, next) => {
    console.log('🔍 Content API - Received query parameters:', req.query);
    console.log('🔍 Content API - Query string:', req.url);
    console.log('🔍 Content API - User ID:', req.user.id, 'Role:', req.user.role);
    next();
  },
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().custom((value) => {
    if (value === '' || value === undefined || value === null) return true;
    return ['knowledge_base', 'policy_update', 'event', 'announcement', 'training'].includes(value);
  }).withMessage('Valid content type is required'),
  query('visibility').optional().custom((value) => {
    if (value === '' || value === undefined || value === null) return true;
    return ['public', 'team', 'private'].includes(value);
  }).withMessage('Valid visibility is required'),
  query('author_id').optional().custom((value) => {
    if (value === '' || value === undefined || value === null) return true;
    const num = parseInt(value);
    return !isNaN(num) && num >= 1;
  }).withMessage('Valid author ID is required'),
  query('search').optional().custom((value) => {
    if (value === '' || value === undefined || value === null) return true;
    return value.length >= 1;
  }).withMessage('Search term is required if provided')
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

    const { page = 1, limit = 20, type, visibility, author_id, search } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where conditions
    let whereConditions = [];

    // Role-based filtering with privacy protection
    // NEW PRIVACY RULES:
    // - Managers can see: public content + content they created
    // - Managers CANNOT see: private content created by agents
    // - Agents can see: public content + content they created
    // - All users are restricted by the content.isPublic flag
    if (userRole === 'manager') {
      // Managers can see public content and content they created
      // But they cannot see private content created by agents
      whereConditions.push(
        or(
          eq(content.isPublic, true),           // Public content
          eq(content.authorId, userId)          // Content they created
        )
      );
      
      if (type && type !== '') {
        whereConditions.push(eq(content.contentType, type));
      }
      if (visibility && visibility !== '') {
        whereConditions.push(eq(content.isPublic, visibility === 'public'));
      }
      if (author_id && author_id !== '') {
        whereConditions.push(eq(content.authorId, parseInt(author_id)));
      }
    } else {
      // Regular agents can only see public content and their own content
      whereConditions.push(
        or(
          eq(content.isPublic, true),
          eq(content.authorId, userId)
        )
      );
      if (type && type !== '') {
        whereConditions.push(eq(content.contentType, type));
      }
    }

    // Search filter
    if (search && search !== '') {
      whereConditions.push(
        or(
          like(content.title, `%${search}%`),
          like(content.description, `%${search}%`),
          like(content.contentText, `%${search}%`)
        )
      );
    }

    // Build query
    let query = db.select({
      id: content.id,
      title: content.title,
      contentType: content.contentType,
      contentText: content.contentText,
      description: content.description,
      contentUrl: content.contentUrl,
      filePath: content.filePath,
      fileName: content.fileName,
      fileSize: content.fileSize,
      fileType: content.fileType,
      isFeatured: content.isFeatured,
      isActive: content.isActive,
      isPublished: content.isPublished,
      isPublic: content.isPublic,
      status: content.status,
      publishedAt: content.publishedAt,
      viewCount: content.viewCount,
      downloadCount: content.downloadCount,
      shareCount: content.shareCount,
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

    // Debug the query conditions
    console.log('🔍 Content API - Where conditions:', whereConditions);
    console.log('🔍 Content API - User role:', userRole);
    console.log('🔍 Content API - User ID:', userId);
    console.log('🔍 Content API - Privacy filtering:', {
      userRole,
      userId,
      canSeePrivate: userRole === 'manager' ? 'Only their own + public' : 'Only their own + public',
      privacyRule: 'Respecting content.isPublic flag'
    });

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

    // Debug the results
    console.log('🔍 Content API - Query results count:', results.length);
    console.log('🔍 Content API - First result:', results[0] || 'No results');

    res.json({
      message: 'Content retrieved successfully',
      content: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /content - Create new content
router.post('/content', authenticateToken, contentUpload.single('file'), validateContent, async (req, res) => {
  try {
    // Add debugging for received data
    console.log('🔍 Content creation - Received body:', req.body);
    console.log('🔍 Content creation - Content type:', req.body.contentType || req.body.content_type);
    console.log('🔍 Content creation - Is public:', req.body.isPublic || req.body.is_public);
    console.log('🔍 Content creation - User ID:', req.user.id, 'Role:', req.user.role);
    console.log('🔍 Content creation - File info:', req.file);
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🔍 Content creation - Validation errors:', errors.array());
      console.log('🔍 Content creation - Validation failed for fields:', errors.array().map(e => e.path));
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }
    
    console.log('🔍 Content creation - Validation passed successfully');

    const userId = req.user.id;
    const {
      title,
      contentType,
      content_type,
      contentText,
      description,
      contentUrl,
      filePath,
      fileName,
      file_name,
      fileSize,
      file_size,
      fileType,
      file_type,
      fileExtension,
      file_extension,
      mimeType,
      mime_type,
      isFeatured = false,
      is_featured,
      isActive = true,
      is_active,
      isPublished = false,
      is_published,
      isPublic,
      is_public,
      status = 'draft',
      tags = []
    } = req.body;
    
    // Map field names to handle both formats
    const mappedContentType = contentType || content_type;
    const mappedFileName = fileName || file_name;
    const mappedFileSize = fileSize || file_size;
    const mappedFileType = fileType || file_type;
    const mappedFileExtension = fileExtension || file_extension;
    const mappedMimeType = mimeType || mime_type;
    
    // Convert string boolean values to actual booleans
    const convertToBoolean = (value) => {
      if (value === undefined || value === null) return true;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return ['true', '1'].includes(value.toLowerCase());
      }
      return Boolean(value);
    };
    
    const mappedIsPublic = convertToBoolean(isPublic !== undefined ? isPublic : is_public);
    const mappedIsActive = convertToBoolean(isActive !== undefined ? isActive : is_active);
    const mappedIsPublished = convertToBoolean(isPublished !== undefined ? isPublished : is_published);
    const mappedIsFeatured = convertToBoolean(isFeatured !== undefined ? isFeatured : is_featured);
    
    console.log('🔍 Content creation - Field mapping:', {
      contentType: contentType,
      content_type: content_type,
      mappedContentType: mappedContentType,
      isPublic: isPublic,
      is_public: is_public,
      mappedIsPublic: mappedIsPublic,
      type: typeof mappedIsPublic
    });

    // Handle uploaded file
    let fileInfo = {};
    if (req.file) {
      console.log('🔍 Content creation - Processing uploaded file:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });
      
      // Store relative path for database, not absolute path
      const relativePath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
      fileInfo = {
        filePath: relativePath,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        fileExtension: path.extname(req.file.originalname)
      };
      console.log('🔍 Content creation - File uploaded:', fileInfo);
    } else {
      console.log('🔍 Content creation - No file uploaded');
    }

    // Create content
    const insertData = {
      title,
      contentType: mappedContentType, // This maps to the database 'contentType' field
      contentText,
      description,
      contentUrl,
      filePath: fileInfo.filePath || filePath,
      fileName: fileInfo.fileName || mappedFileName,
      fileSize: fileInfo.fileSize || mappedFileSize,
      fileType: fileInfo.fileType || mappedFileType,
      fileExtension: fileInfo.fileExtension || mappedFileExtension,
      mimeType: fileInfo.fileType || mappedMimeType,
      authorId: userId,
      isFeatured: mappedIsFeatured,
      isActive: mappedIsActive,
      isPublished: mappedIsPublished,
      isPublic: mappedIsPublic,
      status,
      publishedAt: isPublished ? new Date() : null,
      tags: JSON.stringify(tags),
      viewCount: 0,
      downloadCount: 0,
      shareCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('🔍 Content creation - Inserting data:', insertData);
    
    const newContent = await db.insert(content).values(insertData).returning();
    console.log('🔍 Content creation - Database insertion successful:', newContent);

    res.status(201).json({
      message: 'Content created successfully',
      content: newContent[0]
    });

  } catch (error) {
    console.error('Create content error:', error);
    console.error('Create content error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      where: error.where,
      schema: error.schema,
      table: error.table,
      column: error.column,
      dataType: error.dataType,
      constraint: error.constraint
    });
    
    // Provide more specific error messages
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({
        error: 'Content with this title already exists',
        code: 'DUPLICATE_TITLE'
      });
    } else if (error.code === '23503') { // Foreign key constraint violation
      res.status(400).json({
        error: 'Invalid author ID or category ID',
        code: 'INVALID_REFERENCE'
      });
    } else if (error.code === '23514') { // Check constraint violation
      res.status(400).json({
        error: 'Data validation failed',
        code: 'DATA_VALIDATION_ERROR',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error.message
      });
    }
  }
});

// GET /content/:id - Get content by ID
router.get('/content/:id', authenticateToken, async (req, res) => {
  try {
    const contentId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get content with author information
    const contentItem = await db.select({
      id: content.id,
      title: content.title,
      contentType: content.contentType,
      contentText: content.contentText,
      description: content.description,
      contentUrl: content.contentUrl,
      filePath: content.filePath,
      fileName: content.fileName,
      fileSize: content.fileSize,
      fileType: content.fileType,
      fileExtension: content.fileExtension,
      mimeType: content.mimeType,
      isFeatured: content.isFeatured,
      isActive: content.isActive,
      isPublished: content.isPublished,
      isPublic: content.isPublic,
      status: content.status,
      publishedAt: content.publishedAt,
      viewCount: content.viewCount,
      downloadCount: content.downloadCount,
      shareCount: content.shareCount,
      tags: content.tags,
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
    .leftJoin(users, eq(content.authorId, users.id))
    .where(eq(content.id, contentId))
    .limit(1);

    if (!contentItem || contentItem.length === 0) {
      return res.status(404).json({
        error: 'Content not found',
        code: 'CONTENT_NOT_FOUND'
      });
    }

    const item = contentItem[0];

    // Check access permissions
    // Users can only see content if:
    // 1. It's public, OR
    // 2. They created it themselves
    if (!item.isPublic && item.author.id !== userId) {
      return res.status(403).json({
        error: 'Access denied - This content is private',
        code: 'ACCESS_DENIED'
      });
    }

    // Increment view count
    await db.update(content)
      .set({ 
        viewCount: (item.viewCount || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(content.id, contentId));

    res.json({
      message: 'Content retrieved successfully',
      content: {
        ...item,
        viewCount: (item.viewCount || 0) + 1
      }
    });

  } catch (error) {
    console.error('Get content by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /content/:id - Update content
router.put('/content/:id', authenticateToken, validateContent, async (req, res) => {
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

    const contentId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if content exists and user has permission to edit
    const existingContent = await db.select({
      id: content.id,
      authorId: content.authorId,
      isPublic: content.isPublic
    })
    .from(content)
    .where(eq(content.id, contentId))
    .limit(1);

    if (!existingContent || existingContent.length === 0) {
      return res.status(404).json({
        error: 'Content not found',
        code: 'CONTENT_NOT_FOUND'
      });
    }

    const item = existingContent[0];

    // Check edit permissions
    // Users can only edit content they created themselves
    if (item.authorId !== userId) {
      return res.status(403).json({
        error: 'Access denied - You can only edit your own content',
        code: 'ACCESS_DENIED'
      });
    }

    const updateData = req.body;
    updateData.updatedAt = new Date();

    // Update content
    const updatedContent = await db.update(content)
      .set(updateData)
      .where(eq(content.id, contentId))
      .returning();

    res.json({
      message: 'Content updated successfully',
      content: updatedContent[0]
    });

  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /content/:id - Delete content
router.delete('/content/:id', authenticateToken, async (req, res) => {
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
        error: 'Content not found',
        code: 'CONTENT_NOT_FOUND'
      });
    }

    const item = existingContent[0];

    // Check delete permissions
    // Users can only delete content they created themselves
    if (item.authorId !== userId) {
      return res.status(403).json({
        error: 'Access denied - You can only delete your own content',
        code: 'ACCESS_DENIED'
      });
    }

    // Delete associated file if it exists
    if (item.filePath) {
      const fullPath = path.join(process.cwd(), 'uploads', item.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Delete content from database
    await db.delete(content).where(eq(content.id, contentId));

    res.json({
      message: 'Content deleted successfully'
    });

  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /content/:id/download - Download content file
router.get('/content/:id/download', authenticateToken, async (req, res) => {
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
        error: 'Content not found',
        code: 'CONTENT_NOT_FOUND'
      });
    }

    const item = contentItem[0];

    // Check access permissions
    // Users can only download content if:
    // 1. It's public, OR
    // 2. They created it themselves
    if (!item.isPublic && item.authorId !== userId) {
      return res.status(403).json({
        error: 'Access denied - This content is private',
        code: 'ACCESS_DENIED'
      });
    }

    if (!item.filePath) {
      return res.status(404).json({
        error: 'No file associated with this content',
        code: 'NO_FILE'
      });
    }

    // Handle both relative and absolute paths
    let fullPath;
    if (path.isAbsolute(item.filePath)) {
      fullPath = item.filePath;
    } else {
      fullPath = path.join(process.cwd(), item.filePath);
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND'
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
    console.error('Download content error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
