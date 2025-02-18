const mongoose = require("mongoose");
const {Schema} = mongoose;

const cartSchema = new Schema({
    userId: {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    items: [{
        productId :{
            type : Schema.Types.ObjectId,
            ref : "Product",
            required : true
        },
        size: {
            type: Number,
            required: true
        },
        quantity: {
            type : Number,
            default : 1
        },
        price: {
            type: Number,
            required : true
        },
        totalPrice: {
            type : Number,
            required : true
            // default: function () { return this.quantity * this.price; } // Auto-calculate
        },
        status: {
            type : String,
            default : "placed"
        },
        cancellationReason: {
            type : String,
            default : null
        }
    }],
    cartTotal :{
        type: Number,
        required: true,
        default: 0
    },

},{ timestamps: true})



const Cart = mongoose.model("Cart",cartSchema);
module.exports = Cart;



