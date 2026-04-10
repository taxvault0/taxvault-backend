const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|heic|heif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, HEIC) and PDFs are allowed'));
    }
};

// Multer upload instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Max 5 files per request
    },
    fileFilter: fileFilter
});

// Process image middleware (resize, optimize)
const processImage = async (req, res, next) => {
    if (!req.file) return next();

    try {
        const filePath = req.file.path;
        const ext = path.extname(req.file.originalname).toLowerCase();
        
        // Skip PDF processing
        if (ext === '.pdf') return next();

        // Create thumbnail
        const thumbnailPath = filePath.replace(ext, '_thumb' + ext);
        
        await sharp(filePath)
            .resize(300, 300, { fit: 'inside' })
            .jpeg({ quality: 70 })
            .toFile(thumbnailPath);

        req.file.thumbnail = thumbnailPath;

        // Optimize original image
        const optimizedPath = filePath.replace(ext, '_optimized' + ext);
        
        await sharp(filePath)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toFile(optimizedPath);

        // Replace original with optimized
        fs.unlinkSync(filePath);
        fs.renameSync(optimizedPath, filePath);

        next();
    } catch (error) {
        console.error('Image processing error:', error);
        next(error);
    }
};

// Clean up temporary files on error
const cleanup = (err, req, res, next) => {
    if (req.file) {
        fs.unlink(req.file.path, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting file:', unlinkErr);
        });
        
        if (req.file.thumbnail) {
            fs.unlink(req.file.thumbnail, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting thumbnail:', unlinkErr);
            });
        }
    }
    
    next(err);
};

module.exports = { upload, processImage, cleanup };












