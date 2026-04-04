const express = require('express');
let router = express.Router();
let mongoose = require('mongoose');
let path = require('path');
let fs = require('fs');

let productMediaSchema = require('../schemas/productMedia');
let productSchema = require('../schemas/products');
let { CheckLogin, CheckRole } = require('../utils/authHandler');
let { logAuditAction, getClientIpAddress } = require('../utils/auditHandler');
let { uploadProductMedia } = require('../utils/uploadHandler');

const adminGuard = [CheckLogin, CheckRole(['Admin'])];

const PRODUCT_MEDIA_AUDIT_MAP = {
    upload: {
        action: 'PRODUCT_MEDIA_UPLOAD',
        resourceType: 'productMedia'
    },
    update: {
        action: 'PRODUCT_MEDIA_UPDATE',
        resourceType: 'productMedia'
    },
    delete: {
        action: 'PRODUCT_MEDIA_DELETE',
        resourceType: 'productMedia'
    },
    reorder: {
        action: 'PRODUCT_MEDIA_REORDER',
        resourceType: 'product'
    }
};

const VIDEO_FILE_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'm4v'];
const IMAGE_FILE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'jfif', 'tif', 'tiff'];

function normalizeRequestedMediaType(rawType) {
    let normalized = String(rawType || '').trim().toLowerCase();
    if (normalized === 'video') return 'video';
    if (normalized === 'image') return 'image';
    return '';
}

function getOriginalFileExtension(file) {
    return path.extname(String(file?.originalname || '')).replace('.', '').toLowerCase();
}

function detectUploadedMediaType(file, requestedMediaType = '') {
    let mimeType = String(file?.mimetype || '').toLowerCase();
    let extension = getOriginalFileExtension(file);

    let isVideoByMime = mimeType.startsWith('video/');
    let isImageByMime = mimeType.startsWith('image/');
    let isVideoByExt = VIDEO_FILE_EXTENSIONS.includes(extension);
    let isImageByExt = IMAGE_FILE_EXTENSIONS.includes(extension);

    if (requestedMediaType === 'video' && (isVideoByMime || isVideoByExt)) {
        return 'video';
    }

    if (requestedMediaType === 'image' && (isImageByMime || isImageByExt)) {
        return 'image';
    }

    if (isVideoByMime || isVideoByExt) {
        return 'video';
    }

    if (isImageByMime || isImageByExt) {
        return 'image';
    }

    return '';
}

function safeResourceId(rawId) {
    if (mongoose.isValidObjectId(rawId)) {
        return rawId;
    }
    return new mongoose.Types.ObjectId();
}

function normalizeBoolean(value, defaultValue = false) {
    if (value === undefined || value === null) {
        return defaultValue;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        let normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return Boolean(value);
}

function safeUnlink(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        // Do not throw to keep API operation resilient.
    }
}

function buildProductMediaAuditEntry({
    operation,
    adminId,
    resourceId,
    before = null,
    after = null,
    description = '',
    ipAddress = '',
    success = true,
    errorMessage = ''
}) {
    let config = PRODUCT_MEDIA_AUDIT_MAP[operation];
    if (!config) {
        throw new Error(`Unsupported media audit operation: ${operation}`);
    }

    return {
        action: config.action,
        adminId,
        resourceType: config.resourceType,
        resourceId,
        before,
        after,
        description,
        ipAddress,
        success,
        errorMessage
    };
}

async function ensureDefaultMediaForProduct(productId) {
    let mediaList = await productMediaSchema.find({
        product: productId,
        isDeleted: false
    }).sort({ displayOrder: 1, createdAt: 1 });

    if (mediaList.length === 0) {
        return;
    }

    let hasDefaultMedia = mediaList.some((item) => item?.isDefault === true);
    if (hasDefaultMedia) {
        return;
    }

    mediaList[0].isDefault = true;
    await mediaList[0].save();
}

