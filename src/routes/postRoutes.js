const express = require('express');
const router = express.Router();
const {
    createPost,
    createComment,
    createLike,
    getPosts,
    getCommentsByPost,
    getCategoriesByPost,
    getLikesByPost,
    getPostById,
    updatePost,
    deletePost,
    deleteLike
} = require('../controllers/postController');

const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

// Post
router.post('/', createPost);
router.get('/', getPosts);
router.get('/:postId', getPostById);
router.patch('/:postId', updatePost);
router.delete('/:postId', deletePost);


// Comment
router.post('/:postId/comments', createComment);
router.get('/:postId/comments', getCommentsByPost);

// Like
router.post('/:postId/likes', createLike); // like or dislike post
router.get('/:postId/likes', getLikesByPost);
router.delete('/:postId/likes', deleteLike); // remove like or dislike under post

// Category
router.get('/:postId/categories', getCategoriesByPost);

module.exports = router;