const mongoose = require('mongoose');

const auditLogSchema = mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'PRODUCT_CREATE',
        'PRODUCT_UPDATE_PRICE',
        'PRODUCT_UPDATE_INFO',
        'PRODUCT_DELETE',
        'INVENTORY_UPDATE_STOCK',
        'INVENTORY_UPDATE_RESERVED',
        'ORDER_UPDATE_STATUS',
        'ORDER_UPDATE_INFO',
        'VOUCHER_CREATE',
        'VOUCHER_UPDATE',
        'VOUCHER_DELETE',
        'USER_UPDATE',
        'USER_DELETE',
        'CATEGORY_CREATE',
        'CATEGORY_UPDATE',
        'CATEGORY_DELETE'
      ],
      required: true
    },
    admin: {
      type: mongoose.Types.ObjectId,
      ref: 'user',
      required: true
    },
    resource: {
      type: {
        type: String,
        enum: ['product', 'inventory', 'order', 'voucher', 'user', 'category'],
        required: true
      },
      id: {
        type: mongoose.Types.ObjectId,
        required: true
      }
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed
    },
    description: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success'
    },
    errorMessage: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    indexes: [
      { resource_type: 1, createdAt: -1 },
      { admin: 1, createdAt: -1 },
      { action: 1, createdAt: -1 }
    ]
  }
);

module.exports = mongoose.model('auditLog', auditLogSchema);
