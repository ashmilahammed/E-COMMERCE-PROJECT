const Wallet = require("../../models/walletSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");




const getWalletTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 9; 
        const skip = (page - 1) * limit;

        const wallets = await Wallet.find()
            .populate('userId', 'fullName email')
            .sort({ 'transactions.date': -1 });

        let transactions = wallets.flatMap(wallet => 
            wallet.transactions.map(t => ({
                transactionId: t._id,
                date: t.date,
                user: wallet.userId,
                type: t.type,
                amount: t.amount,
                orderId: t.orderId,
                status: t.status
            }))
        );

        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Paginate the transactions array
        const paginatedTransactions = transactions.slice(skip, skip + limit);
        const totalPages = Math.ceil(transactions.length / limit);

        res.render('walletList', { 
            transactions: paginatedTransactions,
            title: 'Wallet Transactions',
            currentPage: page,
            totalPages: totalPages,
            limit: limit
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};




const getTransactionDetails = async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const wallet = await Wallet.findOne({ 'transactions._id': transactionId })
            .populate('userId', 'fullName email phone');
        
        if (!wallet) {
            return res.status(404).send('Transaction not found');
        }

        const transaction = wallet.transactions.id(transactionId);
        let order = null;
        
        if (transaction.orderId) {
            order = await Order.findOne({ orderId: transaction.orderId })
                .populate('userId', 'username email');
        }

        res.render('transaction-details', {
            user: wallet.userId,
            transaction,
            order,
            title: 'Transaction Details'
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};






module.exports = {
    getWalletTransactions,
    getTransactionDetails
}