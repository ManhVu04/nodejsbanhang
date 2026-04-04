const express = require('express')
let router = express.Router()
let slugify = require('slugify')
let path = require('path')
let productSchema = require('../schemas/products')
let inventorySchema = require('../schemas/inventories')
let productMediaSchema = require('../schemas/productMedia')
let mongoose = require('mongoose')
let { CheckLogin, CheckRole } = require('../utils/authHandler')
let { logAuditAction, getChangesDiff, getClientIpAddress } = require('../utils/auditHandler')

const adminGuard = [CheckLogin, CheckRole(['Admin'])];

function normalizeImageList(imagesInput) {
    if (!imagesInput) {
        return [];
    }

    if (Array.isArray(imagesInput)) {
        return imagesInput
            .map((item) => String(item || '').trim())
            .filter(Boolean);
    }

    let normalized = String(imagesInput || '').trim();
    return normalized ? [normalized] : [];
}

function getMimeTypeByExtension(filePath) {
    let extension = path.extname(String(filePath || '')).toLowerCase();
    if (extension === '.png') return 'image/png';
    if (extension === '.webp') return 'image/webp';
    if (extension === '.gif') return 'image/gif';
    return 'image/jpeg';
}

async function syncProductMediaFromImages(productId, imagePaths, session = null) {
    let normalizedImages = normalizeImageList(imagePaths);
    let updateOptions = session ? { session } : undefined;

    await productMediaSchema.updateMany(
        {
            product: productId,
            mediaType: 'image',
            isDeleted: false
        },
        {
            isDeleted: true,
            isDefault: false
        },
        updateOptions
    );

    if (normalizedImages.length === 0) {
        return;
    }

    let newMediaItems = normalizedImages.map((fileValue, index) => {
        let cleanedPath = String(fileValue || '').trim();
        let fallbackName = cleanedPath.split('/').pop();
        return {
            product: productId,
            mediaType: 'image',
            fileFormat: (path.extname(cleanedPath).replace('.', '').toLowerCase() || 'jpg'),
            filePath: cleanedPath,
            fileName: fallbackName || cleanedPath,
            fileSize: 0,
            mimeType: getMimeTypeByExtension(cleanedPath),
            altText: '',
            displayOrder: index,
            isDefault: index === 0,
            isDeleted: false
        };
    });

    await productMediaSchema.insertMany(newMediaItems, updateOptions);
}

async function mapProductsWithPrimaryImages(productDocs) {
    if (!Array.isArray(productDocs) || productDocs.length === 0) {
        return [];
    }

    let productIds = productDocs
        .map((item) => item?._id)
        .filter(Boolean);

    let mediaList = await productMediaSchema.find({
        product: { $in: productIds },
        isDeleted: false
    }).select('product mediaType filePath isDefault displayOrder createdAt').lean();

    let mediaByProductMap = new Map();
    for (let media of mediaList) {
        let productKey = String(media?.product || '');
        if (!productKey) {
            continue;
        }

        let existing = mediaByProductMap.get(productKey) || [];
        existing.push(media);
        mediaByProductMap.set(productKey, existing);
    }

    function sortMediaItems(list = []) {
        return [...list].sort((leftItem, rightItem) => {
            if (leftItem?.isDefault && !rightItem?.isDefault) return -1;
            if (!leftItem?.isDefault && rightItem?.isDefault) return 1;
            let leftOrder = Number(leftItem?.displayOrder || 0);
            let rightOrder = Number(rightItem?.displayOrder || 0);
            if (leftOrder !== rightOrder) return leftOrder - rightOrder;
            return new Date(leftItem?.createdAt || 0).getTime() - new Date(rightItem?.createdAt || 0).getTime();
        });
    }

    return productDocs.map((item) => {
        let payload = typeof item?.toObject === 'function' ? item.toObject() : { ...item };
        let currentImages = Array.isArray(payload?.images)
            ? payload.images.map((image) => String(image || '').trim()).filter(Boolean)
            : [];

        let productMediaList = sortMediaItems(mediaByProductMap.get(String(payload?._id || '')) || []);
        let imageMediaItems = productMediaList
            .filter((media) => String(media?.mediaType || '').toLowerCase() === 'image')
            .map((media) => String(media?.filePath || '').trim())
            .filter(Boolean);
        let videoCount = productMediaList.filter((media) => String(media?.mediaType || '').toLowerCase() === 'video').length;

        if (imageMediaItems.length > 0) {
            payload.images = Array.from(new Set(imageMediaItems));
        } else {
            payload.images = currentImages;
        }

        payload.mediaMeta = {
            hasVideo: videoCount > 0,
            videoCount,
            imageCount: payload.images.length,
            totalCount: Math.max(productMediaList.length, payload.images.length)
        };

        return payload;
    });
}

