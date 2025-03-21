const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");
const mongodb = require("mongodb");
const mongoose = require("mongoose");

const Razorpay = require("razorpay");
const env = require("dotenv").config();
const crypto = require("crypto");
const { userAuth } = require("../../middlewares/auth");
const { request } = require("http");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})






const checkoutPage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect("/login");
        }

        const userData = await User.findById(userId);
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'productName productImage variants brand'
        });

        if (!cart || cart.items.length === 0) {
            return res.redirect("/cart");
        }

        const blockedProducts = cart.items.filter(item => item.productId.isBlocked);

        if (blockedProducts.length > 0) {
            return res.status(403).json({
                success: false,
                message: "Some products in your cart are blocked and cannot be purchased."
            });
        }


        cart.subtotal = cart.items.reduce((total, item) => {
            // variant matching the cart item's size
            const variant = item.productId.variants.find(v => v.size === item.size);
            return total + (variant ? variant.salePrice * item.quantity : 0);
        }, 0);


        cart.tax = cart.subtotal * 0.0;
        cart.discount = cart.discount ? cart.discount : 0;
        cart.shipping = cart.subtotal > 5000 ? 0 : 50;
        cart.total = cart.subtotal + cart.tax + cart.shipping - cart.discount;

        const userAddresses = await Address.find({ userId: userId });

        const validCoupons = await Coupon.find({
            isActive: true,
            minPurchaseAmount: { $lte: cart.subtotal },
            endDate: { $gte: new Date() },
        }).sort({ createdAt: -1 });



        const wallet = await Wallet.findOne({ userId });

        res.render("checkOut", {
            user: userData,
            cart: cart,
            addresses: userAddresses,
            coupons: validCoupons,
            walletBalance: wallet?.balance ? wallet.balance.toFixed(2) : "0.00"
        });
    } catch (error) {
        console.error("Error in checkout page:", error);
        res.redirect("/pageNotFound");
    }
};




const checkProducts = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.json({ success: false, message: "user not found." });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.json({ success: false, message: "Your cart is empty." });
        }

        const blockedProducts = cart.items.filter(item => item.productId.isBlocked);

        if (blockedProducts.length > 0) {
            return res.json({ success: false, message: "Some products in your cart are blocked and cannot be purchased." });
        }

        // product stock
        const outOfStockProducts = [];

        cart.items.forEach(item => {
            const product = item.productId;

            if (!product.variants || product.variants.length === 0) {
                outOfStockProducts.push(product.productName);
                return;
            }

            const selectedVariant = product.variants.find(variant => variant.size === item.size);

            if (!selectedVariant || selectedVariant.quantity < item.quantity) {
                outOfStockProducts.push(product.productName);
            }
        });

        if (outOfStockProducts.length > 0) {
            return res.json({
                success: false,
                message: `Some products in your cart are out of stock: ${outOfStockProducts.join(', ')}. Please update your cart.`
            });
        }

        return res.json({ success: true });

    } catch (error) {
        console.error("Error checking cart:", error);
        res.json({ success: false, message: "Something went wrong. Please try again later." });
    }
};





