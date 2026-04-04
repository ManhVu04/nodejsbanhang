const express = require('express');
let router = express.Router();
let mongoose = require('mongoose');
let path = require('path');
let fs = require('fs');

let productMediaSchema = require('../schemas/productMedia');
let productSchema = require('../schemas/products');
let { CheckLogin, CheckRole } = require('../utils/authHandler');
let { logAuditAction, getClientIpAddress } = require('../utils/auditHandler');
let { uploadImage, uploadVideo } = require('../utils/uploadHandler');

const adminGuard = [CheckLogin, CheckRole(['Admin'])];

// GET /product-media/:productId — Get all media for a product
router.get('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).send({ message: 'Product ID khong hop le' });
        }

        let product = await productSchema.findOne({
            _id: productId,
            isDeleted: false
        });

        if (!product) {
            return res.status(404).send({ message: 'San pham khong tim thay' });
        }

        let mediaList = await productMediaSchema.find({
            product: productId,
            isDeleted: false
        }).sort({ displayOrder: 1, createdAt: 1 });

        res.send({
            product: product._id,
            media: mediaList,
            total: mediaList.length
        });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// POST /product-media/upload/:productId — Upload new media (image or video)
router.post('/upload/:productId', adminGuard, async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).send({ message: 'Product ID khong hop le' });
        }

        let product = await productSchema.findOne({
            _id: productId,
            isDeleted: false
        });

        if (!product) {
            return res.status(404).send({ message: 'San pham khong tim thay' });
        }

        // Use different upload middleware based on media type
        const mediaType = req.body?.mediaType || 'image';
        const uploader = mediaType === 'video' ? uploadVideo : uploadImage;

        uploader.single('file')(req, res, async (err) => {
            if (err) {
                return res.status(400).send({ message: err.message });
            }

            if (!req.file) {
                return res.status(400).send({ message: 'File khong ton tai' });
            }

            try {
                // Determine file type
                const fileExt = path.extname(req.file.filename).substring(1).toLowerCase();
                const isVideo = mediaType === 'video' || req.file.mimetype.startsWith('video/');
                const isSupportedMedia = (mediaType === 'image' && req.file.mimetype.startsWith('image/')) ||
                                       (isVideo && req.file.mimetype.startsWith('video/'));

                if (!isSupportedMedia) {
                    fs.unlinkSync(req.file.path);
                    return res.status(400).send({ message: 'Dinh dang file khong dung' });
                }

                // Get display order
                let maxOrder = await productMediaSchema.findOne(
                    { product: productId, isDeleted: false },
                    null,
                    { sort: { displayOrder: -1 } }
                );
                let newOrder = (maxOrder?.displayOrder || -1) + 1;

                // Create media document
                let newMedia = new productMediaSchema({
                    product: productId,
                    mediaType: isVideo ? 'video' : 'image',
                    fileFormat: fileExt,
                    filePath: req.file.filename,
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    mimeType: req.file.mimetype,
                    altText: req.body?.altText || '',
                    displayOrder: newOrder,
                    isDefault: await productMediaSchema.countDocuments({ product: productId, isDeleted: false }) === 0
                });

                await newMedia.save();

                // Log audit action
                await logAuditAction({
                    action: 'PRODUCT_MEDIA_UPLOAD',
                    adminId: req.user._id,
                    resourceType: 'productMedia',
                    resourceId: newMedia._id,
                    before: null,
                    after: newMedia.toObject(),
                    description: `Uploaded ${newMedia.mediaType} for product: ${product.title}`,
                    ipAddress: getClientIpAddress(req),
                    success: true
                });

                res.send({
                    message: 'Upload thanh cong',
                    media: newMedia
                });
            } catch (error) {
                if (req.file?.path) {
                    fs.unlinkSync(req.file.path);
                }

                await logAuditAction({
                    action: 'PRODUCT_MEDIA_UPLOAD',
                    adminId: req.user._id,
                    resourceType: 'productMedia',
                    resourceId: new mongoose.Types.ObjectId(),
                    before: null,
                    after: req.body,
                    description: `Failed to upload media for product: ${product?.title || 'Unknown'}`,
                    ipAddress: getClientIpAddress(req),
                    success: false,
                    errorMessage: error.message
                });

                res.status(400).send({ message: error.message });
            }
        });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// PUT /product-media/:mediaId — Update media metadata
