const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const passport = require("passport");
const {userAuth,adminAuth, isBlocked} = require("../middlewares/auth");
const productController = require("../controllers/user/productController");
const cartController = require("../controllers/user/cartController");
const wishlistController = require("../controllers/user/wishlistController");
const checkoutController = require('../controllers/user/checkoutController');




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


//Product management
router.get("/productDetails",userAuth,productController.productDetails);

//cart management
router.get("/cart",userAuth,cartController.cartPage);
router.post("/cart/add",userAuth,cartController.addToCart);
router.post("/cart/update-quantity",userAuth,cartController.updateQuantity);
router.post("/cart/remove-item",userAuth,cartController.removeItem);

//checkout management
router.get('/checkout',userAuth,checkoutController.checkoutPage);
router.post('/checkout',userAuth,checkoutController.placeOrder);
router.post('/add-address',userAuth,checkoutController.addAddress);
router.put('/update-address',userAuth,checkoutController.updateAddress);

// Order Management
// router.get("/checkout", userAuth,orderController.getCheckoutPage);
// router.get("/deleteItem", userAuth, orderController.deleteProduct);
// router.post("/applyCoupon",userAuth,userController.applyCoupon);
// router.post("/orderPlaced", userAuth,orderController.orderPlaced);
// router.get("/orderDetails", userAuth,orderController.getOrderDetailsPage);
// router.post("/cancelOrder",userAuth,orderController.cancelOrder);
// router.post("/returnrequestOrder",userAuth,orderController.returnorder);
// router.post("/verifyPayment", userAuth, orderController.verify);
// router.post("/singleProductId",userAuth,orderController.changeSingleProductStatus);
// router.post('/paymentConfirm',userAuth,orderController.paymentConfirm);
// router.get("/downloadInvoice/:orderId",userAuth,orderController.downloadInvoice);




//wishlist management
router.get("/wishlist",userAuth,wishlistController.getwishList);





router.get("/contacts",userAuth,userController.contactPage)    
module.exports = router