const placeOrder = async (req, res) => {
    try {

        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login to continue' });
        }

        const { selectedAddress, paymentMethod } = req.body;

        if (!selectedAddress) {
            return res.status(400).json({ success: false, message: 'Shipping address is required' });
        }

        if (!paymentMethod) {
            return res.status(400).json({ success: false, message: 'Payment method is required' });
        }

        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'productName productImage variants brand category productOffer',
            populate: { path: 'category', select: 'categoryOffer' }
        });


        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }



        const address = await Address.findOne({ userId, 'address._id': selectedAddress });
        if (!address) {
            return res.status(400).json({ success: false, message: 'Invalid shipping address' });
        }

        const shippingAddress = address.address.find(addr => addr._id.toString() === selectedAddress);


        let productOffersTotal = 0;
        const orderItems = cart.items.map(item => {
            const variant = item.productId.variants.find(v => v.size === item.size);
            const productOffer = item.productId.productOffer || 0;
            const categoryOffer = item.productId.category?.categoryOffer || 0;
            const bestOffer = Math.max(productOffer, categoryOffer);
            const discount = variant.regularPrice * (bestOffer / 100) * item.quantity;
            productOffersTotal += discount;

            return {
                product: item.productId._id,
                variant: { size: item.size, quantity: item.quantity },
                productImage: Array.isArray(item.productId.productImage) ? item.productId.productImage[0] : item.productId.productImage,
                price: {
                    regularPrice: variant.regularPrice,
                    salePrice: variant.salePrice,
                    productOffer: bestOffer,
                    offerType: bestOffer > 0 ? (productOffer >= categoryOffer ? "Product Offer" : "Category Offer") : "No Offer"
                },
                itemStatus: "Processing"
            };
        });


        const subtotal = cart.items.reduce((total, item) => {
            const variant = item.productId.variants.find(v => v.size === item.size);
            return total + (variant ? variant.salePrice * item.quantity : 0);
        }, 0);

        
        const discountAmount = cart.discount || 0;
        const tax = subtotal * 0.0;
        const shipping = subtotal > 5000 ? 0 : 50;
        const finalAmount = subtotal - discountAmount + tax + shipping;


        // Generate unique orderId and orderNumber
        let orderId, orderNumber;
        let isUnique = false;
        while (!isUnique) {
            orderId = 'ID' + Date.now() + Math.floor(Math.random() * 1000);
            orderNumber = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
            const existingOrder = await Order.findOne({ $or: [{ orderId }, { orderNumber }] });
            if (!existingOrder) isUnique = true;
        }

        const normalizedPaymentMethod = paymentMethod.toUpperCase();

        const orderData = new Order({
            userId,
            orderId,
            orderNumber,
            orderItems,
            shippingAddress: {
                name: shippingAddress.name,
                landMark: shippingAddress.landMark,
                city: shippingAddress.city,
                state: shippingAddress.state,
                pincode: shippingAddress.pincode,
                phone: shippingAddress.phone,
                altPhone: shippingAddress.altPhone
            },
            pricing: {
                subtotal,
                finalAmount,
                productOffersTotal,
                discount: discountAmount,
                coupon: { code: cart.couponCode || null, discount: cart.discount || 0 }
            },
            payment: { method: normalizedPaymentMethod },
            orderStatus: "Pending",
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });


        if (normalizedPaymentMethod === 'RAZORPAY') {

            const razorpayOrder = await razorpay.orders.create({
                amount: finalAmount * 100,
                currency: 'INR',
                receipt: orderId
            });
            orderData.payment.razorpay = { orderId: razorpayOrder.id };
            orderData.payment.status = 'Pending';

            const order = await orderData.save();
            await reduceStock(orderItems);
            return res.json({
                success: true,
                isRazorpay: true,
                razorpayOrderId: razorpayOrder.id,
                amount: finalAmount * 100,
                orderId: order.orderId,
                key: process.env.RAZORPAY_KEY_ID
            });

        } else if (normalizedPaymentMethod === 'WALLET') {

            const wallet = await Wallet.findOne({ userId });

            if (!wallet || wallet.balance < finalAmount) {
                return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
            }

            wallet.balance -= finalAmount;

            orderData.payment.status = 'Completed';

            const order = await orderData.save();

            wallet.transactions.push({
                type: "Purchase",
                amount: finalAmount,
                orderId: order._id,
                description: "Order payment",
                status: "Completed",
                date: new Date(),
            });

            await wallet.save();
            await reduceStock(orderItems);

            await Cart.findOneAndUpdate({ userId }, { $set: { items: [], discount: 0, couponCode: null, subtotal: 0, total: 0 } });

            return res.json({ success: true, message: 'Order placed successfully', orderId: order.orderId });


        } else if (normalizedPaymentMethod === 'COD') {

            if (finalAmount > 5000) {
                return res.status(400).json({ success: false, message: 'Cash on delivery is not available for orders above 5000' });
            }

            orderData.payment.status = 'Pending';

            const order = await orderData.save();
            await reduceStock(orderItems);

            await Cart.findOneAndUpdate({ userId }, { $set: { items: [], discount: 0, couponCode: null, subtotal: 0, total: 0 } });

            return res.json({ success: true, message: 'Order placed successfully', orderId: order.orderId });
        } else {
            return res.status(400).json({ success: false, message: 'Invalid payment method' });
        }


    } catch (error) {
        console.error('Error placing order:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: 'Validation error: ' + error.message });
        }

        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'An order with this number already exists. Please try again.' });
        }

        res.status(500).json({ success: false, message: 'Something went wrong while placing your order' });
    }
};

