var express = require("express");
var router = express.Router();
let mongoose = require('mongoose')
let { CheckLogin } = require('../utils/authHandler')
let cartSchema = require('../schemas/carts')
let inventorySchema = require('../schemas/inventories')
let productSchema = require('../schemas/products')

function handleCartRouteError(err, res) {
    if (err?.codeName === 'NotWritablePrimary' || err?.code === 10107) {
        return res.status(503).send({
            message: 'He thong dang dong bo du lieu MongoDB, vui long thu lai sau it giay'
        });
    }

    return res.status(400).send({
        message: err?.message || 'Co loi xay ra khi xu ly gio hang'
    });
}

function normalizeProductId(productValue) {
    return String(productValue || '').trim();
}

function getAvailableStock(inventoryItem) {
    return Math.max(
        0,
        Number(inventoryItem?.stock || 0) - Number(inventoryItem?.reserved || 0)
    );
}

function findCartItemIndex(cart, productId) {
    return cart?.products?.findIndex((item) => String(item?.product || '') === String(productId));
}

function resolveUnavailableReason(productItem, availableStock) {
    if (!productItem) {
        return 'PRODUCT_REMOVED';
    }

    if (productItem?.isDeleted === true) {
        return 'PRODUCT_INACTIVE';
    }

    if (availableStock < 1) {
        return 'OUT_OF_STOCK';
    }

    return '';
}

function buildCartItemResponse(cartItem, productMap, inventoryMap) {
    let productId = normalizeProductId(cartItem?.product);
    let productItem = productMap.get(productId) || null;
    let inventoryItem = inventoryMap.get(productId) || null;
    let availableStock = getAvailableStock(inventoryItem);
    let unavailableReason = resolveUnavailableReason(productItem, availableStock);

    return {
        productId,
        product: productItem,
        quantity: Number(cartItem?.quantity || 0),
        availableStock,
        isUnavailable: Boolean(unavailableReason),
        unavailableReason
    };
}

async function findOrCreateCartByUser(userId) {
    let cart = await cartSchema.findOne({ user: userId });
    if (!cart) {
        cart = new cartSchema({
            user: userId,
            products: []
        });
        await cart.save();
    }
    return cart;
}

async function buildCartResponseByUser(userId) {
    let cart = await cartSchema.findOne({
        user: userId
    });

    if (!cart) {
        return null;
    }

    let productIds = Array.from(
        new Set(
            (cart?.products || [])
                .map((cartItem) => normalizeProductId(cartItem?.product))
                .filter((productId) => mongoose.isValidObjectId(productId))
        )
    );

    let [products, inventories] = await Promise.all([
        productSchema.find({
            _id: { $in: productIds }
        }).select('title price images slug sku isDeleted'),
        inventorySchema.find({
            product: { $in: productIds }
        }).select('product stock reserved')
    ]);

    let productMap = new Map(
        products.map((productItem) => [String(productItem?._id || ''), productItem])
    );
    let inventoryMap = new Map(
        inventories.map((inventoryItem) => [String(inventoryItem?.product || ''), inventoryItem])
    );

    let cartProducts = (cart?.products || []).map((cartItem) =>
        buildCartItemResponse(cartItem, productMap, inventoryMap)
    );

    let cartPayload = cart.toObject();
    cartPayload.products = cartProducts;
    cartPayload.activeProducts = cartProducts.filter((cartItem) => cartItem?.isUnavailable !== true);
    cartPayload.inactiveProducts = cartProducts.filter((cartItem) => cartItem?.isUnavailable === true);

    return cartPayload;
}

