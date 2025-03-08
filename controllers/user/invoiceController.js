const PDFDocument = require("pdfkit-table");
const fs = require('fs');
const path = require('path');
const Order = require('../../models/orderSchema');




const generateInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId).populate("orderItems.product userId");

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Disposition", `attachment; filename=invoice-${orderId}.pdf`);
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);

        /** HEADER **/
        doc.fontSize(22).font("Helvetica-Bold").text("BIG STEPPER", { align: "center" });
        doc.fontSize(14).font("Helvetica").text("Tax Invoice", { align: "center" });
        doc.moveDown(2);

        /** INVOICE DETAILS **/
        doc.fontSize(12).text(`Invoice Number: ${order.orderId}`);
        doc.text(`Date of Issue: ${new Date().toLocaleDateString()}`);
        doc.moveDown(1);

        /** BILLING DETAILS **/
        doc.fontSize(14).font("Helvetica-Bold").text("Billing Details");
        doc.fontSize(12).font("Helvetica").text(`Name: ${order.userId.fullName}`);
        doc.text(`Email: ${order.userId.email}`);
        doc.text(`Phone: ${order.shippingAddress.phone}`);
        doc.text(`Address: ${order.shippingAddress.landMark}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`);
        doc.moveDown(1);

        /** PAYMENT DETAILS **/
        doc.fontSize(14).font("Helvetica-Bold").text("Payment Details");
        doc.fontSize(12).font("Helvetica").text(`Payment Method: ${order.payment.method}`);
        doc.text(`Payment Status: ${order.payment.status}`);
        if (order.payment.method === "RAZORPAY" && order.payment.razorpay.paymentId) {
            doc.text(`Transaction ID: ${order.payment.razorpay.paymentId}`);
        }
        doc.moveDown(1);


        /** ORDER SUMMARY **/
        doc.fontSize(14).font("Helvetica-Bold").text("Order Summary");
        doc.moveDown();

        const table = {
            headers: [
                { label: "Product", width: 250, align: "left" },
                { label: "Size", width: 80, align: "right" },
                { label: "Qty", width: 80, align: "right" },
                { label: "Price (₹)", width: 90, align: "right" },
            ],
            rows: order.orderItems.map((item) => [
                item.product.productName,
                item.variant.size,
                item.variant.quantity,
                `₹${item.price.salePrice}`,
            ]),
        };

        await doc.table(table, { width: 500 });

        /** PRICING SUMMARY **/
        doc.moveDown(0.5);
        doc.fontSize(12).font("Helvetica");

        doc.text(`Subtotal: ₹${order.pricing.subtotal}`, { align: "right" });
        doc.text(`Discount: -₹${order.pricing.coupon.discount}`, { align: "right" });
        doc.text(`Shipping Charge: ₹0`, { align: "right" });
        doc.fontSize(14).font("Helvetica-Bold").text(`Grand Total: ₹${order.pricing.finalAmount}`, { align: "right" });
        doc.moveDown(2);


        /** FOOTER **/
        doc.font("Helvetica").fontSize(12).text("Thanks for choosing our site!", { align: "center" });
        doc.text("Return & Exchange Policy: www.bigstepper.com/return-policy", { align: "center" });
        doc.moveDown();
        doc.font("Helvetica-Bold").text("Contact Us: +91 9188772165", { align: "center" });
        doc.text("Email: support@bigstepper.com", { align: "center" });
        doc.moveDown();
        doc.font("Helvetica").fontSize(12).text("Visit Us: www.bigstepper.com", { align: "center" });


        doc.end();
    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};




module.exports = { generateInvoice };



