var express = require("express");
var router = express.Router();
let userController = require('../controllers/users')
let roleModel = require('../schemas/roles')
let { RegisterValidator, validationResult, ChangPasswordValidator } = require('../utils/validatorHandler')
let { CheckLogin } = require('../utils/authHandler')
let jwt = require('jsonwebtoken')
let bcrypt = require('bcrypt')
let crypto = require('crypto')
let { sendMail } = require('../utils/mailHandler')
let mongoose = require('mongoose');
let cartSchema = require('../schemas/carts')
let { jwtSecret, cookieSecure, cookieSameSite, frontendUrl } = require('../utils/appConfig')

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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