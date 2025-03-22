const Wallet = require("../../models/walletSchema");
const User = require("../../models/userSchema");

const Wishlist = require("../../models/wishlistSchema");
const Cart = require("../../models/cartSchema");



const walletAdd = async (req, res) => {
    try {

        const userId = req.user.id; // From userAuth middleware
        const { amount } = req.body;

        if (!userId || !amount || amount <= 0 || amount > 10000) {
            return res.status(400).json({
                success: false,
                message: "Amount must be between 1 and 10,000",
            });
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0, transactions: [] });
        }

        wallet.balance += amount;
        wallet.transactions.push({
            type: "Deposit",
            amount,
            description: "Added to wallet",
            status: "Completed",
            date: new Date(),
        });

        await wallet.save();
        res.json({
            success: true,
            balance: wallet.balance,
            message: "Money added successfully",
        });
    } catch (error) {
        console.error("Error adding money:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};



const getWalletHistory = async (req, res) => {
    try {
      const userId = req.user.id; 
  
      const wallet = await Wallet.findOne({ userId }).select("balance transactions");
      
      if (!wallet) {
        return res.status(200).json({
            success: true,
            balance: 0,
            transactions: [],
            message: "No wallet found, initializing...",
        });
    }
  
      const sortedTransactions = wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      res.status(200).json({
        success: true,
        balance: wallet.balance,
        transactions: sortedTransactions,
      });
    } catch (error) {
      console.error("Error fetching wallet history:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };



  


const getWalletBalance =  async (req, res) => {
    try {
        const userId = req.session.user;
        const wallet = await Wallet.findOne({ userId });
        res.json({ success: true, balance: wallet?.balance ? wallet.balance.toFixed(2) : "0.00" });
    } catch (error) {
        console.error("Error fetching wallet balance:", error);
        res.json({ success: false, balance: "0.00" });
    }
};






////////
const getWishlistCount = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) return res.json({ count: 0 });

        const wishlist = await Wishlist.findOne({ UserId: userId });
        const count = wishlist ? wishlist.products.length : 0;

        res.json({ count });
    } catch (error) {
        console.error("Error fetching wishlist count:", error);
        res.status(500).json({ count: 0 });
    }
};


const getCartCount = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) return res.json({ count: 0 });

        const cart = await Cart.findOne({ userId });
        const count = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

        res.json({ count });
    } catch (error) {
        console.error("Error fetching cart count:", error);
        res.status(500).json({ count: 0 });
    }
};





module.exports = {
    walletAdd,
    getWalletHistory,
    getWalletBalance,

    getCartCount,
    getWishlistCount
}
