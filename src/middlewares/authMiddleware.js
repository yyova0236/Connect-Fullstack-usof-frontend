const jwt = require('jsonwebtoken');

// Authentication Middleware
const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Authorization Middleware
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ error: 'Forbidden: User role not found' });
        }

        const userRole = req.user.role.toUpperCase();
        const requiredRoles = Array.isArray(roles)
            ? roles.map(role => role.toUpperCase())
            : [roles.toUpperCase()];

        if (requiredRoles.includes(userRole)) {
            return next();
        }

        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    };
};

module.exports = { authenticate, authorize };