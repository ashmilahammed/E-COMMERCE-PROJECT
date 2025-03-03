const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");


function generateOtp(){
    const digits = "1234567890";
    let otp ="";
    for(let i=0;i<6;i++){
        otp += digits[Math.floor(Math.random()*10)];
    }
    return otp;
}


const sendVerificationEmail = async (email,otp) => {
    try {

        const transporter = nodemailer.createTransport({
            service : "gmail",
            port : "587",
            secure : false,
            requireTLS : true,
            auth:{
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        })

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h4>Your OTP: ${otp}</h4></b>`
        }


        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:",info.messageId);
        return true;

        
    } catch (error) {
        console.error("Error in sending email",error);
        return false
    }
}


const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;

    } catch (error) {
        
    }
}



/////////////
const getForgotPassword = async (req ,res) => {
    try {
        res.render("forgot-password")
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const forgotEmailValid = async (req,res) => {
    try {

        const {email} = req.body;
        const findUser = await User.findOne({email:email});
        if(findUser){
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp);

            if(emailSent){
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("forgotPass-otp");
                console.log("OTP:",otp)

            }else {
                res.json({success : false,message : "Failed to send OTP. Please try again."})
            }
        }else {
            res.render("forgot-password",{message: "User with this email does not exist"});
        }
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const verifyForgotPassOtp = async (req,res) =>{
    try {

        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp) {
            res.json({success: true, redirectUrl: "/reset-password"});
        }else {
            res.json({success:false,message: "OTP not matching"})
        }
        
    } catch (error) {
        res.status(500).json({success: false, message: "An error occured. Please try again"});
    }
}



const getResetPassPage = async (req,res) =>{
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.render("reset-password",{
            user: userData
        })
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}



const resendOtp = async (req,res) => {
    try {

        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Resending OTP to email:",email);
        const emailSent = await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true, message: "Resend OTP Successfull"});
            
        }
        
        
    } catch (error) {
        console.error("Error in resending OTP",error);
        res.status(500).json({success:false, message:"Internal Server error"});
    }
}


const postNewPassword = async (req,res) => {
    try {

        const {newPass1, newPass2} = req.body;
        const email = req.session.email;

        if(newPass1 === newPass2) {
            const passwordHash = await securePassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set: {password: passwordHash}}
            );
            
            // res.redirect("/login");

              req.session.destroy((err) => {
                if (err) {
                    console.error("Session destroy error:", err);
                    return res.redirect("/pageNotFound");
                }
                return res.redirect("/login"); 
            });

        }else {
            res.render("reset-password",{message: 'Passwords do not match'});
        }
        
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}



const userProfile = async (req,res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const addressData = await Address.findOne({userId : userId});

        const wallet = await Wallet.findOne({ userId: userId})
        
        
        const orders = await Order.find({ userId: userId })
            .populate({
                path: 'orderItems.product',
                model: 'Product',
                select: 'name'
            })
            .sort({ createdAt: -1 }); 

        res.render("profile", {
            user: userData,
            userAddress: addressData,
            orders: orders ,
            walletBalance: wallet?.balance ? wallet.balance.toFixed(2) : "0.00"

        });         
        
    } catch (error) {
        console.error("Error for rendering profile", error);
        res.redirect("/pageNotFound");
    }
}



const changeEmail = async (req,res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.render("change-email",{
            user : userData
        })
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const changeEmailValid = async (req,res) => {
    try {

        const {email} = req.body;
        const userExists = await User.findOne({email});

        if(userExists) {
            
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;

                const userId = req.session.user;
                const userData = await User.findById(userId);

                res.render("change-email-otp",{
                    user : userData
                });
                console.log("Email sent:",email);
                console.log("OTP:",otp);
                
                
            }else {
                res.json("email-error")
            }
        }else {
            res.render("change-email",{
                message: "User with this e-mail not exist"
            })
        }

        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const verifyEmailOtp = async (req,res) => {
    try {

        const enteredOtp = req.body.otp;

        const userId = req.session.user;
        const userData = await User.findById(userId);

        if(enteredOtp === req.session.userOtp){
            req.session.userData = req.body.userData;
            res.render("new-email",{
                userData : req.session.userData,
                user : userData

            })
        }else {
            res.render("change-email-otp",{
                message: "OTP not matching",
                userData : req.session.userData
            })
        }
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const updateEmail = async (req,res) => {
    try {

        const newEmail = req.body.newEmail;
        const userId = req.session.user;
        await User.findByIdAndUpdate(userId,{email: newEmail});
        res.redirect("/userProfile")
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const changePassword = async (req,res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.render("change-password",{
            user:userData
        })
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const changePasswordValid = async (req,res) => {
    try {

        const {email} = req.body;
        const userExists = await User.findOne({email});

        const userId = req.session.user;
        const userData = await User.findById(userId);

        if(userExists) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp);
            if(emailSent) {
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-password-otp",{
                    user : userData
                });
                console.log('OTP:',otp);
                
            }else {
                res.json({
                    success : false,
                    message : "Failed to send OTP. Please try again",
                })
            }
        }else {
            res.render("change-password",{
                message: "User with this email does not exist"
            })
        }
        
    } catch (error) {
        console.log("Error in change Password Valid",error);   
        res.redirect("/pageNotFound");
    }
}


const verifyChangePassOtp = async (req,res) => {
    try {

        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp) {

            req.session.otpVerified = true; 
            res.json({success: true, redirectUrl:"/reset-password"})
        }else {
            res.json({success: false, message:"OTP not matching"})
        }
        
    } catch (error) {
        res.status(500).json({success: false, message: "An error occured. Please try again later."})
    }
}




const addAddress = async (req,res) => {
    try {
        const user = req.session.user;
        res.render("add-address", {user: user})
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const postAddAddress = async (req,res) => {
    try {

        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        const {addressType,name,city,landMark,state,pincode,phone,altPhone} = req.body;

        const userAddress = await Address.findOne({userId : userData._id});
        if(!userAddress) {
            const newAddress = new Address({
                userId: userData._id,
                address: [{addressType,name,city,landMark,state,pincode,phone,altPhone}]
            });

            await newAddress.save();

        }else {
            userAddress.address.push({addressType,name,city,landMark,state,pincode,phone,altPhone});
            await userAddress.save();
        }

        res.redirect("/userProfile")
        
    } catch (error) {
        console.error("Error adding address",error);
        res.redirect("/pageNotFound")
    }
}


const editAddress = async (req,res) => {
    try {

        const addressId = req.query.id;
        const user = req.session.user;
        const currAddress = await Address.findOne({
            "address._id" : addressId,
        })

        if(!currAddress) {
            return res.redirect("/pageNotFound")
        }

        const addressData = currAddress.address.find((item) => {
            return item._id.toString() === addressId.toString()
        })

        if(!addressData){
            return res.redirect("/pageNotFound")
        }

        res.render("edit-address",{address: addressData, user: user});

        
    } catch (error) {
        console.error("Error in editing address",error);
        res.redirect("/pageNotFound")
    }
}



const postEditAddress = async (req, res) => {
    try {
        const { addressType, name, city, landMark, state,pincode, phone, altPhone } = req.body;
        const addressId = req.query.id;
        
        const findAddress = await Address.findOne({ "address._id": addressId });

        if (!findAddress) {
            return res.redirect("/pageNotFound");
        }

        await Address.updateOne(
            { "address._id": addressId },
            {
                $set: {
                    "address.$.addressType": addressType,
                    "address.$.name": name,
                    "address.$.city": city,
                    "address.$.landMark": landMark,
                    "address.$.state": state,
                    "address.$.pincode": pincode,
                    "address.$.phone": phone,
                    "address.$.altPhone": altPhone
                }
            }
        );

        res.redirect("/userProfile");

    } catch (error) {
        console.error("Error in editing address", error);
        res.redirect("/pageNotFound");
    }
};



const deleteAddress = async (req,res) => {
    try {

        const addressId = req.query.id;
        const findAddress = await Address.findOne({"address._id":addressId});
        
        if(!findAddress) {
            return res.status(404).send("Address not found");
        }

        await Address.updateOne(
            { "address._id": addressId},
            { $pull : {address: { _id: addressId }} }
    )

    res.redirect("/userProfile");
        
    } catch (error) {
        console.error("Error in deleting Address",error);
        res.redirect("/pageNotFound")
    }
}


  


const updateProfile = async (req, res) => {
    try {
        const { fullName, phone } = req.body;
        const userId = req.user.id;

        if (!fullName || !phone) {
            return res.status(400).json({
                success: false,
                message: "Name and phone number are required."
            });
        }

        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid 10-digit phone number."
            });
        }

        const existingUser = await User.findOne({
            phone,
            _id: { $ne: userId }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "This phone number is already registered with another account."
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { 
                fullName, 
                phone,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            fullName: updatedUser.fullName,
            phone: updatedUser.phone,
            message: "Profile updated successfully"
        });

    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while updating your profile."
        });
    }
};


  


module.exports = {
    getForgotPassword,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid,
    verifyChangePassOtp,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    updateProfile

    }