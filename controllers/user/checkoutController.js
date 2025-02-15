const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const mongodb = require("mongodb");
const mongoose = require("mongoose");

// const User = require("../../models/userSchema");
// const Product = require("../../models/productSchema");
// const Address = require("../../models/addressSchema");
// const Cart = require("../../models/cartSchema");
// const Coupon = require("../../models/couponSchema");
// const Order = require("../../models/orderSchema");
// const mongodb = require("mongodb");
// const mongoose = require("mongoose");
// const env = require("dotenv").config();
// const crypto = require("crypto");
// const moment = require("moment");
// const fs = require("fs");
// const path = require("path");
// const easyinvoice = require("easyinvoice");



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

        // Calculate detailed cart summary
        cart.subtotal = cart.items.reduce((total, item) => {
            // Find the variant matching the cart item's size
            const variant = item.productId.variants.find(v => v.size === item.size);
            return total + (variant ? variant.salePrice * item.quantity : 0);
        }, 0);


        cart.tax = cart.subtotal * 0.0; // 10% tax rate
        cart.discount = 0;
        cart.shipping = cart.subtotal > 1000 ? 0 : 50; // Free shipping over 1000
        cart.total = cart.subtotal + cart.tax + cart.shipping - cart.discount;

        // Get user addresses
        const userAddresses = await Address.find({ userId: userId });

        res.render("checkOut", {
            user: userData,
            cart: cart,
            addresses: userAddresses
        });
    } catch (error) {
        console.error("Error in checkout page:", error);
        res.redirect("/pageNotFound");
    }
};



// const placeOrder = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         if (!userId) {
//             return res.status(401).json({ success: false, message: 'Please login to continue' });
//         }

//         const { selectedAddress, paymentMethod } = req.body;

//         // Validate required fields
//         if (!selectedAddress) {
//             return res.status(400).json({ success: false, message: 'Shipping address is required' });
//         }
//         if (!paymentMethod) {
//             return res.status(400).json({ success: false, message: 'Payment method is required' });
//         }

//         // Get user's cart
//         const cart = await Cart.findOne({ userId }).populate({
//             path: 'items.productId',
//             select: 'productName productImage variants brand'
//         });

//         if (!cart || cart.items.length === 0) {
//             return res.status(400).json({ success: false, message: 'Cart is empty' });
//         }

//         // Get shipping address
//         const address = await Address.findOne({
//             userId,
//             'address._id': selectedAddress
//         });

//         if (!address) {
//             return res.status(400).json({ success: false, message: 'Invalid shipping address' });
//         }

//         const shippingAddress = address.address.find(addr => addr._id.toString() === selectedAddress);

//         // Create order items from cart
//         const orderItems = cart.items.map(item => {
//             const variant = item.productId.variants.find(v => v.size === item.size);
//             return {
//                 product: item.productId._id,
//                 variant: {
//                     size: item.size,
//                     quantity: item.quantity
//                 },
//                 productImage: Array.isArray(item.productId.productImage) ? item.productId.productImage[0] : item.productId.productImage,
//                 price: {
//                     regularPrice: variant.regularPrice,
//                     salePrice: variant.salePrice,
//                     productOffer: variant.productOffer || 0,
//                     offerType: variant.offerType || "No Offer"
//                 },
//                 itemStatus: "Processing"
//             };
//         });

//         // Calculate total amount
//         const subtotal = cart.items.reduce((total, item) => {
//             const variant = item.productId.variants.find(v => v.size === item.size);
//             return total + (variant ? variant.salePrice * item.quantity : 0);
//         }, 0);

//         const tax = subtotal * 0.0; 
//         const shipping = subtotal > 1000 ? 0 : 50; // Free shipping over 1000
//         const finalAmount = subtotal + tax + shipping;

//         // Generate unique orderId and orderNumber
//         let orderId, orderNumber;
//         let isUnique = false;
//         while (!isUnique) {
//             orderId = 'ID' + Date.now() + Math.floor(Math.random() * 1000);
//             orderNumber = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
//             const existingOrder = await Order.findOne({ $or: [{ orderId }, { orderNumber }] });
//             if (!existingOrder) {
//                 isUnique = true;
//             }
//         }

//         // Convert payment method to uppercase to match enum
//         const normalizedPaymentMethod = paymentMethod.toUpperCase();