async function syncProductImagesFromMedia(productId) {
    let imageMediaList = await productMediaSchema.find({
        product: productId,
        mediaType: 'image',
        isDeleted: false
    }).sort({ isDefault: -1, displayOrder: 1, createdAt: 1 }).lean();

    let imagePaths = imageMediaList
        .map((item) => String(item?.filePath || '').trim())
        .filter(Boolean);

    await productSchema.updateOne(
        { _id: productId },
        { images: imagePaths }
    );
}

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

        const uploader = uploadProductMedia;

        uploader.single('file')(req, res, async (err) => {
            if (err) {
                await logAuditAction(buildProductMediaAuditEntry({
                    operation: 'upload',
                    adminId: req.user?._id,
                    resourceId: new mongoose.Types.ObjectId(),
                    before: null,
                    after: req.body,
                    description: `Failed to upload media for product: ${product?.title || 'Unknown'}`,
                    ipAddress: getClientIpAddress(req),
                    success: false,
                    errorMessage: err.message
                }));
                return res.status(400).send({ message: err.message });
            }

            if (!req.file) {
                await logAuditAction(buildProductMediaAuditEntry({
                    operation: 'upload',
                    adminId: req.user?._id,
                    resourceId: new mongoose.Types.ObjectId(),
                    before: null,
                    after: req.body,
                    description: `Failed to upload media for product: ${product?.title || 'Unknown'}`,
                    ipAddress: getClientIpAddress(req),
                    success: false,
                    errorMessage: 'File khong ton tai'
                }));
                return res.status(400).send({ message: 'File khong ton tai' });
            }

            try {
                // Determine file type by both MIME and extension.
                const requestedMediaType = normalizeRequestedMediaType(req.body?.mediaType);
                const detectedMediaType = detectUploadedMediaType(req.file, requestedMediaType);
                const fileExt = path.extname(req.file.originalname || req.file.filename).replace('.', '').toLowerCase();

                if (!detectedMediaType) {
                    safeUnlink(req.file.path);

                    await logAuditAction(buildProductMediaAuditEntry({
                        operation: 'upload',
                        adminId: req.user?._id,
                        resourceId: new mongoose.Types.ObjectId(),
                        before: null,
                        after: {
                            requestedMediaType,
                            mimeType: req.file?.mimetype,
                            originalname: req.file?.originalname,
                            extension: getOriginalFileExtension(req.file)
                        },
                        description: `Failed to upload media for product: ${product?.title || 'Unknown'}`,
                        ipAddress: getClientIpAddress(req),
                        success: false,
                        errorMessage: 'Dinh dang file khong dung'
                    }));

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
                    mediaType: detectedMediaType,
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
                await ensureDefaultMediaForProduct(productId);
                await syncProductImagesFromMedia(productId);

                // Log audit action
                await logAuditAction(buildProductMediaAuditEntry({
                    operation: 'upload',
                    adminId: req.user?._id,
                    resourceId: newMedia._id,
                    before: null,
                    after: newMedia.toObject(),
                    description: `Uploaded ${newMedia.mediaType} for product: ${product.title}`,
                    ipAddress: getClientIpAddress(req),
                    success: true
                }));

                res.send({
                    message: 'Upload thanh cong',
                    media: newMedia
                });
            } catch (error) {
                if (req.file?.path) {
                    safeUnlink(req.file.path);
                }

                await logAuditAction(buildProductMediaAuditEntry({
                    operation: 'upload',
                    adminId: req.user?._id,
                    resourceId: new mongoose.Types.ObjectId(),
                    before: null,
                    after: req.body,
                    description: `Failed to upload media for product: ${product?.title || 'Unknown'}`,
                    ipAddress: getClientIpAddress(req),
                    success: false,
                    errorMessage: error.message
                }));

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
            let parsedOrder = Number.parseInt(req.body.displayOrder, 10);
            if (Number.isNaN(parsedOrder) || parsedOrder < 0) {
                return res.status(400).send({ message: 'displayOrder khong hop le' });
            }
            updateFields.displayOrder = parsedOrder;
        }

        if (req.body.isDefault !== undefined) {
            updateFields.isDefault = normalizeBoolean(req.body.isDefault);
        }

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).send({ message: 'Khong co du lieu de cap nhat' });
        }

        Object.assign(media, updateFields);
        await media.save();
        await ensureDefaultMediaForProduct(media.product);
        await syncProductImagesFromMedia(media.product);

        await logAuditAction(buildProductMediaAuditEntry({
            operation: 'update',
            adminId: req.user?._id,
            resourceId: mediaId,
            before: originalData,
            after: media.toObject(),
            description: `Updated product media: ${media.fileName}`,
            ipAddress: getClientIpAddress(req),
            success: true
        }));

        res.send({
            message: 'Cap nhat thanh cong',
            media: media
        });
    } catch (error) {
        await logAuditAction(buildProductMediaAuditEntry({
            operation: 'update',
            adminId: req.user?._id,
            resourceId: safeResourceId(req.params?.mediaId),
            before: null,
            after: req.body,
            description: `Failed to update product media: ${req.params?.mediaId || 'Unknown'}`,
            ipAddress: getClientIpAddress(req),
            success: false,
            errorMessage: error.message
        }));

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
        let productId = media.product;
        let wasDefaultMedia = media.isDefault === true;

        // Soft delete media
        media.isDeleted = true;
        await media.save();
        if (wasDefaultMedia) {
            await ensureDefaultMediaForProduct(productId);
        }
        await syncProductImagesFromMedia(productId);

        // Delete file from disk
        let filePath = require('path').join(__dirname, '../uploads', media.filePath);
        safeUnlink(filePath);

        await logAuditAction(buildProductMediaAuditEntry({
            operation: 'delete',
            adminId: req.user?._id,
            resourceId: mediaId,
            before: originalData,
            after: media.toObject(),
            description: `Deleted product media: ${media.fileName}`,
            ipAddress: getClientIpAddress(req),
            success: true
        }));

        res.send({
            message: 'Xoa thanh cong'
        });
    } catch (error) {
        await logAuditAction(buildProductMediaAuditEntry({
            operation: 'delete',
            adminId: req.user?._id,
            resourceId: safeResourceId(req.params?.mediaId),
            before: null,
            after: null,
            description: `Failed to delete product media: ${req.params?.mediaId || 'Unknown'}`,
            ipAddress: getClientIpAddress(req),
            success: false,
            errorMessage: error.message
        }));

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

        let beforeSnapshot = await productMediaSchema.find({
            product: productId,
            isDeleted: false
        }).select('_id displayOrder isDefault mediaType fileName').sort({ displayOrder: 1, createdAt: 1 }).lean();

        // Validate all media IDs belong to this product
        for (const item of mediaOrder) {
            if (!mongoose.Types.ObjectId.isValid(item.mediaId)) {
                return res.status(400).send({ message: `Media ID khong hop le: ${item.mediaId}` });
            }

            let parsedOrder = Number.parseInt(item.displayOrder, 10);
            if (Number.isNaN(parsedOrder) || parsedOrder < 0) {
                return res.status(400).send({ message: `displayOrder khong hop le: ${item.displayOrder}` });
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
            let parsedOrder = Number.parseInt(item.displayOrder, 10);
            await productMediaSchema.updateOne(
                { _id: item.mediaId },
                { displayOrder: parsedOrder }
            );
        }

        await ensureDefaultMediaForProduct(productId);
        await syncProductImagesFromMedia(productId);

        let afterSnapshot = await productMediaSchema.find({
            product: productId,
            isDeleted: false
        }).select('_id displayOrder isDefault mediaType fileName').sort({ displayOrder: 1, createdAt: 1 }).lean();

        await logAuditAction(buildProductMediaAuditEntry({
            operation: 'reorder',
            adminId: req.user?._id,
            resourceId: productId,
            before: beforeSnapshot,
            after: afterSnapshot,
            description: `Reordered media for product: ${product.title}`,
            ipAddress: getClientIpAddress(req),
            success: true
        }));

        res.send({
            message: 'Sap xep lai media thanh cong'
        });
    } catch (error) {
        await logAuditAction(buildProductMediaAuditEntry({
            operation: 'reorder',
            adminId: req.user?._id,
            resourceId: safeResourceId(req.params?.productId),
            before: null,
            after: req.body?.mediaOrder || [],
            description: `Failed to reorder media for product: ${req.params?.productId || 'Unknown'}`,
            ipAddress: getClientIpAddress(req),
            success: false,
            errorMessage: error.message
        }));

        res.status(400).send({ message: error.message });
    }
});

module.exports = router;
module.exports._testables = {
    buildProductMediaAuditEntry,
    PRODUCT_MEDIA_AUDIT_MAP
};
