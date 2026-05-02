let mongoose = require('mongoose');
let reservationModel = require('../schemas/reservations');
let { releaseReservedStock } = require('./inventoryHelper');

const JOB_INTERVAL_MS = 60 * 1000;
const RESERVATION_BATCH_SIZE = 50;

let reservationExpiryInterval = null;

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

        await releaseReservedStock(reservation.items, session);

        reservation.status = 'expired';
        reservation.expiredAt = now;
        reservation.releasedAt = now;
        await reservation.save({ session });

        await session.commitTransaction();
        await session.endSession();
        return true;
    } catch (err) {
        await session.abortTransaction();
        await session.endSession();
        console.error(`[reservationExpiryJob] Failed to expire reservation ${reservationId}: ${err.message}`);
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

        await Promise.all(candidates.map(c => expireSingleReservation(c._id, now)));

        if (candidates.length < RESERVATION_BATCH_SIZE) {
            break;
        }
    }
}

function startReservationExpiryJob() {
    if (reservationExpiryInterval) {
        return;
    }

    let runJob = () => runReservationExpiryJob().catch(err => {
        console.error(`[reservationExpiryJob] Job error: ${err.message}`);
    });

    runJob();
    reservationExpiryInterval = setInterval(runJob, JOB_INTERVAL_MS);

    if (typeof reservationExpiryInterval?.unref === 'function') {
        reservationExpiryInterval.unref();
    }
}

module.exports = {
    startReservationExpiryJob,
    runReservationExpiryJob
};
