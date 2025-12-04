const express = require("express");
const router = express.Router();
const User = require("../models/Users");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const {
  AccessTokenGenerator,
  RefreshTokenGenerator,
} = require("../utils/tokengenerator");
const fetchuser = require("../middleware/fetchuser");
const VerifyGoogleUser = require("../middleware/VerifyGoogleUser");
const rateLimit = require("express-rate-limit");
const cloudinary = require("../configuration/cloudinaryConfig");
const jwt = require("jsonwebtoken");
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const generateOtp = require("../utils/generateOtpCode");
const sendEmail = require("../utils/sendEmail");
const {loginLimiter, deleteLimiter, signUpLimiter, VerifyOtpLimiter, forgetpwLimiter} = require("../middleware/ratelimiter");
router.use(express.json()); // Re-enable the JSON middleware
const validatePassword = require("../utils/ValidatePassword");




//Router 1: to create user
router.post(
  "/createuser",
  [
    body("name", "Enter a valid name").isLength({ min: 3 }),
    body("email", "Enter a valid email").isEmail(),

    body("password", "Password must be alphanumeric").isLength({ min: 8 }),
  ],
  signUpLimiter,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        return res
          .status(400)
          .json({
            success: false,
            error: "User with this email already exists",
          });
      }
      let securePassword = await bcrypt.hash(
        req.body.password,
        await bcrypt.genSalt(10)
      );
      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: securePassword,
        
        onlineStatus: true,
        lastActive: new Date(),
      });

      const otpcode = generateOtp();
      const emailsend =await sendEmail(req.body.email, otpcode);
       if (!emailsend.success){
        return  res.status(400).json({ success: false, message: "Verification Code failed to sent" });
       }
      user.otpCode = otpcode;
      user.otpExpiry = true;
      await user.save();

      


      return res
        .status(200)
        .json({
          success: true,
          
          message: "Verification Code is sent successfully",
        });
    } catch (error) {
      console.error(error);
      
      return res
        .status(500)
        .send({ success: false, error:error || error.message || "Internal Server Error" });
    }
  }
);

// Router 2: verify user email and login
// Route-2:  for verifying user with otp using post method "/api/auth/verify-otp"
router.post("/verify-otp",VerifyOtpLimiter, async (req, res) => {
  
  const { email, otpCode } = req.body;
  

  // Set a timeout to clear the OTP after 10 minutes (600,000 milliseconds)
  setTimeout(async () => {
    await User.updateOne({ email }, { $set: {otpCode: null, otpExpiry: false } });
  }, 600000);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // console.log("User Found: verify otp", user);
    // console.log("OTP from DB:", user.otpCode);
    // console.log("OTP from Request:", otpCode);
    // console.log("OTP match:", user.otpCode === otpCode);
    // console.log("Email Match:", user.email === email);
    if ( user.otpExpiry === false) {
      
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    } 
    if (user.otpCode !== otpCode){
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

     if ( user.email !== email) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid Email" });
     }
      user.status = true; // Mark user as verified
      user.otpCode = null; // Clear OTP
      user.otpExpiry = false;
      await user.save();
      // console.log("User Found:", user);

      const AccessToken = await AccessTokenGenerator(user);
      const RefreshToken = await RefreshTokenGenerator(user);
      user.refreshToken = RefreshToken;
      await user.save();

      res.cookie('refreshToken', RefreshToken, {
  httpOnly: true,
  secure: false,
  sameSite: 'Strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});

return res.status(200).json({
  success: true,
  token: AccessToken,
  message: "Successfully user created and verified the email",
});
    
  } catch (error) {
    // console.error(error.message, OtpCode);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

//Route-3 for resend verification otp code taht expire using post method "/api/auth/resend"
router.post("/resend",VerifyOtpLimiter, async (req, res) => {
  try {
    const otpEmail = req.body.email; //taking email
    // Generate OTP for the new user
    
    const otpcode = generateOtp();
    //update otp of  user
    const user = await User.updateOne(
      { email: otpEmail },
      { $set: { otpCode: otpcode, otpExpiry: true } }
    ); // updating only those which need this

      const emailsend =await sendEmail(req.body.email, otpcode);
     if (emailsend){
    return res.status(200).json({ success: true, message: "Verification Code is sent succefully" });
    }else{
      return res.status(400).json({ success: false, message: "Verification Code failed to sent" });
    }
  } catch (error) {
    // console.error(error.message);
    return res.status(500).send({success: false, message:"Internal Server Error"});
  }
});


//Rout 4: login user
router.post(
  "/loginuser",
  loginLimiter,
  [
    body("email", "Enter a valid email").isEmail(),
    body("password", "Password must be alphanumeric").isLength({ min: 8 }).exists(),
  ],
  async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array() });
    }

    const { email, password } = req.body;
    try {
      let user = await User.findOne({ email: email });
      if (!user) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid credentials" });
      }
      const comparePassword = await bcrypt.compare(password, user.password);
      if (!comparePassword) {
        return res
          .status(400)
          .json({ success: false, error: "Wrong password" });
      }
      const AccessToken = await AccessTokenGenerator(user);
      const RefreshToken = await RefreshTokenGenerator(user);
      user.onlineStatus = true;
      user.lastActive = new Date();

      user.refreshToken = RefreshToken;
      await user.save();

      res.cookie('refreshToken', RefreshToken, {
  httpOnly: true,
  secure: false,
  sameSite: 'Strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});

      return res
        .status(200)
        .json({
          success: true,
          token: AccessToken,
          message: "Successfully logged in",
        });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .send({ success: false, error: "Internal Server Error" });
    }
  }
);

//Router 5: get logged in user details
router.get("/getuser", fetchuser, async (req, res) => {
  try {
    const userId = req.user.id;
    let user = await User.findById(userId).select("-password");
    if (!user) {
      // User not found, possibly deleted
      return res
        .status(404)
        .json({ success: false, error: "Account not found" });
    }

    return res
      .status(200)
      .send({
        success: true,
        user: {
          name: user.name,
          email: user.email,
          id: user._id,
          onlineStatus: user.onlineStatus,
          lastActive: user.lastActive,
          profile_Url: user.profile_Url,
          public_id: user.public_id,
        },
      });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .send({ success: false, error: "Internal Server Error" });
  }
});

// Router 6: signin or signup with google
router.post("/googleLogin", VerifyGoogleUser, async (req, res) => {
  try {
    const { name, email, picture } = req.user;
    let user = await User.findOne({ email: email });
    let message = "";
    if (!user) {
      // signup with google
      user = await User.create({
        name: name,
        email: email,
        googleUser: true,
        status: true,
        onlineStatus: true,
        lastActive: new Date(),
      });
      message = "Successfully signed up with Google";
    } else {
      if (!user.googleUser) {
        user.googleUser = true;
      }
      // login with google
      user.onlineStatus = true;
      user.lastActive = new Date();
      await user.save();
      message = "Successfully logged in with Google";
    }
    if (!user.profile_Url && !user.public_id) {
    const result = await cloudinary.uploader.upload(picture, {
      resource_type: "image",
      folder: "chatbox_profiles",
    });

    user.profile_Url = result.secure_url;
    user.public_id = result.public_id;
  }
    const AccessToken = await AccessTokenGenerator(user);
    const RefreshToken = await RefreshTokenGenerator(user);
    user.refreshToken = RefreshToken;
    await user.save();
    res.cookie('refreshToken', RefreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});

    return res
      .status(200)
      .json({ success: true, token: AccessToken, message: message });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .send({
        success: false,
        error: "Internal Server Error" || error.message,
      });
  }
});

