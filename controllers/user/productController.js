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

        // const categoryOffer = findCategory?.categoryOffer || 0;
        // const productOffer = product.productOffer || 0;
        // const totalOffer = categoryOffer + productOffer;

        const now = new Date();
        const categoryOffer = (findCategory?.endDate && now > findCategory.endDate) ? 0 : (findCategory?.categoryOffer || 0);
        const productOffer = (product.offerEndDate && now > product.offerEndDate) ? 0 : (product.productOffer || 0);
        const totalOffer = Math.max(categoryOffer, productOffer); 



        // Process variants and format product data
        let formattedProduct = product.toObject();

        if (formattedProduct.variants && formattedProduct.variants.length > 0) {

            formattedProduct.availableSizes = [...new Set(
                formattedProduct.variants
                    .filter(v => v.quantity > 0)
                    .map(v => v.size)
            )].sort((a, b) => a - b);


            formattedProduct.variantQuantities = formattedProduct.variants.reduce((acc, variant) => {
                acc[variant.size] = variant.quantity;
                return acc;
            }, {});

            const activeVariant = formattedProduct.variants.find(v => v.quantity > 0);
            if (activeVariant) {
                formattedProduct.regularPrice = activeVariant.regularPrice;
                formattedProduct.salePrice = activeVariant.salePrice;
                formattedProduct.currentVariantQuantity = activeVariant.quantity;
            }
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
            quantity: formattedProduct.currentVariantQuantity || 0,
            totalOffer: totalOffer,
            category: findCategory,
            relatedProducts: formattedRelatedProducts,
            variantQuantities: JSON.stringify(formattedProduct.variantQuantities || {})
        });

    } catch (error) {
        console.error("Error fetching product details:", error);
        res.redirect("/pageNotFound");
    }
};





module.exports = {
    productDetails,
};
