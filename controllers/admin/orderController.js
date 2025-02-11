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

    res.render("orderList-details")
    
  } catch (error) {
    
  }
}





  module.exports = {
    orderListPage,
    getOrderDetails
  }
  