// GET /search — Full-text search with filters
router.get('/search', async (req, res) => {
    try {
        let { q, category, minPrice, maxPrice, sort, page = 1, limit = 12 } = req.query;
        let filter = { isDeleted: false };

        if (q) {
            filter.$text = { $search: q };
        }
        if (category) {
            filter.category = category;
        }
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        let sortOption = { createdAt: -1 };
        if (sort === 'price_asc') sortOption = { price: 1 };
        else if (sort === 'price_desc') sortOption = { price: -1 };
        else if (sort === 'newest') sortOption = { createdAt: -1 };
        else if (q) sortOption = { score: { $meta: 'textScore' } };

        let query = productSchema.find(filter);
        if (q) {
            query = query.select({ score: { $meta: 'textScore' } });
        }

        let products = await query
            .populate({
                path: 'category',
                select: 'name',
                match: { isDeleted: false }
            })
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        let productsWithMedia = await mapProductsWithPrimaryImages(products);

        let total = await productSchema.countDocuments(filter);

        res.send({
            products: productsWithMedia,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

router.get('/', async (req, res) => {
    let queries = req.query;
    let minQ = queries.min ? queries.min : 0;
    let result = await productSchema.find({
        isDeleted: false,
        price: {
            $gte: minQ
        }
    }).populate({
        path: 'category',
        select: 'name',
        match: { isDeleted: false }
    })
    let productsWithMedia = await mapProductsWithPrimaryImages(result)
    res.send(productsWithMedia)
})
router.get('/:id/related', async (req, res) => {
    try {
        let limit = Number(req.query.limit || 4);
        if (!Number.isInteger(limit) || limit < 1) {
            limit = 4;
        }

        let currentProduct = await productSchema.findOne({
            _id: req.params.id,
            isDeleted: false
        });

        if (!currentProduct) {
            return res.status(404).send({ message: 'ID NOT FOUND' });
        }

        let related = await productSchema.find({
            isDeleted: false,
            _id: { $ne: currentProduct._id },
            category: currentProduct.category
        })
            .populate({
                path: 'category',
                select: 'name',
                match: { isDeleted: false }
            })
            .sort({ createdAt: -1 })
            .limit(limit);

        if (related.length < limit) {
            let fill = await productSchema.find({
                isDeleted: false,
                _id: {
                    $nin: [currentProduct._id, ...related.map((item) => item._id)]
                }
            })
                .populate({
                    path: 'category',
                    select: 'name',
                    match: { isDeleted: false }
                })
                .sort({ createdAt: -1 })
                .limit(limit - related.length);
            related = related.concat(fill);
        }

        let relatedWithMedia = await mapProductsWithPrimaryImages(related);

        return res.send(relatedWithMedia);
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
})
router.get('/:id', async (req, res) => {//req.params
    try {
        let result = await productSchema.findOne({
            isDeleted: false,
            _id: req.params.id
        }).populate({
            path: 'category',
            select: 'name',
            match: { isDeleted: false }
        })
        if (result) {
            let inventory = await inventorySchema.findOne({ product: result._id })
            let payload = (await mapProductsWithPrimaryImages([result]))[0] || result.toObject()
            let availableStock = Math.max(
                0,
                Number(inventory?.stock || 0) - Number(inventory?.reserved || 0)
            )
            payload.availableStock = availableStock
            payload.stock = Number(inventory?.stock || 0)
            res.send(payload)
        } else {
            res.status(404).send({
                message: "ID NOT FOUND"
            })
        }
    } catch (error) {
        res.status(404).send({
            message: "SOMETHING WENT WRONG"
        })
    }
})
// REPLICA SET
// LOCAL : bat replica set
// ATLAS: co san
router.post('/', adminGuard, async (req, res) => {
    let session = await mongoose.startSession()
    session.startTransaction()
    try {
        let newProducts = new productSchema({
            title: req.body.title,
            slug: slugify(req.body.title, {
                replacement: '-',
                lower: false,
                remove: undefined,
            }),
            description: req.body.description,
            category: req.body.category,
            images: normalizeImageList(req.body.images),
            price: req.body.price,
            sku: req.body.sku
        })
        await newProducts.save({ session })
        let newInventory = new inventorySchema({
            product: newProducts._id,
            stock: 0
        })
        await newInventory.save({ session });
        await syncProductMediaFromImages(newProducts._id, newProducts.images, session)
        await newInventory.populate('product')
        await session.commitTransaction();
        await session.endSession()
        
        // Log audit action
        await logAuditAction({
            action: 'PRODUCT_CREATE',
            adminId: req.user._id,
            resourceType: 'product',
            resourceId: newProducts._id,
            before: null,
            after: newProducts.toObject(),
            description: `Created product: ${newProducts.title}`,
            ipAddress: getClientIpAddress(req),
            success: true
        });
        
        res.send(newInventory)
    } catch (error) {
        await session.abortTransaction();
        await session.endSession()
        
        // Log failed audit action
        await logAuditAction({
            action: 'PRODUCT_CREATE',
            adminId: req.user._id,
            resourceType: 'product',
            resourceId: new mongoose.Types.ObjectId(),
            before: null,
            after: req.body,
            description: `Failed to create product: ${req.body?.title || 'Unknown'}`,
            ipAddress: getClientIpAddress(req),
            success: false,
            errorMessage: error.message
        });
        
        res.status(400).send({ message: error.message })
    }
})
router.put('/:id', adminGuard, async (req, res) => {
    try {
        let result = await productSchema.findOne({
            isDeleted: false,
            _id: req.params.id
        })
        if (result) {
            let originalData = result.toObject();
            let keys = Object.keys(req.body);
            for (const key of keys) {
                if (key === 'images') {
                    result.images = normalizeImageList(req.body.images)
                    continue;
                }
                result[key] = req.body[key]
            }
            if (req.body.title) {
                result.slug = slugify(req.body.title, {
                    replacement: '-',
                    lower: false,
                    remove: undefined,
                });
            }
            await result.save();

            if (Object.prototype.hasOwnProperty.call(req.body, 'images')) {
                await syncProductMediaFromImages(result._id, result.images)
            }
            
            // Determine action type based on what was changed
            let actionType = 'PRODUCT_UPDATE_INFO';
            let fieldsTouched = [];
            if (req.body.price !== undefined && req.body.price !== originalData.price) {
                actionType = 'PRODUCT_UPDATE_PRICE';
                fieldsTouched.push('price');
            }
            if (req.body.title !== undefined && req.body.title !== originalData.title) {
                fieldsTouched.push('title');
            }
            if (req.body.description !== undefined && req.body.description !== originalData.description) {
                fieldsTouched.push('description');
            }
            
            // Log audit action
            const changes = getChangesDiff(originalData, result.toObject(), Object.keys(req.body));
            await logAuditAction({
                action: actionType,
                adminId: req.user._id,
                resourceType: 'product',
                resourceId: result._id,
                before: originalData,
                after: changes.after,
                description: `Updated product "${result.title}": ${fieldsTouched.join(', ')}`,
                ipAddress: getClientIpAddress(req),
                success: true
            });
            
            res.send(result);
        } else {
            res.status(404).send({
                message: "ID NOT FOUND"
            })
        }
    } catch (error) {
        res.status(400).send({
            message: error.message || "SOMETHING WENT WRONG"
        })
    }
})
router.delete('/:id', adminGuard, async (req, res) => {
    try {
        let result = await productSchema.findOne({
            isDeleted: false,
            _id: req.params.id
        })
        if (result) {
            let productData = result.toObject();
            result.isDeleted = true;
            await result.save();
            await productMediaSchema.updateMany(
                {
                    product: result._id,
                    isDeleted: false
                },
                {
                    isDeleted: true,
                    isDefault: false
                }
            );
            
            // Log audit action
            await logAuditAction({
                action: 'PRODUCT_DELETE',
                adminId: req.user._id,
                resourceType: 'product',
                resourceId: result._id,
                before: productData,
                after: { isDeleted: true },
                description: `Deleted product: ${result.title}`,
                ipAddress: getClientIpAddress(req),
                success: true
            });
            
            res.send(result);
        } else {
            res.status(404).send({
                message: "ID NOT FOUND"
            })
        }
    } catch (error) {
        res.status(400).send({
            message: error.message || "SOMETHING WENT WRONG"
        })
    }

})

module.exports = router;