//         // Create new order
//         const order = new Order({
//             userId,
//             orderId, 
//             orderNumber,
//             orderItems,
//             shippingAddress: {
//                 name: shippingAddress.name,
//                 landMark: shippingAddress.landMark,
//                 city: shippingAddress.city,
//                 state: shippingAddress.state,
//                 pincode: shippingAddress.pincode,
//                 phone: shippingAddress.phone,
//                 altPhone: shippingAddress.altPhone 
//             },
//             pricing: {
//                 subtotal,
//                 finalAmount,
//                 productOffersTotal: 0,
//                 coupon: {
//                     discount: 0
//                 }
//             },
//             payment: {
//                 method: normalizedPaymentMethod,
//                 status: normalizedPaymentMethod === 'COD' ? 'Pending' : 'Completed',
//                 paidAt: normalizedPaymentMethod === 'COD' ? null : new Date()
//             },
//             orderStatus: "Pending",
//             expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
//         });

//         await order.save();

//         await Cart.findOneAndUpdate(
//             { userId },
//             { $set: { items: [] } }
//         );

//         res.json({
//             success: true,
//             message: 'Order placed successfully',
//             orderId: order.orderId
//         });

//     } catch (error) {
//         console.error('Error placing order:', error);
//         if (error.name === 'ValidationError') {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Validation error: ' + error.message
//             });
//         }
//         if (error.code === 11000) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'An order with this number already exists. Please try again.'
//             });
//         }
//         res.status(500).json({
//             success: false,
//             message: 'Something went wrong while placing your order'
//         });
//     }
// };
const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login to continue' });
        }

        const { selectedAddress, paymentMethod } = req.body;

        // Validate required fields
        if (!selectedAddress) {
            return res.status(400).json({ success: false, message: 'Shipping address is required' });
        }
        if (!paymentMethod) {
            return res.status(400).json({ success: false, message: 'Payment method is required' });
        }

        // Get user's cart
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'productName productImage variants brand'
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        // Get shipping address
        const address = await Address.findOne({
            userId,
            'address._id': selectedAddress
        });

        if (!address) {
            return res.status(400).json({ success: false, message: 'Invalid shipping address' });
        }

        const shippingAddress = address.address.find(addr => addr._id.toString() === selectedAddress);

        // Create order items from cart
        const orderItems = cart.items.map(item => {
            const variant = item.productId.variants.find(v => v.size === item.size);
            return {
                product: item.productId._id,
                variant: {
                    size: item.size,
                    quantity: item.quantity
                },
                productImage: Array.isArray(item.productId.productImage) ? item.productId.productImage[0] : item.productId.productImage,
                price: {
                    regularPrice: variant.regularPrice,
                    salePrice: variant.salePrice,
                    productOffer: variant.productOffer || 0,
                    offerType: variant.offerType || "No Offer"
                },
                itemStatus: "Processing"
            };
        });

        // Calculate total amount
        const subtotal = cart.items.reduce((total, item) => {
            const variant = item.productId.variants.find(v => v.size === item.size);
            return total + (variant ? variant.salePrice * item.quantity : 0);
        }, 0);

        const tax = subtotal * 0.0; 
        const shipping = subtotal > 1000 ? 0 : 50; // Free shipping over 1000
        const finalAmount = subtotal + tax + shipping;

        // Generate unique orderId and orderNumber
        let orderId, orderNumber;
        let isUnique = false;
        while (!isUnique) {
            orderId = 'ID' + Date.now() + Math.floor(Math.random() * 1000);
            orderNumber = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
            const existingOrder = await Order.findOne({ $or: [{ orderId }, { orderNumber }] });
            if (!existingOrder) {
                isUnique = true;
            }
        }

        // Convert payment method to uppercase to match enum
        const normalizedPaymentMethod = paymentMethod.toUpperCase();

        // Create new order
        const order = new Order({
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
                productOffersTotal: 0,
                coupon: {
                    discount: 0
                }
            },
            payment: {
                method: normalizedPaymentMethod,
                status: normalizedPaymentMethod === 'COD' ? 'Pending' : 'Completed',
                paidAt: normalizedPaymentMethod === 'COD' ? null : new Date()
            },
            orderStatus: "Pending",
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        });

        // Reduce stock for each item in the order
        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            const variant = product.variants.find(v => v.size === item.variant.size);
            if (variant && variant.quantity >= item.variant.quantity) {
                variant.quantity -= item.variant.quantity; // Reduce stock
                await product.save(); // Save the updated product
            }
        }

        await order.save();

        await Cart.findOneAndUpdate(
            { userId },
            { $set: { items: [] } }
        );

        res.json({
            success: true,
            message: 'Order placed successfully',
            orderId: order.orderId
        });

    } catch (error) {
        console.error('Error placing order:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error: ' + error.message
            });
        }
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'An order with this number already exists. Please try again.'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Something went wrong while placing your order'
        });
    }
}



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

        // Check if user already has addresses
        const existingAddresses = await Address.findOne({ userId });

        if (existingAddresses) {
            // Add new address to existing addresses
            existingAddresses.address.push(addressData.address[0]);
            await existingAddresses.save();
            return res.status(200).json({ success: true, message: "Address added successfully" });
        } else {
            // Create new address document
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

        // Validation
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login to update address" });
        }

        if (!addressId) {
            return res.status(400).json({ success: false, message: "Address ID is required" });
        }

        const updatedData = {
            _id: addressId, // Make sure to include the _id in the update
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
            {
                userId,
                "address._id": addressId
            },
            {
                $set: { "address.$": updatedData }
            },
            {
                new: true,
                runValidators: true
            }
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
        const orderId = req.query.id;

        if (!userId) {
            return res.redirect("/login");
        }

        if (!orderId) {
            req.flash('error', 'Order ID is required');
            return res.redirect("/userProfile");
        }

        // Fetch the order with full population of product details
        const order = await Order.findOne({ 
            _id: orderId, 
            userId: userId 
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

        // Enrich order items with additional details
        const enrichedOrderItems = order.orderItems.map(item => {
            // Ensure product exists
            if (!item.product) {
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
        }).filter(item => item !== null); // Remove any null items

        // Prepare the order object for rendering
        const orderData = {
            ...order.toObject(),
            orderItems: enrichedOrderItems
        };

        // Render full page
        res.render("order-details", { 
            order: orderData, 
            user: userData
        });
        
    } catch (error) {
        console.error("Error fetching order details:", error);
        req.flash('error', 'An error occurred while fetching order details');
        res.redirect("/userProfile");
    }
};





// const cancelOrder = async (req, res) => {
//     try {
//         const { orderId, cancelReason } = req.body;
//         const userId = req.session.user;

//         const order = await Order.findOne({ 
//             _id: orderId, 
//             userId: userId,
//             orderStatus: { $in: ['Pending', 'Processing'] } 
//         });

//         if (!order) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Order not found or cannot be cancelled'
//             });
//         }

//         // Update order status and reason
//         order.orderStatus = 'Cancelled';
//         order.cancelReason = cancelReason;

//         // Update individual item statuses
//         order.orderItems.forEach(item => {
//             item.itemStatus = 'Cancelled';
//         });

//         await order.save();

//         //  Restore product inventory
//         for (const item of order.orderItems) {
//             await Product.findByIdAndUpdate(
//                 item.product, 
//                 { $inc: { 'variants.$[elem].quantity': item.variant.quantity } },
//                 { 
//                     arrayFilters: [{ 'elem.size': item.variant.size }],
//                     new: true 
//                 }
//             );
//         }

//         // if (order.payment.method !== 'COD') {
//         //     // Implement refund logic here
//         //     await processRefund(order);
//         // }

//         res.json({
//             success: true,
//             message: 'Order cancelled successfully'
//         });
//     } catch (error) {
//         console.error('Order Cancellation Error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'An error occurred while cancelling the order'
//         });
//     }
// };
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

        // Update order status and reason
        order.orderStatus = 'Cancelled';
        order.cancelReason = cancelReason;


        if("Cancelled"){
            order.cancelledBy = "User"
        }

        // Update individual item statuses
        order.orderItems.forEach(item => {
            item.itemStatus = 'Cancelled';
        });

        await order.save();

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

        // Uncomment if refund logic is needed
        // if (order.payment.method !== 'COD') {
        //     await processRefund(order);
        // }

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });
    } catch (error) {
        console.error('Order Cancellation Error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while cancelling the order'
        });
    }
};



module.exports = {
    checkoutPage,
    placeOrder,
    addAddress,
    editAddress,
    deleteAddress,
    getOrderDetails,
    cancelOrder
};
