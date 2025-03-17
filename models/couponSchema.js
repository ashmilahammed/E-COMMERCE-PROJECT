const mongoose = require("mongoose");
const {Schema} = mongoose;




const couponSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    couponCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true, 
        trim: true
    },
    discountType: {
        type: String,
        enum: ['percentage'], 
        default: "percentage"
    },
    discountValue: {  
        type: Number,
        required: true,
        min: [0, "Discount value must be a positive number"]
    },
    minPurchaseAmount: { 
        type: Number,
        default: 0,
        min: [0, "Minimum purchase amount must be a positive number"]
    },
    maxDiscountAmount: { 
        type: Number, 
        default: null
    },
    startDate: {  
        type: Date,
        required: true
    },
    endDate: { 
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                return this.startDate ? value > this.startDate : true;
            },
            message: "End date must be after the start date"
        }
    },
    usageLimit: {
        type: Number, 
        default: 1,
        min: [1, "Usage limit must be at least 1"]
    },
    isActive: {
        type: Boolean,
        default: true
    }

},{timestamps:true});



const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;








