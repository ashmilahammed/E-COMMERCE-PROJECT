const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        variant: {
            size: {
                type: Number,
                required: true
            },
            productImage: {
                type: String,
                required: true
            }
        },
        price: {
            originalPrice: {
                type: Number,
                required: true
            },
            discountedPrice: {
                type: Number,
                required: true
            },
            productOffer: {
                type: Number,
                default: 0
            },
            offerType: {
                type: String,
                enum: ['Product Offer', 'Category Offer', 'No Offer'],
                default: 'No Offer'
            }
        },
        status: {   
            itemStatus: {
                type: String,
                enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'],
                default: 'Processing'
            },
            return: {
                requested: {
                    type: Boolean,
                    default: false
                },
                status: {
                    type: String,
                    enum: ['Pending', 'Approved', 'Rejected'],
                    default: 'Pending'
                },
                reason: {
                    type: String
                },
                comments: {
                    type: String
                },
                requestDate: {
                    type: Date
                }
            }
        }
    }],
    shippingAddress: {
        name: {
            type: String,
            required: true
        },
        landMark: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        pincode: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        }
    },
    payment: {  
        method: {
            type: String,
            enum: ['COD', 'Wallet', 'Razorpay'],
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Completed', 'Failed'],
            default: null
        },
        razorpay: {
            orderId: {
                type: String
            },
            paymentId: {
                type: String
            },
            signature: {
                type: String
            }
        },
        transactionId: {
            type: String
        },
        paidAt: {
            type: Date
        }
    },
    pricing: {
        subtotal: {
            type: Number,
            required: true
        },
        coupon: {
            code: {
                type: String
            },
            discount: {
                type: Number,
                default: 0
            }
        },
        productOffersTotal: {
            type: Number,
            default: 0
        },
        finalAmount: {
            type: Number,
            required: true
        }
    },
    orderStatus: {
        type: String,
        enum: ['Processing', 'Delivered', 'Cancelled', 'Failed', 'Returned'],
        default: 'Processing'
    },
    cancelReason: {
        type: String
    },
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    expectedDeliveryDate: {
        type: Date
    },
    deliveryDate: {
        type: Date
    }
}, { 
    timestamps: true 
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;