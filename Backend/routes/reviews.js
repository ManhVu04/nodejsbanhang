let express = require('express');
let mongoose = require('mongoose');
let router = express.Router();
let reviewModel = require('../schemas/reviews');
let productModel = require('../schemas/products');
let { CheckLogin } = require('../utils/authHandler');

async function getReviewStats(productId) {
    let objectId = new mongoose.Types.ObjectId(productId);
    let result = await reviewModel.aggregate([
        {
            $match: {
                product: objectId,
                isDeleted: false
            }
        },
        {
            $group: {
                _id: '$product',
                reviewCount: { $sum: 1 },
                averageRating: { $avg: '$rating' },
                rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
                rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } }
            }
        }
    ]);

    if (!result || result.length === 0) {
        return {
            reviewCount: 0,
            averageRating: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
    }

    let stats = result[0];
    return {
        reviewCount: stats.reviewCount,
        averageRating: Number((stats.averageRating || 0).toFixed(1)),
        distribution: {
            1: stats.rating1 || 0,
            2: stats.rating2 || 0,
            3: stats.rating3 || 0,
            4: stats.rating4 || 0,
            5: stats.rating5 || 0
        }
    };
}

async function syncProductRating(productId) {
    let stats = await getReviewStats(productId);
    await productModel.findByIdAndUpdate(productId, {
        averageRating: stats.averageRating,
        reviewCount: stats.reviewCount
    });
}

router.get('/product/:productId', async function (req, res) {
    try {
        let { page = 1, limit = 10 } = req.query;
        let productId = req.params.productId;

        let product = await productModel.findOne({ _id: productId, isDeleted: false });
        if (!product) {
            return res.status(404).send({ message: 'San pham khong ton tai' });
        }

        let filter = { product: productId, isDeleted: false };
        let reviews = await reviewModel.find(filter)
            .populate('user', 'username fullName avatarUrl')
            .sort({ updatedAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        let total = await reviewModel.countDocuments(filter);
        let stats = await getReviewStats(productId);

        return res.send({
            reviews,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            stats
        });
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
});

router.post('/product/:productId', CheckLogin, async function (req, res) {
    try {
        let productId = req.params.productId;
        let rating = Number(req.body.rating);
        let comment = String(req.body.comment || '').trim();

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).send({ message: 'Danh gia phai la so nguyen tu 1 den 5' });
        }

        let product = await productModel.findOne({ _id: productId, isDeleted: false });
        if (!product) {
            return res.status(404).send({ message: 'San pham khong ton tai' });
        }

        let review = await reviewModel.findOne({ product: productId, user: req.user._id });
        if (review) {
            review.rating = rating;
            review.comment = comment;
            review.isDeleted = false;
            await review.save();
        } else {
            review = new reviewModel({
                product: productId,
                user: req.user._id,
                rating,
                comment
            });
            await review.save();
        }

        await syncProductRating(productId);
        let stats = await getReviewStats(productId);

        let populated = await reviewModel.findById(review._id).populate('user', 'username fullName avatarUrl');
        return res.send({ message: 'Da gui danh gia', review: populated, stats });
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
});

router.delete('/:id', CheckLogin, async function (req, res) {
    try {
        let review = await reviewModel.findById(req.params.id);
        if (!review || review.isDeleted) {
            return res.status(404).send({ message: 'Danh gia khong ton tai' });
        }

        let isOwner = review.user.toString() === req.user._id.toString();
        let isAdmin = req.user.role && req.user.role.name === 'Admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).send({ message: 'Ban khong co quyen xoa danh gia nay' });
        }

        review.isDeleted = true;
        await review.save();
        await syncProductRating(review.product);

        let stats = await getReviewStats(review.product);
        return res.send({ message: 'Da xoa danh gia', stats });
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
});

module.exports = router;
