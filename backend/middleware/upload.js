const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    // Organize files by type
    if (file.mimetype.startsWith('image/')) {
      uploadPath += 'images/';
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath += 'videos/';
    } else if (file.mimetype === 'application/pdf') {
      uploadPath += 'pdfs/';
    } else if (file.mimetype.includes('document') || file.mimetype.includes('text')) {
      uploadPath += 'documents/';
    } else {
      uploadPath += 'others/';
    }
    
    // Further organize by date
    const date = new Date();
    uploadPath += `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/`;
    
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}_${uniqueSuffix}${ext}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'video/mp4': true,
    'video/mpeg': true,
    'video/quicktime': true,
    'video/x-msvideo': true, // .avi
    'video/x-ms-wmv': true,  // .wmv
    'application/pdf': true,
    'application/msword': true, // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true, // .docx
    'application/vnd.ms-powerpoint': true, // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': true, // .pptx
    'application/vnd.ms-excel': true, // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true, // .xlsx
    'text/plain': true,
    'text/csv': true,
    'application/zip': true,
    'application/x-rar-compressed': true,
    'application/x-7z-compressed': true
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Base upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 10 // Maximum 10 files at once
  }
});

// Specific upload configurations
const uploadConfigs = {
  // Single file upload
  single: (fieldName) => upload.single(fieldName),
  
  // Multiple files upload
  multiple: (fieldName, maxCount = 5) => upload.array(fieldName, maxCount),
  
  // Multiple fields upload
  fields: (fields) => upload.fields(fields),
  
  // Avatar upload (images only, smaller size)
  avatar: multer({
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadPath = 'uploads/avatars/';
        ensureDirectoryExists(uploadPath);
        cb(null, uploadPath);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `avatar_${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for avatars'), false);
      }
    },
    limits: {
      fileSize: 2 * 1024 * 1024 // 2MB for avatars
    }
  }).single('avatar'),
  
  // Course materials upload
  courseMaterials: upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'pdf', maxCount: 1 },
    { name: 'videos', maxCount: 10 },
    { name: 'documents', maxCount: 20 },
    { name: 'images', maxCount: 50 },
    { name: 'attachments', maxCount: 10 }
  ]),
  
  // Assignment files upload
  assignmentFiles: upload.array('files', 10),
  
  // Chat attachments upload
  chatAttachments: multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB for chat files
      files: 3 // Maximum 3 files per message
    }
  }).array('attachments', 3)
};

// Middleware to handle upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size allowed is 10MB.'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum allowed is 10 files.'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name or too many files.'
      });
    }
  }
  
  if (error.message.includes('File type') && error.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Utility function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
  return false;
};

// Utility function to get file info
const getFileInfo = (file) => {
  if (!file) return null;
  
  return {
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
    size: file.size,
    mimeType: file.mimetype,
    uploadedAt: new Date()
  };
};

// Utility function to get multiple files info
const getFilesInfo = (files) => {
  if (!files || !Array.isArray(files)) return [];
  
  return files.map(getFileInfo);
};

module.exports = {
  upload,
  uploadConfigs,
  handleUploadError,
  deleteFile,
  getFileInfo,
  getFilesInfo,
  ensureDirectoryExists
};
