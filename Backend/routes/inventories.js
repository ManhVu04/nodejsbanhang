var express = require("express");
var router = express.Router();
let { CheckLogin, CheckRole } = require('../utils/authHandler');
let inventoryModel = require('../schemas/inventories');
let inventoryLogModel = require('../schemas/inventoryLogs');
let productModel = require('../schemas/products');

// GET / — List all inventory (admin)
router.get('/', CheckLogin, CheckRole(['Admin']), async function (req, res) {
    try {
        let { page = 1, limit = 20, search } = req.query;
        let normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
        let normalizedLimit = Math.max(1, Number.parseInt(limit, 10) || 20);
        let normalizedSearch = String(search || '').trim();

        let productMatch = { isDeleted: false };
        if (normalizedSearch) {
            let escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            productMatch.title = new RegExp(escapedSearch, 'i');
        }

        let matchedProducts = await productModel.find(productMatch).select('_id');
        let productIds = matchedProducts.map((item) => item._id);

        if (productIds.length === 0) {
            return res.send({
                inventories: [],
                total: 0,
                page: normalizedPage,
                totalPages: 0,
                limit: normalizedLimit
            });
        }

        let inventoryFilter = { product: { $in: productIds } };
        let total = await inventoryModel.countDocuments(inventoryFilter);

        let inventories = await inventoryModel.find(inventoryFilter)
            .populate({
                path: 'product',
                select: 'title sku price images'
            })
            .sort({ _id: -1 })
            .skip((normalizedPage - 1) * normalizedLimit)
            .limit(normalizedLimit);

        res.send({
            inventories,
            total,
            page: normalizedPage,
            totalPages: Math.ceil(total / normalizedLimit),
            limit: normalizedLimit
        });
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// POST /:productId/stock — Add stock (admin)
router.post('/:productId/stock', CheckLogin, CheckRole(['Admin']), async function (req, res) {
    try {
        let { quantity, reason } = req.body;
        quantity = parseInt(quantity);
        if (!quantity || quantity < 1) {
            return res.status(400).send({ message: 'Số lượng không hợp lệ' });
        }

        let product = await productModel.findOne({
            _id: req.params.productId,
            isDeleted: false
        });
        if (!product) {
            return res.status(404).send({ message: 'Sản phẩm không tồn tại' });
        }

        let inventory = await inventoryModel.findOneAndUpdate(
            { product: product._id },
            { $inc: { stock: quantity } },
            { new: true, upsert: true }
        ).populate('product', 'title sku');

        // Log the stock addition
        await new inventoryLogModel({
            product: product._id,
            type: 'IN',
            quantity: quantity,
            reason: reason || 'Nhập kho',
            performedBy: req.user._id
        }).save();

        res.send({
            message: `Đã nhập ${quantity} sản phẩm vào kho`,
            inventory
        });
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// GET /logs — View inventory logs (admin)
router.get('/logs', CheckLogin, CheckRole(['Admin']), async function (req, res) {
    try {
        let { page = 1, limit = 20, type, productId } = req.query;
        let filter = {};
        if (type) filter.type = type;
        if (productId) filter.product = productId;

        let logs = await inventoryLogModel.find(filter)
            .populate('product', 'title sku')
            .populate('performedBy', 'username')
            .populate('order')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        let total = await inventoryLogModel.countDocuments(filter);

        res.send({
            logs,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

module.exports = router;
