let inventoryModel = require('../schemas/inventories');

async function deductAvailableStock(productId, quantity, session) {
    let inventoryUpdate = await inventoryModel.findOneAndUpdate(
        {
            product: productId,
            $expr: {
                $gte: [
                    { $subtract: ['$stock', '$reserved'] },
                    quantity
                ]
            }
        },
        {
            $inc: { stock: -quantity, soldCount: quantity }
        },
        { new: true, session }
    );

    if (!inventoryUpdate) {
        throw new Error('Khong du ton kho kha dung');
    }

    return inventoryUpdate;
}

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

module.exports = { deductAvailableStock, releaseReservedStock };
