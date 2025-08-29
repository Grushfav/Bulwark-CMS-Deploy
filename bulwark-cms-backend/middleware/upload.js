import upload, { avatarUpload, contentUpload, bulkUpload } from '../config/multer.js';

// File upload middleware wrapper
export const handleFileUpload = (uploadType = 'default', maxFiles = 1) => {
  let uploadMiddleware;
  
  switch (uploadType) {
    case 'avatar':
      uploadMiddleware = avatarUpload;
      break;
    case 'content':
      uploadMiddleware = contentUpload;
      break;
    case 'bulk':
      uploadMiddleware = bulkUpload;
      break;
    default:
      uploadMiddleware = upload;
  }
  
  return (req, res, next) => {
    const uploadHandler = maxFiles > 1 
      ? uploadMiddleware.array('files', maxFiles)
      : uploadMiddleware.single('file');
    
    uploadHandler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({
              error: 'File too large',
              code: 'FILE_TOO_LARGE',
              maxSize: process.env.MAX_FILE_SIZE || '10MB'
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({
              error: 'Too many files',
              code: 'TOO_MANY_FILES',
              maxFiles
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              error: 'Unexpected file field',
              code: 'UNEXPECTED_FILE_FIELD'
            });
          default:
            return res.status(400).json({
              error: 'File upload error',
              code: 'FILE_UPLOAD_ERROR',
              details: err.message
            });
        }
      } else if (err) {
        // Other errors (e.g., file type not allowed)
        return res.status(400).json({
          error: err.message,
          code: 'FILE_VALIDATION_ERROR'
        });
      }
      
      // File upload successful
      next();
    });
  };
};

// Specific upload middlewares
export const uploadAvatar = handleFileUpload('avatar', 1);
export const uploadContent = handleFileUpload('content', 5);
export const uploadBulk = handleFileUpload('bulk', 1);
export const uploadDefault = handleFileUpload('default', 5);

// Validate file types
export const validateFileType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }
    
    const files = req.files || [req.file];
    
    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: `File type ${file.mimetype} is not allowed`,
          code: 'INVALID_FILE_TYPE',
          allowedTypes,
          receivedType: file.mimetype
        });
      }
    }
    
    next();
  };
};

// Validate file size
export const validateFileSize = (maxSize) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }
    
    const files = req.files || [req.file];
    
    for (const file of files) {
      if (file.size > maxSize) {
        return res.status(400).json({
          error: `File ${file.originalname} is too large`,
          code: 'FILE_TOO_LARGE',
          maxSize: `${maxSize / (1024 * 1024)}MB`,
          actualSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`
        });
      }
    }
    
    next();
  };
};

// Clean up uploaded files on error
export const cleanupOnError = (req, res, next) => {
  res.on('error', () => {
    // Clean up uploaded files if response fails
    if (req.file) {
      // Delete single file
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    } else if (req.files) {
      // Delete multiple files
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      });
    }
  });
  
  next();
};

export default {
  handleFileUpload,
  uploadAvatar,
  uploadContent,
  uploadBulk,
  uploadDefault,
  validateFileType,
  validateFileSize,
  cleanupOnError
};
