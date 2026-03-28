const mongoose = require("mongoose");
let bcrypt = require('bcrypt')
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true
    },

    password: {
      type: String,
      required: [true, "Password is required"]
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true
    },

    fullName: {
      type: String,
      default: ""
    },

    avatarUrl: {
      type: String,
      default: ""
    },

    status: {
      type: Boolean,
      default: false
    },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "role",
      required: true
    },
    wishlist: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product'
      }],
      default: []
    },

    loginCount: {
      type: Number,
      default: 0,
      min: [0, "Login count cannot be negative"]
    },
    lockTime: {
      type: Date
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    forgotPasswordToken: String,
    forgotPasswordTokenExp: Date
  },
  {
    timestamps: true
  }
);
userSchema.pre('save', function () {
  if (this.isModified('password')) {
    let salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
  }
})
userSchema.pre('findOneAndUpdate', function () {
  if (this._update && typeof this._update.password === 'string' && this._update.password.length > 0) {
    let salt = bcrypt.genSaltSync(10);
    this._update.password = bcrypt.hashSync(this._update.password, salt);
  }
})

module.exports = mongoose.model("user", userSchema);