// Router 7: Token refresh
router.post("/token", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res
      .status(401)
      .json({ success: false, message: "Refresh token is required" });
  }
  try {
    const data = await jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const userId = data.user.id;
    const user = await User.findById(userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid refresh token" });
    }
    const newAccessToken = await AccessTokenGenerator(user);
    return res.status(200).json({ success: true, token: newAccessToken });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .send({
        success: false,
        error: "Invalid refresh token" || error.message,
      });
  }
});

// Router 8: Logout user
router.post("/logout", fetchuser, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "Account not found" });
    }
    user.refreshToken = null;
    user.onlineStatus = false;
    user.lastActive = new Date();
    await user.save();
    res.clearCookie('refreshToken');
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .send({ success: false, error: "Internal Server Error" });
    
  }
});

//Router 9: forget password
router.post("/forgetpassword", forgetpwLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const otpcode = generateOtp();
      const emailsend =await sendEmail(req.body.email, otpcode);
       if (!emailsend.success){
        return  res.status(400).json({ success: false, message: "Verification Code failed to sent" });
       }
      user.otpCode = otpcode;
      user.otpExpiry = true;
      await user.save();

      


      return res
        .status(200)
        .json({
          success: true,
          
          message: "Verification Code is sent successfully",
        });

    
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .send({ success: false, error: "Internal Server Error" });
    
  }
});

// Router 10: reset password
router.post("/resetpassword",  async (req, res) => {
  try{
   const { email, newPassword, oldPassword = null } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const oldHashedPassword = user.password;
    if (oldPassword) {
      const isMatch = await bcrypt.compare(oldPassword, oldHashedPassword);
      if (!isMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Password is incorrect" });
      }
    }
    
    
    const validation = validatePassword(newPassword, user);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    const isSamePassword = await bcrypt.compare(newPassword, oldHashedPassword);
    if (isSamePassword) {
      return res
        .status(400)
        .json({ success: false, message: "New password must be different from the old password" });
    }
    const securePassword = await bcrypt.hash(
      newPassword,
      await bcrypt.genSalt(10)
    );
    user.password = securePassword;
    await user.save();
    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  }catch (error) {
    console.error(error);
    return res
      .status(500)
      .send({ success: false, error: "Internal Server Error" });
  }
});


module.exports = router;
