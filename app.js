const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const session = require("express-session");
const passport = require("./config/passport");
const db = require("./config/db");
const userRouter = require("./routes/userRouter")
const adminRouter = require("./routes/adminRouter");
const flash = require('connect-flash');
db();
 
  

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret : process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized : true,
    cookie : {
        secure : false,
        httpOnly : true,
        maxAge : 72*60*60*1000
    }
}))
 

app.use(passport.initialize());
app.use(passport.session());
app.use(flash())


app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next();
})



app.set("view engine","ejs");
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname, "public")));


 
app.use("/",userRouter);
app.use("/admin",adminRouter);


app.use((req, res, next) => {
    res.locals.user = req.session.user || null;    
    next();
});



app.use('/images', express.static(path.join(__dirname, 'images')));


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});





app.use((req, res, next) => {
    if (req.originalUrl.startsWith("/admin")) {

        if (req.session.admin) {
            return res.status(404).render("error-admin");
        }
    } else {
        if (req.session.user) {
            return res.status(404).render("page-404");
        }
    }
    next();
});






const PORT= process.env.PORT
app.listen(PORT, ()=>{
    console.log(`Server running on ${PORT}`)
})


module.exports = app; 