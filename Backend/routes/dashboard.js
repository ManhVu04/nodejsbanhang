var express = require("express");
var router = express.Router();
let { CheckLogin, CheckRole } = require('../utils/authHandler');
let orderModel = require('../schemas/orders');
let productModel = require('../schemas/products');
let userModel = require('../schemas/users');
let inventoryModel = require('../schemas/inventories');
let roleModel = require('../schemas/roles');

// GET /summary — Summary stats
router.get('/summary', CheckLogin, CheckRole(['Admin']), async function (req, res) {
    try {
        let totalRevenue = await orderModel.aggregate([
            { $match: { status: { $in: ['Paid', 'Shipped', 'Delivered'] } } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);

        let totalOrders = await orderModel.countDocuments();
        let userRole = await roleModel.findOne({ name: { $regex: /^user$/i }, isDeleted: false }).select('_id');
        let totalCustomers = await userModel.countDocuments({ isDeleted: false, ...(userRole?._id ? { role: userRole._id } : {}) });
        let totalProducts = await productModel.countDocuments({ isDeleted: false });

        let pendingOrders = await orderModel.countDocuments({ status: 'Pending' });
        let paidOrders = await orderModel.countDocuments({ status: { $in: ['Paid', 'Shipped', 'Delivered'] } });

        res.send({
            totalRevenue: totalRevenue[0]?.total || 0,
            totalOrders,
            totalCustomers,
            totalProducts,
            pendingOrders,
            paidOrders
        });
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// GET /revenue — Revenue aggregation by day or month
router.get('/revenue', CheckLogin, CheckRole(['Admin']), async function (req, res) {
    try {
        let { period = 'day', startDate, endDate } = req.query;

        let matchStage = {
            status: { $in: ['Paid', 'Shipped', 'Delivered'] }
        };

        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        let groupFormat;
        if (period === 'month') {
            groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        } else {
            groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        }

        let revenue = await orderModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: groupFormat,
                    revenue: { $sum: '$totalPrice' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.send(revenue);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// GET /low-stock — Low available-stock products
router.get('/low-stock', CheckLogin, CheckRole(['Admin']), async function (req, res) {
    try {
        let threshold = Math.max(0, Number.parseInt(req.query.threshold, 10) || 10);
        let limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
        let inventories = await inventoryModel.find({
            $expr: {
                $lte: [
                    { $subtract: ['$stock', '$reserved'] },
                    threshold
                ]
            }
        })
            .populate('product', 'title price images sku isDeleted')
            .limit(limit * 3);

        inventories = inventories
            .filter(inv => inv.product && !inv.product.isDeleted)
            .map(inv => ({
                ...inv.toObject(),
                availableStock: Math.max(0, Number(inv.stock || 0) - Number(inv.reserved || 0))
            }))
            .sort((a, b) => a.availableStock - b.availableStock)
            .slice(0, limit);

        res.send(inventories);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// GET /top-products — Top selling products
router.get('/top-products', CheckLogin, CheckRole(['Admin']), async function (req, res) {
    try {
        let limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

        // Pull a wider window then filter out deleted/missing products to ensure
        // we still return up to `limit` after the post-filter.
        let topProducts = await inventoryModel.find()
            .populate('product', 'title price images sku isDeleted')
            .sort({ soldCount: -1 })
            .limit(limit * 3);

        topProducts = topProducts
            .filter(inv => inv.product && !inv.product.isDeleted)
            .slice(0, limit);

        res.send(topProducts);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// GET /order-stats — Order counts by status
router.get('/order-stats', CheckLogin, CheckRole(['Admin']), async function (req, res) {
    try {
        let stats = await orderModel.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        let formatted = {};
        stats.forEach(s => {
            formatted[s._id] = s.count;
        });

        res.send(formatted);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// GET /recent-orders — Recent orders for dashboard
router.get('/recent-orders', CheckLogin, CheckRole(['Admin']), async function (req, res) {
    try {
        let orders = await orderModel.find()
            .populate('user', 'username email')
            .sort({ createdAt: -1 })
            .limit(10);

        res.send(orders);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

module.exports = router;
