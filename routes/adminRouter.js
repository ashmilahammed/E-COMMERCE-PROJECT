const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const userController = require("../controllers/admin/userController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");
const orderController = require("../controllers/admin/orderController");
const couponController = require("../controllers/admin/couponController");
const {userAuth,adminAuth} = require("../middlewares/auth");
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({storage:storage});



router.get("/pageError",adminController.pageError)

//login Management;
router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
router.get("/",adminAuth,adminController.loadDashboard);
router.get("/logout",adminController.logout);

//users management;
router.get("/users",adminAuth,userController.customerInfo);
router.post("/blockCustomer",adminAuth,userController.blockCustomer);
router.post("/unblockCustomer",adminAuth,userController.unblockCustomer);

//category management;
router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory);
router.post("/listCategory",adminAuth,categoryController.getListCategory);
router.post("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory/:id",adminAuth,categoryController.editCategory);
//category offer:
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer);

//brand  management;
router.get("/brands",adminAuth,brandController.getBrandpage);
router.post("/addBrand",adminAuth,uploads.single("logo"),brandController.addBrand);
router.post("/blockBrand",adminAuth,brandController.blockBrand);
router.post("/unBlockBrand",adminAuth,brandController.unBlockBrand);
router.get("/deleteBrand",adminAuth,brandController.deleteBrand);

//product management;
router.get("/addproducts",adminAuth,productController.getProductAddPage);
router.post("/addProducts",adminAuth,uploads.array("images",3),productController.addProducts);
router.get("/products",adminAuth,productController.GetAllProducts);
router.post("/blockProduct",adminAuth,productController.blockProduct);
router.post("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array("images",3),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage);
//product offer
router.post("/addProductOffer",adminAuth,productController.addProductOffer);
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer);

//order  management
router.get("/order-list",adminAuth,orderController.orderListPage);
router.get("/orderList-details/:orderId",adminAuth,orderController.getOrderDetails);
router.post("/update-order-status",adminAuth,orderController.updateOrderStatus);
//return order
router.get("/return-Requests",adminAuth,orderController.returnRequests);
router.post("/process-return",adminAuth,orderController.returnProcess)

//coupon management
router.get("/coupons",adminAuth,couponController.getCouponPage);
router.post("/addCoupon",adminAuth,couponController.createCoupon);
router.put("/editCoupon",adminAuth,couponController.editCoupon);
router.delete("/deleteCoupon/:couponId",adminAuth,couponController.deleteCoupon)





module.exports = router;