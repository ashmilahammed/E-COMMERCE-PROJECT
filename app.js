const express = require("express");
const app = express();
const env = require("dotenv").config();
const db = require("./config/db");
db()

app.use(express.json())
app.use(express.urlencoded({extended:true}))


app.use("/",(req,res)=>{
    res.send("hello")
})

app.listen(parseInt(process.env.PORT) , ()=>{
    console.log("server running on 5000")
})


module.exports = app;