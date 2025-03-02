const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit-table");
const ExcelJS = require("exceljs");



const pageError = async (req, res) => {
    res.render('error-admin')
}


const loadLogin = (req, res) => {
    try {
        if (req.session.admin) {
            return res.redirect("/admin/dashboard");
        }
        res.render("admin-login", { message: null });
    } catch (error) {
        console.error("Error loading admin login page:", error);
        res.status(500).send("Internal Server Error");
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (!admin) {
            return res.render("admin-login", { message: "Admin not found" });
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (!passwordMatch) {
            return res.render("admin-login", { message: "Incorrect password" });
        }

        req.session.admin = true;
        return res.redirect("/admin");

    } catch (error) {
        console.log("Login error:", error);
        return res.rendirect("/admin/pageError");
    }
};


const loadDashboard = async (req, res) => {
    try {
        res.render("dashboard", { admin: req.session.admin }); 
    } catch (error) {
        console.error("Error loading dashboard:", error);
        res.redirect("/admin/pageError");
    }
};



const logout = async (req, res) => {
    try {

        delete req.session.admin;

        res.redirect("/admin/login");

    } catch (error) {
        console.log("Unexpected error during logout", error);
        res.redirect("/admin/pageError")

    }
}




const getSalesReport = async (req, res) => {
    try {
        const perPage = 10;
        const page = parseInt(req.query.page) || 1;
        const reportType = req.query.reportType || "all";
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        let filter = {}; 

        const today = new Date();
        if (reportType === "daily") {
            filter.createdAt = {
                $gte: new Date(today.setHours(0, 0, 0, 0)),
                $lt: new Date(today.setHours(23, 59, 59, 999)),
            };
        } else if (reportType === "weekly") {
            const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
            filter.createdAt = {
                $gte: new Date(startOfWeek.setHours(0, 0, 0, 0)),
                $lt: new Date(today.setHours(23, 59, 59, 999)),
            };
        } else if (reportType === "monthly") {
            filter.createdAt = {
                $gte: new Date(today.getFullYear(), today.getMonth(), 1),
                $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
            };
        } else if (reportType === "yearly") {
            filter.createdAt = {
                $gte: new Date(today.getFullYear(), 0, 1),
                $lt: new Date(today.getFullYear() + 1, 0, 1),
            };
        } else if (reportType === "custom" && startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate),
                $lt: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
            };
        }


        const allOrders = await Order.find(filter).select("pricing");

        let totalSales = 0;
        let totalDiscount = 0;
        let totalCouponDiscount = 0;

        allOrders.forEach(order => {
            totalSales += order.pricing.finalAmount;
            totalDiscount += order.pricing.productOffersTotal;
            totalCouponDiscount += order.pricing.coupon.discount;
        });

        //Pagination
        const totalOrders = allOrders.length;
        const totalPages = Math.ceil(totalOrders / perPage);

        const orders = await Order.find(filter)
            .populate("userId", "fullName email")
            .populate("orderItems.product", "productName brand")
            .sort({ createdAt: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .exec();

        res.render("sales-report", {
            orders,
            totalSales,  
            totalDiscount, 
            totalCouponDiscount, 
            totalOrders,
            currentPage: page,
            totalPages,
            reportType,
            startDate,
            endDate
        });

    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.status(500).send("Server error");
    }
};
 



const downloadPdf = async (req, res) => {
    try {
        const reportType = req.query.reportType || "all";
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        let filter = {};
        const today = new Date();

        if (reportType === "daily") {
            filter.createdAt = {
                $gte: new Date(today.setHours(0, 0, 0, 0)),
                $lt: new Date(today.setHours(23, 59, 59, 999)),
            };
        } else if (reportType === "weekly") {
            const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
            filter.createdAt = {
                $gte: new Date(startOfWeek.setHours(0, 0, 0, 0)),
                $lt: new Date(today.setHours(23, 59, 59, 999)),
            };
        } else if (reportType === "monthly") {
            filter.createdAt = {
                $gte: new Date(today.getFullYear(), today.getMonth(), 1),
                $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
            };
        } else if (reportType === "yearly") {
            filter.createdAt = {
                $gte: new Date(today.getFullYear(), 0, 1),
                $lt: new Date(today.getFullYear() + 1, 0, 1),
            };
        } else if (reportType === "custom" && startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate),
                $lt: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
            };
        }

        // Fetch filtered orders
        const orders = await Order.find(filter)
            .populate("userId", "fullName email")
            .sort({ createdAt: -1 });

        const totalSales = orders.length;
        const totalOrderAmount = orders.reduce((sum, order) => sum + order.pricing.finalAmount, 0);
        const totalCouponDiscount = orders.reduce((sum, order) => sum + order.pricing.coupon.discount, 0);
        const totalOfferDiscount = orders.reduce((sum, order) => sum + order.pricing.productOffersTotal, 0);

        const reportsDir = path.join(__dirname, "../../public/reports");
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const filePath = path.join(reportsDir, "sales_report.pdf");

        const doc = new PDFDocument({ margin: 30, size: "A4" });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);


        // doc.fontSize(22)
        //    .font("Helvetica-Bold")
        //    .text("Big Stepper", { align: "center", underline: true });
        // doc.moveDown(0.5);

        doc.fontSize(18).text("Sales Report", { align: "center" });
        doc.moveDown(1);

        doc.fontSize(12).font("Helvetica-Bold").text("Summary", { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(11).font("Helvetica")
            .text(`Total Sales Count: ${totalSales}`)
            .moveDown(0.2)
            .text(`Overall Order Amount: ₹${totalOrderAmount.toFixed(2)}`)
            .moveDown(0.2)
            .text(`Total Offer Discount: ₹${totalOfferDiscount.toFixed(2)}`)
            .moveDown(0.2)
            .text(`Total Coupon Discount: ₹${totalCouponDiscount.toFixed(2)}`);
        doc.moveDown(1);

  
        const table = {
            headers: [
                { label: "Order ID", width: 90, align: "center" },
                { label: "User", width: 100, align: "left" },
                { label: "Date", width: 70, align: "center" },
                { label: "Status", width: 60, align: "center" },
                { label: "Total", width: 60, align: "right" },
                { label: "Coupon Disc.", width: 80, align: "right" }, 
                { label: "Offer Disc.", width: 80, align: "right" }  
            ],
            rows: orders.map(order => [
                order.orderId, 
                order.userId ? order.userId.fullName : "Guest", 
                new Date(order.createdAt).toLocaleDateString(),
                order.orderStatus,
                `₹${order.pricing.finalAmount.toFixed(2)}`,
                `₹${order.pricing.coupon.discount.toFixed(2)}`,
                `₹${order.pricing.productOffersTotal.toFixed(2)}`
            ])
        };

        await doc.table(table, {
            width: 530, 
            columnSpacing: 5,
            padding: 5, 
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8), 
            prepareRow: (row, indexColumn, indexRow, rectRow) => {
                doc.font("Helvetica").fontSize(8); 
                return { height: 20 }; 
            }
        });

        doc.end();

        // Ensure the file is fully written before sending
        stream.on("finish", () => {
            res.download(filePath, "sales_report.pdf", (err) => {
                if (err) {
                    console.error("Error sending PDF:", err);
                    res.status(500).json({ message: "Error downloading PDF" });
                }
            });
        });

    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ message: "Error generating PDF" });
    }
};





