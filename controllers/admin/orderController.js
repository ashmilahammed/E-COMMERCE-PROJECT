const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema")
const mongodb = require("mongodb");
const mongoose = require('mongoose')
const env = require("dotenv").config();
const crypto = require("crypto");
const { v4: uuidv4 } = require('uuid');





const orderListPage = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });

    let itemsPerPage = 5;
    let currentPage = parseInt(req.query.page) || 1;
    let startIndex = (currentPage - 1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;
    let totalPages = Math.ceil(orders.length / 3);

    const currentOrder = orders.slice(startIndex, endIndex);
    // currentOrder.forEach(order => {
    //   order.orderId = uuidv4();
    // });


    res.render("orderList", { orders: currentOrder, totalPages, currentPage });

  } catch (error) {
    res.redirect("/admin/pageError");
  }
};




const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId)
      .populate({
        path: 'orderItems.product',
        model: 'Product',
        populate: {
          path: 'category',
          model: 'Category',
          select: 'name'
        }
      })
      .populate('shippingAddress');

    if (!order) {
      return res.redirect('/admin/orderList');
    }

    // Enrich order items with additional details
    const enrichedOrderItems = order.orderItems.map(item => {
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
    }).filter(item => item !== null);


    const orderData = {
      ...order.toObject(),
      orderItems: enrichedOrderItems
    };

    res.render("orderList-details", { order: orderData });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.redirect("/admin/pageError");
  }
}



const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and status are required'
      });
    }

    const allowedStatuses = ["Pending", "Shipped", "Delivered", "Cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const order = await Order.findById(orderId).populate('orderItems.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.orderStatus = status;
    order.orderItems.forEach(item => {
      item.itemStatus = status;
    });


    if (status === "Delivered" && order.payment.method === "COD") {
      order.payment.status = "Completed";
      order.payment.paidAt = new Date();
    }

    
    if (status === 'Cancelled') {
      order.cancelledBy = 'Admin';
      order.cancelledAt = new Date();

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

      // Refund for Wallet Payments
      if (order.payment.method === "WALLET") {
        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: 'Refund',
          amount: refundAmount,
          orderId: orderId,
          status: 'Completed',
          description: `Refund for admin cancellation of <b>Order ID: ${orderId}</b>`,
          date: new Date()
        });
        wallet.lastUpdated = new Date();
        await wallet.save();
      }

      // Refund for Razorpay Payments
      if (order.payment.method === "RAZORPAY") {
        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: 'Refund',
          amount: refundAmount,
          orderId: orderId,
          status: 'Completed',
          description: `Refund for admin cancellation of <b>Order ID: ${orderId}</b>`,
          date: new Date()
        });
        wallet.lastUpdated = new Date();
        await wallet.save();
      }

      // Restore product inventory
      for (const item of order.orderItems) {
        const product = await Product.findById(item.product._id);
        const variant = product.variants.find(v => v.size === item.variant.size);

        if (variant) {
          variant.quantity += item.variant.quantity;
          await product.save();
        }
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: status === 'Cancelled' ? 'Order cancelled and refunded successfully' : 'Order status updated successfully',
      updatedStatus: status
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
};




const returnRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    const totalRequests = await Order.countDocuments({ "orderItems.returnRequest.requested": true });

    const returnRequests = await Order.find({ "orderItems.returnRequest.requested": true })
      .populate({
        path: "orderItems.product",
        select: "productName brand category variants",
        populate: {
          path: "category",
          select: "name",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalRequests / limit);

    res.render("return-Requests", { returnRequests, currentPage: page, totalPages });

  } catch (error) {
    console.error("Error fetching return requests:", error);
    res.status(500).send("Internal Server Error");
  }
};




const returnProcess = async (req, res) => {
  try {

    const { orderId, productId, variantSize, action, comments } = req.body;

    const order = await Order.findById(orderId).populate('userId');
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const item = order.orderItems.find(i =>
      i.product.toString() === productId && i.variant.size.toString() === variantSize.toString()
    );

    if (!item || !item.returnRequest?.requested) {
      return res.status(400).json({ success: false, message: "Invalid return request" });
    }

    if (action === "approve") {
      item.returnRequest.status = "Approved";
      item.returnRequest.approvedAt = new Date();

      // Restock product quantity
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      const variant = product.variants.find(v => v.size === item.variant.size);
      if (variant) {
        variant.quantity += item.variant.quantity;
        await product.save();
      }

      //  refund amount
      const refundAmount = Number(item.price.salePrice) * item.variant.quantity;
      if (isNaN(refundAmount) || refundAmount <= 0) {
        console.error('Invalid refund amount:', {
          salePrice: item.price.salePrice,
          quantity: item.variant.quantity,
          calculated: refundAmount
        });
        return res.status(500).json({
          success: false,
          message: 'Invalid refund amount calculated for return'
        });
      }


      let wallet = await Wallet.findOne({ userId: order.userId });
      if (!wallet) {
        wallet = new Wallet({
          userId: order.userId,
          balance: refundAmount,
          transactions: [{
            type: 'Refund',
            amount: refundAmount,
            orderId: orderId,
            status: 'Completed',
            // description: `Refund for return of item in Order #${orderId}`,
            description: `Refund for return of <b>${product.productName}</b>`,
            date: new Date()
          }],
          lastUpdated: new Date()
        });
      } else {
        wallet.balance = Number(wallet.balance) + refundAmount;
        wallet.transactions.push({
          type: 'Refund',
          amount: refundAmount,
          orderId: orderId,
          status: 'Completed',
          // description: `Refund for return of item in Order #${orderId}`,
          description: `Refund for return of <b>${product.productName}</b>`,
          date: new Date()
        });
        wallet.lastUpdated = new Date();
      }

      await wallet.save();

    } else if (action === "reject") {
      item.returnRequest.status = "Rejected";
      item.returnRequest.rejectedAt = new Date();
      item.returnRequest.comments = comments;
    }

    await order.save();

    res.json({ success: true, message: `Return request ${action} successfully` });

  } catch (error) {
    console.error("Error processing return request:", error);
    res.status(500).json({ success: false, message: "Internal Server Error: " + error.message });
  }
};







module.exports = {
  orderListPage,
  getOrderDetails,
  updateOrderStatus,
  returnRequests,
  returnProcess
}

