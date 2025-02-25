const mongoose = require("mongoose");
const {Schema} = mongoose;



const categorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
        required: true,
    },
    categoryOffer: {
        type: Number, 
        default: 0,
    },
    startDate: {  
        type: Date,
        default: null, 
    },
    endDate: { 
        type: Date,
        default: null,
        validate: {
            validator: function (value) {
                return !value || value > this.startDate; 
            },
            message: "End date must be after the start date",
        },
    },
    isListed: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });



const Category = mongoose.model("Category",categorySchema);

module.exports = Category;
