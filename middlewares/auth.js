const User = require("../models/userSchema");



const userAuth = async (req, res, next) => {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user);
            if (user && !user.isBlocked) {
                req.user = user;  
                return next();
            }
        }
        res.redirect("/login");
    } catch (error) {
        console.error("Error in userAuth middleware:", error);
        res.status(500).send("Internal Server Error");
    }
};




const adminAuth = (req, res, next) => {
    try {

        if (!req.session.admin) {
            return res.redirect("/admin/login");
        }
        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};




const isBlocked = async (req, res, next) => {
    try {

        if (!req.session.user) return next();
        const user = await User.findById(req.session.user);
        if (user && user.isBlocked) {
            
            req.session.user = null;
            req.session.blockMessage = "Your account has been blocked. Please contact support.";
            return res.redirect('/login');
        }
        next();
    } catch (error) {
        console.error("Error in isBlocked middleware:", error);
        res.redirect('/admin/pageError');
    }
};




module.exports = {
    userAuth,
    adminAuth,
    isBlocked
}