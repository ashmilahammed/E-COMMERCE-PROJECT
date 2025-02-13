const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");
const orderController = require("../controllers/admin/orderController")
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
router.get("/users",adminAuth,customerController.customerInfo);
router.get("/blockCustomer",adminAuth,customerController.blockCustomer);
router.get("/unblockCustomer",adminAuth,customerController.unblockCustomer);
//category management;
router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory);

router.get("/listCategory",adminAuth,categoryController.getListCategory);
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory/:id",adminAuth,categoryController.editCategory);
//brand  management;
router.get("/brands",adminAuth,brandController.getBrandpage);
router.post("/addBrand",adminAuth,uploads.single("logo"),brandController.addBrand);
router.get("/blockBrand",adminAuth,brandController.blockBrand);
router.get("/unBlockBrand",adminAuth,brandController.unBlockBrand);
router.get("/deleteBrand",adminAuth,brandController.deleteBrand);
//product management;
router.get("/addproducts",adminAuth,productController.getProductAddPage);
router.post("/addProducts",adminAuth,uploads.array("images",3),productController.addProducts);
router.get("/products",adminAuth,productController.GetAllProducts);

router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array("images",3),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage);

//order  management
router.get("/order-list",adminAuth,orderController.orderListPage);
router.get("/orderList-details/:orderId",adminAuth,orderController.getOrderDetails);
router.post("/update-order-status",adminAuth,orderController.updateOrderStatus)






module.exports = router;