// reduce stock
const reduceStock = async (orderItems) => {
    for (const item of orderItems) {
        const product = await Product.findById(item.product);
        const variant = product.variants.find(v => v.size === item.variant.size);
        if (variant && variant.quantity >= item.variant.quantity) {
            variant.quantity -= item.variant.quantity;
            await product.save();
        }
    }
};





const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const orderId = req.query.orderId;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
            return res.status(400).json({ success: false, message: 'Invalid request parameters' });
        }

        const crypto = require('crypto');
        const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.json({
                success: false,
                message: 'Payment verification failed',
                redirectUrl: `/order-details/${orderId}`
            });
        }


        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

 
        order.payment.status = 'Completed';
        order.payment.razorpay = {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature
        };
        order.payment.paidAt = new Date();
        await order.save();


        await Cart.findOneAndUpdate(
            { userId: req.session.user },
            { $set: { items: [], discount: 0, couponCode: null, subtotal: 0, total: 0 } }
        );

        return res.json({
            success: true,
            message: 'Payment verified successfully',
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            redirectUrl: `/order-details/${req.query.orderId}`
        });
    }
};




const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login to continue' });
        }

        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Order ID is required' });
        }

        const order = await Order.findOne({ orderId, userId: userId._id });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
                orderId: orderId,
                userId: userId._id
            });
        }

        if (order.payment.status === 'Completed') {
            return res.status(400).json({ success: false, message: 'Payment already completed for this order' });
        }

        const finalAmount = order.pricing.finalAmount;
        const razorpayOrder = await razorpay.orders.create({
            amount: finalAmount * 100,
            currency: 'INR',
            receipt: orderId
        });

        order.payment.razorpay.orderId = razorpayOrder.id;
        order.payment.status = 'Pending';
        await order.save();

        return res.json({
            success: true,
            options: {
                key: process.env.RAZORPAY_KEY_ID,
                amount: razorpayOrder.amount,
                currency: 'INR',
                order_id: razorpayOrder.id,
                prefill: {
                    name: "Customer Name",
                    email: "customer@example.com",
                    contact: "9999999999"
                },
                theme: { color: "#3399cc" }
            },
            orderId: orderId
        });
    } catch (error) {
        console.error('Retry payment error:', error);
        return res.status(500).json({ success: false, message: 'Something went wrong during retry' });
    }
};




const addAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login to add address" });
        }

        const addressData = {
            userId,
            address: [{
                addressType: req.body.addressType,
                name: req.body.name,
                city: req.body.city,
                landMark: req.body.landMark,
                state: req.body.state,
                pincode: req.body.pincode,
                phone: req.body.phone,
                altPhone: req.body.altPhone,
            }]
        };


        const existingAddresses = await Address.findOne({ userId });

        if (existingAddresses) {

            existingAddresses.address.push(addressData.address[0]);
            await existingAddresses.save();
            return res.status(200).json({ success: true, message: "Address added successfully" });
        } else {
            // new address
            await Address.create(addressData);
            return res.status(200).json({ success: true, message: "Address added successfully" });
        }
    } catch (error) {
        console.error("Error adding address:", error);
        return res.status(500).json({ success: false, message: "Failed to add address" });
    }
};




const editAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressId, addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;


        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login to update address" });
        }

        if (!addressId) {
            return res.status(400).json({ success: false, message: "Address ID is required" });
        }

        const updatedData = {
            _id: addressId,
            addressType,
            name,
            city,
            landMark,
            state,
            pincode,
            phone,
            altPhone,
        };

        const result = await Address.findOneAndUpdate(
            { userId, "address._id": addressId },

            { $set: { "address.$": updatedData } },

            { new: true, runValidators: true }
        );

        if (!result) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }


        return res.status(200).json({ success: true, message: "Address updated successfully" });
    } catch (error) {
        console.error("Error updating address:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update address"
        });
    }
};