router.put('/:mediaId', adminGuard, async (req, res) => {
    try {
        const { mediaId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(mediaId)) {
            return res.status(400).send({ message: 'Media ID khong hop le' });
        }

        let media = await productMediaSchema.findOne({
            _id: mediaId,
            isDeleted: false
        });

        if (!media) {
            return res.status(404).send({ message: 'Media khong tim thay' });
        }

        let originalData = media.toObject();
        let updateFields = {};

        if (req.body.altText !== undefined) {
            updateFields.altText = req.body.altText;
        }

        if (req.body.displayOrder !== undefined) {
            updateFields.displayOrder = req.body.displayOrder;
        }

        if (req.body.isDefault !== undefined) {
            updateFields.isDefault = req.body.isDefault;
        }

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).send({ message: 'Khong co du lieu de cap nhat' });
        }

        Object.assign(media, updateFields);
        await media.save();

        await logAuditAction({
            action: 'PRODUCT_MEDIA_UPDATE',
            adminId: req.user._id,
            resourceType: 'productMedia',
            resourceId: mediaId,
            before: originalData,
            after: media.toObject(),
            description: `Updated product media`,
            ipAddress: getClientIpAddress(req),
            success: true
        });

        res.send({
            message: 'Cap nhat thanh cong',
            media: media
        });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// DELETE /product-media/:mediaId — Delete media
router.delete('/:mediaId', adminGuard, async (req, res) => {
    try {
        const { mediaId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(mediaId)) {
            return res.status(400).send({ message: 'Media ID khong hop le' });
        }

        let media = await productMediaSchema.findOne({
            _id: mediaId,
            isDeleted: false
        });

        if (!media) {
            return res.status(404).send({ message: 'Media khong tim thay' });
        }

        let originalData = media.toObject();

        // Soft delete media
        media.isDeleted = true;
        await media.save();

        // Delete file from disk
        let filePath = require('path').join(__dirname, '../uploads', media.filePath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await logAuditAction({
            action: 'PRODUCT_MEDIA_DELETE',
            adminId: req.user._id,
            resourceType: 'productMedia',
            resourceId: mediaId,
            before: originalData,
            after: media.toObject(),
            description: `Deleted product media: ${media.fileName}`,
            ipAddress: getClientIpAddress(req),
            success: true
        });

        res.send({
            message: 'Xoa thanh cong'
        });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// PUT /product-media/reorder/:productId — Reorder all media for a product
router.put('/reorder/:productId', adminGuard, async (req, res) => {
    try {
        const { productId } = req.params;
        const { mediaOrder } = req.body;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).send({ message: 'Product ID khong hop le' });
        }

        if (!Array.isArray(mediaOrder) || mediaOrder.length === 0) {
            return res.status(400).send({ message: 'mediaOrder phai la mot mang' });
        }

        let product = await productSchema.findOne({
            _id: productId,
            isDeleted: false
        });

        if (!product) {
            return res.status(404).send({ message: 'San pham khong tim thay' });
        }

        // Validate all media IDs belong to this product
        for (const item of mediaOrder) {
            if (!mongoose.Types.ObjectId.isValid(item.mediaId)) {
                return res.status(400).send({ message: `Media ID khong hop le: ${item.mediaId}` });
            }

            let media = await productMediaSchema.findOne({
                _id: item.mediaId,
                product: productId,
                isDeleted: false
            });

            if (!media) {
                return res.status(404).send({ message: `Media khong tim thay: ${item.mediaId}` });
            }
        }

        // Update display order for all media
        for (const item of mediaOrder) {
            await productMediaSchema.updateOne(
                { _id: item.mediaId },
                { displayOrder: item.displayOrder }
            );
        }

        await logAuditAction({
            action: 'PRODUCT_MEDIA_REORDER',
            adminId: req.user._id,
            resourceType: 'product',
            resourceId: productId,
            before: null,
            after: mediaOrder,
            description: `Reordered media for product: ${product.title}`,
            ipAddress: getClientIpAddress(req),
            success: true
        });

        res.send({
            message: 'Sap xep lai media thanh cong'
        });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

module.exports = router;
