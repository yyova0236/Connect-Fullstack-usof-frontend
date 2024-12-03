const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const prisma = new PrismaClient();

// Configure Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/profilePictures/';
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + path.extname(file.originalname);
        cb(null, uniqueSuffix);
    },
});

// multer middleware
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const isValidType = filetypes.test(path.extname(file.originalname).toLowerCase()) && filetypes.test(file.mimetype);

        if (isValidType) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, GIF) are allowed!'));
        }
    },
}).single('profilePicture');

// middleware for handling avatar upload
exports.handleAvatarUpload = (req, res, next) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};

// controller for processing uploaded avatar
exports.uploadAvatar = async (req, res) => {
    const { userId } = req.params;

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const profilePicturePath = req.file.path;

        // update user record in the database
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId, 10) },
            data: { profilePicture: profilePicturePath },
        });

        res.status(200).json({
            message: 'Avatar uploaded successfully',
            user: updatedUser,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload avatar. Please try again later.' });
    }
};