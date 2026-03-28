let mongoose = require('mongoose');

let orderItemSchema = mongoose.Schema({
    product: {
        type: mongoose.Types.ObjectId,
        ref: 'product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    priceAtPurchase: {
        type: Number,
        required: true,
        min: 0
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    }
}, {
    _id: false
});

let orderSchema = mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: {
        type: [orderItemSchema],
        required: true,
        validate: [arr => arr.length > 0, 'Order must have at least one item']
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    subTotalPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    discountAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    voucher: {
        voucherId: {
            type: mongoose.Types.ObjectId,
            ref: 'voucher'
        },
        code: {
            type: String,
            default: ''
        }
    },
    status: {
        type: String,
        enum: ['Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'VNPay'],
        required: true
    },
    shippingAddress: {
        type: String,
        default: ''
    },
    note: {
        type: String,
        default: ''
    },
    afterSaleStatus: {
        type: String,
        enum: ['None', 'Requested', 'Approved', 'Rejected', 'Refunded'],
        default: 'None'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('order', orderSchema);
