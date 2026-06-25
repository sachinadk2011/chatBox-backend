const jwt = require("jsonwebtoken");

const socketAuth = (socket, next) => {
    try {
        console.info("socket auth middle ware : ", socket.handshake.auth.token);
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error("Authentication required"));
        }

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        console.info("Socket authenticated user:", decoded);
        socket.user = decoded.user;

        next();
    } catch (err) {
        console.error("Socket authentication error:", err);
        console.info("Invalid token");
        next(new Error("Invalid token"));
    }
};

module.exports = socketAuth;