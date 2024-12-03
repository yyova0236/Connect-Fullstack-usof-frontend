const express = require('express');
const router = express.Router();
const {
    register,
    login,
    logout,
    resetPassword,
    confirmResetPassword
} = require('../controllers/authController');

const { authenticate } = require('../middlewares/authMiddleware');
const { limiter, loginLimiter } = require('../middlewares/rateLimiter');

router.post('/register', limiter, register); // general rate limiter
router.post('/login', loginLimiter, login); // stricter login limiter
router.post('/logout', authenticate, logout);
router.post('/password-reset', limiter, resetPassword);
router.post('/password-reset/confirm', limiter, confirmResetPassword);

module.exports = router;