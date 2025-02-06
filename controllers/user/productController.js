const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const { categoryInfo } = require("../admin/categoryController");





const productDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.params.id || req.query.id;

        const product = await Product.findById(productId)
            .populate('category')
            .populate('brand');

        if (!product) {
            console.log('Product not found:', productId);
            return res.redirect("/pageNotFound");
        }

        const findCategory = product.category;
        const categoryOffer = findCategory?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;

        // Process variants and format product data
        let formattedProduct = product.toObject();
        
        if (formattedProduct.variants && formattedProduct.variants.length > 0) {
            // Get available sizes from variants
            formattedProduct.availableSizes = [...new Set(
                formattedProduct.variants
                    .filter(v => v.quantity > 0)
                    .map(v => v.size)
            )].sort((a, b) => a - b);

    
            const activeVariant = formattedProduct.variants.find(v => v.quantity > 0);
            if (activeVariant) {
                formattedProduct.regularPrice = activeVariant.regularPrice;
                formattedProduct.salePrice = activeVariant.salePrice;
            }

            //quantity
            formattedProduct.totalQuantity = formattedProduct.variants.reduce(
                (sum, variant) => sum + variant.quantity, 
                0
            );
        }

        const relatedProducts = await Product.find({
            category: findCategory._id,
            _id: { $ne: productId },
            isBlocked: false,
            'variants.quantity': { $gt: 0 }
        })
        .populate('category')
        .populate('brand')
        .limit(4);

        // Format related products
        const formattedRelatedProducts = relatedProducts.map(relProduct => {
            const formatted = relProduct.toObject();
            
            if (formatted.variants && formatted.variants.length > 0) {
                // Get available sizes
                formatted.availableSizes = [...new Set(
                    formatted.variants
                        .filter(v => v.quantity > 0)
                        .map(v => v.size)
                )].sort((a, b) => a - b);

                const activeVariant = formatted.variants.find(v => v.quantity > 0);
                if (activeVariant) {
                    formatted.regularPrice = activeVariant.regularPrice;
                    formatted.salePrice = activeVariant.salePrice;
                }

                formatted.totalQuantity = formatted.variants.reduce(
                    (sum, variant) => sum + variant.quantity, 
                    0
                );
            }

            return formatted;
        });

        res.render("product-details", {
            user: userData,
            product: formattedProduct,
            quantity: formattedProduct.totalQuantity || 0,
            totalOffer: totalOffer,
            category: findCategory,
            relatedProducts: formattedRelatedProducts
        });
        
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.redirect("/pageNotFound");
    }
};

module.exports = {
    productDetails,
};
