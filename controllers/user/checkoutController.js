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

//         const { selectedAddress } = req.body; // Ensure this matches the name attribute in the form
//         if (!selectedAddress) {
//             return res.status(400).json({ success: false, message: 'Shipping address is required' });
//         }

//         // Get cart items
//         const cart = await Cart.findOne({ userId }).populate('items.productId');
//         if (!cart || cart.items.length === 0) {
//             return res.status(400).json({ success: false, message: 'Your cart is empty' });
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

//         // Calculate order items
//         const orderItems = cart.items.map(item => ({
//             product: item.productId._id,
//             quantity: item.quantity,
//             variant: {
//                 size: item.size,
//                 productImage: item.productId.variants.find(v => v.size === item.size)?.productImage[0] || item.productId.productImage[0]
//             },
//             price: {
//                 originalPrice: item.productId.variants.find(v => v.size === item.size)?.price || 0,
//                 discountedPrice: item.productId.variants.find(v => v.size === item.size)?.salePrice || 0,
//                 productOffer: item.productId.productOffer || 0,
//                 offerType: item.productId.productOffer ? 'Product Offer' : 'No Offer'
//             }
//         }));

//         // Create new order
//         const order = new Order({
//             userId,
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
//             totalAmount: orderItems.reduce((total, item) => total + (item.price.discountedPrice * item.quantity), 0),
//             orderNumber: `ORD${Date.now()}`, // Generate order number
//             orderStatus: 'Pending'
//         });

//         await order.save();

//         // Clear cart after successful order
//         await Cart.findOneAndUpdate(
//             { userId },
//             { $set: { items: [] } }
//         );

//         res.json({
//             success: true,
//             message: 'Order placed successfully',
//             orderId: order._id
//         });

//     } catch (error) {
//         console.error('Error placing order:', error);
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

        const { selectedAddress } = req.body; // Ensure this matches the name attribute in the form

        console.log(selectedAddress);  // Debugging line: check if value is passed

        if (!selectedAddress) {
            return res.status(400).json({ success: false, message: 'Shipping address is required' });
        }


        // Get cart items

        // const cart = await Cart.findOne({ userId }).populate('items.productId');
        // if (!cart || cart.items.length === 0) {
        //     return res.status(400).json({ success: false, message: 'Your cart is empty' });
        // }
        const cartItems = req.body.cartItems ? JSON.parse(req.body.cartItems) : [];
        console.log('Cart Items:', cartItems);

        cartItems.forEach(item => {
            console.log('Product Name:', item.name);  // Log the product name to verify it's correct
        });
        
        if (!cartItems || cartItems.length === 0) {
            throw new Error('No items in the cart');
        }


        // Get shipping address
        const address = await Address.findOne({
            userId,
            'address._id': selectedAddress
        });

        console.log('Address object:', address);

        if (!address) {
            return res.status(400).json({ success: false, message: 'Invalid shipping address' });
        }

        const shippingAddress = address.address.find(addr => addr._id.toString() === selectedAddress);

        // Calculate order items
        // const orderItems = cart.items.map(item => ({
        //     product: item.productId._id,
        //     quantity: item.quantity,
        //     variant: {
        //         size: item.size,
        //         productImage: item.productId.variants.find(v => v.size === item.size)?.productImage[0] || item.productId.productImage[0]
        //     },
        //     price: {
        //         originalPrice: item.productId.variants.find(v => v.size === item.size)?.price || 0,
        //         discountedPrice: item.productId.variants.find(v => v.size === item.size)?.salePrice || 0,
        //         productOffer: item.productId.productOffer || 0,
        //         offerType: item.productId.productOffer ? 'Product Offer' : 'No Offer'
        //     }
        // }));
        console.log("abc");

        // const orderItems = cart.items.map(item => {
        //     const variant = item.productId.variants.find(v => v.size === item.size);

        //     if (!variant) {
        //         console.error(`Variant not found for product: ${item.productId._id}, size: ${item.size}`);
        //         return null; // Variant not found, skip this item or handle it as needed
        //     }

        //     // Check if productImage is defined and has at least one item
        //     const productImage = Array.isArray(variant.productImage) && variant.productImage.length > 0
        //         ? variant.productImage[0] 
        //         : 'default_image_url'; // Fallback to default image if not found

        //     return {
        //         product: item.productId._id,
        //         quantity: item.quantity,
        //         variant: {
        //             size: item.size,
        //             productImage: productImage, // Use the checked product image
        //         },
        //         price: {
        //             originalPrice: variant.price || 0,
        //             discountedPrice: variant.salePrice || 0,
        //             productOffer: item.productId.productOffer || 0,
        //             offerType: item.productId.productOffer ? 'Product Offer' : 'No Offer',
        //         },
        //     };
        // }).filter(item => item !== null); // Filter out null values in case variant was not found
        // Create new order


        const orderItems = cart.items.map(item => {
            const variant = item.productId.variants.find(v => v.size === item.size);

            if (!variant) {
                console.error(`Variant not found for product: ${item.productId._id}, size: ${item.size}`);
                return null;
            }

            const product = item.productId;
            const productName = product && product.name ? product.name : 'Unknown Product'; // Fallback if product name is undefined

            // Now safely access product.name
            console.log('Product Name:', productName);

            // Check if productImage is valid
            const productImage = Array.isArray(variant.productImage) && variant.productImage.length > 0
                ? variant.productImage[0]
                : 'default_image_url'; // Fallback if productImage is not found

            return {
                product: product._id,
                name: productName,  // Use the safely accessed product name
                quantity: item.quantity,
                variant: {
                    size: item.size,
                    productImage: productImage,
                },
                price: {
                    originalPrice: variant.price || 0,
                    discountedPrice: variant.salePrice || 0,
                    productOffer: item.productId.productOffer || 0,
                    offerType: item.productId.productOffer ? 'Product Offer' : 'No Offer',
                },
            };
        }).filter(item => item !== null);

        // console.log('Cart Items:', req.body.cartItems); 
        console.log('Request Body:', req.body);




        const order = new Order({
            userId,
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
            totalAmount: orderItems.reduce((total, item) => total + (item.price.discountedPrice * item.quantity), 0),
            orderNumber: `ORD${Date.now()}`, // Generate order number
            orderStatus: 'Pending'
        });

        await order.save();

        // Clear cart after successful order
        await Cart.findOneAndUpdate(
            { userId },
            { $set: { items: [] } }
        );

        res.json({
            success: true,
            message: 'Order placed successfully',
            orderId: order._id
        });

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong while placing your order'
        });
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
