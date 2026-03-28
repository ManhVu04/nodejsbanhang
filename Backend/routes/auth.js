var express = require("express");
var router = express.Router();
let userController = require('../controllers/users')
let roleModel = require('../schemas/roles')
let { RegisterValidator, validationResult, ChangPasswordValidator } = require('../utils/validatorHandler')
let { CheckLogin } = require('../utils/authHandler')
let jwt = require('jsonwebtoken')
let bcrypt = require('bcrypt')
let crypto = require('crypto')
let { OAuth2Client } = require('google-auth-library')
let { sendMail } = require('../utils/mailHandler')
let mongoose = require('mongoose');
let cartSchema = require('../schemas/carts')
let { jwtSecret, cookieSecure, cookieSameSite, frontendUrl, googleOAuthConfig } = require('../utils/appConfig')

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const googleOAuthClient = googleOAuthConfig.clientId
    ? new OAuth2Client(googleOAuthConfig.clientId)
    : null;

function buildAuthCookieOptions(maxAge) {
    return {
        maxAge,
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSameSite,
        path: '/'
    };
}

function validateResetPassword(password) {
    return typeof password === 'string' && password.length >= 8;
}

function normalizeUsernameSeed(value) {
    let normalized = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalized;
}

function selectUsernameSeed(email, fullName) {
    let emailSeed = normalizeUsernameSeed(String(email || '').split('@')[0]);
    if (emailSeed.length >= 3) {
        return emailSeed.slice(0, 24);
    }

    let fullNameSeed = normalizeUsernameSeed(fullName);
    if (fullNameSeed.length >= 3) {
        return fullNameSeed.slice(0, 24);
    }

    return `user${crypto.randomBytes(3).toString('hex')}`;
}

