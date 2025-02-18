const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");
const mongoose = require('mongoose');






const getWishList = async (req, res) => {
    try {

        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userId = req.session.user;
        

        const wishlistData = await Wishlist.findOne({ UserId: userId }).populate({
            path: 'products.productId',
            select: 'productName productImage brand variants' 
        });

        if (!wishlistData) {
            return res.render('wishlist', { 
                user: { _id: userId }, 
                wishlist: [] 
            });
        }

        const formattedWishlist = wishlistData.products.map(item => {
            const product = item.productId;
            const selectedVariant = product.variants.find(variant => variant.size === item.size);

            return {
                _id: product._id,
                name: product.productName,
                brand: product.brand,
                productImage: product.productImage[0], 
                size: item.size,
                salePrice: selectedVariant ? selectedVariant.salePrice : "N/A",
                addedOn: item.addedOn,
                availableSizes: product.variants.map(variant => variant.size) 
            };
        });

        res.render('wishlist', { 
            user:  userId , 
            wishlist: formattedWishlist 
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).redirect('/pageNotFound');
    }
};




const addToWishlist = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Please login to add items to wishlist'
            });
        }

        const userId = req.session.user;
        const { productId, size } = req.body;

        if (!size || isNaN(size)) {
            return res.status(400).json({
                success: false,
                message: 'Size is required and must be a valid number'
            });
        }

        let wishlist = await Wishlist.findOne({ UserId: userId });

        if (!wishlist) {
            wishlist = new Wishlist({
                UserId: userId,
                products: []
            });
        }

        const productExists = wishlist.products.some(item =>
            item.productId.toString() === productId && item.size === size
        );

        if (productExists) {
            return res.status(400).json({
                success: false,
                message: 'Product with this size already in wishlist'
            });
        }

        wishlist.products.push({
            productId,
            size: parseInt(size), 
            addedOn: new Date()
        });

        await wishlist.save();

        return res.status(200).json({
            success: true,
            message: 'Product added to wishlist successfully',
            wishlistCount: wishlist.products.length
        });

    } catch (error) {
        console.error('Error adding to wishlist:', error);
        return res.status(500).json({
            success: false,
            message: 'Error adding product to wishlist'
        });
    }
};





const changeSize = async (req,res) => {
    try {

        const { productId,size } = req.body;
        const UserId = req.session.user;

        if(!UserId){
            return res.status(401).json({success:false, message:"User not Found"})
        }

        const updatedWishlist = await Wishlist.findOneAndUpdate(
            { UserId, "products.productId" : productId},
            { $set: { "products.$.size" : size}},
            { new : true }
        )

        if(!updatedWishlist){
            return res.status(404).json({success:false, message:"Product not Found in WIshlist."});
        }

        res.json({success: true, message:"Size updated Successfully.",updatedWishlist})
     
    } catch (error) {
        console.error("Error in updating size.",error);
        res.status(500).json({success:false, message:"Failed to update size"})
    }
}





const removeFromWishlist = async (req, res) => {
    try {
        // Ensure the user is logged in
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please login to remove items from wishlist' });
        }

        const { productId, size } = req.body;
        const userId = req.session.user;

      
        const wishlist = await Wishlist.findOne({ UserId: userId });

        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist not found' });
        }

        const parsedSize = parseInt(size);


        wishlist.products = wishlist.products.filter(item => 
            !(item.productId.toString() === productId && item.size === parsedSize)
        );

        await wishlist.save();

        // Update session wishlist
        req.session.wishlist = wishlist.products;

        return res.status(200).json({ 
            success: true, 
            message: 'Product removed from wishlist',
            wishlistCount: wishlist.products.length,
        });

    } catch (error) {
        console.error('Error removing from wishlist:', error);
        return res.status(500).json({
            success: false,
            message: 'Error removing product from wishlist'
        });
    }
};






// const removeFromWishlist = async (req, res) => {
//     try {
//         if (!req.session.user) {
//             return res.status(401).json({ success: false, message: 'Please login to remove items from wishlist' });
//         }

//         const { productId, size } = req.body;
//         const userId = req.session.user;


//         const parsedSize = parseInt(size);
//         console.log("Parsed Size:", parsedSize);

//         const wishlist = await Wishlist.findOne({ UserId: userId });
//         if (!wishlist) {
//             return res.status(404).json({ success: false, message: 'Wishlist not found' });
//         }

//         const updatedWishlist = await Wishlist.findOneAndUpdate(
//             { UserId: userId },
//             { $pull: { products: { productId: productId, size: parsedSize } } },
//             { new: true }
//         );


//         if (!updatedWishlist) {
//             return res.status(404).json({ success: false, message: 'Product not found in wishlist' });
//         }

//         req.session.wishlist = updatedWishlist.products;
//         await req.session.save();

//         return res.status(200).json({
//             success: true,
//             message: 'Product removed from wishlist',
//             wishlistCount: updatedWishlist.products.length
//         });

//     } catch (error) {
//         console.error('Error removing from wishlist:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Error removing product from wishlist'
//         });
//     }
// };






module.exports = {
    getWishList,
    addToWishlist,
    removeFromWishlist,
    changeSize
}