<p align="center">
 
<img width="180" height="180" alt="image" src="https://github.com/user-attachments/assets/3905e74d-1a84-4b87-a5d2-44831016d1a9" />
</p>


<h1 align="center">ChatWave — Backend</h1>

<p align="center">
  A production-ready REST API + real-time WebSocket server powering the <strong>ChatWave</strong> messaging platform.
  <br />
  Built with <strong>Node.js</strong> · <strong>Express</strong> · <strong>Socket.IO</strong> · <strong>MongoDB</strong>
</p>

<p align="center">
  <a href="https://chatwaves.sachinadhikari.com.np/" target="_blank">
    <img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-ChatWave-blueviolet?style=for-the-badge&logo=vercel&logoColor=white" />
  </a>
</p>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-23.x-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img alt="Express" src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Real-Time Events (Socket.IO)](#real-time-events-socketio)
- [Data Models](#data-models)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Docker](#docker)
- [Security Highlights](#security-highlights)

---

## Overview

The ChatWave backend is a **stateful HTTP + WebSocket server** that handles user authentication, friend management, media messaging, and real-time delivery receipts. It is designed to be lean, observable, and resilient — returning correct HTTP status codes even when the database is temporarily unavailable, and gracefully sweeping stale online-user records on startup.

---

## Live Demo

🌐 **[https://chatwaves.sachinadhikari.com.np/](https://chatwaves.sachinadhikari.com.np/)**

> The app is hosted on a free-tier server — first load may take a few seconds while the backend wakes up. A cold-start banner is shown in the UI during this time.

---

## Features

| Category | Highlights |
|---|---|
| **Authentication** | JWT access + refresh tokens, bcrypt password hashing, email OTP verification, Google OAuth 2.0 (Firebase Admin) |
| **Real-time messaging** | Bidirectional Socket.IO channels, per-user rooms, online/offline presence, blue-tick read receipts |
| **Media support** | Image and video uploads via Multer → Cloudinary |
| **Friend system** | Send / accept / decline / cancel requests, mutual-friend calculation |
| **Push notifications** | Firebase Cloud Messaging via `notificationService` when receiver is offline |
| **Email** | OTP delivery via Nodemailer (Gmail) and Resend API |
| **Rate limiting** | Per-route limiters (signup, login, OTP, delete, password-reset) via `express-rate-limit` |
| **Resilience** | DB-health middleware returns 503 immediately on MongoDB outage; global 500 error handler prevents hanging requests |
| **Observability** | Morgan HTTP logger, structured console output for socket events and DB sweeps |
| **Docker** | Multi-stage Dockerfile, compose-ready |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 23.x |
| Framework | Express 4 |
| Real-time | Socket.IO 4 |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (jsonwebtoken), bcryptjs, Firebase Admin SDK |
| File Storage | Cloudinary |
| Email | Nodemailer, Resend |
| Validation | express-validator |
| Rate Limiting | express-rate-limit |
| Push | Firebase Cloud Messaging |
| Dev tooling | Nodemon |
| Containerisation | Docker |

---

## Project Structure

```
chatBox-backend/
├── app.js                  # Entry point — Express app, Socket.IO setup, DB sweep
├── db.js                   # MongoDB connection + health-check helper
├── configuration/
│   └── cloudinaryConfig.js # Cloudinary SDK initialisation
├── credentials/            # Firebase service-account credentials
├── middleware/
│   ├── fetchuser.js        # JWT access-token verification middleware
│   ├── socketAuth.js       # Socket.IO JWT handshake middleware
│   ├── VerifyGoogleUser.js # Google ID-token verification
│   ├── checkFriends.js     # Friend-relationship guard
│   ├── ratelimiter.js      # Per-route rate-limit presets
│   └── uploadFiles.js      # Multer file-upload middleware
├── models/
│   ├── Users.js            # User schema (auth, presence, friends, OTP)
│   ├── Messages.js         # Message schema (text / media, delivery status)
│   └── UserSession.js      # Refresh-token session store
├── routes/
│   ├── auths.js            # /api/auth — register, login, OTP, Google OAuth, password reset
│   ├── messageses.js       # /api/messages — send, fetch, delete messages
│   ├── friend.js           # /api/friends — friend requests & management
│   └── users.js            # /api/users — profile, search
├── scripts/
│   └── migration.js        # Schema-migration runner (adds new fields to existing docs)
├── service/
│   └── notificationService.js  # Firebase push-notification delivery
├── utils/
│   ├── tokengenerator.js   # Access + Refresh JWT generators
│   ├── OtpCode.js          # OTP generation & expiry helpers
│   ├── sendEmail.js        # Email dispatch wrapper
│   └── ValidatePassword.js # Password-strength validator
└── uploads/                # Temporary local upload staging (pre-Cloudinary)
```

---

## API Reference

All routes are prefixed with `/api`. A `503` is returned immediately if the database is unreachable.

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/ping` | — | Health-check / cold-start wake probe |
| `POST` | `/createuser` | — | Register with email + password (rate-limited) |
| `POST` | `/login` | — | Login, returns access + refresh tokens (rate-limited) |
| `POST` | `/googlelogin` | — | Google OAuth sign-in / sign-up |
| `POST` | `/refresh` | Cookie | Rotate refresh token, issue new access token |
| `POST` | `/logout` | Cookie | Invalidate refresh-token session |
| `POST` | `/sendotp` | — | Send OTP to email for verification |
| `POST` | `/verifyotp` | — | Verify OTP code (rate-limited) |
| `POST` | `/forgetpassword` | — | Initiate password-reset flow (rate-limited) |
| `POST` | `/resetpassword` | JWT | Set new password after OTP verification |
| `PUT` | `/updateprofile` | JWT | Upload / replace profile picture (Cloudinary) |
| `DELETE` | `/deleteaccount` | JWT | Permanently delete account (rate-limited) |

### Messages — `/api/messages`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/sendmessage` | JWT | Send a text or media message |
| `GET` | `/fetchmessages/:userId` | JWT | Fetch conversation history with a user |
| `DELETE` | `/deletemessage/:id` | JWT | Delete a message |

### Friends — `/api/friends`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/fetchallfriends` | JWT | Get friends list with mutual-friend data |
| `GET` | `/fetchallreceivedrequests` | JWT | Incoming friend requests |
| `GET` | `/fetchallsentrequests` | JWT | Outgoing friend requests |
| `POST` | `/sendrequest/:id` | JWT | Send a friend request |
| `POST` | `/acceptrequest/:id` | JWT | Accept a friend request |
| `DELETE` | `/declinerequest/:id` | JWT | Decline a received request |
| `DELETE` | `/cancelrequest/:id` | JWT | Cancel a sent request |
| `DELETE` | `/removefriend/:id` | JWT | Remove an existing friend |

### Users — `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/getuser` | JWT | Get authenticated user's profile |
| `GET` | `/searchusers` | JWT | Full-text search for users by name |

---

## Real-Time Events (Socket.IO)

Socket connections are authenticated via JWT on the handshake (`socketAuth` middleware).

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `joinRoom` | — | Join the user's private room; marks user online |
| `sendMessage` | `MessageObject` | Deliver a message; auto-marks read if receiver's chat is open |
| `markRead` | `{ senderId }` | Notify sender that all their messages were read |
| `chatOpen` | `{ viewingUserId }` | Track which conversation is currently open |
| `chatClose` | — | Clear open-chat tracking |
| `alive` | — | Heartbeat to keep `lastActive` and `isOnline` fresh |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `receiveMessage` | `MessageObject` | Real-time message delivery |
| `messagesRead` | `{ by: userId }` | Blue-tick notification — all messages read by `by` |

> **Stale-user sweep**: On startup and every 5 minutes, users inactive for > 5 minutes are automatically marked offline.

---

## Data Models

### User

```js
{
  name: String,           // required
  email: String,          // required, unique
  password: String,       // required unless googleUser
  googleUser: Boolean,
  friends: [ObjectId],
  friendRequests: [ObjectId],
  sentRequests: [ObjectId],
  isVerified: Boolean,
  isOnline: Boolean,
  lastActive: Date,
  profile_Url: String,    // Cloudinary URL
  public_id: String,      // Cloudinary public_id
  otpCode: String,
  otpExpiry: Date,
  passwordResetVerified: Boolean,
  isPasswordResetRequest: Boolean,
  date: Date
}
```

### Message

```js
{
  sender: ObjectId,       // ref: User
  receiver: ObjectId,     // ref: User
  types: 'text' | 'image' | 'video',  // audio/file/multiple defined in schema but not yet active
  message: String,        // required for text type
  public_id: String,      // Cloudinary ID for media types
  status: 'sent' | 'delivered' | 'read',
  date: Date
}
```

---

## Environment Variables

Create a `.env` file in the project root (see `.env.example` for all keys):

```env
# Server
PORT=8000
NODE_ENV=development

# Database
DB_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/chatbox

# Frontend (CORS whitelist)
FRONTEND_URL=http://localhost:5173

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google OAuth
CLIENT_ID=your_google_client_id
CLIENT_SECRET=your_google_client_secret

# Email (Nodemailer)
EMAIL_USER=you@gmail.com
EMAIL_PASS=your_app_password
EMAIL_SERVICE=gmail

# Resend API
RESEND_API_KEY=your_resend_key
RESEND_EMAIL_FROM=no-reply@yourdomain.com

# Firebase (for push notifications)
# Place your serviceAccountKey.json in credentials/
```

> **Never commit real secrets.** The `.gitignore` already excludes `.env` and the `credentials/` folder.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB Atlas cluster (or local MongoDB)
- Cloudinary account
- Google Cloud OAuth 2.0 credentials
- Firebase project (for push notifications)

### Installation

```bash
# 1. Clone and enter the backend directory
git clone https://github.com/your-username/chatbox.git
cd chatbox/chatBox-backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in your values in .env

# 4. Start development server (with hot-reload)
npm run dev

# 5. Or start production server
npm start
```

The server will be available at `http://localhost:8000`.

---

## Docker

```bash
# Build and run the backend container
docker build -t chatbox-backend .
docker run -p 8000:8000 --env-file .env chatbox-backend

# Or use the root-level docker-compose (starts both frontend + backend)
cd ..
docker-compose up --build
```

---

## Security Highlights

- **Password hashing** — bcrypt with salt rounds = 10
- **JWT rotation** — short-lived access tokens + refresh-token rotation stored in `UserSession`; logout invalidates the session
- **Rate limiting** — dedicated limiters per sensitive route (signup, login, OTP, delete, password-reset)
- **Input validation** — `express-validator` on all mutation endpoints
- **CORS whitelist** — only the configured `FRONTEND_URL` origin is allowed
- **HTTP security headers** — `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- **DB health gate** — 503 response (not timeout) when MongoDB is unreachable
- **No stack traces in production** — error handler strips `stack` in `NODE_ENV=production`
- **Socket authentication** — every WebSocket connection verified via JWT before any event is processed

---

<p align="center">Made with ❤️ by <strong>Sachin</strong></p>
