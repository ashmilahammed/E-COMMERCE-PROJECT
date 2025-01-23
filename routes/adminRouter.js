const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const {userAuth,adminAuth} = require("../middlewares/auth")
// const { route } = require("./userRouter");


router.get("/pageError",adminController.pageError)

router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
router.get("/",adminController.loadDashboard);
router.get("/logout",adminController.logout);





module.exports = router;