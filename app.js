const connectToMongo = require('./db');
const { isDbConnected } = require('./db');
const express = require('express');
const cors = require('cors');
const http = require('http');  
const { Server } = require('socket.io');
const User = require('./models/Users');
const Message = require('./models/Messages');
const cookieParser = require('cookie-parser');
const updateSchema = require('./scripts/migration');

connectToMongo();

updateSchema(); // Run the migration script to add new fields to the User schema in database
 const app = express();
 const port = process.env.PORT;
// Support both spellings (FRONTEND_URL and FONTEND_URL)
const FRONTEND_URL = process.env.FRONTEND_URL;
//const FRONTEND_URL = process.env.DEV_URL ;
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true   // allow sending cookies
}));

// Set COOP and COEP headers for cross-origin isolation
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  next();
});


app.use(cookieParser());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.static('public')); // for serving static files



// ── DB-health middleware — returns 503 immediately if MongoDB is down ──
// Without this, requests to any route that hits the DB hang for 30+ seconds
// (MongoDB default socket timeout) and never send a response,
// so the browser sees a network timeout instead of a 500/503 status code.
// With this middleware, the frontend interceptor gets a real 5xx immediately
// and can show the proper error page.
app.use('/api', (req, res, next) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database is currently unavailable. Please try again shortly.',
    });
  }
  next();
});

// available routes
app.use('/api/auth', require('./routes/auths'));
app.use('/api/messages', require('./routes/messageses')); // added route for messages
app.use('/api/users', require('./routes/users')); // added route for users
app.use('/api/friends', require('./routes/friend')); // added route for friends

// ── Global 500 error handler — MUST be defined AFTER all routes ──
// Catches any error passed to next(err) from any route/middleware.
// Without this, DB crashes leave the request hanging (no response sent),
// which the browser sees as a network timeout rather than a 500.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[Global Error Handler]', err.stack || err.message || err);
  // Don't leak stack traces to the client in production
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    success: false,
    message: isDev ? (err.message || 'Internal Server Error') : 'Internal Server Error',
    ...(isDev && { stack: err.stack }),
  });
});

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

  // Track which chat each socket has open
socket.on('chatOpen', ({ viewingUserId }) => {
  socket.openChatWith = viewingUserId?.toString() ?? null;
  console.log(`${socket.userId} opened chat with ${viewingUserId}`);
});

socket.on('chatClose', () => {
  socket.openChatWith = null;
});


  // listen for messages
  socket.on("sendMessage", async (data) => {
    console.log("Message received: ", data);
    const receiverId = data.receiver._id?.toString();
    const senderId = data.sender._id?.toString();

    try{
      const receiverSockets = await io.in(receiverId).fetchSockets();
      const chatIsOpen = receiverSockets.some(
        s=> s.openChatWith?.toString() === senderId
      );

      if (chatIsOpen){
        // Receiver is activeky looking at this chat - mark as read immediately
        await Message.findByIdAndUpdate(data._id,
          { status: 'read' }
        );
        await Message.updateMany(
          { sender: senderId, receiver: receiverId, status: { $ne: 'read' } },
        { $set: { status: 'read' } }
        );
        const readMsg = { ...data, status: 'read' };
      io.to(receiverId).emit("receiveMessage", readMsg);
      io.to(senderId).emit("receiveMessage", readMsg);
      // Sender's ticks turn blue instantly
      io.to(senderId).emit('messagesRead', { by: receiverId });

    } else {
      // normal deliver to receiver - not looking at this chat
       io.to(receiverId).emit("receiveMessage", data);
       io.to(senderId).emit("receiveMessage", data);

      }
    } catch (err){
       console.error("sendMessage handler error:", err);
    // Fallback to normal delivery
    io.to(receiverId).emit("receiveMessage", data);
    io.to(senderId).emit("receiveMessage", data);
    }
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




