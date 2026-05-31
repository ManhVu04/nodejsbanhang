let userModel = require("../schemas/users");
let bcrypt = require('bcrypt');
let crypto = require('crypto');

const MAX_LOGIN_ATTEMPTS = 10;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function hashResetToken(token) {
    return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

module.exports = {
    CreateAnUser: async function (username, password, email, role,session,
        fullName, avatarUrl, status, loginCount
    ) {
        let newUser = new userModel({
            username: username,
            password: password,
            email: email,
            fullName: fullName,
            avatarUrl: avatarUrl,
            status: status,
            role: role,
            loginCount: loginCount
        })
        if (session) {
            await newUser.save({ session });
        } else {
            await newUser.save();
        }
        return newUser;
    },
    FindUserByUsername: async function (username) {
        return await userModel.findOne({
            isDeleted: false,
            username: username
        })
    }, FindUserByEmail: async function (email) {
        return await userModel.findOne({
            isDeleted: false,
            email: email
        })
    }, FindUserByGoogleId: async function (googleId) {
        return await userModel.findOne({
            isDeleted: false,
            googleId: googleId
        })
    },
    FindUserByToken: async function (token) {
        if (!token) return false;
        let result = await userModel.findOne({
            isDeleted: false,
            forgotPasswordToken: hashResetToken(token)
        })
        if (result && result.forgotPasswordTokenExp && result.forgotPasswordTokenExp > Date.now()) {
            return result;
        }
        return false
    },
    HashResetToken: hashResetToken,
    VerifyPassword: async function (user, password) {
        return bcrypt.compare(password, user.password);
    },
    CompareLogin: async function (user, password) {
        if (await this.VerifyPassword(user, password)) {
            if (user.loginCount !== 0 || user.lockTime) {
                user.loginCount = 0;
                user.lockTime = undefined;
                await user.save();
            }
            return user;
        }
        user.loginCount++;
        if (user.loginCount >= MAX_LOGIN_ATTEMPTS) {
            user.lockTime = new Date(Date.now() + LOCK_DURATION_MS);
            user.loginCount = 0;
        }
        await user.save()
        return false;
    },
    GetUserById: async function (id) {
        try {
            let user = await userModel.findOne({
                _id: id,
                isDeleted: false
            }).select('-password -forgotPasswordToken -forgotPasswordTokenExp').populate('role')
            return user;
        } catch (error) {
            return false;
        }
    },
    GetUserByIdWithPassword: async function (id) {
        try {
            return await userModel.findOne({ _id: id, isDeleted: false });
        } catch (error) {
            return false;
        }
    }
}