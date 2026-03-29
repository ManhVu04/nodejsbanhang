let mongoose = require('mongoose');
let reservationModel = require('../schemas/reservations');
let inventoryModel = require('../schemas/inventories');

const JOB_INTERVAL_MS = 60 * 1000;
const RESERVATION_BATCH_SIZE = 50;

let reservationExpiryInterval = null;

async function releaseReservedItemsForExpiredReservation(reservation, session) {
    for (let item of reservation?.items || []) {
        let updateResult = await inventoryModel.findOneAndUpdate(
            {
                product: item?.product,
                reserved: { $gte: item?.quantity }
            },
            {
                $inc: { reserved: -item?.quantity }
            },
            {
                new: true,
                session
            }
        );

        if (!updateResult) {
            throw new Error('Khong the giai phong ton dat tru khi expire reservation');
        }
    }
}

async function expireSingleReservation(reservationId, now) {
    let session = await mongoose.startSession();
    session.startTransaction();
    try {
        let reservation = await reservationModel.findOne({
            _id: reservationId,
            status: 'actived',
            expiresAt: { $lte: now }
        }).session(session);

        if (!reservation) {
            await session.commitTransaction();
            await session.endSession();
            return false;
        }

        await releaseReservedItemsForExpiredReservation(reservation, session);

        reservation.status = 'expired';
        reservation.expiredAt = now;
        reservation.releasedAt = now;
        await reservation.save({ session });

        await session.commitTransaction();
        await session.endSession();
        return true;
    } catch {
        await session.abortTransaction();
        await session.endSession();
        return false;
    }
}

async function runReservationExpiryJob() {
    let now = new Date();

    while (true) {
        let candidates = await reservationModel.find({
            status: 'actived',
            expiresAt: { $lte: now }
        })
            .select('_id')
            .sort({ expiresAt: 1 })
            .limit(RESERVATION_BATCH_SIZE);

        if (!candidates || candidates.length === 0) {
            break;
        }

        for (let candidate of candidates) {
            await expireSingleReservation(candidate?._id, now);
        }

        if (candidates.length < RESERVATION_BATCH_SIZE) {
            break;
        }
    }
}

function startReservationExpiryJob() {
    if (reservationExpiryInterval) {
        return;
    }

    runReservationExpiryJob().catch(() => { });

    reservationExpiryInterval = setInterval(() => {
        runReservationExpiryJob().catch(() => { });
    }, JOB_INTERVAL_MS);

    if (typeof reservationExpiryInterval?.unref === 'function') {
        reservationExpiryInterval.unref();
    }
}

module.exports = {
    startReservationExpiryJob,
    runReservationExpiryJob
};
