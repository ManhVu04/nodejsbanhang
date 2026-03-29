let express = require('express');
let router = express.Router();
let { CheckLogin } = require('../utils/authHandler');
let userModel = require('../schemas/users');
let productModel = require('../schemas/products');

async function getWishlistByUserId(userId) {
    let user = await userModel.findById(userId).populate({
        path: 'wishlist',
        match: { isDeleted: false },
        populate: { path: 'category', select: 'name' }
    });
    return user ? user.wishlist : [];
}

router.get('/', CheckLogin, async function (req, res) {
    try {
        let wishlist = await getWishlistByUserId(req.user._id);
        return res.send({ wishlist });
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
});

router.post('/:productId', CheckLogin, async function (req, res) {
    try {
        let productId = req.params.productId;

        let product = await productModel.findOne({ _id: productId, isDeleted: false });
        if (!product) {
            return res.status(404).send({ message: 'San pham khong ton tai' });
        }

        let user = await userModel.findById(req.user._id);
        if (!user) {
            return res.status(404).send({ message: 'User khong ton tai' });
        }

        let exists = user.wishlist.some((id) => id.toString() === productId);
        if (exists) {
            user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
        } else {
            user.wishlist.push(productId);
        }

        await user.save();
        let wishlist = await getWishlistByUserId(user._id);

        return res.send({
            message: exists ? 'Da xoa khoi wishlist' : 'Da them vao wishlist',
            isInWishlist: !exists,
            wishlist
        });
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
});

router.delete('/:productId', CheckLogin, async function (req, res) {
    try {
        let user = await userModel.findById(req.user._id);
        if (!user) {
            return res.status(404).send({ message: 'User khong ton tai' });
        }

        let productId = req.params.productId;
        user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
        await user.save();

        let wishlist = await getWishlistByUserId(user._id);
        return res.send({ message: 'Da xoa khoi wishlist', wishlist, isInWishlist: false });
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
});

module.exports = router;
