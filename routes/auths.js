const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const fetchuser = require('../middleware/fetchuser');

const rateLimit = require('express-rate-limit');


router.use(express.json()); // Re-enable the JSON middleware

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: "Too many requests from this IP, please try again later."
});


//Router 1: to create user
router.post('/createuser',
    [
    body('name', 'Enter a valid name').isLength({min:3}),
    body("email", "Enter a valid email").isEmail(),
   
    body("password", "Password must be alphanumeric").isLength({min: 8})
], 
async(req, res)=>{
    let success = false;
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({success: false, errors: errors.array()});
    }
    try {
        let user = await User.findOne({email: req.body.email});
        if(user){
            return res.status(400).json({success: false, message: "User with this email already exits"});
        }
        let securePassword = await bcrypt.hash(req.body.password, await bcrypt.genSalt(10));
        user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: securePassword,
            status: true
        })
       
        const token = await jwt.sign({user: {id: user._id}}, JWT_SECRET, {expiresIn: '1d'});
        const {name, email} = user;

        return res.status(200).json({ success: true, token: token, user: {id: user._id, name, email}, message:"Successfully created user"});

    } catch (error) {
        return res.status(500).send({success: false, error: "Internal Server Error"});
    }
    
})

//Rout 2: login user
router.post("/loginuser", loginLimiter,
    [
        body("email", "Enter a valid email").isEmail(),
        body("password", "Password must be alphanumeric").isLength({min: 8})
    ],
    async (req, res) => {
        
        let errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({success: false, error: errors.array()});
        }
        
        const {email, password}= req.body;
        try {
        let user =await User.findOne({email: email});
        if(!user){
            return res.status(400).json({success: false, error: "Invalid credentials"});
        }
        const comparePassword = await bcrypt.compare(password, user.password);
        if(!comparePassword){
            return res.status(400).json({success: false, error: "Wrong password"});
        }
        user.status = true;
        await user.save();
        const token = await jwt.sign({user: {id: user.id}}, JWT_SECRET, {expiresIn: '1d'});
        
        const {name} = user;
        return res.status(200).json({success: true, token: token, user: {name, email}, message: "Successfully logged in"});

    } catch (error) {

        return res.status(500).send({success: false, error:"Internal Server Error"});

    }
})

//Router 3: get logged in user details
router.get("/getuser", fetchuser, async (req, res) => {
    try {
         const userId = req.user.id;
    let user = await User.findById(userId).select("-password");
     if (!user) {
      // User not found, possibly deleted
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    return res.status(200).send({ success: true, user:{name: user.name, email: user.email} });
    } catch (error) {
        
        return res.status(500).send("Internal Server Error");
    }
    
})



module.exports = router;
