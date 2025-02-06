const User = require("../../models/userSchema");
const Product = require("../../models/productSchema")




const getwishList = async (req,res) => {
    try {

        const userId = req.session.user;
        const userData = await User.findById(userId);
        
        res.render("wishlist", {
            user: userData
        });
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


module.exports = {
    getwishList
}