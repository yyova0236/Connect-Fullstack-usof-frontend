const express = require('express');
const router = express.Router();
const { 
    getUsers, 
    getUserById, 
    createUser, 
    updateUser, 
    deleteUser,
    updateOtherUsers
} = require('../controllers/userController');

const { handleAvatarUpload, uploadAvatar } = require('../controllers/uploadController');

const { authenticate, authorize } = require('../middlewares/authMiddleware');
router.use(authenticate);

// Route for all users (get users)
router.get('/', getUsers); 
router.get('/:userId', getUserById);

// Route for users to upload avatar
router.post('/avatar', handleAvatarUpload, uploadAvatar);

// Admin-only route to create a new user
router.post('/', authorize(['ADMIN']), createUser);

// Route for authenticated users to update their own data
router.patch('/me', updateUser); // Route for self-update

// Admin-only route to update another user's role
router.patch('/:userId', authorize(['ADMIN']), updateOtherUsers);

// Route for admin to delete a user
router.delete('/:userId', authorize(['ADMIN']), deleteUser);

module.exports = router;
