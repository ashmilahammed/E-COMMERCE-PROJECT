const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");





const getcheckOutPage = async (req,res) => {
    try {

        res.render("checkOut")
        
    } catch (error) {
        
    }
}



module.exports = {
    getcheckOutPage
}