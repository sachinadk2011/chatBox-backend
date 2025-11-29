const jwt = require('jsonwebtoken');
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;


const AccessTokenGenerator = async(user) => {
    const payload = {
        user: 
        {
            id: user._id
        }
    }
    const token = await jwt.sign(payload, JWT_ACCESS_SECRET, {expiresIn: '15m'});
    return token;
}

const RefreshTokenGenerator = async(user) => {
    const payload = {
        user: 
        {
            id: user._id
            
        }
    }
    const token = await jwt.sign(payload, JWT_REFRESH_SECRET, {expiresIn: '30d'});
    return token;
}

module.exports = {AccessTokenGenerator, RefreshTokenGenerator};