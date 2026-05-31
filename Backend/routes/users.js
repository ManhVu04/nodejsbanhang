var express = require("express");
var router = express.Router();
let { CreateUserValidator, validationResult } = require('../utils/validatorHandler')
let userModel = require("../schemas/users");
let userController = require('../controllers/users')
let { CheckLogin, CheckRole } = require('../utils/authHandler')
let mongoose = require('mongoose')
let { logAuditAction, getClientIpAddress } = require('../utils/auditHandler')
let { escapeRegex } = require('../utils/regexHelper')

const adminGuard = [CheckLogin, CheckRole(['Admin'])];
const adminOrModeratorGuard = [CheckLogin, CheckRole(['Admin', 'Moderator'])];

function safeResourceId(rawId) {
  if (mongoose.isValidObjectId(rawId)) {
    return rawId;
  }
  return new mongoose.Types.ObjectId();
}

function sanitizeUserAuditData(userDoc) {
  if (!userDoc) {
    return null;
  }
  let rawData = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };
  if (Object.prototype.hasOwnProperty.call(rawData, 'password')) {
    delete rawData.password;
  }
  return rawData;
}

function pickAdminUserUpdate(body) {
  let updateData = {};
  if (Object.prototype.hasOwnProperty.call(body, 'fullName')) updateData.fullName = String(body.fullName || '').trim();
  if (Object.prototype.hasOwnProperty.call(body, 'email')) updateData.email = String(body.email || '').trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(body, 'role')) updateData.role = body.role;
  if (Object.prototype.hasOwnProperty.call(body, 'isActive')) updateData.isActive = body.isActive === true;
  return updateData;
}

router.put('/me', CheckLogin, async function (req, res, next) {
  try {
    let updateData = {};

    if (Object.prototype.hasOwnProperty.call(req.body, 'fullName')) {
      let fullName = String(req.body.fullName || '').trim();
      if (!fullName || fullName.length < 2) {
        return res.status(400).send({ message: 'ho ten phai co it nhat 2 ky tu' });
      }
      updateData.fullName = fullName;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
      let email = String(req.body.email || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).send({ message: 'email sai dinh dang' });
      }

      let existing = await userModel.findOne({
        isDeleted: false,
        email: email,
        _id: { $ne: req.user._id }
      });

      if (existing) {
        return res.status(400).send({ message: 'email da duoc su dung' });
      }

      updateData.email = email;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'avatarUrl')) {
      updateData.avatarUrl = String(req.body.avatarUrl || '').trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).send({ message: 'khong co du lieu cap nhat' });
    }

    let updatedUser = await userModel.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true }
    ).populate({
      path: 'role',
      select: 'name'
    });

    return res.send(updatedUser);
  } catch (err) {
    return res.status(400).send({ message: err.message });
  }
});

