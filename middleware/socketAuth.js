const jwt = require("jsonwebtoken");

const socketAuth = (socket, next) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error("Authentication required"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Socket authenticated user:", decoded);
        socket.user = decoded;

        next();
    } catch (err) {
        next(new Error("Invalid token"));
    }
};

module.exports = socketAuth;