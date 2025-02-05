const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const passport = require("passport");
const {userAuth,adminAuth, isBlocked} = require("../middlewares/auth");
const productController = require("../controllers/user/productController");
const cartController = require("../controllers/user/cartController")



router.get("/pageNotFound",userController.pageNotFound)

//sign up management
router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    req.session.user = req.session.passport.user
    res.redirect('/');
})
//login management
router.get("/login",userController.loadLogin);
router.post("/login",userController.login);
router.get("/logout",userController.logout);

//home page and Shop
router.get("/",isBlocked,userController.loadHomepage);
router.get("/shop",userAuth,userController.loadShoppingpage);

//Profile management
router.get("/forgot-password",profileController.getForgotPassword);
router.post("/forgot-email-valid",profileController.forgotEmailValid);
router.post("/verify-PassForgot-otp",profileController.verifyForgotPassOtp);
router.get("/reset-password",profileController.getResetPassPage);
router.post("/resend-forgot-otp",profileController.resendOtp);
router.post("/reset-password",profileController.postNewPassword);

router.get("/userProfile",userAuth,profileController.userProfile);
router.get("/change-email",userAuth,profileController.changeEmail);
router.post("/change-email",userAuth,profileController.changeEmailValid);
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp);
router.post("/update-email",userAuth,profileController.updateEmail);
router.get("/change-password",userAuth,profileController.changePassword);
router.post("/change-password",userAuth,profileController.changePasswordValid);
router.post("/verify-changepassword-otp",userAuth,profileController.verifyChangePassOtp);

//Address management
// router.get("/address",userAuth,profileController.address);
router.get("/addAddress",userAuth,profileController.addAddress);
router.post("/addAddress",userAuth,profileController.postAddAddress);
router.get("/editAddress",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.postEditAddress);
router.get("/deleteAddress",userAuth,profileController.deleteAddress);

//cart management
router.get("/cart",userAuth,cartController.cartPage);
// router.post("/addToCart",userAuth, cartController.addToCart)
// router.post("/changeQuantity", userAuth,cartController.changeQuantity)
// router.get("/deleteItem", userAuth, cartController.deleteProduct)


//Product management
router.get("/productDetails",userAuth,productController.productDetails)






module.exports = router