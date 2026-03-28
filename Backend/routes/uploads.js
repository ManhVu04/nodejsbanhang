var express = require("express");
var router = express.Router();
let { uploadImage, uploadExcel } = require('../utils/uploadHandler')
let exceljs = require('exceljs')
let path = require('path')
let fs = require('fs')
let mongoose = require('mongoose');
let productModel = require('../schemas/products')
let inventoryModel = require('../schemas/inventories')
let categoryModel = require('../schemas/categories')
let userModel = require('../schemas/users')
let roleModel = require('../schemas/roles')
let { sendAccountPasswordMail } = require('../utils/mailHandler')
let crypto = require('crypto')
let slugify = require('slugify')
let { CheckLogin, CheckRole } = require('../utils/authHandler')

const adminGuard = [CheckLogin, CheckRole(['Admin'])];

function buildUploadUrl(req, filename) {
    let configuredFrontend = String(process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
    if (configuredFrontend) {
        return `${configuredFrontend}/api/v1/upload/${filename}`;
    }
    return `${req.protocol}://${req.get('host')}/api/v1/upload/${filename}`;
}

function randomPassword(length = 16) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const bytes = crypto.randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars[bytes[i] % chars.length];
    }
    return password;
}

function getCellStringValue(cell) {
    const value = cell ? cell.value : null;
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value.toString().trim();
    }

    if (value instanceof Date) {
        return value.toISOString().trim();
    }

    if (typeof value === 'object') {
        if (Array.isArray(value.richText)) {
            return value.richText.map(item => item.text).join('').trim();
        }
        if (Object.prototype.hasOwnProperty.call(value, 'result')) {
            return (value.result === null || value.result === undefined)
                ? ''
                : value.result.toString().trim();
        }
        if (typeof value.text === 'string') {
            return value.text.trim();
        }
        if (typeof value.hyperlink === 'string') {
            return value.hyperlink.trim();
        }
        return '';
    }

    return value.toString().trim();
}

router.post('/an_image', adminGuard, uploadImage.single('file')
    , function (req, res, next) {
        if (!req.file) {
            res.status(400).send({
                message: "file khong duoc rong"
            })
        } else {
            res.send({
                filename: req.file.filename,
                path: req.file.path,
                size: req.file.size,
                mimeType: req.file.mimetype,
                url: buildUploadUrl(req, req.file.filename)
            })
        }
    })
router.get('/:filename', function (req, res, next) {
    let filename = path.join(__dirname, '../uploads', req.params.filename)
    res.sendFile(filename)
})

router.post('/multiple_images', adminGuard, uploadImage.array('files', 5)
    , function (req, res, next) {
        if (!req.files) {
            res.status(400).send({
                message: "file khong duoc rong"
            })
        } else {
            // res.send({
            //     filename: req.file.filename,
            //     path: req.file.path,
            //     size: req.file.size
            // })

            res.send(req.files.map(f => {
                return {
                    filename: f.filename,
                    path: f.path,
                    size: f.size,
                    mimeType: f.mimetype,
                    url: buildUploadUrl(req, f.filename)
                }
            }))
        }
    })

