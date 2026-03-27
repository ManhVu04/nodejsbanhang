let mongoose = require('mongoose');

let inventoryLogSchema = mongoose.Schema({
    product: {
        type: mongoose.Types.ObjectId,
        ref: 'product',
        required: true
    },
    type: {
        type: String,
        enum: ['IN', 'OUT', 'RESERVED', 'RELEASED'],
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    reason: {
        type: String,
        default: ''
    },
    order: {
        type: mongoose.Types.ObjectId,
        ref: 'order'
    },
    performedBy: {
        type: mongoose.Types.ObjectId,
        ref: 'user'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('inventoryLog', inventoryLogSchema);
