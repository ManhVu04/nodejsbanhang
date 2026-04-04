var express = require("express");
var router = express.Router();
let { CreateUserValidator, validationResult } = require('../utils/validatorHandler')
let userModel = require("../schemas/users");
let userController = require('../controllers/users')
let { CheckLogin, CheckRole } = require('../utils/authHandler')
let mongoose = require('mongoose')
let { logAuditAction, getClientIpAddress } = require('../utils/auditHandler')

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
  let users = await userModel
    .find({ isDeleted: false })
    .populate({
      path: 'role',
      select: 'name'
    })
  res.send(users);
});

router.get("/:id", adminGuard, async function (req, res, next) {
  try {
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
    let beforeUser = await userModel.findById(id);

    if (!beforeUser) return res.status(404).send({ message: "id not found" });

    let updatedItem = await
      userModel.findByIdAndUpdate(id, req.body, { new: true });

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

router.delete("/:id", adminGuard, async function (req, res, next) {
  try {
    let id = req.params.id;
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