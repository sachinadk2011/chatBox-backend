const {OAuth2Client} = require('google-auth-library');
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);

const VerifyGoogleUser = async (req, res, next) => {
    const token = req.header("auth-token");
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({success: false, error: "Invalid Google token"});
        
    }
}

module.exports = VerifyGoogleUser;