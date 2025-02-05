const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema")
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { error } = require("console");
const { response } = require("express");




const getProductAddPage = async (req,res) => {
    try {

        const category = await Category.find({isListed : true});
        const brand = await Brand.find({isBlocked : false});
        res.render("product-add",{
            category : category,
            brand : brand
        });
        
    } catch (error) {
        console.log(error)
        res.redirect("/admin/pageError")
    }
}


const addProducts = async (req,res) => {
    try {

        const products = req.body;
        const productExists = await Product.findOne({
            productName : products.productName,
        });

        if(!productExists) {
            const images = [];

            if(req,images && req.files.length > 0) {
                for(let i=0;i<req.files.length;i++){
                    const originalImagepath = req.files[i].path;

                    const resizedImagePath = path.join("public","uploads","product-images",req.files[i].filename);
                    await sharp(originalImagepath).resize({width:440,height:440}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }

            const categoryId = await Category.findOne({name: products.category});

            if(!categoryId) {
                return res.status(400).join("Invalid Category name");
            }

            const newProduct = new Product({
                productName : products.productName,
                description : products.description,
                brand : products.brand,
                category : categoryId._id,
                regularPrice : products.regularPrice,
                salePrice : products.salePrice,
                createdOn : new Date(),
                quantity : products.quantity,
                size : products.size,
                color : products.color,
                productImage : images,
                status : "Available",

            })  ;

            await newProduct.save();
            return res.redirect("/admin/addProducts");

        }else {
            return res.status(400).json("Product already exists. Please try with another name.")
        }
        
    } catch (error) {
        console.error("Error saving product",error);
        return res.redirect("/admin/pageError")
    }
}



const GetAllProducts = async (req,res) => {
    try {

        const search = req.query.search || "";
        // const page = req.query.page || 1;
        const page = parseInt(req.query.page) || 1;
        const limit = 4;

        const productData = await Product.find({
            $or:[

                {productName:{ $regex : new RegExp(".*" + search + ".*","i" )}},
                {brand: { $regex: new RegExp(".*" + search + ".*","i")}},
            ],
        })
        .sort({ createdAt: -1 })
        .limit(limit*1)
        .skip((page-1)*limit)
        .populate('category')
        .exec();


        const count = await Product.find({
            $or: [
                {productName: {$regex:new RegExp(".*" + search + ".*","i" )}},
                {brand: { $regex: new RegExp(".*" + search + ".*","i")}},
            ],
        }).countDocuments();

        const category = await Category.find({isListed:true});
        const brand = await Brand.find({isBlocked:false});

        if(category && brand) {
            res.render("products",{
                products: productData,
                currentPage: page,
                totalPages: Math.ceil(count/limit),
                category : category,
                brand : brand,

            })
        }else {
            res.render("page-404");
        }

        
    } catch (error) {
        console.log(error);
        res.redirect("/admin/pageError")
    }
}


const blockProduct = async (req,res) => {
    try {

        const id = req.query.productId;
        await Product.updateOne({_id:id},{ $set: {isBlocked : true}});
        res.redirect("/admin/products")
        
    } catch (error) {
        res.redirect("/admin/pageError")
    }
}


const unblockProduct = async (req,res) => {
    try {

        const id = req.query.productId;
        await Product.updateOne({_id:id},{$set: {isBlocked : false}});
        res.redirect("/admin/products")
        
    } catch (error) {
        res.redirect("/admin/pageError")
    }
}



const getEditProduct = async (req,res) => {
    try {

        const id = req.query.productId;
        const product = await Product.findOne({_id:id});
        const category = await Category.find({});
        const brand = await Brand.find({});
        res.render("edit-product",{
            product : product,
            category : category,
            brand : brand,
        })
        
    } catch (error) {
        res.redirect("/admin/pageError")
    }

}



const editProduct = async (req,res) => {
    try {

        const id = req.params.id;
        const product = await Product.findOne({_id:id});
        const data = req.body;
        const existingProduct = await Product.findOne({
            productName:data.productName,
            _id:{$ne : id},
        })

        if(existingProduct) {
            return response.status(400).json({error:"Product with this name already exists. Please try with another name"});
        }

        const images = []

        if(req.files && req.files.length > 0) {
            for(let i=0;i<req.files.length;i++){
                images.push(req.files[i].filename);
            }
        }


        const updateFields = {
            productName : data.productName,
            description : data.description,
            brand : data.brand,
            category : data.category,
            regularPrice : data.regularPrice,
            salePrice : data.salePrice,
            quantity : data.quantity,
            size : data.size,
            color : data.color
        }
        
        if(req.files.length > 0){
            updateFields.$push = {productImage: {$each:images}}
        }

        await Product.findByIdAndUpdate(id,updateFields,{new:true});
        res.redirect("/admin/products");;

    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageError")
    }
}



const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;

        // Remove image reference from database
        await Product.findByIdAndUpdate(productIdToServer, {
            $pull: { productImage: imageNameToServer }
        });

        const imagePath = path.join("public", "uploads", "re-image", imageNameToServer);

        if (fs.existsSync(imagePath)) {
            try {
                await fs.promises.unlink(imagePath); // Asynchronous deletion
                console.log(`Image ${imageNameToServer} deleted successfully.`);
            } catch (unlinkErr) {
                console.error(`Failed to delete image: ${unlinkErr.message}`);
                return res.status(500).json({ status: false, message: "Failed to delete image from server." });
            }
        } else {
            console.log(`Image ${imageNameToServer} not found.`);
        }

        res.json({ status: true, message: "Image deleted successfully." });

    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageError");
    }
};



// const deleteSingleImage = async (req,res) => {
//     try {

//         const {imageNameToServer, productIdToServer} = req.body;
//         const product = await Product.findByIdAndUpdate(productIdToServer,{$pull: {productImage:imageNameToServer}});

//         const imagePath = path.join("public","uploads","re-image",imageNameToServer);
//         if(fs.existsSync(imagePath)) {
//             await fs.unlinkSync(imagePath);
//             console.log(`Image ${imageNameToServer} deleted Successfully.`)
//         }else {
//            console.log(`Image ${imageNameToServer} not Found`) 
//         }
//         res.send({status:true});

        
//     } catch (error) {
//         console.error(error);
//         res.redirect("/admin/pageError")
//     }
// }




module.exports = {
    getProductAddPage,
    addProducts,
    GetAllProducts,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
}