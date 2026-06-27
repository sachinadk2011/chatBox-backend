<div align="center">

# 💬 ChatWave — Backend

**Robust, real-time Node.js server.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-%F0%9F%9A%80-indigo?style=for-the-badge)](https://chatwaves.sachinadhikari.com.np/chats)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb)](https://mongodb.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-black?style=flat-square&logo=socket.io)](https://socket.io)

</div>

---

## ✨ Overview

This is the backend repository for **ChatWave**. It provides RESTful APIs for user management, messaging, and friend requests, alongside a Socket.IO server for real-time, bidirectional communication.

## 🛠️ Tech Stack

- **Node.js** + **Express.js** — Fast and scalable API server.
- **Socket.IO** — Real-time event handling (typing, read receipts, messaging).
- **MongoDB** + **Mongoose** — NoSQL database and object modeling.
- **JWT & bcrypt** — Secure authentication (access/refresh tokens) and password hashing.
- **Cloudinary** — Cloud storage for image and video uploads.
- **Nodemailer** — Transactional emails (OTP, password resets).
- **express-validator** & **express-rate-limit** — Input validation and abuse protection.

---

## 🔒 Environment Variables

To run this project locally, create a `.env` file in the root directory. 
**Note: Do not expose real secrets in your public repositories.**

```env
# Server Configuration
PORT=8000
NODE_ENV=development

# Database Configuration
DB_URL=your_mongodb_connection_string_here

# JWT Secrets (Use strong, random strings in production)
JWT_SECRET=your_jwt_access_secret_here
REFRESH_TOKEN_SECRET=your_jwt_refresh_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Service (For OTP & password reset)
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_app_password

# CORS Settings (Frontend URL)
FRONTEND_URL=http://localhost:5173
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (Local instance or MongoDB Atlas cluster)
- **Cloudinary Account** (for media handling)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server (uses `nodemon` for hot-reloading):
   ```bash
   npm run dev
   ```

3. Start for production:
   ```bash
   npm start
   ```

---

## 📡 API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /createuser` — Register a new account.
- `POST /loginuser` — Login with email/password.
- `POST /googlelogin` — Authenticate via Google OAuth.
- `POST /token` — Refresh access token (requires valid HttpOnly cookie).
- `POST /verify-otp` — Verify email OTP.
- `GET /ping` — Health check endpoint.

### Messages (`/api/messages`)
- `GET /fetchallmessages` — Fetch latest message per conversation.
- `GET /conversation/:userId` — Fetch paginated chat history with a specific user.
- `POST /sendmessage` — Send text and media files.
- `PUT /markasread/:senderId` — Mark messages as read.

### Friends (`/api/friends`)
- `GET /fetchallfriends` — List accepted friends.
- `POST /sendfriendrequest` — Send a friend request.
- `POST /actiononfriendrequest` — Accept/reject friend requests.

---

## ⚡ Real-Time Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `joinRoom` | Client → Server | Subscribes user to their personal notification room. |
| `sendMessage` | Client → Server | Emits a new message. |
| `receiveMessage` | Server → Client | Delivers a message to the recipient. |
| `markRead` | Client → Server | Notifies the server that messages were read. |
| `messagesRead` | Server → Client | Broadcasts read status (blue ticks) to the sender. |
| `alive` | Client → Server | Keep-alive heartbeat to update `lastActive` status. |

---

## 🧠 Architecture Notes

### Database Health Middleware
All `/api` routes are protected by a database health check middleware. If MongoDB disconnects, the server immediately responds with `503 Service Unavailable` rather than hanging indefinitely. This allows the frontend to swiftly display an offline/maintenance page and begin its auto-recovery polling sequence.
