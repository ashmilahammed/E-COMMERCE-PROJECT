const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");





const getBrandpage = async (req, res) => {
    try {
        
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const brandData = await Brand.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands / limit);

        res.render("brands", {
            brands: brandData, 
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};




const addBrand = async (req, res) => {
    try {
        const { brandName, description } = req.body;
   
        const logo = req.file ? req.file.filename : 'default-logo.png';  

        const existingBrand = await Brand.findOne({ brandName:{$regex: `^${brandName}$`, $options: 'i'}});

        if (existingBrand) {
            return res.status(400).json({ error: 'Brand already exists' });
        }

        const newBrand = new Brand({
            brandName: brandName,
            description: description,
            brandImage: [logo], 
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

        const id = req.body.brandId;
        await Brand.updateOne({_id:id},{ $set: {isBlocked : true}});

        const brandData = await Brand.findById(id);
        if (brandData) {
            await Product.updateMany({ brand: brandData.brandName }, { $set: { isBlocked: true } });
        }
     
        res.json({ success: true, message: "Brand Blocked Successfully" });

    } catch (error) {
        res.status(500).json({ success: false, message: "Error blocking brand" });
    }
}


const unBlockBrand = async (req,res) => {
    try {

        const id = req.body.brandId;
        await Brand.updateOne({_id:id},{ $set: {isBlocked : false}});

        const brandData = await Brand.findById(id);
        if (brandData) {
            await Product.updateMany({ brand: brandData.brandName }, { $set: { isBlocked: false } });
        }
       
        res.json({ success: true, message: "Brand Unblocked Successfully" });
        
    } catch (error) {
        res.status(500).json({ success: false, message: "Error unblocking brand" });
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