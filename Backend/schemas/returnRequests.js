let mongoose = require('mongoose');

let returnRequestSchema = mongoose.Schema({
    order: {
        type: mongoose.Types.ObjectId,
        ref: 'order',
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    details: {
        type: String,
        default: ''
    },
    requestedAmount: {
        type: Number,
        required: true,
        min: 0
    },
    approvedAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['Requested', 'Approved', 'Rejected', 'Refunded', 'Cancelled'],
        default: 'Requested'
    },
    adminNote: {
        type: String,
        default: ''
    },
    reviewedBy: {
        type: mongoose.Types.ObjectId,
        ref: 'user'
    },
    reviewedAt: {
        type: Date
    },
    refundTransactionId: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('returnRequest', returnRequestSchema);
