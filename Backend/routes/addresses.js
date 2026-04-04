let express = require("express");
let mongoose = require("mongoose");
let router = express.Router();

let addressModel = require("../schemas/addresses");
let { CheckLogin } = require("../utils/authHandler");

function normalizePhoneNumber(phoneNumberValue) {
  return String(phoneNumberValue || "");
}

function normalizeAddressPayload(payload) {
  let normalizedPayload = {
    label: String(payload?.label || "").trim(),
    recipientName: String(payload?.recipientName || "").trim(),
    phoneNumber: normalizePhoneNumber(payload?.phoneNumber),
    addressLine: String(payload?.addressLine || "").trim(),
    isDefault: payload?.isDefault === true,
  };

  if (!normalizedPayload?.label) {
    normalizedPayload.label = "Dia chi";
  }

  return normalizedPayload;
}

function validateAddressPayload(payload) {
  if (!payload?.addressLine) {
    return "Dia chi khong duoc de trong";
  }

  if (payload?.addressLine?.length < 8) {
    return "Dia chi phai co it nhat 8 ky tu";
  }

  if (!payload?.phoneNumber) {
    return "So dien thoai khong duoc de trong";
  }

  if (!/^\d{10}$/.test(payload?.phoneNumber)) {
    return "So dien thoai phai gom dung 10 chu so, vi du: 0869727139";
  }

  return "";
}

async function unsetDefaultAddresses(userId, excludedAddressId) {
  let filter = {
    user: userId,
    isDeleted: false,
    isDefault: true,
  };

  if (excludedAddressId) {
    filter._id = { $ne: excludedAddressId };
  }

  await addressModel.updateMany(filter, { isDefault: false });
}

router.get("/", CheckLogin, async function (req, res) {
  try {
    let addresses = await addressModel
      .find({
        user: req.user?._id,
        isDeleted: false,
      })
      .sort({ isDefault: -1, createdAt: -1 });

    return res.send({ addresses });
  } catch (error) {
    return res
      .status(400)
      .send({ message: error?.message || "Lay danh sach dia chi that bai" });
  }
});

router.post("/", CheckLogin, async function (req, res) {
  try {
    let normalizedPayload = normalizeAddressPayload(req.body || {});
    let validateMessage = validateAddressPayload(normalizedPayload);

    if (validateMessage) {
      return res.status(400).send({ message: validateMessage });
    }

    let activeAddressCount = await addressModel.countDocuments({
      user: req.user?._id,
      isDeleted: false,
    });

    // The first address is automatically marked as default.
    if (activeAddressCount === 0) {
      normalizedPayload.isDefault = true;
    }

    if (normalizedPayload?.isDefault) {
      await unsetDefaultAddresses(req.user?._id);
    }

    let newAddress = new addressModel({
      user: req.user?._id,
      label: normalizedPayload?.label,
      recipientName: normalizedPayload?.recipientName,
      phoneNumber: normalizedPayload?.phoneNumber,
      addressLine: normalizedPayload?.addressLine,
      isDefault: normalizedPayload?.isDefault,
    });

    await newAddress.save();

    return res.send({
      message: "Tao dia chi thanh cong",
      address: newAddress,
    });
  } catch (error) {
    return res
      .status(400)
      .send({ message: error?.message || "Tao dia chi that bai" });
  }
});

router.put("/:id", CheckLogin, async function (req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params?.id)) {
      return res.status(400).send({ message: "Address id khong hop le" });
    }

    let normalizedPayload = normalizeAddressPayload(req.body || {});
    let validateMessage = validateAddressPayload(normalizedPayload);

    if (validateMessage) {
      return res.status(400).send({ message: validateMessage });
    }

    let existingAddress = await addressModel.findOne({
      _id: req.params?.id,
      user: req.user?._id,
      isDeleted: false,
    });

    if (!existingAddress) {
      return res.status(404).send({ message: "Dia chi khong ton tai" });
    }

    if (normalizedPayload?.isDefault) {
      await unsetDefaultAddresses(req.user?._id, existingAddress?._id);
    }

    existingAddress.label = normalizedPayload?.label;
    existingAddress.recipientName = normalizedPayload?.recipientName;
    existingAddress.phoneNumber = normalizedPayload?.phoneNumber;
    existingAddress.addressLine = normalizedPayload?.addressLine;
    existingAddress.isDefault = normalizedPayload?.isDefault;

    await existingAddress.save();

    return res.send({
      message: "Cap nhat dia chi thanh cong",
      address: existingAddress,
    });
  } catch (error) {
    return res
      .status(400)
      .send({ message: error?.message || "Cap nhat dia chi that bai" });
  }
});

router.post("/:id/default", CheckLogin, async function (req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params?.id)) {
      return res.status(400).send({ message: "Address id khong hop le" });
    }

    let selectedAddress = await addressModel.findOne({
      _id: req.params?.id,
      user: req.user?._id,
      isDeleted: false,
    });

    if (!selectedAddress) {
      return res.status(404).send({ message: "Dia chi khong ton tai" });
    }

    await unsetDefaultAddresses(req.user?._id, selectedAddress?._id);
    selectedAddress.isDefault = true;
    await selectedAddress.save();

    return res.send({
      message: "Cap nhat dia chi mac dinh thanh cong",
      address: selectedAddress,
    });
  } catch (error) {
    return res
      .status(400)
      .send({
        message: error?.message || "Cap nhat dia chi mac dinh that bai",
      });
  }
});

router.delete("/:id", CheckLogin, async function (req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params?.id)) {
      return res.status(400).send({ message: "Address id khong hop le" });
    }

    let existingAddress = await addressModel.findOne({
      _id: req.params?.id,
      user: req.user?._id,
      isDeleted: false,
    });

    if (!existingAddress) {
      return res.status(404).send({ message: "Dia chi khong ton tai" });
    }

    let wasDefault = existingAddress?.isDefault === true;

    await existingAddress.deleteOne();

    if (wasDefault) {
      let nextDefaultAddress = await addressModel
        .findOne({
          user: req.user?._id,
          isDeleted: false,
        })
        .sort({ createdAt: -1 });

      if (nextDefaultAddress) {
        nextDefaultAddress.isDefault = true;
        await nextDefaultAddress.save();
      }
    }

    return res.send({ message: "Xoa dia chi thanh cong" });
  } catch (error) {
    return res
      .status(400)
      .send({ message: error?.message || "Xoa dia chi that bai" });
  }
});

module.exports = router;
module.exports.__testables = {
  normalizePhoneNumber,
  normalizeAddressPayload,
  validateAddressPayload,
};
