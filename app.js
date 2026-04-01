const connecttomoongo = require('./db');
const express = require('express');
const cors = require('cors');
const http = require('http');  
const { Server } = require('socket.io');
const User = require('./models/Users');
const Message = require('./models/Messages');
const cookieParser = require('cookie-parser');

connecttomoongo();

// ── One-time migration: convert old Boolean status → String enum ────────────
// Old schema: status: Boolean (false = unread, true = read)
// New schema: status: String enum ('sent','delivered','read')
// Any document with a non-string status gets normalised on startup.
(async () => {
  try {
    // true  (old "read")   → 'read'
    await Message.updateMany({ status: true },  { $set: { status: 'read' } });
    // false (old "unread") → 'read' as well, since these are all historical msgs
    await Message.updateMany({ status: false }, { $set: { status: 'read' } });
    // null / missing       → 'read'
    await Message.updateMany(
      { $or: [{ status: null }, { status: { $exists: false } }] },
      { $set: { status: 'read' } }
    );
    console.log('[Migration] Old boolean status values normalised to string enum.');
  } catch (err) {
    console.error('[Migration] Failed:', err.message);
  }
})();
//updateSchema(); // Run the migration script to add new fields to the User schema in database
 const app = express();
 const port = process.env.PORT;
// Support both spellings (FRONTEND_URL and FONTEND_URL)
const FRONTEND_URL = process.env.FRONTEND_URL;
//const FRONTEND_URL = process.env.DEV_URL || 'http://localhost:3000';
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
    methods: ["GET", "POST"],
     credentials: true,
  }
});

// Socket.IO logic
io.on("connection", (socket) => {
  console.log("A user connected: ", socket.id);

  // Mark messages as read — receiver tells sender
  socket.on('markRead', ({ senderId, receiverId }) => {
    // Emit to original sender so their ticks turn blue immediately
    io.to(senderId).emit('messagesRead', { by: receiverId });
    console.log(`markRead: ${receiverId} read messages from ${senderId}`);
  });

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




