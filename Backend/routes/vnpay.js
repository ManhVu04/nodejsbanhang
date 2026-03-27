var express = require("express");
var router = express.Router();
let { CheckLogin } = require('../utils/authHandler');
let orderModel = require('../schemas/orders');
let paymentModel = require('../schemas/payments');
let crypto = require('crypto');
let querystring = require('querystring');

// VNPay Sandbox config — replace with your real credentials
const VNP_TMN_CODE = 'CGXZLS0Z';
const VNP_HASH_SECRET = 'YOUR_VNP_HASH_SECRET_HERE';
const VNP_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_RETURN_URL = 'http://localhost:5173/vnpay-return';

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
            'vnp_TmnCode': VNP_TMN_CODE,
            'vnp_Locale': 'vn',
            'vnp_CurrCode': 'VND',
            'vnp_TxnRef': orderId_vnp,
            'vnp_OrderInfo': 'Thanh toan don hang ' + order._id,
            'vnp_OrderType': 'other',
            'vnp_Amount': order.totalPrice * 100,
            'vnp_ReturnUrl': VNP_RETURN_URL,
            'vnp_IpAddr': ipAddr,
            'vnp_CreateDate': createDate
        };

        let sorted = sortObject(vnpParams);
        let signData = querystring.stringify(sorted, '&', '=', { encodeURIComponent: str => str });
        let hmac = crypto.createHmac("sha512", VNP_HASH_SECRET);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        sorted['vnp_SecureHash'] = signed;

        let paymentUrl = VNP_URL + '?' + querystring.stringify(sorted, '&', '=', { encodeURIComponent: str => str });

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
        let vnpParams = req.query;
        let secureHash = vnpParams['vnp_SecureHash'];

        delete vnpParams['vnp_SecureHash'];
        delete vnpParams['vnp_SecureHashType'];

        let sorted = sortObject(vnpParams);
        let signData = querystring.stringify(sorted, '&', '=', { encodeURIComponent: str => str });
        let hmac = crypto.createHmac("sha512", VNP_HASH_SECRET);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        let responseCode = vnpParams['vnp_ResponseCode'];
        let txnRef = vnpParams['vnp_TxnRef'];

        if (secureHash === signed && responseCode === '00') {
            // Payment success
            let payment = await paymentModel.findOne({ transactionId: txnRef });
            if (payment) {
                payment.status = 'paid';
                payment.paidAt = new Date();
                payment.providerResponse = vnpParams;
                await payment.save();

                await orderModel.findByIdAndUpdate(payment.order, { status: 'Paid' });
            }
            res.send({ code: '00', message: 'Thanh toán thành công' });
        } else {
            res.send({ code: responseCode, message: 'Thanh toán thất bại' });
        }
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// GET /vnpay-ipn — VNPay IPN webhook (server-to-server)
router.get('/vnpay-ipn', async function (req, res) {
    try {
        let vnpParams = req.query;
        let secureHash = vnpParams['vnp_SecureHash'];

        delete vnpParams['vnp_SecureHash'];
        delete vnpParams['vnp_SecureHashType'];

        let sorted = sortObject(vnpParams);
        let signData = querystring.stringify(sorted, '&', '=', { encodeURIComponent: str => str });
        let hmac = crypto.createHmac("sha512", VNP_HASH_SECRET);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        if (secureHash === signed) {
            let responseCode = vnpParams['vnp_ResponseCode'];
            let txnRef = vnpParams['vnp_TxnRef'];

            let payment = await paymentModel.findOne({ transactionId: txnRef });
            if (!payment) {
                return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
            }

            if (payment.status === 'paid') {
                return res.status(200).json({ RspCode: '02', Message: 'Already processed' });
            }

            if (responseCode === '00') {
                payment.status = 'paid';
                payment.paidAt = new Date();
                payment.providerResponse = vnpParams;
                await payment.save();
                await orderModel.findByIdAndUpdate(payment.order, { status: 'Paid' });
                return res.status(200).json({ RspCode: '00', Message: 'Success' });
            } else {
                payment.status = 'failed';
                payment.providerResponse = vnpParams;
                await payment.save();
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
