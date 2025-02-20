const Coupon = require("../../models/couponSchema")




const getCouponPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / limit);

        const coupons = await Coupon.find({})
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit);

        res.render("coupon", { 
            coupons, 
            currentPage: page, 
            totalPages 
        }); 
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).send("Internal Server Error");
    }
};






const createCoupon = async (req, res) => {
    try {
        let {
            couponName, 
            couponCode,
            discountType,
            discountValue,
            maxDiscountAmount,
            minPurchaseAmount,
            startDate,
            endDate,
            usageLimit
        } = req.body;


        if (!couponName || !couponCode || !discountValue || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: "All required fields must be filled." });
        }

        couponCode = couponCode.trim().toUpperCase();

        if (!couponCode) {
            return res.status(400).json({ success: false, message: "Coupon code cannot be empty." });
        }

        const existingCoupon = await Coupon.findOne({ couponCode });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: "Coupon code already exists." });
        }

        if (new Date(endDate) <= new Date(startDate)) {
            return res.status(400).json({ success: false, message: "End date must be after start date." });
        }

      
        const newCoupon = new Coupon({
            name: couponName.trim(),
            couponCode,
            discountType,
            discountValue,
            maxDiscountAmount: maxDiscountAmount || null,
            minPurchaseAmount: minPurchaseAmount || 0,
            startDate,
            endDate,
            usageLimit: usageLimit || 1,
            isActive: true
        })

        await newCoupon.save();
        return res.status(201).json({ success: true, message: "Coupon added successfully.", coupon: newCoupon });

    } catch (error) {
        console.error("Error creating coupon:", error);
        return res.status(500).json({ success: false, message: "Server error, please try again later." });
    }
};




const editCoupon = async (req, res) => {
    try {
        const {
            couponId,
            couponName,
            couponCode,
            discountType,
            discountValue,
            maxDiscountAmount,
            minPurchaseAmount,
            startDate,
            endDate,
            usageLimit
        } = req.body;

        if (!couponId) {
            return res.status(400).json({ success: false, message: "Coupon ID is required." });
        }

        if (!couponName || !couponCode || !discountValue || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: "All required fields must be filled." });
        }

        if (new Date(endDate) <= new Date(startDate)) {
            return res.status(400).json({ success: false, message: "End date must be after start date." });
        }

        const existingCoupon = await Coupon.findOne({ couponCode, _id: { $ne: couponId } });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: "Coupon code already exists." });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                name: couponName.trim(),
                couponCode: couponCode.trim().toUpperCase(),
                discountType,
                discountValue,
                maxDiscountAmount: maxDiscountAmount || null,
                minPurchaseAmount: minPurchaseAmount || 0,
                startDate,
                endDate,
                usageLimit: usageLimit || 1
            },
            { new: true, runValidators: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }

        return res.status(200).json({ success: true, message: "Coupon updated successfully.", coupon: updatedCoupon });

    } catch (error) {
        console.error("Error updating coupon:", error);
        return res.status(500).json({ success: false, message: "Server error, please try again later." });
    }
};  




const deleteCoupon = async(req,res) => {
    try { 
        
        const { couponId } = req.params;

        if(!couponId){
            res.status(400).json({success:false, message:"CouponId is required."})
        }

        const deleteCoupon = await Coupon.findByIdAndDelete(couponId);

        if(!deleteCoupon){
            res.status(404).json({success:false, message: "Coupon not found."})
        }

        return res.status(200).json({success:true, message: "Coupon deleted Successfully"})

    } catch (error) {
        console.error("Error in Deleting coupon",error)
        res.status(500).json({success:false, message: "Server Error.please try again later."})   
    }
}



  

module.exports = {
    getCouponPage,
    createCoupon,
    editCoupon,
    deleteCoupon
}

