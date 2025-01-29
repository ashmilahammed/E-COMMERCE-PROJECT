const User = require("../../models/userSchema");



// const customerInfo = async(req,res) => {
//     try {

//          let search = "";
//          if(req.query.search){
//             search = req.query.search;
//          }
//          let page = 1;
//          if(req.query.page) {
//             page = req.query.page;
//          }
//          const limit = 3;
//          const userData = await User.find({
//             isAdmin : false,
//             $or: [
//                 { name: { $regex: ".*" + search + ".*" }},
//                 { email: { $regex: ".*" + search + ".*" }}
//             ]
//          })
//          .limit(limit*1)
//          .skip((page-1)*limit)
//          .exec()

//          const count = await User.find({
//             isAdmin : false,
//             $or: [
//                 { name: { $regex: ".*" + search + ".*" }},
//                 { email: { $regex: ".*" + search + ".*" }}
//             ],

//          }).countDocuments();

//          res.render("customers")

//     } catch (error) {
//         console.log(error)
        
//     }
// }

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

        res.render("customers", {
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


const blockCustomer = async (req,res) => {
    try {

       let id = req.query.userId;
       await User.updateOne({_id:id}, { $set: { isBlocked:true }});
       res.redirect("/admin/users");
        
    } catch (error) {
        res.redirect("/admin/pageError")
    }
}


const unblockCustomer = async (req,res) => {
    try {

        let id = req.query.userId;
        await User.updateOne({_id:id}, { $set: { isBlocked:false }});
        res.redirect("/admin/users")
        
    } catch (error) {
        res.redirect("/admin/pageError")
    }
}




module.exports = {
    customerInfo,
    blockCustomer,
    unblockCustomer
}