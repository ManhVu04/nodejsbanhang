let express = require('express');
let router = express.Router();
let { CheckLogin, CheckRole } = require('../utils/authHandler');
let returnRequestModel = require('../schemas/returnRequests');
let orderModel = require('../schemas/orders');
let paymentModel = require('../schemas/payments');

const adminGuard = [CheckLogin, CheckRole(['Admin'])];

function canCreateReturn(order) {
    return order && ['Delivered', 'Paid'].includes(order.status);
}

router.post('/', CheckLogin, async function (req, res) {
    try {
        let { orderId, reason, details, requestedAmount } = req.body;
        reason = String(reason || '').trim();

        if (!orderId) {
            return res.status(400).send({ message: 'orderId khong duoc de trong' });
        }

        if (!reason) {
            return res.status(400).send({ message: 'Ly do doi tra khong duoc de trong' });
        }

        let order = await orderModel.findOne({ _id: orderId, user: req.user._id });
        if (!order) {
            return res.status(404).send({ message: 'Don hang khong ton tai' });
        }

        if (!canCreateReturn(order)) {
            return res.status(400).send({ message: 'Chi duoc yeu cau doi tra voi don da thanh toan hoac da giao' });
        }

        let existing = await returnRequestModel.findOne({ order: order._id });
        if (existing && ['Requested', 'Approved', 'Refunded'].includes(existing.status)) {
            return res.status(400).send({ message: 'Don hang nay da co yeu cau doi tra' });
        }

        let amount = Number(requestedAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            amount = order.totalPrice;
        }

        if (amount > order.totalPrice) {
            amount = order.totalPrice;
        }

        let request;
        if (existing) {
            existing.reason = reason;
            existing.details = String(details || '').trim();
            existing.requestedAmount = amount;
            existing.approvedAmount = 0;
            existing.status = 'Requested';
            existing.adminNote = '';
            existing.reviewedBy = null;
            existing.reviewedAt = null;
            existing.refundTransactionId = '';
            request = await existing.save();
        } else {
            request = await returnRequestModel.create({
                order: order._id,
                user: req.user._id,
                reason,
                details: String(details || '').trim(),
                requestedAmount: amount
            });
        }

        order.afterSaleStatus = 'Requested';
        await order.save();

        let populated = await returnRequestModel.findById(request._id)
            .populate('order', 'status totalPrice createdAt')
            .populate('user', 'username email');

        return res.send({ message: 'Da tao yeu cau doi tra', request: populated });
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
});

router.get('/my', CheckLogin, async function (req, res) {
    try {
        let { status, orderId, page = 1, limit = 10 } = req.query;
        let filter = { user: req.user._id };
        if (status) {
            filter.status = status;
        }
        if (orderId) {
            filter.order = orderId;
        }

        let requests = await returnRequestModel.find(filter)
            .populate('order', 'status totalPrice createdAt afterSaleStatus')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        let total = await returnRequestModel.countDocuments(filter);
        return res.send({
            requests,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
});

router.get('/admin/all', adminGuard, async function (req, res) {
    try {
        let { status, page = 1, limit = 20 } = req.query;
        let filter = {};
        if (status) {
            filter.status = status;
        }

        let requests = await returnRequestModel.find(filter)
            .populate('order', 'status totalPrice createdAt afterSaleStatus')
            .populate('user', 'username email')
            .populate('reviewedBy', 'username')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        let total = await returnRequestModel.countDocuments(filter);
        return res.send({
            requests,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
});

router.put('/:id/review', adminGuard, async function (req, res) {
    try {
        let { status, adminNote, approvedAmount, refundTransactionId } = req.body;
        let validStatuses = ['Approved', 'Rejected', 'Refunded'];

        if (!validStatuses.includes(status)) {
            return res.status(400).send({ message: 'Trang thai khong hop le' });
        }

        let request = await returnRequestModel.findById(req.params.id).populate('order');
        if (!request) {
            return res.status(404).send({ message: 'Yeu cau doi tra khong ton tai' });
        }

        if (request.status === 'Refunded' || request.status === 'Cancelled') {
            return res.status(400).send({ message: 'Yeu cau nay da ket thuc' });
        }

        if (request.status === 'Requested' && !['Approved', 'Rejected'].includes(status)) {
            return res.status(400).send({ message: 'Chi duoc duyet hoac tu choi yeu cau moi' });
        }

        if (request.status === 'Approved' && status !== 'Refunded') {
            return res.status(400).send({ message: 'Yeu cau da duyet chi co the chuyen sang Refund' });
        }

        request.status = status;
        request.adminNote = String(adminNote || '').trim();
        request.reviewedBy = req.user._id;
        request.reviewedAt = new Date();

        if (status === 'Approved') {
            let amount = Number(approvedAmount);
            if (!Number.isFinite(amount) || amount <= 0) {
                amount = request.requestedAmount;
            }
            request.approvedAmount = Math.min(amount, request.order.totalPrice);
            request.order.afterSaleStatus = 'Approved';
            await request.order.save();
        }

        if (status === 'Rejected') {
            request.approvedAmount = 0;
            request.order.afterSaleStatus = 'Rejected';
            await request.order.save();
        }

        if (status === 'Refunded') {
            let refundAmount = request.approvedAmount > 0 ? request.approvedAmount : request.requestedAmount;
            request.approvedAmount = Math.min(refundAmount, request.order.totalPrice);
            request.refundTransactionId = String(refundTransactionId || '').trim();

            let payment = await paymentModel.findOne({ order: request.order._id });
            if (payment) {
                payment.status = 'refunded';
                payment.providerResponse = {
                    ...payment.providerResponse,
                    refundAmount: request.approvedAmount,
                    refundAt: new Date().toISOString(),
                    refundTransactionId: request.refundTransactionId
                };
                await payment.save();
            }

            request.order.afterSaleStatus = 'Refunded';
            await request.order.save();
        }

        await request.save();

        let populated = await returnRequestModel.findById(request._id)
            .populate('order', 'status totalPrice createdAt afterSaleStatus')
            .populate('user', 'username email')
            .populate('reviewedBy', 'username');

        return res.send({ message: 'Cap nhat yeu cau doi tra thanh cong', request: populated });
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
});

module.exports = router;
