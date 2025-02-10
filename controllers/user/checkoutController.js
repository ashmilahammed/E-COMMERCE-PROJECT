const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");


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
        cart.discount = 0; // You can implement discount logic later
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



const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressId, paymentMethod } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login to place order" });
        }

        const userData = await User.findById(userId);
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'productName productImage variants brand price'
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }
        if (!addressId || !paymentMethod) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        

        // Calculate order details
        const subtotal = cart.items.reduce((total, item) => {
            // Find the variant matching the cart item's size
            const variant = item.productId.variants.find(v => v.size === item.size);
            return total + (variant ? variant.salePrice * item.quantity : 0);
        }, 0);

        const tax = subtotal * 0.0;
        const shipping = subtotal > 1000 ? 0 : 50;
        const total = subtotal + tax + shipping;

        // Find selected address
        const selectedAddress = await Address.findById(addressId);
        if (!selectedAddress) {
            return res.status(400).json({ success: false, message: "Invalid address selected" });
        }

        // Create order
        const newOrder = new Order({
            userId,
            items: cart.items.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.variants.find(v => v.size === item.size).salePrice,
                size: item.size
            })),
            shippingAddress: selectedAddress,
            paymentMethod,
            subtotal,
            tax,
            shipping,
            total,
            status: 'Pending'
        });

        await newOrder.save();

        // Clear cart after order placement
        await Cart.findOneAndDelete({ userId });

        res.json({
            success: true,
            message: "Order placed successfully",
            orderId: newOrder._id
        });

    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ success: false, message: "Error placing order" });
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



// const updateAddress = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;

//         if (!userId) {
//             return res.status(401).json({ success: false, message: "Please login to update address" });
//         }

//         const updatedData = {
//             addressType,
//             name,
//             city,
//             landMark,
//             state,
//             pincode,
//             phone,
//             altPhone,
//         };

//         const result = await Address.findOneAndUpdate(
//             { userId, "address._id": addressId },
//             { $set: { "address.$": updatedData } },
//             { new: true }
//         );

//         console.log('User ID:', userId);
// console.log('Address ID:', addressId);

//         if (!result) {
//             return res.status(404).json({ success: false, message: "Address not found" });
//         }

//         return res.status(200).json({ success: true, message: "Address updated successfully" });
//     } catch (error) {
//         console.error("Error updating address:", error);
//         return res.status(500).json({ success: false, message: "Failed to update address" });
//     }
// };



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




module.exports = {
    checkoutPage,
    placeOrder,
    addAddress,
    editAddress,
    deleteAddress
};



