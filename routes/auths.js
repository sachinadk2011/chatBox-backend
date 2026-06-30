const express = require("express");
const router = express.Router();
const User = require("../models/Users");
const Session = require("../models/UserSession");
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
const {generateOtp, GenerateOtpExpiry} = require("../utils/OtpCode");
const sendEmail = require("../utils/sendEmail");
const {loginLimiter, deleteLimiter, signUpLimiter, VerifyOtpLimiter, forgetpwLimiter} = require("../middleware/ratelimiter");
router.use(express.json()); // Re-enable the JSON middleware
const validatePassword = require("../utils/ValidatePassword");

// Health-check — used by the frontend ServerWakingBanner to detect when
// Render's server has woken up after a cold-start sleep period.
router.get('/ping', (req, res) => {
  res.status(200).json({ ok: true, ts: Date.now() });
});


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
        
        isOnline: true,
        lastActive: new Date(),
      });

      const otpcode = generateOtp();
      const emailsend =await sendEmail(req.body.email, otpcode);
       if (!emailsend.success){
        return  res.status(400).json({ success: false, message: "Verification Code failed to sent" });
       }
      user.otpCode = otpcode;
      user.otpExpiry = GenerateOtpExpiry();
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
  
  const { email, otpCode, deviceId } = req.body;
  

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
    if ( user.otpExpiry && user.otpExpiry < new Date().getTime()) {
      
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    } 
    if (user.otpCode !== otpCode){
      return res.status(400).json({ success: false, message: "Invalid OTP Code" });
    }

      user.isVerified = true; // Mark user as verified
      user.otpCode = null; // Clear OTP
      if (user.isPasswordResetRequest){
        user.isPasswordResetRequest = false;
        user.passwordResetVerified = true;
      }
      user.otpExpiry = null;
      await user.save();
      // console.log("User Found:", user);

      let userSession = await Session.findOne({ userId: user._id, deviceId: deviceId});
    if (!userSession){
      userSession = await Session.create({
        userId: user._id,
        deviceId: deviceId,
        deviceName: req.body.deviceName || null,
        browser: req.body.browser || null,
        OS: req.body.OS || null,
        userAgent: req.body.userAgent || null,
        
      })
      
    }

      const AccessToken = await AccessTokenGenerator(user);
      const RefreshToken = await RefreshTokenGenerator(user);
      userSession.refreshToken = RefreshToken;
      userSession.lastLogin = new Date();
      userSession.isActive = true;
      
      await userSession.save();
      

      res.cookie('refreshToken', RefreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
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
      { $set: { otpCode: otpcode, otpExpiry: GenerateOtpExpiry() } }
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

    const { email, password, deviceId, deviceName, browser, OS, userAgent } = req.body;
    console.info("login: ", deviceId)
    try {
      let user = await User.findOne({ email: email });
      if (!user) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid credentials" });
      }
      console.info("User found for login:", user.email, "Verified:", user.isVerified);
      if (!user.isVerified) {
    return res.status(403).json({
        success: false,
        message: "Please verify your email first."
    });
}

      const comparePassword = await bcrypt.compare(password, user.password);
      if (!comparePassword) {
        return res
          .status(400)
          .json({ success: false, error: "Wrong password" });
      }

      let userSession = await Session.findOne({ userId: user._id, deviceId: deviceId});

      if (!userSession){
      userSession = await Session.create({
        userId: user._id,
        deviceId: deviceId,
        deviceName: deviceName || null,
        browser: browser || null,
        OS: OS || null,
        userAgent: userAgent || null,
        
      })
      
    }

      const AccessToken = await AccessTokenGenerator(user);
      const RefreshToken = await RefreshTokenGenerator(user);
      userSession.refreshToken = RefreshToken;
      userSession.lastLogin = new Date();
      userSession.isActive = true;
      
      await userSession.save();
      user.isOnline = true;
      user.lastActive = new Date();

      
      await user.save();

      res.cookie('refreshToken', RefreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
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
          onlineStatus: user.isOnline,
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
    const { deviceId, deviceName, browser, OS, userAgent, fcmToken } = req.body;
    let user = await User.findOne({ email: email });
    let message = "";
    if (!user) {
      // signup with google
      user = await User.create({
        name: name,
        email: email,
        googleUser: true,
        isVerified: true,
        isOnline: true,
        lastActive: new Date(),
      });
      message = "Successfully signed up with Google";
    } else {
      if (!user.googleUser) {
        user.googleUser = true;
      }

      // login with google
      user.isOnline = true;
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

  let userSession = await Session.findOne({
    userId: user._id,
    deviceId: deviceId,

  });

  if (!userSession){
      userSession = await Session.create({
        userId: user._id,
        deviceId: deviceId,
        deviceName: deviceName || null,
        browser: browser || null,
        OS: OS || null,
        userAgent: userAgent || null,
        
      })
      
    }

    const AccessToken = await AccessTokenGenerator(user);
    const RefreshToken = await RefreshTokenGenerator(user);
    userSession.refreshToken = RefreshToken;
    
    userSession.lastLogin = new Date();
      userSession.isActive = true;
      await userSession.save();
    
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
  const deviceId = req.body.deviceId;
  if (!deviceId) {
    return res
      .status(400)
      .json({ success: false, message: "Device ID is required" });
  }
  if (!refreshToken) {
    return res
      .status(401)
      .json({ success: false, message: "Refresh token is required" });
  }
  try {
    const data = await jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const userId = data.user.id;
    const user = await User.findById(userId);
    let userSession = await Session.findOne({
    userId: user._id,
    deviceId: deviceId,

  }); 
    if (!user || userSession.refreshToken !== refreshToken) {
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
    const deviceId = req.body.deviceId;
    if (!deviceId) {
      return res
        .status(400)
        .json({ success: false, message: "Device ID is required" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "Account not found" });
    }

    let userSession = await Session.findOne({
    userId: user._id,
    deviceId: deviceId,

  });
    if (!userSession) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    userSession.refreshToken = null;
    user.isOnline = false;
    user.lastActive = userSession.lastActive = new Date();
    userSession.isActive = false;
    await userSession.save();
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
      user.otpExpiry = GenerateOtpExpiry();
      user.isPasswordResetRequest = true;
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
    if (!user.passwordResetVerified){
      return res.status(403).json({
        success:false,
        message: "Password reset not verified. Please Verify OTP sent to your email before resetting password"
      })
    }
    const oldHashedPassword = user.password;
    if (user.password && oldPassword) {
      const isMatch = await bcrypt.compare(oldPassword, oldHashedPassword);
      if (!isMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Password is incorrect" });
      }
    }
    
    
    const validation = validatePassword(newPassword, user);
    if (!validation.isValid) {
      console.error("Password validation failed:", validation.errors);
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, oldHashedPassword);
    if (isSamePassword) {
      return res
        .status(400)
        .json({ success: false, message: "New password must be different from the old password" });
    }
  }
    const securePassword = await bcrypt.hash(
      newPassword,
      await bcrypt.genSalt(10)
    );
    user.password = securePassword;
    user.passwordResetVerified = false;
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

// Router 11: get method to check if user is verified or not to set password reset flow in right direction
router.get("/checkverification", async(req, res)=>{
  try {
    const email = req.query.email;
    if (!email){
      return res.status(400).json({
        success:false,
        message: "Email is required"
      })
    }
    const user = await User.findOne({email});

    if (!user){
      return res.status(404).json({
        success:false,
        message: "User not Found"
      })
    }
    if ( user.passwordResetVerified !== true){
      return res.status(403).json({
        success: false,
        message: "Please complete OTP verification before resetting password"
      })
    }

    // ✅ Add this
return res.status(200).json({
  success: true,
  message: "Verified"
});
  }
  catch (error){
    console.error(error);
    return res.status(500).json({
      success:false,
      error: "Internal server Error" || error.message
    })
  }
})

// Router 12: post method to get the fcm of user from frontendand save it in user session model 
router.post("/save-fcm-token", fetchuser, async (req, res) =>{
  const {fcmToken , deviceId} = req.body;
  console.info("save-fcm-token: ", fcmToken);
  if ( !fcmToken || !deviceId){
    return res.status(400).json({
      success:false,
      error: "fcmToken and deviceId are required"
    });
  }
  const userId = req.user.id;
  try {
    const userSession = await Session.findOneAndUpdate({
      userId: userId, 
      deviceId: deviceId
    },
  {
    fcmToken: fcmToken
  },
  { new: true }
  )
  if (!userSession){
    return res.status(404).json({
      success:false,
      error: "Session not found for this user and device"
    });
  }

  return res.status(200).json({
    success: true
  });

  }catch (error) {
    console.error("error fromfcm token route: ", error);
    return res.
    status(500)
    .json({
      success:false,
      error: "Internal Server Error" || error.message
    });
  }

  
})


module.exports = router;
