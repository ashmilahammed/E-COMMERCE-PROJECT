const User = require("../models/userSchema");



// const userAuth = (req, res, next) => {
//     if (req.session.user) {
//         User.findById(req.session.user)
//             .then(data => {
//                 if (data && !data.isBlocked) {
//                     next();
//                 } else {
//                     res.redirect("/login")
//                 }
//             })
//             .catch(error => {
//                 console.log("Error in user auth Middleware", error);
//                 res.status(500).send("Internal Server error")
//             })
//     } else {
//         res.redirect("/login")
//     }
// }
// const userAuth = async (req, res, next) => {
//     try {
//         if (!req.session.user) {
//             return res.redirect("/login"); // Ensure session exists first
//         }

//         const user = await User.findById(req.session.user);
//         if (!user) {
//             return res.redirect("/login"); // If user not found
//         }

//         if (user.isBlocked) {
//             return res.status(403).send("Access Denied: User is blocked");
//         }

//         req.user = user._id.toString();  // Attach only user ID for efficiency
//         next();
//     } catch (error) {
//         console.error("Error in userAuth middleware:", error);
//         res.status(500).send("Internal Server Error");
//     }
// };



// const adminAuth = (req,res,next) => {
//     User.findOne({isAdmin:true})
//     .then(data => {
//         if(data){
//             next();
//         }else {
//             res.redirect("/admin/login")
//         }
//     })
//     .catch(error=>{
//         console.log("Error in admin auth Middleware",error);
//         res.status(500).send("Internal server error")
//     })
// }


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
            console.log("User is blocked, redirecting to login.");
            req.session.user = null;
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