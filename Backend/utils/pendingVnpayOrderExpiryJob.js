let mongoose = require('mongoose');
let orderModel = require('../schemas/orders');
let paymentModel = require('../schemas/payments');
let inventoryModel = require('../schemas/inventories');
let inventoryLogModel = require('../schemas/inventoryLogs');
let voucherModel = require('../schemas/vouchers');

const JOB_INTERVAL_MS = 60 * 1000;
const DEFAULT_VNPAY_TIMEOUT_MINUTES = 15;
const EXPIRE_BATCH_SIZE = 30;

let pendingVnpayOrderExpiryInterval = null;

function getVnpayTimeoutMinutes() {
    let configuredMinutes = Number.parseInt(
        process.env.VNPAY_PENDING_TIMEOUT_MINUTES || `${DEFAULT_VNPAY_TIMEOUT_MINUTES}`,
        10
    );

    if (!Number.isInteger(configuredMinutes) || configuredMinutes < 1 || configuredMinutes > 240) {
        return DEFAULT_VNPAY_TIMEOUT_MINUTES;
    }

    return configuredMinutes;
}

function buildCancelReason(cancelReason) {
    let normalizedCancelReason = String(cancelReason || '').trim();
    if (!normalizedCancelReason) {
        return 'Don VNPay qua han thanh toan';
    }
    return normalizedCancelReason;
}

function buildFailedProviderResponse(existingProviderResponse, providerResponse, cancelReason) {
    return {
        ...(existingProviderResponse || {}),
        ...(providerResponse || {}),
        autoCancelled: true,
        cancelReason,
        cancelledAt: new Date().toISOString()
    };
}

async function restoreOrderStockInSession(order, session, cancelReason) {
    for (let item of order?.items || []) {
        let quantity = Number(item?.quantity || 0);
        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error('So luong san pham trong don hang khong hop le');
        }

        await inventoryModel.findOneAndUpdate(
            { product: item?.product },
            { $inc: { stock: quantity, soldCount: -quantity } },
            { session }
        );

        await new inventoryLogModel({
            product: item?.product,
            type: 'IN',
            quantity,
            reason: `Tra lai kho do ${cancelReason}`,
            order: order?._id
        }).save({ session });
    }
}

async function cancelPendingVnpayOrderByPaymentId(paymentId, options = {}) {
    if (!mongoose.isValidObjectId(paymentId)) {
        return false;
    }

    let session = await mongoose.startSession();
    session.startTransaction();
    try {
        let payment = await paymentModel.findOne({
            _id: paymentId,
            method: 'VNPay'
        }).session(session);

        if (!payment || payment?.status === 'paid' || payment?.status === 'refunded') {
            await session.commitTransaction();
            await session.endSession();
            return false;
        }

        let order = await orderModel.findOne({
            _id: payment?.order,
            paymentMethod: 'VNPay',
            status: 'Pending'
        }).session(session);

        let cancelReason = buildCancelReason(options?.cancelReason);

        if (payment?.status === 'pending' && options?.markPaymentFailed !== false) {
            payment.status = 'failed';
            payment.providerResponse = buildFailedProviderResponse(
                payment?.providerResponse,
                options?.providerResponse,
                cancelReason
            );
            await payment.save({ session });
        }

        if (!order) {
            await session.commitTransaction();
            await session.endSession();
            return false;
        }

        await restoreOrderStockInSession(order, session, cancelReason);

        if (order?.voucher?.voucherId) {
            await voucherModel.findOneAndUpdate(
                {
                    _id: order?.voucher?.voucherId,
                    usedCount: { $gt: 0 }
                },
                {
                    $inc: { usedCount: -1 }
                },
                {
                    session
                }
            );
        }

        order.status = 'Cancelled';
        await order.save({ session });

        await session.commitTransaction();
        await session.endSession();
        return true;
    } catch (error) {
        await session.abortTransaction();
        await session.endSession();
        return false;
    }
}

async function runPendingVnpayOrderExpiryJob() {
    let timeoutMinutes = getVnpayTimeoutMinutes();
    let cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    while (true) {
        let candidatePayments = await paymentModel.find({
            method: 'VNPay',
            $or: [
                {
                    status: 'failed'
                },
                {
                    status: 'pending',
                    createdAt: { $lte: cutoffTime }
                }
            ]
        })
            .select('_id status')
            .sort({ createdAt: 1 })
            .limit(EXPIRE_BATCH_SIZE);

        if (!candidatePayments || candidatePayments.length === 0) {
            break;
        }

        for (let payment of candidatePayments) {
            let isFailedPayment = payment?.status === 'failed';

            await cancelPendingVnpayOrderByPaymentId(payment?._id, {
                cancelReason: isFailedPayment
                    ? 'Don VNPay thanh toan that bai'
                    : 'Don VNPay qua han thanh toan',
                providerResponse: {
                    timeoutAt: new Date().toISOString(),
                    timeoutMinutes
                },
                markPaymentFailed: !isFailedPayment
            });
        }

        if (candidatePayments.length < EXPIRE_BATCH_SIZE) {
            break;
        }
    }
}

function startPendingVnpayOrderExpiryJob() {
    if (pendingVnpayOrderExpiryInterval) {
        return;
    }

    runPendingVnpayOrderExpiryJob().catch(() => { });

    pendingVnpayOrderExpiryInterval = setInterval(() => {
        runPendingVnpayOrderExpiryJob().catch(() => { });
    }, JOB_INTERVAL_MS);

    if (typeof pendingVnpayOrderExpiryInterval?.unref === 'function') {
        pendingVnpayOrderExpiryInterval.unref();
    }
}

module.exports = {
    cancelPendingVnpayOrderByPaymentId,
    runPendingVnpayOrderExpiryJob,
    startPendingVnpayOrderExpiryJob
};
