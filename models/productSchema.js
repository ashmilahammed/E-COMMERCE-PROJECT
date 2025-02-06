const mongoose = require("mongoose");
const { Schema } = mongoose;


const productSchema = new Schema({
    productName: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    brand: {
        type: String,
        required: true,
    },
    productOffer: {
        type: Number,
        default: 0,
    },
    productImage: {
        type: [String],
        required: true,
    },
    status: {
        type: String,
        enum: ["Available", "out of stock", "Discontinued"],
        required: true,
        default: "Available",
    },

    variants: [{
       
        size: {
            type: Number,
            required: true,
        },
        regularPrice: {
            type: Number,
            required: true,
        },
        salePrice: {
            type: Number,
            required: true,
        },
        quantity: {
            type: Number,
            default: true,
        },
        status: {
            type: String,
            enum: ["Available", "out of stock", "Discontinued"],
            required: true,
            default: "Available",
        }
    }],

    isBlocked: {
        type: Boolean,
        default: false,
    },


}, { timestamps: true });


const Product = mongoose.model("Product", productSchema);

module.exports = Product;