router.get('/', CheckLogin, async function (req, res, next) {
    try {
        let user = req.user;
        await findOrCreateCartByUser(user?._id)
        let cart = await buildCartResponseByUser(user._id)
        res.send(cart)
    } catch (err) {
        handleCartRouteError(err, res);
    }
})
router.post('/add', CheckLogin, async function (req, res, next) {
    try {
        let user = req.user;
        let productId = normalizeProductId(req.body?.product);

        if (!mongoose.isValidObjectId(productId)) {
            res.status(400).send({
                message: "product id khong hop le"
            });
            return;
        }

        let cart = await findOrCreateCartByUser(user?._id)
        let productItem = await productSchema.findOne({
            _id: productId,
            isDeleted: false
        }).select('_id')

        if (!productItem) {
            res.status(404).send({
                message: "san pham khong ton tai hoac da ngung kinh doanh"
            });
            return;
        }

        let inventory = await inventorySchema.findOne({
            product: productId
        })
        if (!inventory) {
            res.status(404).send({
                message: "san pham khong ton tai trong kho"
            });
            return;
        }
        let availableStock = getAvailableStock(inventory);
        let index = findCartItemIndex(cart, productId)
        let currentQuantity = index === -1
            ? 0
            : Number(cart?.products?.[index]?.quantity || 0);
        let nextQuantity = currentQuantity + 1;

        if (nextQuantity > availableStock) {
            res.status(400).send({
                message: "san pham trong kho khong du"
            });
            return;
        }

        if (index == -1) {
            cart.products.push({
                product: productId,
                quantity: 1
            })
        } else {
            cart.products[index].quantity = nextQuantity
        }
        await cart.save();
        let populatedCart = await buildCartResponseByUser(user._id)
        res.send(populatedCart)
    } catch (err) {
        handleCartRouteError(err, res);
    }
})
router.post('/remove', CheckLogin, async function (req, res, next) {
    try {
        let user = req.user;
        let productId = normalizeProductId(req.body?.product);

        if (!mongoose.isValidObjectId(productId)) {
            res.status(400).send({
                message: "product id khong hop le"
            });
            return;
        }

        let cart = await findOrCreateCartByUser(user?._id)
        let index = findCartItemIndex(cart, productId)
        if (index == -1) {
            res.status(404).send({
                message: "san pham khong ton tai"
            });
            return;
        } else {
            cart.products.splice(index, 1)
        }
        await cart.save();
        let populatedCart = await buildCartResponseByUser(user._id)
        res.send(populatedCart)
    } catch (err) {
        handleCartRouteError(err, res);
    }
})
router.post('/decrease', CheckLogin, async function (req, res, next) {
    try {
        let user = req.user;
        let productId = normalizeProductId(req.body?.product);

        if (!mongoose.isValidObjectId(productId)) {
            res.status(400).send({
                message: "product id khong hop le"
            });
            return;
        }

        let cart = await findOrCreateCartByUser(user?._id)
        let index = findCartItemIndex(cart, productId)
        if (index == -1) {
            res.status(404).send({
                message: "san pham khong ton tai"
            });
            return;
        } else {
            if (cart.products[index].quantity == 1) {
                cart.products.splice(index, 1);
            } else {
                cart.products[index].quantity -= 1;
            }
        }
        await cart.save();
        let populatedCart = await buildCartResponseByUser(user._id)
        res.send(populatedCart)
    } catch (err) {
        handleCartRouteError(err, res);
    }
})

router.post('/modify', CheckLogin, async function (req, res, next) {
    try {
        let user = req.user;
        let productId = normalizeProductId(req.body?.product);
        let quantity = Number(req.body.quantity);

        if (!mongoose.isValidObjectId(productId)) {
            res.status(400).send({
                message: "product id khong hop le"
            });
            return;
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            res.status(400).send({
                message: 'so luong phai la so nguyen duong'
            });
            return;
        }

        let cart = await findOrCreateCartByUser(user?._id)
        let productItem = await productSchema.findOne({
            _id: productId,
            isDeleted: false
        }).select('_id')

        if (!productItem) {
            res.status(404).send({
                message: "san pham khong ton tai hoac da ngung kinh doanh"
            });
            return;
        }

        let inventory = await inventorySchema.findOne({
            product: productId
        })
        if (!inventory) {
            res.status(404).send({
                message: "san pham khong ton tai trong kho"
            });
            return;
        }
        let availableStock = getAvailableStock(inventory);
        if (quantity > availableStock) {
            res.status(400).send({
                message: "san pham trong kho khong du"
            });
            return;
        }

        let index = findCartItemIndex(cart, productId)
        if (index == -1) {
            cart.products.push({
                product: productId,
                quantity
            })
        } else {
            cart.products[index].quantity = quantity
        }
        await cart.save();
        let populatedCart = await buildCartResponseByUser(user._id)
        res.send(populatedCart)
    } catch (err) {
        handleCartRouteError(err, res);
    }
})
module.exports = router;