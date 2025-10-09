const connecttomoongo = require('./db');
const express = require('express');
const cors = require('cors');
const updateSchema = require('./scripts/migration')
const http = require('http');  // 👈 needed for socket.io
const { Server } = require('socket.io');

connecttomoongo();
//updateSchema(); // Run the migration script to add new fields to the User schema in database
 const app = express();
 const port = process.env.PORT;

app.use(cors());
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
    origin: "*", // In production, change to your frontend domain
    methods: ["GET", "POST"]
  }
});

// Socket.IO logic
io.on("connection", (socket) => {
  console.log("A user connected: ", socket.id);

  // user joins their "room" (userId = unique)
  socket.on("joinRoom", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  // listen for messages
  socket.on("sendMessage", (data) => {
    console.log("Message received: ", data);

    

    // deliver to receiver
    io.to(data.receiver._id).emit("receiveMessage", data);
    io.to(data.sender._id).emit("receiveMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected: ", socket.id);
  });
});

// start the server with both Express + Socket.IO
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});




