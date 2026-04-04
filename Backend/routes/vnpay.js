var express = require("express");
var router = express.Router();
let { CheckLogin } = require('../utils/authHandler');
let orderModel = require('../schemas/orders');
let paymentModel = require('../schemas/payments');
let crypto = require('crypto');
let querystring = require('querystring');
let { vnpayConfig } = require('../utils/appConfig');
let {
    cancelPendingVnpayOrderByPaymentId
} = require('../utils/pendingVnpayOrderExpiryJob');

function validateVNPayConfig() {
    if (!vnpayConfig.tmnCode || !vnpayConfig.hashSecret) {
        return false;
    }
    return true;
}

function sortObject(obj) {
    let sorted = {};
    let keys = Object.keys(obj).sort();
    for (let key of keys) {
        sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
    }
    return sorted;
}

// POST /create-payment-url — Generate VNPay payment URL
router.post('/create-payment-url', CheckLogin, async function (req, res) {
    try {
        if (!validateVNPayConfig()) {
            return res.status(500).send({ message: 'VNPay is not configured' });
        }

        let { orderId } = req.body;

        let order = await orderModel.findOne({
            _id: orderId,
            user: req.user._id,
            paymentMethod: 'VNPay',
            status: 'Pending'
        });

        if (!order) {
            return res.status(404).send({ message: 'Đơn hàng không tồn tại hoặc không hợp lệ' });
        }

        let payment = await paymentModel.findOne({ order: order._id });
        if (!payment) {
            return res.status(404).send({ message: 'Không tìm thấy thông tin thanh toán' });
        }

        let date = new Date();
        let createDate = date.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
        let orderId_vnp = date.getTime().toString();

        let ipAddr = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress || '127.0.0.1';

        let vnpParams = {
            'vnp_Version': '2.1.0',
            'vnp_Command': 'pay',
            'vnp_TmnCode': vnpayConfig.tmnCode,
            'vnp_Locale': 'vn',
            'vnp_CurrCode': 'VND',
            'vnp_TxnRef': orderId_vnp,
            'vnp_OrderInfo': 'Thanh toan don hang ' + order._id,
            'vnp_OrderType': 'other',
            'vnp_Amount': order.totalPrice * 100,
            'vnp_ReturnUrl': vnpayConfig.returnUrl,
            'vnp_IpAddr': ipAddr,
            'vnp_CreateDate': createDate
        };

        let sorted = sortObject(vnpParams);
        let signData = querystring.stringify(sorted, '&', '=', { encodeURIComponent: str => str });
        let hmac = crypto.createHmac("sha512", vnpayConfig.hashSecret);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        sorted['vnp_SecureHash'] = signed;

        let paymentUrl = vnpayConfig.url + '?' + querystring.stringify(sorted, '&', '=', { encodeURIComponent: str => str });

        // Save vnpay txn ref to payment
        payment.transactionId = orderId_vnp;
        await payment.save();

        res.send({ paymentUrl });
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// GET /vnpay-return — Handle VNPay redirect
router.get('/vnpay-return', async function (req, res) {
    try {
        if (!validateVNPayConfig()) {
            return res.status(500).send({ message: 'VNPay is not configured' });
        }

        let vnpParams = { ...req.query };
        let secureHash = vnpParams['vnp_SecureHash'];

        delete vnpParams['vnp_SecureHash'];
        delete vnpParams['vnp_SecureHashType'];

        let sorted = sortObject(vnpParams);
        let signData = querystring.stringify(sorted, '&', '=', { encodeURIComponent: str => str });
        let hmac = crypto.createHmac("sha512", vnpayConfig.hashSecret);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        let responseCode = vnpParams['vnp_ResponseCode'];
        let txnRef = vnpParams['vnp_TxnRef'];

        if (secureHash === signed && responseCode === '00') {
            // Payment success
            let payment = await paymentModel.findOne({ transactionId: txnRef });
            if (payment) {
                let order = await orderModel.findById(payment.order);
                let canMarkPaid =
                    payment.status === 'pending' &&
                    order &&
                    order.status === 'Pending';

                if (canMarkPaid) {
                    payment.status = 'paid';
                    payment.paidAt = payment.paidAt || new Date();
                }

                payment.providerResponse = {
                    ...(payment.providerResponse || {}),
                    ...vnpParams
                };
                await payment.save();

                if (canMarkPaid) {
                    order.status = 'Paid';
                    await order.save();
                    return res.send({ code: '00', message: 'Thanh toán thành công' });
                }

                return res.send({
                    code: '24',
                    message: 'Don hang da het han hoac da duoc xu ly truoc do'
                });
            }

            return res.send({ code: '01', message: 'Khong tim thay giao dich thanh toan' });
        } else {
            if (secureHash === signed) {
                let payment = await paymentModel.findOne({ transactionId: txnRef }).select('_id');
                if (payment?._id) {
                    await cancelPendingVnpayOrderByPaymentId(payment?._id, {
                        cancelReason: `VNPay tra ve ma loi ${String(responseCode || 'unknown')}`,
                        providerResponse: vnpParams,
                        markPaymentFailed: true
                    });
                }
            }

            return res.send({ code: responseCode, message: 'Thanh toán thất bại' });
        }
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// GET /vnpay-ipn — VNPay IPN webhook (server-to-server)
router.get('/vnpay-ipn', async function (req, res) {
    try {
        if (!validateVNPayConfig()) {
            return res.status(200).json({ RspCode: '99', Message: 'VNPay not configured' });
        }

        let vnpParams = { ...req.query };
        let secureHash = vnpParams['vnp_SecureHash'];

        delete vnpParams['vnp_SecureHash'];
        delete vnpParams['vnp_SecureHashType'];

        let sorted = sortObject(vnpParams);
        let signData = querystring.stringify(sorted, '&', '=', { encodeURIComponent: str => str });
        let hmac = crypto.createHmac("sha512", vnpayConfig.hashSecret);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        if (secureHash === signed) {
            let responseCode = vnpParams['vnp_ResponseCode'];
            let txnRef = vnpParams['vnp_TxnRef'];

            let payment = await paymentModel.findOne({ transactionId: txnRef });
            if (!payment) {
                return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
            }

            if (payment.status === 'paid' || payment.status === 'refunded') {
                return res.status(200).json({ RspCode: '02', Message: 'Already processed' });
            }

            if (responseCode === '00') {
                let order = await orderModel.findById(payment.order);

                if (payment.status === 'pending' && order && order.status === 'Pending') {
                    payment.status = 'paid';
                    payment.paidAt = payment.paidAt || new Date();
                    payment.providerResponse = {
                        ...(payment.providerResponse || {}),
                        ...vnpParams
                    };
                    await payment.save();

                    order.status = 'Paid';
                    await order.save();
                    return res.status(200).json({ RspCode: '00', Message: 'Success' });
                }

                payment.providerResponse = {
                    ...(payment.providerResponse || {}),
                    ...vnpParams,
                    lateSuccessIgnored: true
                };
                await payment.save();
                return res.status(200).json({ RspCode: '02', Message: 'Already processed' });
            } else {
                await cancelPendingVnpayOrderByPaymentId(payment?._id, {
                    cancelReason: `VNPay IPN tra ve ma loi ${String(responseCode || 'unknown')}`,
                    providerResponse: vnpParams,
                    markPaymentFailed: true
                });
                return res.status(200).json({ RspCode: '00', Message: 'Confirmed' });
            }
        } else {
            return res.status(200).json({ RspCode: '97', Message: 'Invalid Checksum' });
        }
    } catch (err) {
        return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
    }
});

module.exports = router;
