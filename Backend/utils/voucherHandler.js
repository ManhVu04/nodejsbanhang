function normalizeVoucherCode(code) {
    return String(code || '').trim().toUpperCase();
}

function isVoucherLive(voucher, now = new Date()) {
    if (!voucher || voucher.isDeleted || !voucher.isActive) {
        return false;
    }

    if (voucher.startsAt && voucher.startsAt.getTime() > now.getTime()) {
        return false;
    }

    if (voucher.expiresAt && voucher.expiresAt.getTime() < now.getTime()) {
        return false;
    }

    if (typeof voucher.usageLimit === 'number' && voucher.usageLimit >= 0 && voucher.usedCount >= voucher.usageLimit) {
        return false;
    }

    return true;
}

function calculateVoucherDiscount(voucher, subTotal) {
    let amount = Number(subTotal);
    if (!Number.isFinite(amount) || amount < 0) {
        amount = 0;
    }

    if (!voucher || amount <= 0) {
        return 0;
    }

    if (amount < (voucher.minOrderValue || 0)) {
        return 0;
    }

    let discount = 0;
    if (voucher.discountType === 'PERCENT') {
        discount = amount * (voucher.discountValue / 100);
    } else if (voucher.discountType === 'FIXED') {
        discount = voucher.discountValue;
    }

    if (typeof voucher.maxDiscount === 'number' && voucher.maxDiscount > 0) {
        discount = Math.min(discount, voucher.maxDiscount);
    }

    discount = Math.max(0, Math.min(discount, amount));
    return Number(discount.toFixed(0));
}

function validateVoucherForOrder(voucher, subTotal) {
    if (!voucher) {
        return { valid: false, message: 'Voucher khong ton tai', discount: 0 };
    }

    if (!isVoucherLive(voucher)) {
        return { valid: false, message: 'Voucher khong con hieu luc', discount: 0 };
    }

    if (Number(subTotal) < (voucher.minOrderValue || 0)) {
        return {
            valid: false,
            message: `Don hang toi thieu ${(voucher.minOrderValue || 0).toLocaleString('vi-VN')}d de ap dung voucher`,
            discount: 0
        };
    }

    let discount = calculateVoucherDiscount(voucher, subTotal);
    if (discount <= 0) {
        return { valid: false, message: 'Voucher khong ap dung duoc cho don hang nay', discount: 0 };
    }

    return { valid: true, message: 'Voucher hop le', discount };
}

module.exports = {
    normalizeVoucherCode,
    isVoucherLive,
    calculateVoucherDiscount,
    validateVoucherForOrder
};
