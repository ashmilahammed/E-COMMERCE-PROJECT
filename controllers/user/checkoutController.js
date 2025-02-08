const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");





const getcheckOutPage = async (req,res) => {
    try {
 
        const userId = req.session.user;
        const userData = await User.findById(userId)
        res.render("checkOut",{
            user: userData
        })
        
    } catch (error) {
        
    }
}



module.exports = {
    getcheckOutPage
}