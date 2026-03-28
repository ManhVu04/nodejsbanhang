var express = require("express");
var router = express.Router();
let { CreateUserValidator, validationResult } = require('../utils/validatorHandler')
let userModel = require("../schemas/users");
let userController = require('../controllers/users')
let { CheckLogin, CheckRole } = require('../utils/authHandler')

const adminGuard = [CheckLogin, CheckRole(['Admin'])];
const adminOrModeratorGuard = [CheckLogin, CheckRole(['Admin', 'Moderator'])];

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
    res.send(newItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.put("/:id", adminGuard, async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await
      userModel.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedItem) return res.status(404).send({ message: "id not found" });

    let populated = await userModel
      .findById(updatedItem._id)
    res.send(populated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.delete("/:id", adminGuard, async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;