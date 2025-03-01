const Wallet = require("../../models/walletSchema");
const User = require("../../models/userSchema");



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



  

// const getWalletHistory = async (req, res) => {
//   try {
//     const userId = req.params.userId; 

//     const wallet = await Wallet.findOne({ userId }).select("balance transactions");
//     if (!wallet) {
//       return res.status(404).json({
//         success: false,
//         message: "Wallet not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       balance: wallet.balance,
//       transactions: wallet.transactions,
//     });
//   } catch (error) {
//     console.error("Error fetching wallet history:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// Get wallet history





module.exports = {
    walletAdd,
    getWalletHistory
}
