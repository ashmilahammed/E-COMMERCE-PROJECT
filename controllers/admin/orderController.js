const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
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
      currentOrder.forEach(order => {
        order.orderId = uuidv4();
      });

  
      res.render("orderList", { orders: currentOrder, totalPages, currentPage });

    } catch (error) {
      res.redirect("/admin/pageError");
    }
  };




  const getOrderDetails = async (req,res) => {
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

      if (status === 'Cancelled') {
        order.cancelledBy = 'Admin';
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

      // console.log(`Order ${orderId} status updated to ${status}`);

      res.status(200).json({ 
          success: true, 
          message: 'Order status updated successfully',
          updatedStatus: status 
      });

  } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ 
          success: false, 
          message: 'Internal server error' 
      });
  }
};

  

  module.exports = {
    orderListPage,
    getOrderDetails,
    updateOrderStatus
  }
  
