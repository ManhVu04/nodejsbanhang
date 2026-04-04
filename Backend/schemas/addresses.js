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
      default: "",
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
