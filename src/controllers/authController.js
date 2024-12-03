const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');

const prisma = new PrismaClient();

// send password reset email
const sendResetEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });

    const resetLink = `http://your-frontend-url.com/reset-password/${token}`;
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request',
        text: `Please reset your password using the following link: ${resetLink}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

const registerValidationRules = [
    body('name').isLength({ min: 3, max: 64 }).withMessage('Name must be between 3 and 64 characters.'),
    body('email').isEmail().withMessage('Enter a valid email address, like: yourname@email.com'),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
        .matches(/[a-z]/).withMessage('Include at least one lowercase letter.')
        .matches(/[A-Z]/).withMessage('Include at least one uppercase letter.')
        .matches(/\d|\W/).withMessage('Include at least one number or symbol.')
];

// register
exports.register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { login, password, passwordConfirmation, fullName, email, role } = req.body;
 
    if (password !== passwordConfirmation) {
        return res.status(400).json({ error: 'Password and password confirmation do not match' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { login } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
            return res.status(400).json({ error: 'Email already in use' });
        }        

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                login,
                password: hashedPassword,
                fullName,
                email,
                role: role || 'USER',
            },
        });

        res.status(201).json({ message: 'User created', userId: newUser.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.registerValidationRules = registerValidationRules;

// login
exports.login = async (req, res) => {

    console.log('Login controller hit');
    const { login, email, password } = req.body;

    if (!password || (!login && !email)) {
        return res.status(400).json({ error: 'Login, email, and password are required' });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { login },
                    { email },
                ],
            },
        });

        if (!user) {
            return res.status(401).json({ error: 'User is not found' });
        }

        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Email not confirmed. Please confirm your email to log in.' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            token,
            userId: user.id,
            role: user.role,
        });
    } catch (err) {
        res.status(500).json({ error: 'An error occurred while logging in. Please try again later.' });
    }
};


// logout
exports.logout = (req, res) => {
    res.status(200).json({ message: 'Logout successful' });
};

// password reset
exports.resetPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        
        await prisma.passwordReset.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + 3600000), // 1 hour expiry
            }
        });

        const emailSent = await sendResetEmail(email, token);
        if (!emailSent) {
            return res.status(500).json({ error: 'Failed to send email. Please try again.' });
        }

        res.status(200).json({ message: 'Password reset link sent to your email' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// confirm password reset
exports.confirmResetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const resetRequest = await prisma.passwordReset.findUnique({
            where: { token }
        });

        if (!resetRequest || resetRequest.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: resetRequest.userId },
            data: { password: hashedPassword }
        });

        await prisma.passwordReset.delete({
            where: { token }
        });

        res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};