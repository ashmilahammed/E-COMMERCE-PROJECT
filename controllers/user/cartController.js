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
            select: 'productName productImage variants brand price'
        });
        
        if (cart) {
            // Calculate detailed cart summary
            cart.subtotal = cart.items.reduce((total, item) => total + (item.productId.price * item.quantity), 0);
            cart.tax = cart.subtotal * 0.0; 
            cart.discount = 0; 
            cart.shipping = cart.subtotal > 1000 ? 0 : 50; 
            cart.total = cart.subtotal + cart.tax + cart.shipping - cart.discount;
        }

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
        const MAX_QUANTITY_PER_SIZE = 5;

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
            
            // Check if new quantity exceeds max limit
            if (newQuantity > MAX_QUANTITY_PER_SIZE) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Maximum ${MAX_QUANTITY_PER_SIZE} items allowed per product and size`,
                    maxQuantityReached: true
                });
            }
            
            // Check if new quantity is available
            if (variant.quantity < newQuantity) {
                return res.status(400).json({ success: false, message: "Requested quantity exceeds available stock" });
            }
            
            item.quantity = newQuantity;
            item.totalPrice = variant.salePrice * newQuantity;
        } else {
            // Check if adding new item would exceed max limit
            const sameProductSizeItems = cart.items.filter(
                item => item.productId.toString() === productId && item.size === parseInt(size)
            );

            if (sameProductSizeItems.length >= MAX_QUANTITY_PER_SIZE) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Maximum ${MAX_QUANTITY_PER_SIZE} items allowed per product and size`,
                    maxQuantityReached: true
                });
            }

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
        const { productId, size, quantity } = req.body;

        // Validate inputs
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login to update cart" });
        }

        // Validate quantity
        const parsedQuantity = parseInt(quantity);
        if (parsedQuantity <= 0) {
            return res.status(400).json({ success: false, message: "Invalid quantity" });
        }

        // Check maximum quantity limit
        const MAX_QUANTITY = 5;
        if (parsedQuantity > MAX_QUANTITY) {
            return res.status(400).json({ 
                success: false, 
                message: `Maximum ${MAX_QUANTITY} items allowed per product`,
                maxQuantityReached: true
            });
        }

        // Find cart
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'variants'
        });

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        // Find the specific cart item
        const cartItem = cart.items.find(
            item => item.productId._id.toString() === productId && item.size === parseInt(size)
        );

        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Product not found in cart" });
        }

        // Find the product variant
        const variant = cartItem.productId.variants.find(v => v.size === parseInt(size));
        if (!variant) {
            return res.status(400).json({ success: false, message: "Selected size not available" });
        }

        // Check stock availability
        if (variant.quantity < parsedQuantity) {
            return res.status(400).json({ 
                success: false, 
                message: "Requested quantity exceeds available stock" 
            });
        }

        // Update quantity
        cartItem.quantity = parsedQuantity;
        cartItem.totalPrice = variant.salePrice * parsedQuantity;

        // Recalculate cart total
        cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

        // Save cart
        await cart.save();

        res.json({ 
            success: true, 
            message: "Cart updated successfully",
            cartTotal: cart.cartTotal
        });

    } catch (error) {
        console.error("Error updating cart quantity:", error);
        res.status(500).json({ 
            success: false, 
            message: "An error occurred while updating cart quantity" 
        });
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
    removeItem,
}