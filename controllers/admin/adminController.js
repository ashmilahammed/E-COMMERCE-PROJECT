const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
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
            return res.redirect("/admin");
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

        let filter = { orderStatus: { $in: ["Delivered", "Cancelled"] } };

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of the day

        if (reportType === "daily") {
            filter.createdAt = {
                $gte: new Date(today),
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            };
        } else if (reportType === "weekly") {
            const dayOfWeek = today.getDay();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - dayOfWeek);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(today);
            endOfWeek.setHours(23, 59, 59, 999);

            filter.createdAt = {
                $gte: startOfWeek,
                $lt: endOfWeek,
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

        const allOrders = await Order.find(filter).select("pricing orderItems");

        let totalSales = 0;
        let totalDiscount = 0;
        let totalCouponDiscount = 0;
        let totalRefunds = 0;

        allOrders.forEach(order => {
            totalSales += order.pricing.finalAmount;
            totalDiscount += order.pricing.productOffersTotal;
            totalCouponDiscount += order.pricing.coupon.discount;

            // Deduct refund amounts for returned products
            order.orderItems.forEach(item => {
                if (item.returnRequest?.status === "Approved") {
                    totalRefunds += Number(item.price.salePrice) * item.variant.quantity;
                }
            });
        });

        totalSales -= totalRefunds;

        // Pagination
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
            totalRefunds,
            totalOrders,
            currentPage: page,
            totalPages,
            reportType,
            startDate,
            endDate,
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


        let filter = { orderStatus: { $in: ["Delivered", "Cancelled"] } };


        const today = new Date();
        today.setHours(0, 0, 0, 0);


        if (reportType === "daily") {
            filter.createdAt = {
                $gte: new Date(today),
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            };
        } else if (reportType === "weekly") {
            const dayOfWeek = today.getDay();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - dayOfWeek);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(today);
            endOfWeek.setHours(23, 59, 59, 999);

            filter.createdAt = {
                $gte: startOfWeek,
                $lt: endOfWeek,
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


        const orders = await Order.find(filter)
            .populate("userId", "fullName email")
            .populate("orderItems.product", "productName brand")
            .sort({ createdAt: -1 });


        let totalSales = 0;
        let totalDiscount = 0;
        let totalCouponDiscount = 0;
        let totalRefunds = 0;
        const totalOrders = orders.length;

        orders.forEach(order => {
            totalSales += order.pricing.finalAmount;
            totalDiscount += order.pricing.productOffersTotal;
            totalCouponDiscount += order.pricing.coupon.discount;

            // Deduct refund amounts for returned products
            if (order.orderItems) {
                order.orderItems.forEach(item => {
                    if (item.returnRequest?.status === "Approved") {
                        totalRefunds += Number(item.price.salePrice) * item.variant.quantity;
                    }
                });
            }
        });

        totalSales -= totalRefunds;

        // Create PDF
        const reportsDir = path.join(__dirname, "../../public/reports");
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const filePath = path.join(reportsDir, "sales_report.pdf");

        const doc = new PDFDocument({ margin: 30, size: "A4" });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);


        // doc.fontSize(22)
        //     .font("Helvetica-Bold")
        //     .text("Big Stepper", { align: "center", underline: true });
        // doc.moveDown(0.5);

        doc.fontSize(18).font("Helvetica-Bold").text("Sales Report", { align: "center" });
        doc.moveDown(1);


        doc.fontSize(12).font("Helvetica-Bold").text("Summary", { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(11).font("Helvetica")
            .text(`Total Orders: ${totalOrders}`)
            .moveDown(0.2)
            .text(`Total Sales (Net): ₹${totalSales.toFixed(2)}`)
            .moveDown(0.2)
            .text(`Total Offer Discount: ₹${totalDiscount.toFixed(2)}`)
            .moveDown(0.2)
            .text(`Total Coupon Discount: ₹${totalCouponDiscount.toFixed(2)}`)
            .moveDown(0.2)
            .text(`Total Refunds: ₹${totalRefunds.toFixed(2)}`);
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

        let filter = { orderStatus: { $in: ["Delivered", "Cancelled"] } };


        const today = new Date();
        today.setHours(0, 0, 0, 0); 


        if (reportType && reportType !== "all") {
            if (reportType === "daily") {
                filter.createdAt = {
                    $gte: new Date(today),
                    $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                };
            } else if (reportType === "weekly") {
                const dayOfWeek = today.getDay();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - dayOfWeek);
                startOfWeek.setHours(0, 0, 0, 0);

                const endOfWeek = new Date(today);
                endOfWeek.setHours(23, 59, 59, 999);

                filter.createdAt = {
                    $gte: startOfWeek,
                    $lt: endOfWeek,
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
        }

        
        const orders = await Order.find(filter)
            .populate("userId", "fullName email")
            .populate("orderItems.product", "productName brand")
            .sort({ createdAt: -1 });


        let totalSales = 0;
        let totalDiscount = 0;
        let totalCouponDiscount = 0;
        let totalRefunds = 0;
        const totalOrders = orders.length;

        orders.forEach(order => {
            totalSales += order.pricing.finalAmount;
            totalDiscount += order.pricing.productOffersTotal;
            totalCouponDiscount += order.pricing.coupon.discount;


            if (order.orderItems) {
                order.orderItems.forEach(item => {
                    if (item.returnRequest?.status === "Approved") {
                        totalRefunds += Number(item.price.salePrice) * item.variant.quantity;
                    }
                });
            }
        });

        totalSales -= totalRefunds;

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sales Report");


        worksheet.addRow(["Sales Report Summary"]).style = { font: { bold: true, size: 14 } };
        worksheet.addRow([]); // Empty row for spacing
        worksheet.addRow(["Total Orders", totalOrders]);
        worksheet.addRow(["Total Sales (Net)", `₹${totalSales.toFixed(2)}`]);
        worksheet.addRow(["Total Offer Discount", `₹${totalDiscount.toFixed(2)}`]);
        worksheet.addRow(["Total Coupon Discount", `₹${totalCouponDiscount.toFixed(2)}`]);
        worksheet.addRow(["Total Refunds", `₹${totalRefunds.toFixed(2)}`]);
        worksheet.addRow([]); // Empty row for spacing


        worksheet.columns = [
            { header: "Order ID", key: "orderId", width: 25 },
            { header: "User", key: "user", width: 30 },
            { header: "Date", key: "date", width: 15 },
            { header: "Status", key: "status", width: 15 },
            { header: "Total", key: "total", width: 15 },
            { header: "Offer Discount", key: "offerDiscount", width: 15 },
            { header: "Coupon Discount", key: "couponDiscount", width: 15 }
        ];


        worksheet.getRow(8).font = { bold: true };
        worksheet.getRow(8).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" } 
        };
        worksheet.getRow(8).alignment = { vertical: "middle", horizontal: "center" };


        // Add order data
        orders.forEach(order => {
            let orderRefunds = 0;
            if (order.orderItems) {
                order.orderItems.forEach(item => {
                    if (item.returnRequest?.status === "Approved") {
                        orderRefunds += Number(item.price.salePrice) * item.variant.quantity;
                    }
                });
            }
            const netTotal = order.pricing.finalAmount - orderRefunds;

            worksheet.addRow({
                orderId: order.orderId,
                user: order.userId ? `${order.userId.fullName} (${order.userId.email})` : "Guest",
                date: new Date(order.createdAt).toLocaleDateString(),
                status: order.orderStatus,
                total: `₹${netTotal.toFixed(2)}`,
                offerDiscount: `₹${order.pricing.productOffersTotal.toFixed(2)}`,
                couponDiscount: `₹${order.pricing.coupon.discount.toFixed(2)}`
            });
        });

        // Style the data rows
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 8) { 
                row.alignment = { vertical: "middle", horizontal: "left" };
                row.border = {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" }
                };
            }
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



////////////////


// Updated getDateFilter function to include date grouping info
const getDateFilter = (filter) => {
    const now = new Date();
    let startDate;
    let groupBy;

    if (filter === "weekly") {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    } else if (filter === "monthly") {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    } else if (filter === "yearly") {
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
    } else {
        return { filter: {}, groupBy: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } };
    }

    return {
        filter: { createdAt: { $gte: startDate, $lte: new Date() } },
        groupBy: groupBy
    };
};


const getDashboardData = async (req, res) => {
    try {
        const { filter: dateFilter, groupBy } = getDateFilter(req.query.filter);

        const totalProducts = await Product.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalCategories = await Category.countDocuments();

        // Get revenue over time
        const revenueOverTime = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: groupBy,
                    revenue: { $sum: { $ifNull: ["$pricing.finalAmount", 0] } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Format data for frontend
        const labels = revenueOverTime.map(item => item._id);
        const revenueData = revenueOverTime.map(item => item.revenue);
        const orderData = revenueOverTime.map(item => item.count);


        const totalRevenue = revenueData.reduce((sum, val) => sum + val, 0);
        const totalOrders = orderData.reduce((sum, val) => sum + val, 0);


        // Category Performance
        const categoryPerformance = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderItems.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $group: {
                    _id: "$productInfo.category",
                    totalSales: { $sum: { $ifNull: ["$orderItems.variant.quantity", 0] } }
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: "$categoryInfo" },
            { $project: { category: "$categoryInfo.name", totalSales: 1 } }
        ]);

        // Brand Performance
        const brandPerformance = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderItems.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $group: {
                    _id: "$productInfo.brand",
                    totalSales: { $sum: { $ifNull: ["$orderItems.variant.quantity", 0] } }
                }
            },
            { $project: { brand: "$_id", totalSales: 1 } }
        ]);

        res.json({
            revenue: totalRevenue,
            totalOrders,
            totalProducts,
            totalUsers,
            totalCategories,
            timeSeriesData: {
                labels,
                revenueData,
                orderData
            },
            categoryPerformance,
            brandPerformance
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};



const getBestSellingData = async (req, res) => {
    try {

        const filter = req.query.filter || "weekly";
        const { filter: dateFilter } = getDateFilter(filter);

        const bestSellingProducts = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: "$orderItems" },
            {
                $group: {
                    _id: "$orderItems.product",
                    totalSales: { $sum: { $ifNull: ["$orderItems.variant.quantity", 0] } }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $lookup: {
                    from: "categories",
                    localField: "productInfo.category",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: "$categoryInfo" },
            {
                $project: {
                    productName: "$productInfo.productName",
                    totalSales: 1,
                    category: "$categoryInfo.name"
                }
            }
        ]);


        const bestSellingCategories = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderItems.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $group: {
                    _id: "$productInfo.category",
                    totalSales: { $sum: { $ifNull: ["$orderItems.variant.quantity", 0] } }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: "$categoryInfo" },
            { $project: { category: "$categoryInfo.name", totalSales: 1 } }
        ]);


        const bestSellingBrands = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderItems.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $group: {
                    _id: "$productInfo.brand",
                    totalSales: { $sum: { $ifNull: ["$orderItems.variant.quantity", 0] } }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 },
            { $project: { brand: "$_id", totalSales: 1 } }
        ]);

        res.json({ bestSellingProducts, bestSellingCategories, bestSellingBrands });
    } catch (error) {
        console.error("Error fetching best-selling data:", error);
        res.status(500).json({ error: "Internal Server Error" });
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

    getDashboardData,
    getBestSellingData
}