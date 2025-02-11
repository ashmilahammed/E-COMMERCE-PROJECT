const mongoose = require("mongoose");
const { Schema } = mongoose;


const orderSchema = new Schema({
    orderId: {
        type: String,
        unique: true,
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    orderItems: [
        {
            product: {
                type: Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            variant: {
                size: {
                    type: Number,
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
            },
            productImage: {
                type: String,
                required: true,
            },
            price: {
                regularPrice: {
                    type: Number,
                    required: true,
                },
                salePrice: {
                    type: Number,
                    required: true,
                },
                productOffer: {
                    type: Number,
                    default: 0,
                },
                offerType: {
                    type: String,
                    enum: ["Product Offer", "Category Offer", "No Offer"],
                    default: "No Offer",
                },
            },
            itemStatus: {
                type: String,
                enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
                default: "Processing",
            },
            returnRequest: {
                requested: {
                    type: Boolean,
                    default: false,
                },
                status: {
                    type: String,
                    enum: ["Pending", "Approved", "Rejected"],
                    default: "Pending",
                },
                reason: {
                    type: String,
                },
                comments: {
                    type: String,
                },
                requestDate: {
                    type: Date,
                },
            },
        },
    ],
    shippingAddress: {
        name: {
            type: String,
            required: true,
        },
        landMark: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        state: {
            type: String,
            required: true,
        },
        pincode: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        altPhone: {
            type: String,
            required: true,
        },
    },
    payment: {
        method: {
            type: String,
            enum: ["COD", "Wallet", "Razorpay"],
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Completed", "Failed"],
            default: "Pending",
        },
        razorpay: {
            orderId: String,
            paymentId: String,
            signature: String,
        },
        transactionId: String,
        paidAt: Date,
    },
    pricing: {
        subtotal: {
            type: Number,
            required: true,
        },
        coupon: {
            code: String,
            discount: {
                type: Number,
                default: 0,
            },
        },
        productOffersTotal: {
            type: Number,
            default: 0,
        },
        finalAmount: {
            type: Number,
            required: true,
        },
    },
    orderStatus: {
        type: String,
        enum: ["Pending", "Delivered", "Cancelled", "Failed", "Returned"],
        default: "Pending",
    },
    cancelReason: String,
    orderNumber: {
        type: String,
        unique: true,
        required: true,
    },
    expectedDeliveryDate: Date,
    deliveryDate: Date,
}, 
{ timestamps: true });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