router.get("/", adminOrModeratorGuard, async function (req, res, next) {
  try {
    let { page = 1, limit = 10, search = '', role, isActive, isDeleted, sort = '-createdAt' } = req.query;
    let normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
    let normalizedLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
    let filter = {};

    if (isDeleted === 'true') filter.isDeleted = true;
    else filter.isDeleted = false;

    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;

    let normalizedSearch = String(search || '').trim();
    if (normalizedSearch) {
      let escaped = escapeRegex(normalizedSearch);
      filter.$or = [
        { username: new RegExp(escaped, 'i') },
        { email: new RegExp(escaped, 'i') },
        { fullName: new RegExp(escaped, 'i') }
      ];
    }

    if (role && mongoose.isValidObjectId(role)) {
      filter.role = role;
    }

    let sortValue = String(sort || '-createdAt').trim();
    let users = await userModel
      .find(filter)
      .populate({ path: 'role', select: 'name' })
      .sort(sortValue)
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit);
    let total = await userModel.countDocuments(filter);

    res.send({ users, total, page: normalizedPage, totalPages: Math.ceil(total / normalizedLimit), limit: normalizedLimit });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.get("/:id", adminGuard, async function (req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).send({ message: "id not found" });
    }
    let result = await userModel
      .find({ _id: req.params.id, isDeleted: false })
    if (result.length > 0) {
      res.send(result);
    }
    else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post("/", adminGuard, CreateUserValidator, validationResult, async function (req, res, next) {
  try {
    let newItem = await userController.CreateAnUser(
      req.body.username, req.body.password, req.body.email, req.body.role
    )

    await logAuditAction({
      action: 'USER_CREATE',
      adminId: req.user?._id,
      resourceType: 'user',
      resourceId: newItem._id,
      before: null,
      after: sanitizeUserAuditData(newItem),
      description: `Created user: ${newItem?.username || newItem?._id}`,
      ipAddress: getClientIpAddress(req),
      success: true
    });

    res.send(newItem);
  } catch (err) {
    await logAuditAction({
      action: 'USER_CREATE',
      adminId: req.user?._id,
      resourceType: 'user',
      resourceId: new mongoose.Types.ObjectId(),
      before: null,
      after: {
        username: req.body?.username,
        email: req.body?.email,
        role: req.body?.role
      },
      description: `Failed to create user: ${req.body?.username || 'Unknown'}`,
      ipAddress: getClientIpAddress(req),
      success: false,
      errorMessage: err.message
    });

    res.status(400).send({ message: err.message });
  }
});

router.put("/:id", adminGuard, async function (req, res, next) {
  try {
    let id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).send({ message: "id not found" });
    }
    let beforeUser = await userModel.findById(id);

    if (!beforeUser) return res.status(404).send({ message: "id not found" });

    let updateData = pickAdminUserUpdate(req.body);
    if (Object.keys(updateData).length === 0) {
      return res.status(400).send({ message: 'khong co du lieu cap nhat hop le' });
    }

    let updatedItem = await
      userModel.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    if (!updatedItem) return res.status(404).send({ message: "id not found" });

    let populated = await userModel
      .findById(updatedItem._id)

    await logAuditAction({
      action: 'USER_UPDATE',
      adminId: req.user?._id,
      resourceType: 'user',
      resourceId: updatedItem._id,
      before: sanitizeUserAuditData(beforeUser),
      after: sanitizeUserAuditData(populated || updatedItem),
      description: `Updated user: ${updatedItem?.username || updatedItem?._id}`,
      ipAddress: getClientIpAddress(req),
      success: true
    });

    res.send(populated);
  } catch (err) {
    await logAuditAction({
      action: 'USER_UPDATE',
      adminId: req.user?._id,
      resourceType: 'user',
      resourceId: safeResourceId(req.params?.id),
      before: null,
      after: sanitizeUserAuditData(req.body),
      description: `Failed to update user: ${req.params?.id || 'Unknown'}`,
      ipAddress: getClientIpAddress(req),
      success: false,
      errorMessage: err.message
    });

    res.status(400).send({ message: err.message });
  }
});

router.patch("/:id/active", adminGuard, async function (req, res, next) {
  try {
    let id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).send({ message: "id not found" });
    }
    let beforeUser = await userModel.findById(id);
    if (!beforeUser) return res.status(404).send({ message: "id not found" });

    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { $set: { isActive: req.body?.isActive === true } },
      { new: true }
    ).populate({ path: 'role', select: 'name' });

    await logAuditAction({
      action: 'USER_UPDATE_ACTIVE',
      adminId: req.user?._id,
      resourceType: 'user',
      resourceId: updatedItem._id,
      before: sanitizeUserAuditData(beforeUser),
      after: sanitizeUserAuditData(updatedItem),
      description: `Updated user active state: ${updatedItem?.username || updatedItem?._id}`,
      ipAddress: getClientIpAddress(req),
      success: true
    });

    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.delete("/:id", adminGuard, async function (req, res, next) {
  try {
    let id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).send({ message: "id not found" });
    }
    let beforeUser = await userModel.findById(id);

    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }

    await logAuditAction({
      action: 'USER_DELETE',
      adminId: req.user?._id,
      resourceType: 'user',
      resourceId: updatedItem._id,
      before: sanitizeUserAuditData(beforeUser),
      after: sanitizeUserAuditData(updatedItem),
      description: `Deleted user: ${updatedItem?.username || updatedItem?._id}`,
      ipAddress: getClientIpAddress(req),
      success: true
    });

    res.send(updatedItem);
  } catch (err) {
    await logAuditAction({
      action: 'USER_DELETE',
      adminId: req.user?._id,
      resourceType: 'user',
      resourceId: safeResourceId(req.params?.id),
      before: null,
      after: null,
      description: `Failed to delete user: ${req.params?.id || 'Unknown'}`,
      ipAddress: getClientIpAddress(req),
      success: false,
      errorMessage: err.message
    });

    res.status(400).send({ message: err.message });
  }
});

module.exports = router;