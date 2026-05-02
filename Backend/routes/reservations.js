let express = require('express');
let mongoose = require('mongoose');
let router = express.Router();

let { CheckLogin } = require('../utils/authHandler');
let { releaseReservedStock } = require('../utils/inventoryHelper');
let reservationModel = require('../schemas/reservations');
let productModel = require('../schemas/products');
let inventoryModel = require('../schemas/inventories');
let inventoryLogModel = require('../schemas/inventoryLogs');
let orderModel = require('../schemas/orders');
let paymentModel = require('../schemas/payments');

const RESERVATION_TTL_MINUTES = 15;
const ALLOWED_PAYMENT_METHODS = ['COD', 'VNPay'];

function normalizeReserveItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Danh sach san pham dat tru khong hop le');
    }

    let mergedItems = new Map();
    for (let item of items) {
        let productId = String(item?.productId || item?.product || '').trim();
        let quantity = Number(item?.quantity);

        if (!mongoose.isValidObjectId(productId)) {
            throw new Error('productId khong hop le');
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error('So luong dat tru phai la so nguyen duong');
        }

        let current = mergedItems.get(productId) || 0;
        mergedItems.set(productId, current + quantity);
    }

    return Array.from(mergedItems.entries()).map(([productId, quantity]) => ({ productId, quantity }));
}

router.post('/reserve', CheckLogin, async function (req, res) {
    let session = await mongoose.startSession();
    session.startTransaction();
    try {
        let user = req.user;
        let reserveItems = normalizeReserveItems(req.body?.items);
        let paymentMethod = String(req.body?.paymentMethod || 'COD').trim();
        let shippingAddress = String(req.body?.shippingAddress || '').trim();
        let note = String(req.body?.note || '').trim();
        let idempotencyKey = String(req.body?.idempotencyKey || '').trim();

        if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
            throw new Error('Phuong thuc thanh toan khong hop le');
        }

        if (idempotencyKey) {
            let existingReservation = await reservationModel.findOne({
                user: user._id,
                idempotencyKey,
                status: 'actived',
                expiresAt: { $gt: new Date() }
            }).session(session);

            if (existingReservation) {
                await session.commitTransaction();
                await session.endSession();

                let populatedExisting = await reservationModel.findById(existingReservation._id)
                    .populate('items.product', 'title images sku price');

                return res.send({
                    message: 'Reservation da ton tai',
                    reservation: populatedExisting,
                    idempotent: true
                });
            }
        }

        let productIds = reserveItems.map(r => r.productId);
        let products = await productModel.find({
            _id: { $in: productIds },
            isDeleted: false
        }).select('_id title price').session(session);

        let productMap = new Map(products.map(p => [String(p._id), p]));

        let reservationItems = [];
        let amount = 0;

        for (let reserveItem of reserveItems) {
            let product = productMap.get(reserveItem.productId);
            if (!product) {
                throw new Error('San pham dat tru khong ton tai');
            }

            let inventoryUpdate = await inventoryModel.findOneAndUpdate(
                {
                    product: product._id,
                    $expr: {
                        $gte: [
                            { $subtract: ['$stock', '$reserved'] },
                            reserveItem.quantity
                        ]
                    }
                },
                {
                    $inc: { reserved: reserveItem.quantity }
                },
                {
                    new: true,
                    session
                }
            );

            if (!inventoryUpdate) {
                throw new Error(`San pham "${product.title}" khong du ton kha dung`);
            }

            let subtotal = Number(product.price || 0) * reserveItem.quantity;
            reservationItems.push({
                product: product._id,
                quantity: reserveItem.quantity,
                priceAtReserve: Number(product.price || 0),
                subtotal,
                promotion: 0
            });
            amount += subtotal;
        }

        let now = new Date();
        let expiresAt = new Date(now.getTime() + RESERVATION_TTL_MINUTES * 60 * 1000);

        let reservation = new reservationModel({
            user: user._id,
            items: reservationItems,
            amount,
            promotion: 0,
            status: 'actived',
            paymentMethod,
            shippingAddress,
            note,
            expiresAt,
            idempotencyKey
        });
        await reservation.save({ session });

        await session.commitTransaction();
        await session.endSession();

        let populatedReservation = await reservationModel.findById(reservation._id)
            .populate('items.product', 'title images sku price');

        return res.send({
            message: 'Dat tru thanh cong',
            reservation: populatedReservation
        });
    } catch (error) {
        await session.abortTransaction();
        await session.endSession();
        return res.status(400).send({ message: error?.message || 'Dat tru that bai' });
    }
});

