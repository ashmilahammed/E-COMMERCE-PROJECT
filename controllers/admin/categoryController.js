const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");




const categoryInfo = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        res.render("category", {
            category: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        })

    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageError")

    }
}


const addCategory = async (req, res) => {

    const { name, description } = req.body;
    try {

        const existingCategory = await Category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });

        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" })
        }

        const newCategory = new Category({ name, description })
        await newCategory.save();
        return res.status(201).json({ message: "Category added Successfully." })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Internal server error" })

    }
}


const getListCategory = async (req, res) => {
    try {

        let id = req.body.categoryId;
        await Category.updateOne({ _id: id }, { $set: { isListed: true } });

        await Product.updateMany({ category: id }, { $set: { isBlocked: false } });

        res.json({ success: true, message: "Category listed Successfully" })

    } catch (error) {
        res.status(500).json({ success: false, message: "Error listing category" });
    }
}


const getUnlistCategory = async (req, res) => {
    try {

        let id = req.body.categoryId;
        await Category.updateOne({ _id: id }, { $set: { isListed: false } });

        await Product.updateMany({ category: id }, { $set: { isBlocked: true } });

        res.json({ success: true, message: "Category Unlisted Successfully." })

    } catch (error) {
        res.status(500).json({ success: false, message: "Error Unlisting category" });
    }
}



const getEditCategory = async (req, res) => {
    try {

        const id = req.query.categoryId;
        const category = await Category.findOne({ _id: id });
        res.render("edit-category", { category: category })

    } catch (error) {
        res.redirect("/admin/pageError")

    }
}


const editCategory = async (req, res) => {
    try {

        const id = req.params.id;
        const { categoryName, description } = req.body;
        const existingCategory = await Category.findOne({ name: categoryName });

        // if(existingCategory) {
        //     return res.status(400).json({error: "Category exists, Please choose another name"})
        // }

        const updateCategory = await Category.findByIdAndUpdate(id, {
            name: categoryName,
            description: description
        }, { new: true });

        if (updateCategory) {
            res.redirect("/admin/category");
        } else {
            res.status(404).json({ error: "Category not found" })
        }

    } catch (error) {
        res.status(500).json({ error: "Internal server error" })
    }
}




const addCategoryOffer = async (req, res) => {
    try {
        const { categoryId, percentage, startDate, expiryDate } = req.body;

        if (!categoryId || !percentage || !startDate || !expiryDate) {
            return res.json({ success: false, message: "All fields are required." });
        }

        if (percentage < 1 || percentage > 99) {
            return res.json({ success: false, message: "Offer percentage must be between 0 and 100." });
        }

        if (new Date(expiryDate) <= new Date(startDate)) {
            return res.json({ success: false, message: "Expiry date must be after the start date." });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.json({ success: false, message: "Category not found" });
        }


        category.categoryOffer = parseInt(percentage);
        category.startDate = new Date(startDate);
        category.endDate = new Date(expiryDate);

        await category.save();

        const products = await Product.find({ category: categoryId });

        products.forEach(async product => {
            product.variants.forEach(variant => {
                const bestOffer = Math.max(product.productOffer || 0, category.categoryOffer);
                variant.salePrice = variant.regularPrice - Math.floor(variant.regularPrice * (bestOffer / 100));
            });

            await product.save();
        });

        res.json({ success: true, message: "Category offer applied successfully." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};





const removeCategoryOffer = async (req, res) => {
    try {
        const { categoryId } = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.json({ success: false, message: "Category not found" });
        }

        category.categoryOffer = 0;
        await category.save();

        const products = await Product.find({ category: categoryId });

        for (const product of products) {
            product.variants.forEach(variant => {
                if (product.productOffer > 0) {

                    variant.salePrice = variant.regularPrice - Math.floor(variant.regularPrice * (product.productOffer / 100));

                } else {
                    variant.salePrice = variant.regularPrice;
                }
            });

            await product.save();
        }

        res.json({ success: true, message: "Category offer removed successfully." });

    } catch (error) {
        console.error("Error removing category offer:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};







module.exports = {
    categoryInfo,
    addCategory,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
    addCategoryOffer,
    removeCategoryOffer

}