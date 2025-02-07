const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");





const cartPage = async (req,res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect("/login");
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.redirect("/login");
        }
        
        // Get cart items with product details
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'productName productImage variants brand'
        });
        
        res.render("cart", {
            user: userData,
            cart: cart
        });
    } catch (error) {
        console.error("Error in cart page:", error);
        res.redirect("/pageNotFound")
    }
}




const addToCart = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login to add items to cart" });
        }

        const { productId, size, quantity = 1 } = req.body;

        // Validate product and size
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Find the variant with the selected size
        const variant = product.variants.find(v => v.size === parseInt(size));
        if (!variant) {
            return res.status(400).json({ success: false, message: "Selected size not available" });
        }

        // Check if quantity is available
        if (variant.quantity < quantity) {
            return res.status(400).json({ success: false, message: "Selected quantity not available" });
        }

        // Find or create cart
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ 
                userId, 
                items: [],
                cartTotal: 0
            });
        }

        // Check if product with same size exists in cart
        const existingItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId && item.size === parseInt(size)
        );

        if (existingItemIndex > -1) {
            // Update existing item
            const item = cart.items[existingItemIndex];
            const newQuantity = item.quantity + parseInt(quantity);
            
            // Check if new quantity is available
            if (variant.quantity < newQuantity) {
                return res.status(400).json({ success: false, message: "Requested quantity exceeds available stock" });
            }
            
            item.quantity = newQuantity;
            item.totalPrice = variant.salePrice * newQuantity;
        } else {
            // Add new item
            cart.items.push({
                productId,
                size: parseInt(size),
                quantity: parseInt(quantity),
                price: variant.salePrice,
                totalPrice: variant.salePrice * parseInt(quantity)
            });
        }

        // Calculate cart total
        cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

        await cart.save();

        res.json({ 
            success: true, 
            message: "Product added to cart successfully",
            cartCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
            cartTotal: cart.cartTotal
        });

    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ success: false, message: "Error adding product to cart" });
    }
}




const updateQuantity = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login to update cart" });
        }

        const { productId, size, quantity } = req.body;

        // Validate inputs
        if (!productId || !size || !quantity || quantity < 1) {
            return res.status(400).json({ success: false, message: "Invalid input" });
        }

        // Find cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        // Find the item in cart
        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId && item.size === parseInt(size)
        );

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: "Item not found in cart" });
        }

        // Check product stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const variant = product.variants.find(v => v.size === parseInt(size));
        if (!variant || variant.quantity < quantity) {
            return res.status(400).json({ success: false, message: "Requested quantity not available" });
        }

        // Update quantity and price
        cart.items[itemIndex].quantity = parseInt(quantity);
        cart.items[itemIndex].totalPrice = variant.salePrice * parseInt(quantity);
        
        // Recalculate cart total
        cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

        await cart.save();

        res.json({ 
            success: true, 
            message: "Quantity updated successfully",
            cartTotal: cart.cartTotal
        });

    } catch (error) {
        console.error("Error updating quantity:", error);
        res.status(500).json({ success: false, message: "Error updating quantity" });
    }
}




const removeItem = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login to remove items" });
        }

        const { productId, size } = req.body;

        // Find cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        // Remove item from cart
        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId && item.size === parseInt(size)
        );

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: "Item not found in cart" });
        }

        // Remove the item
        cart.items.splice(itemIndex, 1);
        
        // Recalculate cart total
        cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

        await cart.save();

        res.json({ 
            success: true, 
            message: "Item removed successfully",
            cartTotal: cart.cartTotal
        });

    } catch (error) {
        console.error("Error removing item:", error);
        res.status(500).json({ success: false, message: "Error removing item" });
    }
}





module.exports = {
    cartPage,
    addToCart,
    updateQuantity,
    removeItem
}