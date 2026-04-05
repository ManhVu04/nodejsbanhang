let express = require('express');
let router = express.Router();
let mongoose = require('mongoose');
let voucherModel = require('../schemas/vouchers');
let orderModel = require('../schemas/orders');
let { CheckLogin, CheckRole } = require('../utils/authHandler');
let { logAuditAction, getClientIpAddress } = require('../utils/auditHandler');
let { normalizeVoucherCode, validateVoucherForOrder } = require('../utils/voucherHandler');

const adminGuard = [CheckLogin, CheckRole(['Admin'])];

function safeResourceId(rawId) {
    if (mongoose.isValidObjectId(rawId)) {
        return rawId;
    }
    return new mongoose.Types.ObjectId();
}

function normalizeDiscountType(discountTypeValue) {
    return String(discountTypeValue || '').trim().toUpperCase();
}

router.get('/validate/:code', async function (req, res) {
    try {
        let code = normalizeVoucherCode(req.params.code);
        let subTotal = Number(req.query.subtotal || 0);

        if (!code) {
            return res.status(400).send({ message: 'Voucher khong hop le' });
        }

        if (!Number.isFinite(subTotal) || subTotal < 0) {
            return res.status(400).send({ message: 'Tong tien khong hop le' });
        }

        let voucher = await voucherModel.findOne({ code, isDeleted: false });
        let validation = validateVoucherForOrder(voucher, subTotal);

        if (!validation.valid) {
            return res.status(400).send({ message: validation.message });
        }

        return res.send({
            code: voucher.code,
            description: voucher.description,
            discountType: voucher.discountType,
            discountValue: voucher.discountValue,
            discountAmount: validation.discount,
            finalTotal: Math.max(0, subTotal - validation.discount)
        });
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
});

router.get('/', adminGuard, async function (req, res) {
    try {
        let vouchers = await voucherModel.find({ isDeleted: false }).sort({ createdAt: -1 });
        return res.send(vouchers);
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
});

router.post('/', adminGuard, async function (req, res) {
    try {
        let payload = {
            code: normalizeVoucherCode(req.body.code),
            description: req.body.description || '',
            discountType: normalizeDiscountType(req.body.discountType),
            discountValue: Number(req.body.discountValue || 0),
            minOrderValue: Number(req.body.minOrderValue || 0),
            maxDiscount: req.body.maxDiscount === null || req.body.maxDiscount === undefined || req.body.maxDiscount === ''
                ? null
                : Number(req.body.maxDiscount),
            usageLimit: req.body.usageLimit === null || req.body.usageLimit === undefined || req.body.usageLimit === ''
                ? null
                : Number(req.body.usageLimit),
            perUserLimit: Number(req.body.perUserLimit || 1),
            startsAt: req.body.startsAt || null,
            expiresAt: req.body.expiresAt || null,
            isActive: req.body.isActive !== false
        };

        if (!payload.code) {
            return res.status(400).send({ message: 'Ma voucher khong duoc de trong' });
        }

        let existing = await voucherModel.findOne({ code: payload.code });
        if (existing && !existing.isDeleted) {
            return res.status(400).send({ message: 'Ma voucher da ton tai' });
        }

        if (existing && existing.isDeleted) {
            Object.assign(existing, payload, { isDeleted: false });
            await existing.save();

            await logAuditAction({
                action: 'VOUCHER_UPDATE',
                adminId: req.user?._id,
                resourceType: 'voucher',
                resourceId: existing._id,
                before: null,
                after: existing.toObject(),
                description: `Restored voucher: ${existing.code}`,
                ipAddress: getClientIpAddress(req),
                success: true
            });

            return res.send(existing);
        }

        let newVoucher = new voucherModel(payload);
        await newVoucher.save();

        await logAuditAction({
            action: 'VOUCHER_CREATE',
            adminId: req.user?._id,
            resourceType: 'voucher',
            resourceId: newVoucher._id,
            before: null,
            after: newVoucher.toObject(),
            description: `Created voucher: ${newVoucher.code}`,
            ipAddress: getClientIpAddress(req),
            success: true
        });

        return res.send(newVoucher);
    } catch (error) {
        await logAuditAction({
            action: 'VOUCHER_CREATE',
            adminId: req.user?._id,
            resourceType: 'voucher',
            resourceId: new mongoose.Types.ObjectId(),
            before: null,
            after: req.body,
            description: `Failed to create voucher: ${req.body?.code || 'Unknown'}`,
            ipAddress: getClientIpAddress(req),
            success: false,
            errorMessage: error.message
        });

        return res.status(400).send({ message: error.message });
    }
});

router.put('/:id', adminGuard, async function (req, res) {
    try {
        let existingVoucher = await voucherModel.findOne({
            _id: req.params.id,
            isDeleted: false
        });

        if (!existingVoucher) {
            return res.status(404).send({ message: 'Voucher khong ton tai' });
        }

        let beforeData = existingVoucher.toObject();
        let updateData = { ...req.body };
        if (typeof updateData.code === 'string') {
            updateData.code = normalizeVoucherCode(updateData.code);
        }
        if (updateData.discountType !== undefined) {
            updateData.discountType = normalizeDiscountType(updateData.discountType);
        }

        let voucher = await voucherModel.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            updateData,
            { new: true }
        );

        await logAuditAction({
            action: 'VOUCHER_UPDATE',
            adminId: req.user?._id,
            resourceType: 'voucher',
            resourceId: voucher._id,
            before: beforeData,
            after: voucher.toObject(),
            description: `Updated voucher: ${voucher.code}`,
            ipAddress: getClientIpAddress(req),
            success: true
        });

        return res.send(voucher);
    } catch (error) {
        await logAuditAction({
            action: 'VOUCHER_UPDATE',
            adminId: req.user?._id,
            resourceType: 'voucher',
            resourceId: safeResourceId(req.params?.id),
            before: null,
            after: req.body,
            description: `Failed to update voucher: ${req.params?.id || 'Unknown'}`,
            ipAddress: getClientIpAddress(req),
            success: false,
            errorMessage: error.message
        });

        return res.status(400).send({ message: error.message });
    }
});

router.delete('/:id', adminGuard, async function (req, res) {
    try {
        let beforeData = await voucherModel.findOne({ _id: req.params.id, isDeleted: false });

        let voucher = await voucherModel.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { isDeleted: true, isActive: false },
            { new: true }
        );

        if (!voucher) {
            return res.status(404).send({ message: 'Voucher khong ton tai' });
        }

        await logAuditAction({
            action: 'VOUCHER_DELETE',
            adminId: req.user?._id,
            resourceType: 'voucher',
            resourceId: voucher._id,
            before: beforeData?.toObject() || null,
            after: voucher.toObject(),
            description: `Deleted voucher: ${voucher.code}`,
            ipAddress: getClientIpAddress(req),
            success: true
        });

        return res.send({ message: 'Da xoa voucher', voucher });
    } catch (error) {
        await logAuditAction({
            action: 'VOUCHER_DELETE',
            adminId: req.user?._id,
            resourceType: 'voucher',
            resourceId: safeResourceId(req.params?.id),
            before: null,
            after: null,
            description: `Failed to delete voucher: ${req.params?.id || 'Unknown'}`,
            ipAddress: getClientIpAddress(req),
            success: false,
            errorMessage: error.message
        });

        return res.status(400).send({ message: error.message });
    }
});

router.get('/usage/:code', adminGuard, async function (req, res) {
    try {
        let code = normalizeVoucherCode(req.params.code);
        let orders = await orderModel.countDocuments({ 'voucher.code': code });
        return res.send({ code, orders });
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
});

module.exports = router;
