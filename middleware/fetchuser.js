const jwt = require("jsonwebtoken");
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

const fetchuser = async (req, res, next) => {
  //get the user from jwt token and add id 
  // to req  object:
  const token = req.header("auth-token");
  if (!token) {
    return res.status(401).send({ success: false, message: "please autheticate using valide token" });
  }
  try {
    const data = await jwt.verify(token, JWT_ACCESS_SECRET);
    req.user = data.user;
    next();
  } catch (error) {
    

     return res.status(401).send({ success: false, message: "Invalid authentication token." });
  }

 
};

module.exports = fetchuser;
