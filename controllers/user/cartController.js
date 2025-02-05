const User = require("../../models/userSchema");




const cartPage = async (req,res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        
        res.render("cart", {
            user: userData
        });
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

module.exports = {
    cartPage
}