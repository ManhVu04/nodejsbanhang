let mongoose = require('mongoose');
let productSchema = mongoose.Schema({
    sku: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    price: {
        type: Number,
        default: 0,
        min: 0
    },
    description:{
        type: String,
        default:"",
    },
    images:{
        type:[String],
        default:[]
    },
    averageRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    reviewCount: {
        type: Number,
        min: 0,
        default: 0
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    category:{
        type:mongoose.Types.ObjectId,
        ref:'category'
    }
},{
    timestamps:true
})
productSchema.index({ title: 'text', description: 'text' });
module.exports = new mongoose.model('product',productSchema)