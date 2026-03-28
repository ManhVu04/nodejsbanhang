const express = require('express')
let router = express.Router()
let slugify = require('slugify')
let categorySchema = require('../schemas/categories');
let { CheckLogin, CheckRole } = require('../utils/authHandler')

const adminGuard = [CheckLogin, CheckRole(['Admin'])];


router.get('/:id', async (req, res) => {//req.params
    try {
        let dataCategories = await categorySchema.findOne({
            isDeleted: false,
            _id: req.params.id
        });
        if (!dataCategories) {
            res.status(404).send(
                { message: "ID NOT FOUND" }
            )
        } else {
            res.send(dataCategories)
        }
    } catch (error) {
        res.status(404).send(
            { message: "something went wrong" }
        )
    }
})
router.get('/', async (req, res) => {
    let queries = req.query;
    let nameQ = queries.name?queries.name:'';
    let dataCategories = await categorySchema.find({
        isDeleted: false,
        name:new RegExp(nameQ,'i')
    }).populate('products')
    res.send(dataCategories)
})
router.get('/:id/products', async (req, res) => {//req.params
    let id = req.params.id;
    let filterData = await categorySchema.findOne(
        {
            _id: id,
            isDeleted: false
        }
    ).populate('products')
    if (!filterData) {
        res.status(404).send("id khong hop le")
    } else {
        res.send(filterData.products)
    }
})
router.post('/', adminGuard, async function (req, res, next) {
    let newItem = new categorySchema({
        name: req.body.name,
        slug: slugify(req.body.name, {
            replacement: '-',
            lower: false,
            remove: undefined,
        }),
        image: req.body.image
    })
    await newItem.save();
    res.send(newItem)
})
router.put('/:id', adminGuard, async function (req, res, next) {
    try {
        let updateData = { ...req.body };
        if (req.body.name) {
            updateData.slug = slugify(req.body.name, {
                replacement: '-',
                lower: false,
                remove: undefined,
            });
        }

        let getItem = await categorySchema.findByIdAndUpdate(
            req.params.id, updateData, {
            new: true
        }
        )
        if (getItem) {
            res.send(getItem)
        } else {
            res.status(404).send({
                message: "ID NOT FOUND"
            })
        }
    } catch (error) {
        res.status(400).send(
            { message: error.message }
        )
    }
})
router.delete('/:id', adminGuard, async function (req, res, next) {
    try {
        let getItem = await categorySchema.findOne({
            isDeleted: false,
            _id: req.params.id
        });
        if (!getItem) {
            res.status(404).send(
                { message: "ID NOT FOUND" }
            )
        } else {
            getItem.isDeleted = true
            await getItem.save();
            res.send(getItem)
        }

    } catch (error) {
        res.status(400).send(
            { message: error.message }
        )
    }
})


module.exports = router;