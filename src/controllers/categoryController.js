const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// create a new category (ADMIN only)
exports.createCategory = async (req, res) => {
    const { title, description } = req.body;

    try {
        const newCategory = await prisma.category.create({
            data: {
                title,
                description,
            }
        });
        res.status(201).json({ message: 'Category created successfully', category: newCategory });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create category. Please try again later.' });
    }
};

// see all categories
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany();
        res.status(200).json(categories);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve categories. Please try again later.' });
    }
};

// see a specified category by ID
exports.getCategoryById = async (req, res) => {
    const { category_id } = req.params;

    try {
        const category = await prisma.category.findUnique({
            where: { id: parseInt(category_id) }
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.status(200).json(category);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve category. Please try again later.' });
    }
};

// see all posts associated with the specified category
exports.getPostsByCategory = async (req, res) => {
    const { category_id } = req.params;

    try {
        const posts = await prisma.post.findMany({
            where: { categoryId: parseInt(category_id) }
        });

        if (!posts.length) {
            return res.status(404).json({ error: 'No posts found for this category' });
        }

        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve posts for category. Please try again later.' });
    }
};

// update a specified category (ADMIN only)
exports.updateCategory = async (req, res) => {
    const { category_id } = req.params;
    const { title, description } = req.body;

    try {
        const updatedCategory = await prisma.category.update({
            where: { id: parseInt(category_id) },
            data: {
                title,
                description,
            }
        });
        res.status(200).json({ message: 'Category updated successfully', category: updatedCategory });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.status(500).json({ error: 'Failed to update category. Please try again later.' });
    }
};

// delete category (ADMIN only)
exports.deleteCategory = async (req, res) => {
    const { category_id } = req.params;

    try {
        const category = await prisma.category.findUnique({
            where: { id: parseInt(category_id) }
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        await prisma.category.delete({
            where: { id: parseInt(category_id) }
        });

        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete category. Please try again later.' });
    }
};