const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressId } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login to delete address" });
        }

        const result = await Address.findOneAndUpdate(
            { userId },
            { $pull: { address: { _id: addressId } } },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        return res.status(200).json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
        console.error("Error deleting address:", error);
        return res.status(500).json({ success: false, message: "Failed to delete address" });
    }
};




const getOrderDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const orderId = req.params.orderId;


        if (!userId) {
            console.log('No userId, redirecting to login');
            return res.redirect("/login");
        }

        if (!orderId) {
            req.flash('error', 'Order ID is required');
            return res.redirect("/userProfile");
        }

        // Build the query conditions dynamically
        const queryConditions = [
            { orderId: orderId, userId: userId },
            { 'payment.razorpay.orderId': orderId, userId: userId }
        ];


        if (mongoose.Types.ObjectId.isValid(orderId)) {
            queryConditions.push({ _id: orderId, userId: userId });
        }

        const order = await Order.findOne({
            $or: queryConditions
        })
            .populate({
                path: 'orderItems.product',
                model: 'Product',
                populate: {
                    path: 'category',
                    model: 'Category',
                    select: 'name'
                }
            });


        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect("/userProfile");
        }

        const enrichedOrderItems = order.orderItems.map(item => {
            if (!item.product) {
                console.log('No product found for item:', item);
                return null;
            }
            return {
                ...item.toObject(),
                productDetails: {
                    name: item.product.productName,
                    description: item.product.description,
                    category: item.product.category ? item.product.category.name : 'Uncategorized',
                    brand: item.product.brand || 'Unknown Brand',
                    images: item.product.productImage
                }
            };
        }).filter(item => item !== null);

        // Prepare the order object for rendering
        const orderData = {
            ...order.toObject(),
            orderItems: enrichedOrderItems
        };

        res.render("order-details", {
            order: orderData,
            user: userData,
        });
    } catch (error) {
        console.error("Error fetching order details:", error);
        req.flash('error', 'An error occurred while fetching order details');
        res.redirect("/userProfile");
    }
};



const cancelOrder = async (req, res) => {
    try {
        const { orderId, cancelReason } = req.body;
        const userId = req.session.user;

        const order = await Order.findOne({
            _id: orderId,
            userId: userId,
            orderStatus: { $in: ['Pending', 'Processing'] }
        });

        if (!order) {
            return res.status(400).json({
                success: false,
                message: 'Order not found or cannot be cancelled'
            });
        }

        order.orderStatus = 'Cancelled';
        order.cancelReason = cancelReason;
        order.cancelledBy = "User";
        order.cancelledAt = new Date();

        order.orderItems.forEach(item => {
            item.itemStatus = 'Cancelled';
        });

        const refundAmount = Number(order.pricing.finalAmount);
        if (isNaN(refundAmount)) {
            throw new Error('Refund amount calculated as NaN');
        }

        let wallet = await Wallet.findOne({ userId: order.userId });

        if (!wallet) {
            wallet = new Wallet({
                userId: order.userId,
                balance: 0,
                transactions: [],
                lastUpdated: new Date()
            });
        }

        // Refund for Razorpay & Wallet Payments
        if (order.payment.method === "RAZORPAY" || order.payment.method === "WALLET") {
            wallet.balance += refundAmount;
            wallet.transactions.push({
                type: 'Refund',
                amount: refundAmount,
                orderId: orderId,
                status: 'Completed',
                description: `Refund for cancellation <b>Order ID: ${orderId}</b> by you`,
                date: new Date()
            });
            wallet.lastUpdated = new Date();
            await wallet.save();
        }

        // Restore product inventory
        for (const item of order.orderItems) {
            const productUpdate = await Product.findByIdAndUpdate(
                item.product,
                { $inc: { 'variants.$[elem].quantity': item.variant.quantity } },
                {
                    arrayFilters: [{ 'elem.size': item.variant.size }],
                    new: true
                }
            );

            if (!productUpdate) {
                console.error(`Failed to update stock for product ID: ${item.product}`);
            }
        }

        await order.save();

        res.json({
            success: true,
            message: (order.payment.method === "RAZORPAY" || order.payment.method === "WALLET")
                ? 'Order cancelled and refunded successfully'
                : 'Order cancelled successfully (No refund for COD orders)'
        });

    } catch (error) {
        console.error('Order Cancellation Error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while cancelling the order: ' + error.message
        });
    }
};