router.post('/excel', adminGuard, uploadExcel.single('file')
    , async function (req, res, next) {
        if (!req.file) {
            res.status(400).send({
                message: "file khong duoc rong"
            })
        } else {
            //wookbook->worksheet->row/column->cell
            let workBook = new exceljs.Workbook()
            let filePath = path.join(__dirname, '../uploads', req.file.filename)
            await workBook.xlsx.readFile(filePath)
            let worksheet = workBook.worksheets[0];
            let result = [];

            let categoryMap = new Map();
            let categories = await categoryModel.find({
            })
            for (const category of categories) {
                categoryMap.set(category.name, category._id)
            }

            let products = await productModel.find({})
            let getTitle = products.map(
                p => p.title
            )
            let getSku = products.map(
                p => p.sku
            )

            for (let index = 2; index <= worksheet.rowCount; index++) {
                let errorsRow = [];
                const element = worksheet.getRow(index);
                let sku = element.getCell(1).value;
                let title = element.getCell(2).value;
                let category = element.getCell(3).value;
                let price = Number.parseInt(element.getCell(4).value);
                let stock = Number.parseInt(element.getCell(5).value);

                if (price < 0 || isNaN(price)) {
                    errorsRow.push("price khong duoc nho hon 0 va la so")
                }
                if (stock < 0 || isNaN(stock)) {
                    errorsRow.push("stock khong duoc nho hon 0 va la so")
                }
                if (!categoryMap.has(category)) {
                    errorsRow.push("category khong hop le")
                }
                if (getSku.includes(sku)) {
                    errorsRow.push("sku da ton tai")
                }
                if (getTitle.includes(title)) {
                    errorsRow.push("title da ton tai")
                }

                if (errorsRow.length > 0) {
                    result.push({
                        success: false,
                        data: errorsRow
                    })
                    continue;
                }
                let session = await mongoose.startSession()
                session.startTransaction()
                try {
                    let newProducts = new productModel({
                        sku: sku,
                        title: title,
                        slug: slugify(title, {
                            replacement: '-',
                            lower: false,
                            remove: undefined,
                        }),
                        description: title,
                        category: categoryMap.get(category),
                        price: price
                    })
                    await newProducts.save({ session })
                    let newInventory = new inventoryModel({
                        product: newProducts._id,
                        stock: stock
                    })
                    await newInventory.save({ session });
                    await newInventory.populate('product')
                    await session.commitTransaction();
                    await session.endSession()
                    getTitle.push(title);
                    getSku.push(sku)
                    result.push({
                        success: true,
                        data: newInventory
                    })
                } catch (error) {
                    await session.abortTransaction();
                    await session.endSession()
                    result.push({
                        success: false,
                        data: error.message
                    })
                }
            }
            fs.unlinkSync(filePath)
            result = result.map((r, index) => {
                if (r.success) {
                    return {
                        [index + 1]: r.data
                    }
                } else {
                    return {
                        [index + 1]: r.data.join(',')
                    }
                }
            })
            res.send(result)
        }

    })

router.post('/excel/users', adminGuard, uploadExcel.single('file')
    , async function (req, res, next) {
        if (!req.file) {
            return res.status(400).send({
                message: "file khong duoc rong"
            })
        }

        let filePath = path.join(__dirname, '../uploads', req.file.filename)
        let workBook = new exceljs.Workbook()
        let result = [];

        try {
            await workBook.xlsx.readFile(filePath)
            let worksheet = workBook.worksheets[0];

            let roleUser = await roleModel.findOne({
                name: { $regex: /^user$/i },
                isDeleted: false
            })

            if (!roleUser) {
                return res.status(400).send({
                    message: "khong tim thay role user"
                })
            }

            let users = await userModel.find({ isDeleted: false })
            let existingUsernames = new Set(users.map(u => u.username))
            let existingEmails = new Set(users.map(u => u.email))

            for (let index = 2; index <= worksheet.rowCount; index++) {
                let errorsRow = [];
                const row = worksheet.getRow(index);
                let username = getCellStringValue(row.getCell(1));
                let email = getCellStringValue(row.getCell(2)).toLowerCase();

                if (!username) {
                    errorsRow.push('username khong duoc rong')
                }
                if (!email) {
                    errorsRow.push('email khong duoc rong')
                }
                if (email && !/^\S+@\S+\.\S+$/.test(email)) {
                    errorsRow.push('email khong hop le')
                }
                if (existingUsernames.has(username)) {
                    errorsRow.push('username da ton tai')
                }
                if (existingEmails.has(email)) {
                    errorsRow.push('email da ton tai')
                }

                if (errorsRow.length > 0) {
                    result.push({
                        success: false,
                        data: errorsRow
                    })
                    continue;
                }

                let password = randomPassword(16)

                try {
                    let newUser = new userModel({
                        username: username,
                        email: email,
                        password: password,
                        role: roleUser._id
                    })
                    await newUser.save()
                    await sendAccountPasswordMail(email, username, password)

                    existingUsernames.add(username)
                    existingEmails.add(email)

                    result.push({
                        success: true,
                        data: {
                            username: newUser.username,
                            email: newUser.email
                        }
                    })
                } catch (error) {
                    result.push({
                        success: false,
                        data: error.message
                    })
                }
            }

            result = result.map((r, index) => {
                if (r.success) {
                    return {
                        [index + 1]: r.data
                    }
                }
                return {
                    [index + 1]: Array.isArray(r.data) ? r.data.join(',') : r.data
                }
            })

            return res.send(result)
        } catch (error) {
            return res.status(400).send({ message: error.message })
        } finally {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
        }

    })
module.exports = router;