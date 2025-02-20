const User = require("../../models/userSchema");





const customerInfo = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 4;

        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' }},
                { email: { $regex: ".*" + search + ".*", $options: 'i' }}
            ]
        })
        .sort({createdOn:-1})
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' }},
                { email: { $regex: ".*" + search + ".*", $options: 'i' }}
            ]
        });

        res.render("users", {
            users: userData,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            search: search
        });

    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageError")
    }
}



const blockCustomer = async (req, res) => {
    try {
        let id = req.body.userId;
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });

        res.json({ success: true, message: "User blocked successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error blocking user" });
    }
};



const unblockCustomer = async (req,res) => {
    try {

        let id = req.body.userId;
        await User.updateOne({_id:id}, { $set: { isBlocked:false }});
        
        res.json({success:true, message:"User Blocked Successfully"})
        
    } catch (error) {
        res.status(500).json({success:false, message: "Error blocking User."})
    }
}




module.exports = {
    customerInfo,
    blockCustomer,
    unblockCustomer
}