const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.status(404).json({ success: false, message: "User not Found." });
        }

        if (!couponCode) {
            return res.status(400).json({ success: false, message: "Coupon code is required." });
        }

        const coupon = await Coupon.findOne({ couponCode, isActive: true });

        if (!coupon) {
            return res.status(400).json({ success: false, message: "Invalid or expired Coupon." });
        }


        const cart = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            select: "variants",
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty." });
        }


        const subtotal = cart.items.reduce((total, item) => {
            const variant = item.productId.variants.find((v) => v.size === item.size);
            return total + (variant ? variant.salePrice * item.quantity : 0);
        }, 0);


        if (subtotal < coupon.minPurchaseAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required for this coupon.`,
            });
        }

        let discountAmount = Math.floor((subtotal * coupon.discountValue) / 100)

        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
        }

        const newTotal = Math.floor(subtotal - discountAmount)

        await Cart.findOneAndUpdate(
            { userId },
            {
                couponCode: coupon.code,
                discount: discountAmount
            }
        );

        // Save applied coupon details in the cart
        cart.discount = discountAmount;
        cart.couponCode = couponCode;
        cart.total = newTotal;

        await cart.save();

        return res.json({
            success: true,
            discountAmount: discountAmount.toFixed(2),
            newTotal: newTotal.toFixed(2),
        });

    } catch (error) {
        console.error("Error in applying coupon", error);
        return res.status(500).json({ success: false, message: "Internal Server error." });
    }
};




const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const cart = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            select: "variants",
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty." });
        }


        const originalTotal = cart.items.reduce((total, item) => {
            const variant = item.productId.variants.find((v) => v.size === item.size);
            return total + (variant ? variant.salePrice * item.quantity : 0);
        }, 0);

        await Cart.findOneAndUpdate(
            { userId },
            {
                $unset: { couponCode: "", discount: "" },
                total: originalTotal
            }
        );

        cart.couponCode = null;
        cart.discount = 0;
        cart.total = originalTotal;
        await cart.save();

        return res.json({
            success: true,
            originalTotal: originalTotal.toFixed(2),
            message: "Coupon removed successfully"
        });

    } catch (error) {
        console.error("Error in removing coupon:", error);
        return res.status(500).json({ success: false, message: "Internal Server error." });
    }
};





const returnProduct = async (req, res) => {
    try {
        const { orderId, productId, variantSize, reason } = req.body;

        if (!orderId || !productId || !variantSize || !reason) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // Find the specific product with the matching variant size
        const item = order.orderItems.find(
            (i) => i.product.toString() === productId && i.variant.size === parseInt(variantSize)
        );

        if (!item) {
            return res.status(404).json({ success: false, message: "Variant not found in order." });
        }

        if (item.itemStatus !== "Delivered") {
            return res.status(400).json({ success: false, message: "Only delivered products can be returned." });
        }

        if (item.returnRequest?.requested) {
            return res.status(400).json({ success: false, message: "Return already requested for this variant." });
        }


        item.returnRequest = {
            requested: true,
            status: "Pending",
            reason,
            requestDate: new Date(),
        };

        await order.save();

        res.json({ success: true, message: "Return request submitted successfully." });

    } catch (error) {
        console.error("Error in return request:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};




const checkBlockedProducts = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login to continue' });
        }

        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'productName productImage variants brand category isBlocked'
        });

        if (!cart || cart.items.length === 0) {
            return res.json({ success: true });
        }

        const blockedItems = cart.items.filter(item => item.productId.isBlocked);

        if (blockedItems.length > 0) {
            const blockedNames = blockedItems.map(item => item.productId.productName);
            return res.status(400).json({
                success: false,
                message: `The following products are no longer available: ${blockedNames.join(', ')}. Please remove them from your cart to continue.`
            });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('Error checking blocked products:', error);
        return res.status(500).json({ success: false, message: 'An error occurred while checking product availability' });
    }
};




module.exports = {
    checkoutPage,
    checkProducts,
    placeOrder,
    addAddress,
    editAddress,
    deleteAddress,
    getOrderDetails,
    cancelOrder,
    applyCoupon,
    removeCoupon,
    returnProduct,

    verifyPayment,
    retryPayment,

    checkBlockedProducts
};
