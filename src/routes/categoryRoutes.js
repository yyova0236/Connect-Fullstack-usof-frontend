const express = require('express');
const router = express.Router();
const {
    createCategory,
    getAllCategories,
    getCategoryById,
    getPostsByCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');

const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', getAllCategories);
router.get('/:category_id', getCategoryById);
router.get('/:category_id/posts', getPostsByCategory);

router.post('/', authorize(['ADMIN']), createCategory);
router.patch('/:category_id', authorize(['ADMIN']), updateCategory);
router.delete('/:category_id', authorize(['ADMIN']), deleteCategory);

module.exports = router;