async function buildUniqueUsername(email, fullName) {
    let seed = selectUsernameSeed(email, fullName);

    for (let attempt = 0; attempt < 30; attempt++) {
        let suffix = attempt === 0 ? '' : `${Math.floor(1000 + Math.random() * 9000)}`;
        let candidate = `${seed}${suffix}`.slice(0, 30);
        if (candidate.length < 3) {
            candidate = `user${crypto.randomBytes(3).toString('hex')}`;
        }

        let existed = await userController.FindUserByUsername(candidate);
        if (!existed) {
            return candidate;
        }
    }

    return `user${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
}

function buildGoogleGeneratedPassword() {
    return `${crypto.randomBytes(12).toString('hex')}Aa1!`;
}

async function resetPasswordWithToken(token, password, res) {
    if (!validateResetPassword(password)) {
        return res.status(400).send({ message: 'mat khau phai co it nhat 8 ky tu' });
    }

    let user = await userController.FindUserByToken(token);
    if (!user) {
        return res.status(400).send('token loi');
    }

    user.password = password;
    user.forgotPasswordToken = null;
    user.forgotPasswordTokenExp = null;
    await user.save();
    return res.send('da cap nhat');
}



router.post('/register', RegisterValidator, validationResult, async function (req, res, next) {
    let session = await mongoose.startSession();
    session.startTransaction()
    try {
        let defaultUserRole = await roleModel.findOne({
            isDeleted: false,
            name: { $regex: /^user$/i }
        });

        if (!defaultUserRole) {
            throw new Error('He thong chua cau hinh role User');
        }

        let newItem = await userController.CreateAnUser(
            req.body.username, req.body.password, req.body.email,
            defaultUserRole._id, session,
            String(req.body.fullName || '').trim()
        )
        let newCart = new cartSchema({
            user: newItem._id
        })
        await newCart.save({ session });
        await newCart.populate('user');
        await session.commitTransaction()
        await session.endSession()
        res.send(newCart);

    } catch (err) {
        await session.abortTransaction()
        await session.endSession()
        res.status(400).send({ message: err.message });
    }
})
router.post('/login', async function (req, res, next) {
    try {
        let { username, password } = req.body;
        let result = await userController.FindUserByUsername(username);
        if (!result) {
            res.status(403).send("sai thong tin dang nhap");
            return;
        }
        if (result.lockTime > Date.now()) {
            res.status(404).send("ban dang bi ban");
            return;
        }
        result = await userController.CompareLogin(result, password);
        if (!result) {
            res.status(403).send("sai thong tin dang nhap");
            return;
        }
        let token = jwt.sign({
            id: result._id
        }, jwtSecret, {
            expiresIn: '1d'
        })
        res.cookie("LOGIN_NNPTUD_S3", token, buildAuthCookieOptions(ONE_DAY_MS))
        res.send(token)

    } catch (err) {
        res.status(400).send({ message: err.message });
    }
})

router.get('/google/config', function (req, res) {
    res.send({
        enabled: Boolean(googleOAuthConfig.clientId),
        clientId: googleOAuthConfig.clientId || null
    });
})

router.post('/google/login', async function (req, res) {
    try {
        if (!googleOAuthClient || !googleOAuthConfig.clientId) {
            return res.status(503).send({ message: 'dang nhap google chua duoc cau hinh' });
        }

        let credential = String(req.body.credential || '').trim();
        if (!credential) {
            return res.status(400).send({ message: 'thieu google credential' });
        }

        let ticket = await googleOAuthClient.verifyIdToken({
            idToken: credential,
            audience: googleOAuthConfig.clientId
        });
        let payload = ticket.getPayload();

        let googleId = String(payload?.sub || '').trim();
        let email = String(payload?.email || '').trim().toLowerCase();
        let fullName = String(payload?.name || '').trim();
        let avatarUrl = String(payload?.picture || '').trim();

        if (!googleId || !email) {
            return res.status(400).send({ message: 'thong tin google khong hop le' });
        }
        if (payload?.email_verified === false) {
            return res.status(400).send({ message: 'email google chua duoc xac minh' });
        }

        let user = await userController.FindUserByGoogleId(googleId);
        if (!user) {
            user = await userController.FindUserByEmail(email);
        }

        if (user && user.googleId && user.googleId !== googleId) {
            return res.status(409).send({ message: 'tai khoan email da lien ket google khac' });
        }

        if (!user) {
            let defaultUserRole = await roleModel.findOne({
                isDeleted: false,
                name: { $regex: /^user$/i }
            });
            if (!defaultUserRole) {
                return res.status(500).send({ message: 'He thong chua cau hinh role User' });
            }

            let session = await mongoose.startSession();
            session.startTransaction();
            try {
                let username = await buildUniqueUsername(email, fullName);
                let generatedPassword = buildGoogleGeneratedPassword();
                user = await userController.CreateAnUser(
                    username,
                    generatedPassword,
                    email,
                    defaultUserRole._id,
                    session,
                    fullName,
                    avatarUrl,
                    false,
                    0
                );
                user.googleId = googleId;
                await user.save({ session });

                let newCart = new cartSchema({ user: user._id });
                await newCart.save({ session });

                await session.commitTransaction();
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                await session.endSession();
            }
        } else {
            if (user.lockTime > Date.now()) {
                return res.status(403).send({ message: 'ban dang bi ban' });
            }

            let needSave = false;
            if (!user.googleId) {
                user.googleId = googleId;
                needSave = true;
            }
            if (fullName && !user.fullName) {
                user.fullName = fullName;
                needSave = true;
            }
            if (avatarUrl && !user.avatarUrl) {
                user.avatarUrl = avatarUrl;
                needSave = true;
            }
            if (needSave) {
                await user.save();
            }
        }

        let token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '1d' });
        res.cookie('LOGIN_NNPTUD_S3', token, buildAuthCookieOptions(ONE_DAY_MS));
        return res.send(token);
    } catch (err) {
        return res.status(400).send({ message: err.message || 'dang nhap google that bai' });
    }
})

router.get('/me', CheckLogin, function (req, res, next) {
    let user = req.user;
    res.send(user)
})
router.post('/logout', CheckLogin, function (req, res, next) {
    res.cookie("LOGIN_NNPTUD_S3", "", buildAuthCookieOptions(0))
    res.send("da logout ")
})
router.post('/changepassword', CheckLogin,
    ChangPasswordValidator, validationResult
    , async function (req, res, next) {
        let { newpassword, oldpassword } = req.body;
        let user = req.user;
        if (bcrypt.compareSync(oldpassword, user.password)) {
            user.password = newpassword;
            await user.save();
            res.send("doi pass thanh cong")
        } else {
            res.status(400).send("old password khong dung")
        }
    })

router.post('/forgotpassword', async function (req, res, next) {
    try {
        let { email } = req.body;
        if (!email) {
            return res.status(400).send({ message: 'email khong duoc de trong' });
        }

        let user = await userController.FindUserByEmail(email);
        if (user) {
            user.forgotPasswordToken = crypto.randomBytes(32).toString('hex');
            user.forgotPasswordTokenExp = Date.now() + 10 * 60 * 1000;
            let url = `${frontendUrl}/reset-password?token=${user.forgotPasswordToken}`;
            await user.save();
            await sendMail(user.email, url)
        }

        // Always return the same message to avoid account enumeration.
        res.send('check email')
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
})

router.post('/resetpassword/:token', async function (req, res, next) {
    try {
        let { password } = req.body;
        return await resetPasswordWithToken(req.params.token, password, res);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }

})

router.post('/resetpassword', async function (req, res) {
    let { token, password } = req.body;
    if (!token) {
        return res.status(400).send({ message: 'token khong hop le' });
    }
    try {
        return await resetPasswordWithToken(token, password, res);
    } catch (err) {
        return res.status(400).send({ message: err.message });
    }
})

module.exports = router;