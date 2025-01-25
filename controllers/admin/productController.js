const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema")
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { error } = require("console");




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



module.exports = {
    getProductAddPage,
    addProducts,
    GetAllProducts,
    blockProduct,
    unblockProduct
}