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
let maxVideoUploadSizeMb = parseMbLimit(process.env.MAX_VIDEO_UPLOAD_SIZE_MB, 100);

let imageLimits = {
    fileSize: maxImageUploadSizeMb * 1024 * 1024
};

let excelLimits = {
    fileSize: maxExcelUploadSizeMb * 1024 * 1024
};

let videoLimits = {
    fileSize: maxVideoUploadSizeMb * 1024 * 1024
};

let productMediaLimits = {
    fileSize: Math.max(maxImageUploadSizeMb, maxVideoUploadSizeMb) * 1024 * 1024
};

const allowedVideoFormats = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const allowedVideoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.jfif', '.tif', '.tiff'];

function getFileExtension(file) {
    return path.extname(String(file?.originalname || '')).toLowerCase();
}

function isOctetStream(file) {
    return String(file?.mimetype || '').toLowerCase() === 'application/octet-stream';
}

function isVideoExtension(extension) {
    return allowedVideoExtensions.includes(String(extension || '').toLowerCase());
}

function isImageExtension(extension) {
    return allowedImageExtensions.includes(String(extension || '').toLowerCase());
}

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
    } else if (isOctetStream(file) && isImageExtension(getFileExtension(file))) {
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
let filterVideo = function (req, file, cb) {
    if (allowedVideoFormats.includes(file.mimetype)) {
        cb(null, true)
    } else if (isOctetStream(file) && isVideoExtension(getFileExtension(file))) {
        cb(null, true)
    } else {
        cb(new Error("dinh dang video khong dung (chi ho tro mp4, webm, ogg, quicktime)"))
    }
}

let filterProductMedia = function (req, file, cb) {
    let extension = getFileExtension(file);
    let mimeType = String(file?.mimetype || '').toLowerCase();
    let isImageMime = mimeType.startsWith('image');
    let isVideoMime = allowedVideoFormats.includes(mimeType);
    let isKnownByExtension = isImageExtension(extension) || isVideoExtension(extension);
    let isKnownOctet = isOctetStream(file) && isKnownByExtension;

    if (isImageMime || isVideoMime || isKnownOctet || isKnownByExtension) {
        cb(null, true)
    } else {
        cb(new Error("dinh dang file khong dung"))
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
    uploadVideo: multer({
        storage: storage,
        limits: videoLimits,
        fileFilter: filterVideo
    }),
    uploadProductMedia: multer({
        storage: storage,
        limits: productMediaLimits,
        fileFilter: filterProductMedia
    }),
    maxImageUploadSizeMb: maxImageUploadSizeMb,
    maxExcelUploadSizeMb: maxExcelUploadSizeMb,
    maxVideoUploadSizeMb: maxVideoUploadSizeMb
}
