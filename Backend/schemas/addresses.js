let mongoose = require("mongoose");

let addressSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    label: {
      type: String,
      default: "Dia chi",
    },
    recipientName: {
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      required: [true, "So dien thoai khong duoc de trong"],
      match: [/^\d{10}$/, "So dien thoai phai gom dung 10 chu so, vi du: 0869727139"],
    },
    addressLine: {
      type: String,
      required: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

addressSchema.index({ user: 1, isDeleted: 1, isDefault: -1, createdAt: -1 });

addressSchema.virtual("formattedAddress").get(function () {
  return String(this?.addressLine || "").trim();
});

addressSchema.set("toJSON", { virtuals: true });
addressSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("address", addressSchema);
