let multer = require("multer");
let path = require('path')
let fs = require('fs')

let uploadDirectory = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

function parseMbLimit(value, fallbackMb) {
    let parsed = Number.parseInt(String(value || ''), 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
        return fallbackMb;
    }
    return parsed;
}

let maxImageUploadSizeMb = parseMbLimit(process.env.MAX_IMAGE_UPLOAD_SIZE_MB, 10);
let maxExcelUploadSizeMb = parseMbLimit(process.env.MAX_EXCEL_UPLOAD_SIZE_MB, 10);

let imageLimits = {
    fileSize: maxImageUploadSizeMb * 1024 * 1024
};

let excelLimits = {
    fileSize: maxExcelUploadSizeMb * 1024 * 1024
};

//ghi vao dau? - ghi ten la gi->storage
let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDirectory)
    },
    filename: function (req, file, cb) {
        //name + ext
        let ext = path.extname(file.originalname);//wtdd.png->.png
        let fileName = Date.now() + '-' + Math.round(Math.random() * 1000_000_000) + ext;
        cb(null, fileName)
    }
})
let filterImage = function (req, file, cb) {
    if (file.mimetype.startsWith('image')) {
        cb(null, true)
    } else {
        cb(new Error("dinh dang file khong dung "))
    }
}
let filterExcel = function (req, file, cb) {
    if (file.mimetype.includes('spreadsheetml')) {
        cb(null, true)
    } else {
        cb(new Error("dinh dang file khong dung "))
    }
}
module.exports = {
    uploadImage: multer({
        storage: storage,
        limits: imageLimits,
        fileFilter: filterImage
    }),
    uploadExcel: multer({
        storage: storage,
        limits: excelLimits,
        fileFilter: filterExcel
    }),
    maxImageUploadSizeMb: maxImageUploadSizeMb,
    maxExcelUploadSizeMb: maxExcelUploadSizeMb
}
