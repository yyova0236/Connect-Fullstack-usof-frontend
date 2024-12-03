const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// create new post
exports.createPost = async (req, res) => {
    const { title, content, categories } = req.body;
    const { userId } = req.user;

    try {
        const post = await prisma.post.create({
            data: {
                title,
                content,
                authorId: userId,
                categories: {
                    connect: categories.map(categoryId => ({ id: categoryId })),
                },
            },
        });

        res.json(post);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error while creating the post' });
    }
};

// update an existing post
exports.updatePost = async (req, res) => {
    const { postId } = req.params;
    const { title, content, categories, status } = req.body;
    const { userId, role } = req.user;

    try {
        const post = await prisma.post.findUnique({
            where: { id: parseInt(postId) },
            include: { categories: true },
        });

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (role !== 'ADMIN' && post.authorId !== userId) {
            return res.status(403).json({ error: 'You can only update your own posts or be an admin' });
        }

        const updatedPostData = {
            title: title || post.title,
            content: content || post.content,
            status: status !== undefined ? status : post.status,
        };

        if (categories && categories.length > 0) {
            updatedPostData.categories = {
                connect: categories.map((categoryId) => ({ id: categoryId })),
            };
        }

        const updatedPost = await prisma.post.update({
            where: { id: parseInt(postId) },
            data: updatedPostData,
            include: { author: true, categories: true },
        });

        res.json(updatedPost);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error while updating the post' });
    }
};

// see all posts
exports.getPosts = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    try {
        const userId = req.user.id;
        const userRole = req.user.role.toUpperCase();

        let postsCondition;

        if (userRole === 'ADMIN') {
            postsCondition = {};
        } else {
            postsCondition = {
                OR: [
                    { status: 'ACTIVE' },
                    { userId: userId, status: 'INACTIVE' },
                ],
            };
        }

        const [posts, total] = await prisma.$transaction([
            prisma.post.findMany({
                where: postsCondition,
                skip,
                take: parseInt(limit),
                include: {
                    author: true,
                    categories: true,
                    comments: true,
                    likes: true,
                },
                orderBy: { publishDate: 'desc' },
            }),
            prisma.post.count({
                where: postsCondition,
            }),
        ]);

        res.status(200).json({
            posts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching posts' });
    }
};

exports.getPostsByUser = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    try {
        const userId = req.user.id;
        const postsCondition = { userId: userId };

        const [posts, total] = await prisma.$transaction([
            prisma.post.findMany({
                where: postsCondition,
                skip,
                take: parseInt(limit),
                include: {
                    author: true,
                    categories: true,
                    comments: true,
                    likes: true,
                },
                orderBy: { publishDate: 'desc' },
            }),
            prisma.post.count({
                where: postsCondition,
            }),
        ]);

        // Відправляємо відповідь
        res.status(200).json({
            posts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        console.error('Error fetching user posts:', err);
        res.status(500).json({ error: 'Error fetching user posts' });
    }
};


// see single post by ID
exports.getPostById = async (req, res) => {
    const { postId } = req.params;

    try {
        const post = await prisma.post.findUnique({
            where: { id: parseInt(postId) },
            include: { author: true, categories: true },
        });

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json(post);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error while fetching post' });
    }
};

//delete post
exports.deletePost = async (req, res) => {
    const { postId } = req.params;
    const { userId, role } = req.user;

    try {
        console.log(`Delete request for postId: ${postId} by userId: ${userId}, role: ${role}`);

        const post = await prisma.post.findUnique({
            where: { id: parseInt(postId) },
        });

        if (!post) {
            console.log('Post not found');
            return res.status(404).json({ error: 'Post not found' });
        }

        if (role !== 'ADMIN' && post.authorId !== userId) {
            console.log('Unauthorized delete attempt');
            return res.status(403).json({ error: 'You can only delete your own posts or be an admin' });
        }

        await prisma.post.delete({
            where: { id: parseInt(postId) },
        });

        console.log('Post deleted successfully');
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (err) {
        console.error('Error in deletePost handler:', err); // Детальний лог помилки
        res.status(500).json({ error: 'Internal server error while deleting post' });
    }
};

// create new comment
exports.createComment = async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    const { userId } = req.user;

    if (!content) {
        return res.status(400).json({ error: 'Content is required to create a comment' });
    }

    try {
        const post = await prisma.post.findUnique({ where: { id: parseInt(postId) } });

        if (!post || post.status !== 'ACTIVE') {
            return res.status(404).json({ error: 'Post not found or inactive' });
        }

        const newComment = await prisma.comment.create({
            data: {
                content,
                post: { connect: { id: parseInt(postId) } },
                author: { connect: { id: userId } },
            },
            include: { author: true },
        });

        res.status(201).json(newComment);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error while creating comment' });
    }
};

// see comments for specific post
exports.getCommentsByPost = async (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    try {
        const [comments, total] = await prisma.$transaction([
            prisma.comment.findMany({
                where: { postId: parseInt(postId) },
                skip,
                take: parseInt(limit),
                include: { author: true },
                orderBy: { publishDate: 'desc' },
            }),
            prisma.comment.count({ where: { postId: parseInt(postId) } }),
        ]);

        res.status(200).json({
            comments,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error while fetching comments' });
    }
};

exports.createLike = async (req, res) => {
    const { postId } = req.params;
    const { type } = req.body;
    const { userId } = req.user;

    if (!type || !['LIKE', 'DISLIKE'].includes(type.toUpperCase())) {
        return res.status(400).json({ error: 'Type must be either "LIKE" or "DISLIKE"' });
    }

    try {
        const post = await prisma.post.findUnique({
            where: { id: parseInt(postId) },
        });

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Cannot react to an inactive post' });
        }

        const existingLike = await prisma.like.findFirst({
            where: { postId: parseInt(postId), authorId: userId },
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
                postId: parseInt(postId),
                authorId: userId,
            },
            include: { author: true },
        });

        res.status(201).json({ message: 'Reaction added successfully', like: newLike });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error while processing reaction' });
    }
};

//see likes under post
exports.getLikesByPost = async (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    try {
        const [likes, total] = await prisma.$transaction([
            prisma.like.findMany({
                where: { postId: parseInt(postId) },
                skip,
                take: parseInt(limit),
                include: { author: true },
                orderBy: { id: 'desc' },
            }),
            prisma.like.count({ where: { postId: parseInt(postId) } }),
        ]);

        res.status(200).json({
            likes,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error while fetching likes' });
    }
};

// delete like or dislike under post
exports.deleteLike = async (req, res) => {
    const { postId } = req.params;
    const { type } = req.body;
    const { userId } = req.user;

    if (!type || !['LIKE', 'DISLIKE'].includes(type.toUpperCase())) {
        return res.status(400).json({ error: 'Type must be either "LIKE" or "DISLIKE"' });
    }

    try {
        const existingReaction = await prisma.like.findFirst({
            where: {
                postId: parseInt(postId),
                authorId: userId,
                type: type.toUpperCase(),
            },
        });

        if (!existingReaction) {
            return res.status(404).json({ error: `${type} not found for the specified post` });
        }

        await prisma.like.delete({
            where: { id: existingReaction.id },
        });

        res.status(200).json({ message: `${type} removed successfully` });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error while deleting reaction' });
    }
};


// see categories for specific post
exports.getCategoriesByPost = async (req, res) => {
    const { postId } = req.params;

    try {
        const post = await prisma.post.findUnique({
            where: { id: parseInt(postId) },
            include: { categories: true },
        });

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json(post.categories);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error while fetching categories' });
    }
};