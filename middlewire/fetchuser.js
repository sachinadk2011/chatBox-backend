const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const fetchuser = async (req, res, next) => {
  //get the user from jwt token and add id 
  // to req  object:
  const token = req.header("auth-token");
  if (!token) {
    return res.status(401).send({ error: "please autheticate using valide token" });
  }
  try {
    const data = await jwt.verify(token, JWT_SECRET);
    req.user = data.user;
    next();
  } catch (error) {
  if (error.name === "TokenExpiredError") {
    const decoded = jwt.decode(token);
    const userId = decoded?.user?.id;

    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, { status: "false" });
      } catch (dbErr) {
        console.error("Failed to update user status:", dbErr.message);
      }
    }

    return res.status(401).send({ error: "Session expired. Please log in again." });
  }

  return res.status(401).send({ error: "Invalid authentication token." });
}

};

module.exports = fetchuser;
