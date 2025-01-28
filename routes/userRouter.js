const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const {userAuth,adminAuth, isBlocked} = require("../middlewares/auth");



router.get("/pageNotFound",userController.pageNotFound)

//sign up management
router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    res.redirect('/');
})
//login management
router.get("/login",userController.loadLogin);
router.post("/login",userController.login);
router.get("/logout",userController.logout);

//home page and Shop
router.get("/",isBlocked,userController.loadHomepage);
router.get("/shop",userAuth,userController.loadShoppingpage)





module.exports = router