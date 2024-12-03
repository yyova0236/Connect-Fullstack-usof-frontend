const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// see all users
exports.getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { 
                id: true, 
                email: true, 
                role: true,
                fullName: true,
                login: true
            }
        });

        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'No users found' });
        }

        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve users. Please try again later.' });
    }
};

// update user data (self-update for authenticated user)
exports.updateUser = async (req, res) => {
    const { userId } = req.user;  // Get the authenticated user's ID
    const { fullName, email, login } = req.body;  // Fields to update

    if (!fullName || !email || !login) {
        return res.status(400).json({ error: 'Full name, email, and login are required fields' });
    }
    
    const updatedData = {};
    if (fullName) updatedData.fullName = fullName;
    if (email) updatedData.email = email;
    if (login) updatedData.login = login;
    
    // Ensure no role or rate changes
    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updatedData,
        });
    
        const { password, ...userWithoutSensitiveData } = updatedUser;
        res.status(200).json({
            message: 'User updated successfully',
            user: userWithoutSensitiveData,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update user. Please try again later.' });
    }
};


// get user by ID
exports.getUserById = async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve user' });
    }
};

// create new user (ADMIN)
exports.createUser = async (req, res) => {
    const { login, password, passwordConfirmation, fullName, email, role } = req.body;

    if (!email || !password || !login || !fullName) {
        return res.status(400).json({ error: 'Email, password, login, and full name are required' });
    }

    if (password !== passwordConfirmation) {
        return res.status(400).json({ error: 'Password and password confirmation do not match' });
    }

    const validRoles = ['USER', 'ADMIN'];
    const normalizedRole = role ? role.toUpperCase() : 'USER';

    if (!validRoles.includes(normalizedRole)) {
        return res.status(400).json({ error: 'Invalid role provided. Only USER or ADMIN are allowed.' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email is already taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                login,
                password: hashedPassword,
                fullName,
                email,
                role: normalizedRole,
            },
        });

        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create user. Please try again later.' });
    }
};

// update user data (ADMIN can update role of other users)
exports.updateOtherUsers = async (req, res) => {
    const { userId } = req.params;  // User ID to update
    const { role } = req.body;  // Role to update

    try {
        const validRoles = ['USER', 'ADMIN'];
        const normalizedRole = role ? role.toUpperCase() : undefined;

        if (normalizedRole && !validRoles.includes(normalizedRole)) {
            return res.status(400).json({ error: 'Invalid role provided. Allowed values are USER or ADMIN.' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: {
                role: normalizedRole,  // Update only the role
            },
        });

        res.status(200).json({ message: 'User role updated successfully', user: updatedUser });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user role. Please try again later.' });
    }
};


// delete user (ADMIN)
exports.deleteUser = async (req, res) => {
    const { userId } = req.params;

    try {
        await prisma.post.deleteMany({ where: { authorId: parseInt(userId) } });
        await prisma.comment.deleteMany({ where: { authorId: parseInt(userId) } });
        await prisma.like.deleteMany({ where: { authorId: parseInt(userId) } });

        await prisma.user.delete({
            where: { id: parseInt(userId) }
        });

        res.json({ message: 'User and related data deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
};