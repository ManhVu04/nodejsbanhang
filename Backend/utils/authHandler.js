let userController = require('../controllers/users');
let jwt = require('jsonwebtoken');
let { jwtSecret } = require('./appConfig');

function normalizeRequiredRoles(requiredRoles) {
    if (Array.isArray(requiredRoles)) {
        return requiredRoles.map((role) => String(role).toLowerCase());
    }
    return Array.from(arguments).map((role) => String(role).toLowerCase());
}

function hasRequiredRole(user, requiredRoles) {
    if (!user || !user.role || !user.role.name) {
        return false;
    }

    let normalizedRoles = normalizeRequiredRoles(requiredRoles);
    return normalizedRoles.includes(String(user.role.name).toLowerCase());
}

module.exports = {
    CheckLogin: async function (req, res, next) {
        let key = req.headers.authorization;

        if (typeof key === 'string' && key.toLowerCase().startsWith('bearer ')) {
            key = key.slice(7).trim();
        }

        if (!key) {
            if (req.cookies.LOGIN_NNPTUD_S3) {
                key = req.cookies.LOGIN_NNPTUD_S3;
            } else {
                res.status(401).send('ban chua dang nhap');
                return;
            }
        }

        try {
            let result = jwt.verify(key, jwtSecret);
            if (result.exp * 1000 < Date.now()) {
                res.status(401).send('ban chua dang nhap');
                return;
            }

            let user = await userController.GetUserById(result.id);
            if (!user) {
                res.status(401).send('ban chua dang nhap');
                return;
            }

            req.user = user;
            next();
        } catch (error) {
            res.status(401).send('ban chua dang nhap');
        }
    },
    CheckRole: function (requiredRoles) {
        let normalizedRoles = normalizeRequiredRoles.apply(null, arguments);
        if (arguments.length === 1 && Array.isArray(requiredRoles)) {
            normalizedRoles = normalizeRequiredRoles(requiredRoles);
        }

        return function (req, res, next) {
            if (hasRequiredRole(req.user, normalizedRoles)) {
                next();
            } else {
                res.status(403).send('ban khong co quyen');
            }
        };
    },
    normalizeRequiredRoles,
    hasRequiredRole
};