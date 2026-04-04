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
        'CATEGORY_DELETE',
        'PRODUCT_MEDIA_UPLOAD',
        'PRODUCT_MEDIA_UPDATE',
        'PRODUCT_MEDIA_DELETE',
        'PRODUCT_MEDIA_REORDER',
        'USER_CREATE',
        'RETURN_REVIEW'
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
        enum: ['product', 'inventory', 'order', 'voucher', 'user', 'category', 'productMedia', 'returnRequest'],
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
    timestamps: true
  }
);

auditLogSchema.index({ 'resource.type': 1, createdAt: -1 });
auditLogSchema.index({ 'resource.id': 1, createdAt: -1 });
auditLogSchema.index({ admin: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('auditLog', auditLogSchema);
