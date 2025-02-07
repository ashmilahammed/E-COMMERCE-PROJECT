const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const passport = require("passport");
const {userAuth,adminAuth, isBlocked} = require("../middlewares/auth");
const productController = require("../controllers/user/productController");
const cartController = require("../controllers/user/cartController");
const checkoutController = require("../controllers/user/checkoutController");
const wishlistController = require("../controllers/user/wishlistController");



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
router.post("/cart/add",userAuth,cartController.addToCart);
router.post("/cart/update-quantity",userAuth,cartController.updateQuantity);
router.post("/cart/remove-item",userAuth,cartController.removeItem);

//checkout management
router.get("/checkOut",userAuth,checkoutController.getcheckOutPage);


//Product management
router.get("/productDetails",userAuth,productController.productDetails);


//wishlist management
router.get("/wishlist",userAuth,wishlistController.getwishList);





router.get("/contacts",userAuth,userController.contactPage)    
module.exports = router