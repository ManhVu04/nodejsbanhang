let mongoose = require('mongoose');

let paymentSchema = mongoose.Schema({
    order: {
        type: mongoose.Types.ObjectId,
        ref: 'order',
        required: true
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    method: {
        type: String,
        enum: ['COD', 'VNPay'],
        required: true
    },
    transactionId: {
        type: String,
        default: ''
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    providerResponse: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    paidAt: {
        type: Date
    },
    idempotencyKey: {
        type: String,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('payment', paymentSchema);