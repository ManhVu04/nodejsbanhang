var express = require("express");
var router = express.Router();
let { CheckLogin } = require('../utils/authHandler')
let cartSchema = require('../schemas/carts')
let inventorySchema = require('../schemas/inventories')

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

async function getPopulatedCartByUser(userId) {
    return await cartSchema.findOne({
        user: userId
    }).populate({
        path: 'products.product',
        select: 'title price images slug sku'
    })
}

router.get('/', CheckLogin, async function (req, res, next) {
    try {
        let user = req.user;
        let cart = await getPopulatedCartByUser(user._id)
        res.send(cart)
    } catch (err) {
        handleCartRouteError(err, res);
    }
})
router.post('/add', CheckLogin, async function (req, res, next) {
    try {
        let user = req.user;
        let productId = req.body.product;

        let cart = await cartSchema.findOne({
            user: user._id
        })
        let product = await inventorySchema.findOne({
            product: productId
        })
        if (!product) {
            res.status(404).send({
                message: "san pham khong ton tai"
            });
            return;
        }
        let stock = product.stock;
        let index = cart.products.findIndex(
            function (e) {
                return e.product == productId
            })
        if (index == -1) {
            if (stock < 1) {
                res.status(404).send({
                    message: "san pham trong kho khong du"
                });
                return;
            }
            cart.products.push({
                product: productId,
                quantity: 1
            })
        } else {
            if (stock - cart.products[index].quantity < 1) {
                res.status(404).send({
                    message: "san pham trong kho khong du"
                });
                return;
            }
            cart.products[index].quantity++
        }
        await cart.save();
        let populatedCart = await getPopulatedCartByUser(user._id)
        res.send(populatedCart)
    } catch (err) {
        handleCartRouteError(err, res);
    }
})
router.post('/remove', CheckLogin, async function (req, res, next) {
    try {
        let user = req.user;
        let productId = req.body.product;
        let cart = await cartSchema.findOne({
            user: user._id
        })
        let product = await inventorySchema.findOne({
            product: productId
        })
        if (!product) {
            res.status(404).send({
                message: "san pham khong ton tai"
            });
            return;
        }
        let index = cart.products.findIndex(
            function (e) {
                return e.product == productId
            })
        if (index == -1) {
            res.status(404).send({
                message: "san pham khong ton tai"
            });
            return;
        } else {
            cart.products.splice(index, 1)
        }
        await cart.save();
        let populatedCart = await getPopulatedCartByUser(user._id)
        res.send(populatedCart)
    } catch (err) {
        handleCartRouteError(err, res);
    }
})
router.post('/decrease', CheckLogin, async function (req, res, next) {
    try {
        let user = req.user;
        let productId = req.body.product;
        let cart = await cartSchema.findOne({
            user: user._id
        })
        let product = await inventorySchema.findOne({
            product: productId
        })
        if (!product) {
            res.status(404).send({
                message: "san pham khong ton tai"
            });
            return;
        }
        let index = cart.products.findIndex(
            function (e) {
                return e.product == productId
            })
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
        let populatedCart = await getPopulatedCartByUser(user._id)
        res.send(populatedCart)
    } catch (err) {
        handleCartRouteError(err, res);
    }
})

router.post('/modify', CheckLogin, async function (req, res, next) {
    try {
        let user = req.user;
        let productId = req.body.product;
        let quantity = Number(req.body.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
            res.status(400).send({
                message: 'so luong phai la so nguyen duong'
            });
            return;
        }

        let cart = await cartSchema.findOne({
            user: user._id
        })
        let product = await inventorySchema.findOne({
            product: productId
        })
        if (!product) {
            res.status(404).send({
                message: "san pham khong ton tai"
            });
            return;
        }
        let stock = product.stock;
        let index = cart.products.findIndex(
            function (e) {
                return e.product == productId
            })
        if (index == -1) {
            res.status(404).send({
                message: "san pham khong ton tai trong gio hang"
            });
            return;
        } else {
            if (stock - quantity < 0) {
                res.status(400).send({
                    message: "san pham trong kho khong du"
                });
                return;
            }
            cart.products[index].quantity = quantity
        }
        await cart.save();
        let populatedCart = await getPopulatedCartByUser(user._id)
        res.send(populatedCart)
    } catch (err) {
        handleCartRouteError(err, res);
    }
})
module.exports = router;