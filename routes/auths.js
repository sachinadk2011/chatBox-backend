const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const fetchuser = require('../middlewire/fetchuser');

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
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }
    try {
        let user = await User.findOne({email: req.body.email});
        if(user){
            return res.status(400).json({error: "User with this email already exits"});
        }
        let success = false;
        let securePassword = await bcrypt.hash(req.body.password, await bcrypt.genSalt(10));
        user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: securePassword,
            status: true
        })
        success = true;
        const token = await jwt.sign({user: {id: user.id}}, JWT_SECRET, {expiresIn: '1h'});
        const {name, email} = user;
        // const token = jwt.sign({user: {id: user.id}}, JWT_SECRET);
        return res.status(200).json({success: success, token, user: {name, email}});
        
    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Internal Server Error");
    }
    
})

//Rout 2: login user
router.post("/loginuser", loginLimiter,
    [
        body("email", "Enter a valid email").isEmail(),
        body("password", "Password must be alphanumeric").isAlphanumeric().isLength({min: 8})
    ],
    async (req, res) => {
        
        let errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({errors: errors.array()});
        }
        
        const {email, password}= req.body;
        try {
        let user =await User.findOne({email: email});
        if(!user){
            return res.status(400).json({error: "Invalid credentials"});
        }
        const comparePassword = await bcrypt.compare(password, user.password);
        if(!comparePassword){
            return res.status(400).json({error: "Invalid credentials"});
        }
        const token = await jwt.sign({user: {id: user.id}}, JWT_SECRET, {expiresIn: '1h'});
        let success = true;
        const {name} = user;
        return res.status(200).json({success, token, user: {name, email}});

        
    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Internal Server Error");
        
    }
})

//Router 3: get logged in user details
router.post("/getuser", fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("-password");
        return res.status(200).json({user});
    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Internal Server Error");
    }
    
})



module.exports = router;
