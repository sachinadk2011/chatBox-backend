const rateLimit = require("express-rate-limit");

//get time stap how much time remaining 
// For CommonJS
const rateLimitHandler = (action) => (req, res, next, options) => {
  const remainingMs = req.rateLimit.resetTime - new Date();
  const totalSeconds = Math.ceil(remainingMs / 1000);
  // console.log(totalSeconds)

  return res.status(429).json({
    success: false,
    message: `Too many ${action} requests.`,
    retryAfter: totalSeconds,
  });
};




// login limiter
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("login"),
});

//delete limiter
const deleteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("delete"),
});

//signup limiter
const signUpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("signup"),
});

//verify otp limiter 
const VerifyOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Otp"),
});

//forgetpw limiter
const forgetpwLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("password reset"),
});

module.exports = {loginLimiter, deleteLimiter, signUpLimiter, VerifyOtpLimiter, forgetpwLimiter};
