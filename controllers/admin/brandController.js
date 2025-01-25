const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");




// const getBrandpage = async (req,res) => {
//     try {

//         const page = parseInt(req.query.page) || 1;
//         const limit = 4;
//         const skip = (page-1)*limit;

//         const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit);
//         const totalBrands = await Brand.countDocuments();
//         const totalPages = Math.ceil(totalBrands/limit);
//         const reverseBrand = brandData.reverse();
//         res.render("brands",{
//             brands: reverseBrand,
//             currentPage: page,
//             totalPages: totalPages,
//             totalBrands: totalBrands,

//         })
        
//     } catch (error) {
//         console.error(error)
//         res.redirect("/pageError")
//     }
// }

const getBrandpage = async (req, res) => {
    try {
        
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const brandData = await Brand.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands / limit);

        res.render("brands", {
            brands: brandData, // No need to reverse the order here
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};



// const addBrand = async (req,res) =>{
//     try {

//         const brand = req.body.brandName;
//         const findBrand = await Brand.findOne({brand});
//         if(!findBrand) {
//             const image = req.file.filename;
//             const newBrand = new Brand({
//                 brandname : brand,
//                 brandDescription : description,
//                 brandImage : image
//             })
//             await newBrand.save();
//             res.redirect("/admin/brands")
//         }
        
//     } catch (error) {
//         console.log(error);
//         res.redirect("/pageError")
//     }
// }


// const addBrand=async (req, res) => {
//     try {
//         const { brandName, description } = req.body;
//         const logo = req.file.filename;

//         // Check if brand exists
//         const existingBrand = await Brand.findOne({ brandName: brandName });
//         if (existingBrand) {
//             return res.status(400).json({ error: 'Brand already exists' });
//         }

//         const newBrand = new Brand({
//             brandName: brandName,
//             description: description,
//             brandImage: [logo],
//         });
//         await newBrand.save();

//         res.status(200).json({ message: 'Brand added successfully' });
//     } catch (error) {
//         console.error('Error adding brand:', error);
//         res.status(500).json({ error: 'Server error' });
//     }
// };
const addBrand = async (req, res) => {
    try {
        const { brandName, description } = req.body;
        
        // Check if an image was uploaded, if not, use a default value
        const logo = req.file ? req.file.filename : 'default-logo.png';  // Set default image if no file is uploaded

        // Check if brand exists
        const existingBrand = await Brand.findOne({ brandName: brandName });
        if (existingBrand) {
            return res.status(400).json({ error: 'Brand already exists' });
        }

        const newBrand = new Brand({
            brandName: brandName,
            description: description,
            brandImage: [logo],  // Use the logo or default if no file is uploaded
        });
        await newBrand.save();

        res.status(200).json({ message: 'Brand added successfully' });
    } catch (error) {
        console.error('Error adding brand:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


const blockBrand = async (req,res) => {
    try {

        const id = req.query.brandId;
        await Brand.updateOne({_id:id},{ $set: {isBlocked : true}});
        res.redirect("/admin/brands")

    } catch (error) {
        console.log(error);
    }
}


const unBlockBrand = async (req,res) => {
    try {

        const id = req.query.brandId;
        await Brand.updateOne({_id:id},{ $set: {isBlocked : false}});
        res.redirect("/admin/brands")
        
    } catch (error) {
        console.log(error)
    }
}



const deleteBrand = async (req,res) => {
    try {

        const {brandId} = req.query;
        if(!brandId){
            return res.status(400).redirect("/admin/pageError")
        }
        await Brand.deleteOne({_id:brandId});
        res.redirect("/admin/brands")
        
    } catch (error) {
        console.log("Error deleting brand",error)
        res.status(500).redirect("/admin/pageError")
    }
}




module.exports = {
    getBrandpage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand,

}