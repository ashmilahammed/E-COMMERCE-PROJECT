const User = require("../../models/userSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");


const pageNotFound = async(req,res) => {
    try {
         res.render("page-404")
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}



const loadHomepage = async(req,res) => {
    try {
        
        const user = req.session.user;
        if(user){
            
            const userData = await User.findOne({_id:user._id});
            res.render("home",{user:userData})

        }else{
            return res.render("home");
        }
       
    } catch (error) {
        console.log("Home page not found",error);
        res.status(500).send("server error")
        
    }
}

const loadSignup = async(req,res) => {
    try {

        return res.render("signup")
        
    } catch (error) {
        console.log("Signup page not found",error);
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


function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString();
}

async function sendVerificationEmail(email,otp) {
    try {

        const transporter = nodemailer.createTransport({

            service : 'gmail',
            port : 587,
            secure : false,
            requireTLS : true,
            auth:{
               user: process.env.NODEMAILER_EMAIL,
               pass: process.env.NODEMAILER_PASSWORD,
            }
        })

        const info = await transporter.sendMail({
            from : process.env.NODEMAILER_EMAIL,
            to : email,
            subject : "verify your account",
            text : `your OTP is ${otp}`,
            html : `<b>Your OTP: ${otp}</b>`,   
        })

        return info.accepted.length > 0
        
    } catch (error) {
        console.error("Error sending email",error);
        // return false
        throw error
    }
}


const signup = async (req,res) => {
    try {
        
       const {fullName,phone,email,password} = req.body;

       const findUser = await User.findOne({email});
       if(findUser){
        return res.render("signup",{message:"User with this email already exists."})
       }

       const otp = generateOtp();

       const emailSent = await sendVerificationEmail(email,otp);

       if(!emailSent){
        return res.json("email-error")
       }
    //    else{
    //     console.log("email sent successfully")
    //    }

    //    console.log("Received OTP:", otp);
    //    console.log("Session OTP:", req.session.userOtp);

       req.session.userOtp = otp;
       req.session.userData = {fullName,phone,email,password};

       res.render("verify-otp");
       console.log("OTP Sent",otp);
     

    } catch (error) {
        console.error("signup error",error);
        res.redirect("/pageNotFound")
    }
}


const securePassword = async (password) => {
    try {

        const passwordHash = await bcrypt.hash(password,10)

        return passwordHash;
        
    } catch (error) {
        
    }
}

const verifyOtp = async(req,res) => {
    try {

         const{otp} = req.body;

         console.log(otp);


            if (req.session.userOtp && otp.toString() === req.session.userOtp.toString()) {
        //  if(otp === req.session.userOtp.toString()){
            const user = req.session.userData
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                fullName : user.fullName,
                email : user.email,
                phone : user.phone,
                password : passwordHash
            })

            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({
                success:true ,
                redirectUrl : "/",
                message: "OTP verified succesfully"
            })

         }else {
            res.status(400).json({success:false , message: "Invalid OTP, Please try again."})
         }
    
           
    } catch (error) {
        console.error("Error in Verifying OTP");
        res.status(500).json({success:false , message:"An error occured"})
        
    }
}

const resendOtp = async (req,res) => {
    try {
        
         const {email} = req.session.userData;
         if(!email){
            return res.status(400).json({success:false , message: "Email not found in session"})
         }

         const otp = generateOtp();
         req.session.userOtp = otp;

         const emailSent = await sendVerificationEmail(email,otp);
         if(emailSent){
             console.log("Resend OTP:",otp);
             res.status(200).json({success:true , message: "OTP Resend Successfully"})
         }else {
            res.status(500).json({success:false , message: "Failed to resend OTP. Please try again"});
         }

    } catch (error) {
        console.error("Error resending OTP",error);
        res.status(500).json({success:false , message: "Internal Server Error. Please try again"})
        
    }
}


const loadLogin = async (req,res) => {
    try {
        
       if(!req.session.user){
        return res.render("login")
       }else {
        res.redirect("/")
       }

    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const login = async (req, res) => {
    try {
        
       const {email, password} = req.body;

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

       // Store the entire user data in the session, not just the user ID
       req.session.user = findUser;
       // Optionally, pass the user data to the view
       res.locals.user = findUser;

       res.redirect("/");

    } catch (error) {
        console.log("login error", error);
        res.render("login", { message: "Login failed. Please try again." });
    }
}

// const logout = async (req,res) {
//     try {
       
//         req.session.destroy((err)=>{
//             if(err){
//                 console.log("Session destruction error",err.message)
//                 return res.redirect("/pageNotFound")
//             }
//             return res.redirect("/login")
//         })

//     } catch (error) {
//         console.log("Logout error",error);
//         res.redirect("/pageNotFound")
        
//     }
// }
const logout = async (req, res) => {
    try {
        // Clear user data before destroying session
        req.session.user = null;

        req.session.destroy((err) => {
            if (err) {
                console.log("Session destruction error", err.message);
                return res.redirect("/pageNotFound");
            }
            return res.redirect("/login");
        });

    } catch (error) {
        console.log("Logout error", error);
        res.redirect("/pageNotFound");
    }
};



module.exports = {
    pageNotFound,
    loadHomepage,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout
}