const downloadExcel = async (req, res) => {
    try {
        const { reportType, startDate, endDate } = req.query;

        let filter = {};
        
        if (reportType && reportType !== "all") {
            const now = new Date();
            if (reportType === "daily") {
                filter.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
            } else if (reportType === "weekly") {
                const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
                startOfWeek.setHours(0, 0, 0, 0);
                filter.createdAt = { $gte: startOfWeek };
            } else if (reportType === "monthly") {
                filter.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
            } else if (reportType === "yearly") {
                filter.createdAt = { $gte: new Date(now.getFullYear(), 0, 1) };
            } else if (reportType === "custom" && startDate && endDate) {
                filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
            }
        }

        const orders = await Order.find(filter)
            .populate("userId", "fullName email")
            .sort({ createdAt: -1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sales Report");

        worksheet.columns = [
            { header: "Order ID", key: "_id", width: 25 },
            { header: "User", key: "user", width: 30 },
            { header: "Date", key: "date", width: 15 },
            { header: "Status", key: "status", width: 15 },
            { header: "Total", key: "total", width: 15 },
            { header: "Offer Discount", key: "offerDiscount", width: 15 },
            { header: "Coupon Discount", key: "couponDiscount", width: 15 } 
        ];

        orders.forEach(order => {
            worksheet.addRow({
                // _id: order._id,
                _id: order.orderId,
                user: order.userId ? `${order.userId.fullName} (${order.userId.email})` : "Guest",
                date: new Date(order.createdAt).toLocaleDateString(),
                status: order.orderStatus,
                total: `₹${order.pricing.finalAmount.toFixed(2)}`,
                offerDiscount: `₹${order.pricing.productOffersTotal.toFixed(2)}`,
                couponDiscount: `₹${order.pricing.coupon.discount.toFixed(2)}` // ✅
            });
        });

        const reportsDir = path.join(__dirname, "../../public/reports");
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const filePath = path.join(reportsDir, "sales_report.xlsx");

        await workbook.xlsx.writeFile(filePath);

        res.download(filePath, "sales_report.xlsx", (err) => {
            if (err) {
                console.error("Error sending Excel file:", err);
                res.status(500).json({ message: "Error downloading Excel file" });
            }
        });

    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).json({ message: "Error generating Excel" });
    }
};






module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,

    getSalesReport,
    downloadPdf,
    downloadExcel,
}