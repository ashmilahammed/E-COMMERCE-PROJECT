const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema")
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");





const getProductAddPage = async (req, res) => {
    try {

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        res.render("product-add", {
            category: category,
            brand: brand
        });

    } catch (error) {
        console.log(error)
        res.redirect("/admin/pageError")
    }
}


const addProducts = async (req, res) => {
    try {
        const products = req.body;
        const productExists = await Product.findOne({
            productName: products.productName,
        });

        if (!productExists) {
            const images = [];

            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagepath = req.files[i].path;

                    const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);
                    await sharp(originalImagepath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }

            const categoryId = await Category.findOne({ name: products.category });

            if (!categoryId) {
                return res.status(400).json("Invalid Category name");
            }

            // Extract variants from the request body
            const variants = products.variants.map(variant => ({
                size: variant.size,
                regularPrice: variant.regularPrice,
                salePrice: variant.salePrice,
                quantity: variant.quantity,
                status: variant.status
            }));

            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                brand: products.brand,
                category: categoryId._id,
                productImage: images,
                status: "Available",
                variants: variants, 
            });

            await newProduct.save();
            return res.redirect("/admin/addProducts");
        } else {
            return res.status(400).json("Product already exists. Please try with another name.");
        }
    } catch (error) {
        console.log(error);
        res.status(500).json("Server Error");
    }
}




const GetAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const sortField = req.query.sort || "createdAt";
        const sortOrder = req.query.order || "desc";
        const filterCategory = req.query.category || "";
        const filterBrand = req.query.brand || "";
        const filterStatus = req.query.status || "";

        const filter = {
            $and: [
                {
                    $or: [
                        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } }
                    ]
                }
            ]
        };

        if (filterCategory) {
            const category = await Category.findOne({ name: filterCategory, isListed: true });
            if (category) {
                filter.$and.push({ category: category._id });
            }
        }

        if (filterBrand) {
            filter.$and.push({ brand: filterBrand });
        }

        if (filterStatus) {
            filter.$and.push({ status: filterStatus });
        }

        const sort = {};
        sort[sortField] = sortOrder === "asc" ? 1 : -1;

        const productData = await Product.find(filter)
            .sort(sort)
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('category')
            .lean()
            .exec();

        const processedProducts = productData.map(product => {
            // Handle cases where variants might be undefined
            const variants = product.variants || [];

            const totalQuantity = variants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);

            const prices = variants.map(v => v.salePrice || 0);
            const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
            const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

            const sizes = [...new Set(variants.map(v => v.size || 0))].filter(size => size !== 0).sort((a, b) => a - b);

           
            const hasAvailableVariants = variants.some(v => v.status === "Available" && (v.quantity || 0) > 0);
            const overallStatus = hasAvailableVariants ? "Available" : "out of stock";

            return {
                ...product,
                totalQuantity,
                priceRange: prices.length > 0 ? (minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice} - ₹${maxPrice}`) : "Price not set",
                sizes: sizes.length > 0 ? sizes.join(", ") : "No sizes available",
                overallStatus,
                variants: variants
            };
        });

        const count = await Product.countDocuments(filter);

        const categories = await Category.find({ isListed: true });
        const brands = await Brand.find({ isBlocked: false });

        if (categories && brands) {
            res.render("products", {
                products: processedProducts,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                categories: categories,
                brands: brands,
                search: search,
                currentCategory: filterCategory,
                currentBrand: filterBrand,
                currentStatus: filterStatus,
                currentSort: sortField,
                currentOrder: sortOrder
            });
        } else {
            res.render("page-404");
        }
    } catch (error) {
        console.log(error);
        res.redirect("/admin/pageError");
    }
};



const blockProduct = async (req, res) => {
    try {

        const id = req.body.productId;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        
        res.json({success: true, message:"Product blocked Successfully."})

    } catch (error) {
        res.status(500).json({ success: false, message: "Error blocking product" });
    }
}



const unblockProduct = async (req, res) => {
    try {
        const id = req.body.productId; 
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });

        res.json({ success: true, message: "Product unblocked successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error unblocking product" });
    }
};



const getEditProduct = async (req, res) => {
    try {
        const productId = req.query.productId;

        // console.log( productId);

        const product = await Product.findById(productId)
            .populate('category')
            .lean();

        // console.log(product);

        if (!product) {
            console.log('Product not found');
            return res.redirect("/admin/pageError");
        }

        const categories = await Category.find({ isListed: true }).lean();
        const brands = await Brand.find({ isBlocked: false }).lean();

        if (!categories || !brands) {
            console.log('Categories or brands not found');
            return res.redirect("/admin/pageError");
        }


        if (!product.variants) {
            console.log('No variants found, creating default variant');
            product.variants = [{
                size: '',
                regularPrice: '',
                salePrice: '',
                quantity: 1,
                status: 'Available'
            }];
        }

        res.render("edit-product", {
            product: product,
            category: categories,
            brand: brands
        });
    } catch (error) {
        console.log('Error in getEditProduct:', error);
        res.redirect("/admin/pageError");
    }
};



const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const updates = req.body;
        const images = [];

        //  image uploads
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const originalImagepath = req.files[i].path;
                const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);
                await sharp(originalImagepath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                images.push(req.files[i].filename);
            }
        }


        const categoryId = await Category.findOne({ name: updates.category });
        if (!categoryId) {
            return res.status(400).json("Invalid Category name");
        }


        const variants = updates.variants.map(variant => ({
            size: Number(variant.size),
            regularPrice: Number(variant.regularPrice),
            salePrice: Number(variant.salePrice),
            quantity: Number(variant.quantity),
            status: variant.status
        }));


        const updateData = {
            productName: updates.productName,
            description: updates.description,
            brand: updates.brand,
            category: categoryId._id,
            variants: variants
        };

        // Only add images if new ones were uploaded
        if (images.length > 0) {
            updateData.productImage = images;
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json("Product not found");
        }

        res.redirect("/admin/products");
    } catch (error) {
        console.log(error);
        res.status(500).json("Server Error");
    }
}



const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;

        await Product.findByIdAndUpdate(productIdToServer, {
            $pull: { productImage: imageNameToServer }
        });

        const imagePath = path.join("public", "uploads", "re-image", imageNameToServer);

        if (fs.existsSync(imagePath)) {
            try {
                await fs.promises.unlink(imagePath);
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