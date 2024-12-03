const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// create new nested comment
exports.createCommentOnComment = async (req, res) => {
    const { postId, commentId } = req.params;  // commentId is the ID of the parent comment
    const { content } = req.body;              // Content of the reply
    const { userId } = req.user;               // The user making the reply

    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required to create a reply' });
    }

    const postIdInt = parseInt(postId, 10);
    const commentIdInt = parseInt(commentId, 10);  // ID of the comment being replied to

    if (isNaN(postIdInt) || isNaN(commentIdInt)) {
        return res.status(400).json({ error: 'Invalid postId or commentId' });
    }

    try {
        // Check if the post exists and is active
        const post = await prisma.post.findUnique({
            where: { id: postIdInt },
        });
        if (!post || post.status !== 'ACTIVE') {
            return res.status(404).json({ error: 'Post not found or inactive' });
        }

        // Check if the parent comment (commentId) exists
        const parentComment = await prisma.comment.findUnique({
            where: { id: commentIdInt },
        });
        if (!parentComment) {
            return res.status(404).json({ error: 'Parent comment not found' });
        }

        // Create the new reply (comment) under the parent comment
        const newReply = await prisma.comment.create({
            data: {
                content,
                post: { connect: { id: postIdInt } },  // Connect the reply to the post
                author: { connect: { id: userId } },  // Connect the reply to the user
                comment: { connect: { id: commentIdInt } },  // Connect to the parent comment (reply to comment)
            },
            include: { author: true },
        });

        // Return the newly created reply
        res.status(201).json(newReply);
    } catch (err) {
        console.error('Error creating reply:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// get a specific comment by ID
exports.getCommentById = async (req, res) => {
    const { commentId } = req.params;

    try {
        const comment = await prisma.comment.findUnique({
            where: { id: parseInt(commentId) },
            include: {
                author: true,
                likes: true,
            },
        });

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        res.status(200).json(comment);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error while fetching comment' });
    }
};

// update comment status - Only admin or author
exports.updateComment = async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const { userId } = req.user;
    const userRole = req.user.role;

    if (!content) {
        return res.status(400).json({ error: 'Content is required to update the comment' });
    }

    try {
        const comment = await prisma.comment.findUnique({
            where: { id: parseInt(commentId) }
        });

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (userRole !== 'ADMIN' && comment.authorId !== userId) {
            return res.status(403).json({ error: 'You can only update your own comments or be an admin' });
        }

        const updatedComment = await prisma.comment.update({
            where: { id: parseInt(commentId) },
            data: { content }
        });

        res.json(updatedComment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// delete comment - ADMIN or USER
exports.deleteComment = async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const comment = await prisma.comment.findUnique({
            where: { id: parseInt(commentId) },
            include: { author: true }
        });

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (userRole !== 'ADMIN' && comment.authorId !== userId) {
            return res.status(403).json({ error: 'You can only delete your own comments or be an admin' });
        }

        await prisma.comment.delete({
            where: { id: parseInt(commentId) }
        });

        res.json({ message: 'Comment deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// create like for comment
exports.createLike = async (req, res) => {
    const { commentId } = req.params;
    const { type } = req.body;
    const { userId } = req.user;

    if (!type || !['LIKE', 'DISLIKE'].includes(type.toUpperCase())) {
        return res.status(400).json({ error: 'Type must be either "LIKE" or "DISLIKE"' });
    }

    try {
        const comment = await prisma.comment.findUnique({
            where: { id: parseInt(commentId) },
        });

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comment.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Cannot react to an inactive comment' });
        }

        const existingLike = await prisma.like.findFirst({
            where: { commentId: parseInt(commentId), authorId: userId },
        });

        if (existingLike) {
            if (existingLike.type === type.toUpperCase()) {
                await prisma.like.delete({
                    where: { id: existingLike.id },
                });
                return res.status(200).json({ message: 'Reaction removed successfully' });
            }

            const updatedLike = await prisma.like.update({
                where: { id: existingLike.id },
                data: { type: type.toUpperCase() },
            });
            return res.status(200).json({ message: 'Reaction updated successfully', like: updatedLike });
        }

        const newLike = await prisma.like.create({
            data: {
                type: type.toUpperCase(),
                commentId: parseInt(commentId),
                authorId: userId,
            },
            include: { author: true },
        });

        res.status(201).json({ message: 'Reaction added successfully', like: newLike });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error while processing reaction' });
    }
};

// see all likes for the specified comment
exports.getLikesByComment = async (req, res) => {
    const { commentId } = req.params;

    try {
        const likes = await prisma.like.findMany({
            where: {
                commentId: parseInt(commentId),
            },
            include: {
                author: true,
            },
        });

        res.status(200).json(likes);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error while fetching likes for comment' });
    }
};

// delete like for the specified comment
exports.deleteLike = async (req, res) => {
    const { commentId } = req.params;
    const { type } = req.body;
    const { userId } = req.user;

    if (!type || !['LIKE', 'DISLIKE'].includes(type.toUpperCase())) {
        return res.status(400).json({ error: 'Type must be either "LIKE" or "DISLIKE"' });
    }

    try {
        const existingReaction = await prisma.like.findFirst({
            where: {
                commentId: parseInt(commentId),
                authorId: userId,
                type: type.toUpperCase(),
            },
        });

        if (!existingReaction) {
            return res.status(404).json({ error: `${type} not found for the specified comment` });
        }

        await prisma.like.delete({
            where: { id: existingReaction.id },
        });

        res.status(200).json({ message: `${type} removed successfully` });
    } catch (err) {
        console.error('Error deleting reaction:', err);
        res.status(500).json({ error: 'Internal server error while deleting reaction' });
    }
};
