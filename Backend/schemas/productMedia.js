let mongoose = require('mongoose');

let productMediaSchema = mongoose.Schema({
    product: {
        type: mongoose.Types.ObjectId,
        ref: 'product',
        required: true
    },
    mediaType: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    fileFormat: {
        type: String,
        required: true,
        lowercase: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    altText: {
        type: String,
        default: ''
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

productMediaSchema.pre('save', async function() {
    if (this.isDefault && !this.isDeleted) {
        await mongoose.model('productMedia').updateMany(
            { 
                product: this.product, 
                _id: { $ne: this._id },
                isDeleted: false 
            },
            { isDefault: false }
        );
    }
});

productMediaSchema.index({ product: 1, displayOrder: 1 });
productMediaSchema.index({ product: 1, isDeleted: 1 });

module.exports = new mongoose.model('productMedia', productMediaSchema);
