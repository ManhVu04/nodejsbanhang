let inventoryModel = require('../schemas/inventories');

async function releaseReservedStock(items, session) {
    for (let item of items) {
        let updateResult = await inventoryModel.findOneAndUpdate(
            {
                product: item.product,
                reserved: { $gte: item.quantity }
            },
            {
                $inc: { reserved: -item.quantity }
            },
            {
                new: true,
                session
            }
        );

        if (!updateResult) {
            throw new Error('Khong the giai phong ton dat tru');
        }
    }
}

module.exports = { releaseReservedStock };
