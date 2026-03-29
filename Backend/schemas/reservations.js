let mongoose = require('mongoose');

let reservationItemSchema = mongoose.Schema({
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
	priceAtReserve: {
		type: Number,
		required: true,
		min: 0
	},
	subtotal: {
		type: Number,
		required: true,
		min: 0
	},
	promotion: {
		type: Number,
		default: 0,
		min: 0
	}
}, {
	_id: false
});

let reservationSchema = mongoose.Schema({
	user: {
		type: mongoose.Types.ObjectId,
		ref: 'user',
		required: true
	},
	items: {
		type: [reservationItemSchema],
		required: true,
		validate: [arr => arr.length > 0, 'Reservation must have at least one item']
	},
	amount: {
		type: Number,
		required: true,
		min: 0
	},
	promotion: {
		type: Number,
		default: 0,
		min: 0
	},
	status: {
		type: String,
		enum: ['actived', 'cancelled', 'expired', 'transfer'],
		default: 'actived'
	},
	paymentMethod: {
		type: String,
		enum: ['COD', 'VNPay'],
		default: 'COD'
	},
	shippingAddress: {
		type: String,
		default: ''
	},
	note: {
		type: String,
		default: ''
	},
	expiresAt: {
		type: Date,
		required: true
	},
	idempotencyKey: {
		type: String,
		default: ''
	},
	order: {
		type: mongoose.Types.ObjectId,
		ref: 'order'
	},
	payment: {
		type: mongoose.Types.ObjectId,
		ref: 'payment'
	},
	confirmedAt: {
		type: Date
	},
	cancelledAt: {
		type: Date
	},
	releasedAt: {
		type: Date
	},
	expiredAt: {
		type: Date
	}
}, {
	timestamps: true
});

reservationSchema.index({ status: 1, expiresAt: 1 });
reservationSchema.index({ user: 1, createdAt: -1 });
reservationSchema.index(
	{ user: 1, idempotencyKey: 1 },
	{
		unique: true,
		partialFilterExpression: {
			idempotencyKey: { $type: 'string', $ne: '' }
		}
	}
);

module.exports = mongoose.model('reservation', reservationSchema);