router.post('/:id/confirm', CheckLogin, async function (req, res) {
    let session = await mongoose.startSession();
    session.startTransaction();
    try {
        let reservationId = req.params?.id;
        if (!mongoose.isValidObjectId(reservationId)) {
            throw new Error('Reservation id khong hop le');
        }

        let reservation = await reservationModel.findOne({
            _id: reservationId,
            user: req.user._id
        }).session(session);

        if (!reservation) {
            return res.status(404).send({ message: 'Reservation khong ton tai' });
        }

        if (reservation.status === 'transfer') {
            await session.commitTransaction();
            await session.endSession();
            let transferred = await reservationModel.findById(reservation._id)
                .populate('order')
                .populate('payment');
            return res.send({ message: 'Reservation da duoc xac nhan truoc do', reservation: transferred });
        }

        if (reservation.status === 'cancelled') {
            throw new Error('Reservation da bi huy');
        }

        let now = new Date();
        if (reservation.status === 'actived' && reservation.expiresAt <= now) {
            await releaseReservedStock(reservation.items, session);
            reservation.status = 'expired';
            reservation.expiredAt = now;
            reservation.releasedAt = now;
            await reservation.save({ session });
        }

        if (reservation.status === 'expired') {
            await session.commitTransaction();
            await session.endSession();
            return res.status(400).send({ message: 'Reservation da het han' });
        }

        let paymentMethod = String(req.body?.paymentMethod || reservation.paymentMethod || 'COD').trim();
        if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
            throw new Error('Phuong thuc thanh toan khong hop le');
        }

        let shippingAddress = String(req.body?.shippingAddress || reservation.shippingAddress || '').trim();
        let note = String(req.body?.note || reservation.note || '').trim();

        let orderItems = [];
        let subTotalPrice = 0;

        for (let item of reservation.items) {
            let inventoryUpdate = await inventoryModel.findOneAndUpdate(
                {
                    product: item.product,
                    reserved: { $gte: item.quantity },
                    stock: { $gte: item.quantity }
                },
                {
                    $inc: {
                        reserved: -item.quantity,
                        stock: -item.quantity,
                        soldCount: item.quantity
                    }
                },
                {
                    new: true,
                    session
                }
            );

            if (!inventoryUpdate) {
                throw new Error('Khong du ton kho de xac nhan reservation');
            }

            orderItems.push({
                product: item.product,
                quantity: item.quantity,
                priceAtPurchase: item.priceAtReserve,
                subtotal: item.subtotal
            });
            subTotalPrice += Number(item.subtotal || 0);

            await new inventoryLogModel({
                product: item.product,
                type: 'OUT',
                quantity: item.quantity,
                reason: `Xac nhan reservation #${reservation._id}`,
                performedBy: req.user._id
            }).save({ session });
        }

        let newOrder = new orderModel({
            user: req.user._id,
            items: orderItems,
            totalPrice: subTotalPrice,
            subTotalPrice: subTotalPrice,
            discountAmount: 0,
            voucher: { code: '' },
            status: 'Pending',
            paymentMethod,
            shippingAddress,
            note
        });
        await newOrder.save({ session });

        let newPayment = new paymentModel({
            order: newOrder._id,
            user: req.user._id,
            method: paymentMethod,
            amount: subTotalPrice,
            status: 'pending',
            idempotencyKey: `confirm:${reservation._id}`
        });
        await newPayment.save({ session });

        reservation.status = 'transfer';
        reservation.paymentMethod = paymentMethod;
        reservation.shippingAddress = shippingAddress;
        reservation.note = note;
        reservation.order = newOrder._id;
        reservation.payment = newPayment._id;
        reservation.confirmedAt = now;
        await reservation.save({ session });

        await session.commitTransaction();
        await session.endSession();

        let [order, payment] = await Promise.all([
            orderModel.findById(newOrder._id)
                .populate('items.product', 'title images price slug')
                .populate('user', 'username email fullName'),
            paymentModel.findById(newPayment._id)
        ]);

        return res.send({
            message: 'Xac nhan reservation thanh cong',
            reservationId: reservation._id,
            order,
            payment
        });
    } catch (error) {
        await session.abortTransaction();
        await session.endSession();
        return res.status(400).send({ message: error?.message || 'Xac nhan reservation that bai' });
    }
});

router.post('/:id/release', CheckLogin, async function (req, res) {
    let session = await mongoose.startSession();
    session.startTransaction();
    try {
        let reservationId = req.params?.id;
        if (!mongoose.isValidObjectId(reservationId)) {
            throw new Error('Reservation id khong hop le');
        }

        let reservation = await reservationModel.findOne({
            _id: reservationId,
            user: req.user._id
        }).session(session);

        if (!reservation) {
            return res.status(404).send({ message: 'Reservation khong ton tai' });
        }

        if (reservation.status === 'transfer') {
            throw new Error('Reservation da duoc xac nhan, khong the release');
        }

        if (reservation.status === 'cancelled' || reservation.status === 'expired') {
            await session.commitTransaction();
            await session.endSession();
            return res.send({ message: 'Reservation da duoc giai phong truoc do', reservation });
        }

        await releaseReservedStock(reservation.items, session);

        let now = new Date();
        reservation.status = 'cancelled';
        reservation.cancelledAt = now;
        reservation.releasedAt = now;
        await reservation.save({ session });

        await session.commitTransaction();
        await session.endSession();

        return res.send({
            message: 'Giai phong reservation thanh cong',
            reservation
        });
    } catch (error) {
        await session.abortTransaction();
        await session.endSession();
        return res.status(400).send({ message: error?.message || 'Giai phong reservation that bai' });
    }
});

module.exports = router;
