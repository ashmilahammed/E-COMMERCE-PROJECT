const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");




function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {

        const transporter = nodemailer.createTransport({

            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "verify your account",
            text: `your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        })

        return info.accepted.length > 0

    } catch (error) {
        console.error("Error sending email", error);
        // return false
        throw error
    }
}


////////////

const pageNotFound = async (req, res) => {
    try {
        res.render("page-404")

    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const loadHomepage = async (req, res) => {
    try {
        const userId = req.session.user;
        const categories = await Category.find({ isListed: true });

        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map((category) => category._id) },
            'variants.quantity': { $gt: 0 }
        }).populate('category')
            .populate('brand')
            .sort({ createdOn: -1 })
            .limit(8);

        // Format product data
        productData = productData.map(product => {
            const formattedProduct = product.toObject();

            // Get available sizes from variants
            if (formattedProduct.variants && formattedProduct.variants.length > 0) {
                formattedProduct.availableSizes = [...new Set(
                    formattedProduct.variants
                        .filter(v => v.quantity > 0)
                        .map(v => v.size)
                )].sort((a, b) => a - b);

                // Get the regular and sale prices
                const activeVariant = formattedProduct.variants.find(v => v.quantity > 0);
                if (activeVariant) {
                    formattedProduct.regularPrice = activeVariant.regularPrice;
                    formattedProduct.salePrice = activeVariant.salePrice;
                }
            }

            return formattedProduct;
        });

        // Filter out products with no active variants
        productData = productData.filter(product =>
            product.variants &&
            product.variants.some(variant => variant.quantity > 0)
        );

        // Render the homepage with or without user data
        if (userId) {
            const userData = await User.findById(userId);
            return res.render("home", {
                user: userData,
                products: productData,
                categories: categories
            });
        } else {
            return res.render("home", {
                products: productData,
                categories: categories
            });
        }
    } catch (error) {
        console.error("Error loading homepage:", error);
        res.status(500).send("An error occurred while loading the homepage. Please try again later.");
    }
};


const loadSignup = async (req, res) => {
    try {

        return res.render("signup")

    } catch (error) {
        console.log("Signup page not found", error);
        res.status(500).send("server error")

    }
}

// const signup = async(req,res) => {

//     const{fullName,email,phone,password} = req.body;
//     try {

//         const newUSer = new User({fullName,email,phone,password});
//         console.log(newUSer)

//         await newUSer.save();

//         return res.redirect("/signup");

//     } catch (error) {
//         console.log("Error for saving user",error);
//         res.status(500).send("Internal server error")
//     }
// }


const signup = async (req, res) => {
    try {

        const { fullName, phone, email, password } = req.body;

        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User with this email already exists." })
        }

        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.json("email-error")
        }
        //    else{
        //     console.log("email sent successfully")
        //    }

        //    console.log("Received OTP:", otp);
        //    console.log("Session OTP:", req.session.userOtp);

        req.session.userOtp = otp;
        req.session.userData = { fullName, phone, email, password };

        res.render("verify-otp");
        console.log("OTP Sent", otp);


    } catch (error) {
        console.error("signup error", error);
        res.redirect("/pageNotFound")
    }
}


const securePassword = async (password) => {
    try {

        const passwordHash = await bcrypt.hash(password, 10)

        return passwordHash;

    } catch (error) {

    }
}


const verifyOtp = async (req, res) => {
    try {

        const { otp } = req.body;

        console.log(otp);


        if (req.session.userOtp && otp.toString() === req.session.userOtp.toString()) {
            //  if(otp === req.session.userOtp.toString()){
            const user = req.session.userData
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                password: passwordHash
            })

            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({
                success: true,
                redirectUrl: "/",
                message: "OTP verified succesfully"
            })

        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, Please try again." })
        }


    } catch (error) {
        console.error("Error in Verifying OTP");
        res.status(500).json({ success: false, message: "An error occured" })

    }
}


const resendOtp = async (req, res) => {
    try {

        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" })
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP:", otp);
            res.status(200).json({ success: true, message: "OTP Resend Successfully" })
        } else {
            res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again" });
        }

    } catch (error) {
        console.error("Error resending OTP", error);
        res.status(500).json({ success: false, message: "Internal Server Error. Please try again" })

    }
}


const loadLogin = async (req, res) => {
    try {

        if (!req.session.user) {
            return res.render("login")
        } else {
            res.redirect("/")
        }

    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const login = async (req, res) => {
    try {

        const { email, password } = req.body;

        const findUser = await User.findOne({ isAdmin: 0, email: email });

        if (!findUser) {
            return res.render("login", { message: "User not found." });
        }

        if (findUser.isBlocked) {
            return res.render("login", { message: "User is blocked." });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect Password." });
        }

        req.session.user = findUser;
        // Optionally, pass the user data to the view
        res.locals.user = findUser;

        res.redirect("/");

    } catch (error) {
        console.log("login error", error);
        res.render("login", { message: "Login failed. Please try again." });
    }
}


const logout = async (req, res) => {
    try {
        // Clear user data before destroying session
        req.session.user = null;

        delete req.session.user;

        res.redirect("/login");

    } catch (error) {
        console.log("Logout error", error);
        res.redirect("/pageNotFound");
    }
};




const loadShoppingpage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map((category) => category._id.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;



        // Get the sort option from the query
        const sortOption = req.query.sort || 'newArrivals';
        let sortCriteria;

        switch (sortOption) {
            case 'priceAsc':
                sortCriteria = { 'variants.salePrice': 1 };
                break;
            case 'priceDesc':
                sortCriteria = { 'variants.salePrice': -1 };
                break;
            case 'nameAsc':
                sortCriteria = { productName: 1 };
                break;
            case 'nameDesc':
                sortCriteria = { productName: -1 };
                break;
            case 'newArrivals':
            default:
                sortCriteria = { createdAt: -1 };
                break;
        }

        // Initialize filters
        const filters = {
            isBlocked: false,
            'variants.quantity': { $gt: 0 }
        };

        //  search filter
        if (req.query.search) {
            filters.productName = { $regex: req.query.search, $options: 'i' };
        }


         // category filter 
         const selectedCategory = req.query.category || null;
         if (selectedCategory) {
             filters.category = selectedCategory;
         }

        //brand filter 
        if (req.query.brand) {
            filters.brand = req.query.brand;
        }


        //price filter
        if (req.query.minPrice && req.query.maxPrice) {
            filters['variants'] = {
                $elemMatch: {
                    salePrice: {
                        $gte: parseInt(req.query.minPrice),
                        $lte: parseInt(req.query.maxPrice)
                    }
                }
            };
        }


        let products = await Product.find(filters)
            .populate('category')
            .sort(sortCriteria)
            .collation({ locale: "en", strength: 2 })
            .skip(skip)
            .limit(limit);

        // Format product data
        products = products.map(product => {
            const formattedProduct = product.toObject();

            // Get available sizes from variants
            if (formattedProduct.variants && formattedProduct.variants.length > 0) {
                formattedProduct.availableSizes = [...new Set(
                    formattedProduct.variants
                        .filter(v => v.quantity > 0)
                        .map(v => v.size)
                )].sort((a, b) => a - b);

                // Get the regular and sale prices
                const activeVariant = formattedProduct.variants.find(v => v.quantity > 0);
                if (activeVariant) {
                    formattedProduct.regularPrice = activeVariant.regularPrice;
                    formattedProduct.salePrice = activeVariant.salePrice;
                }
            }

            return formattedProduct;
        });

        // Count total products for pagination
        const totalProducts = await Product.countDocuments(filters);
        const totalPages = Math.ceil(totalProducts / limit);
        const brands = await Product.distinct("brand", { isBlocked: false });
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));


        // Reset to default state if no query params
        const defaultQuery = {
            sort: 'newArrivals',
            brand: null,
            category: null
        };


        res.render("shop", {
            user: userData,
            products: products,
            category: categoriesWithIds,
            brand: brands,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages,
            sortOption: req.query.sort || 'newArrivals',
            selectedBrand: req.query.brand || null,
            searchQuery: req.query.search || '',
            selectedMinPrice: req.query.minPrice || null,
            selectedMaxPrice: req.query.maxPrice || null,
            selectedCategory: selectedCategory
        });

    } catch (error) {
        console.error("Error loading shop page:", error);
        res.redirect("/pageNotFound");
    }
};





const contactPage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect("/login");
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.redirect("/pageNotFound");
        }

        res.render("contacts", {
            user: userData
        });

    } catch (error) {
        console.error("Error loading contact page:", error);
        res.redirect("/pageNotFound");
    }
}





module.exports = {
    pageNotFound,
    loadHomepage,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
    loadShoppingpage,
    contactPage
}