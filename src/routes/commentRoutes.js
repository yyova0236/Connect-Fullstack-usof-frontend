const express = require('express');
const router = express.Router();
const {
    createCommentOnComment,
    updateComment,
    deleteComment,
    createLike,
    getLikesByComment,
    deleteLike,
    getCommentById
} = require('../controllers/commentController');

const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.post('/:postId/:commentId/replies', createCommentOnComment);
router.patch('/:commentId', updateComment);
router.delete('/:commentId', deleteComment);
router.get('/:commentId', getCommentById);

// Like
router.post('/:commentId/likes', createLike); // like or dislike commment
router.get('/:commentId/likes', getLikesByComment);
router.delete('/:commentId/likes', deleteLike); // remove like or dislike under commment

module.exports = router;