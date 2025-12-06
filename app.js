const connecttomoongo = require('./db');
const express = require('express');
const cors = require('cors');
const updateSchema = require('./scripts/migration')
const http = require('http');  
const { Server } = require('socket.io');
const User = require('./models/Users');
const cookieParser = require('cookie-parser');

connecttomoongo();
//updateSchema(); // Run the migration script to add new fields to the User schema in database
 const app = express();
 const port = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true   // allow sending cookies
}));
app.use(cookieParser());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.static('public')); // for serving static files



// available routes
app.use('/api/auth', require('./routes/auths'));
app.use('/api/messages', require('./routes/messageses')); // added route for messages
app.use('/api/users', require('./routes/users')); // added route for users
app.use('/api/friends', require('./routes/friend')); // added route for friends

// 👉 Instead of app.listen, create a server instance
const server = http.createServer(app);

// 👉 Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL, // In production, change to your frontend domain
    methods: ["GET", "POST"]
  }
});

// Socket.IO logic
io.on("connection", (socket) => {
  console.log("A user connected: ", socket.id);

  // user joins their "room" (userId = unique)
  socket.on("joinRoom", async (userId) => {
    socket.userId = userId;
    socket.join(userId);
    console.log(`User ${userId} joined room`);
    // Mark user online
   await User.findByIdAndUpdate(userId, {
    onlineStatus: true,
    lastActive: new Date()
  });
  });

  // update lastActive periodically (frontend should emit "alive")
  socket.on("alive", async () => {
    if (!socket.userId) return;
    await User.findByIdAndUpdate(socket.userId, {
      lastActive: new Date()
    });
    console.log(`Updated lastActive for user ${socket.userId}`);
  });


  // listen for messages
  socket.on("sendMessage", (data) => {
    console.log("Message received: ", data);

  // deliver to receiver
    io.to(data.receiver._id).emit("receiveMessage", data);
    io.to(data.sender._id).emit("receiveMessage", data);
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected: ", socket.id);

    if (!socket.userId) return;

    await User.findByIdAndUpdate(socket.userId, {
      onlineStatus: false,
      lastActive: new Date()
    });
  });
});

// start the server with both Express + Socket.IO
server.listen(port, async() => {
  console.log(`Server running on port ${port}`);

});




