import express from "express";
import dotenv from "dotenv";
import { clerkMiddleware } from '@clerk/express';
import fileUpload from "express-fileupload";
import path from "path";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import userRoutes from "./routes/user.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import playlistRoutes from "./routes/playlist.route.js";
import chatRoutes from "./routes/chat.route.js";
import notificationRoutes from "./routes/notification.route.js";
import planRequestRoutes from "./routes/planRequest.routes.js";
import adminRoutes from "./routes/admin.route.js";
import aiChatRoutes from "./routes/aiChat.route.js";

import { connectDB } from "./lib/db.js";

dotenv.config();

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
    }
});

// Store online users: Map<clerkId, socketId>
const onlineUsers = new Map();

// Make io and onlineUsers available to routes
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// Socket.IO connection handling
io.on('connection', (socket) => {
    if (process.env.NODE_ENV !== 'production') console.log('New socket connection:', socket.id);

    const userId = socket.handshake.query.userId;

    if (userId && userId !== 'undefined') {
        onlineUsers.set(userId, socket.id);
        if (process.env.NODE_ENV !== 'production') console.log('User connected:', userId);

        // Broadcast online users to all clients
        io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    }

    // Send current online users to the newly connected socket
    socket.emit('onlineUsers', Array.from(onlineUsers.keys()));

    // Handle request for online users (fallback)
    socket.on('getOnlineUsers', () => {
        socket.emit('onlineUsers', Array.from(onlineUsers.keys()));
    });

    // Handle typing indicator
    socket.on('typing', ({ recipientId, isTyping }) => {
        const recipientSocketId = onlineUsers.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('userTyping', { userId, isTyping });
        }
    });

    socket.on('disconnect', () => {
        if (userId) {
            onlineUsers.delete(userId);
            if (process.env.NODE_ENV !== 'production') console.log('User disconnected:', userId);

            // Broadcast updated online users
            io.emit('onlineUsers', Array.from(onlineUsers.keys()));
        }
    });
});

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json()); // to parse the req.body

// Forward query token to Authorization header (for <audio> elements that can't set headers)
app.use((req, res, next) => {
    if (req.query.token && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
});

app.use(clerkMiddleware()); // this will add the auth to the reqObj => req.auth
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "tmp"),
    createParentPath: true,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB  max file size
    }
}));

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/plans", planRequestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai-chat", aiChatRoutes);

// error handler (must be AFTER routes to catch route errors)
app.use((err, req, res, next) => {
    res.status(500).json({ message: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message });
});

// Connect only once
connectDB()
    .then(() => {
        httpServer.listen(PORT, () => {
            console.log("Server is running on port " + PORT);
        });

        httpServer.on('error', (err) => {
            console.error('Server error:', err);
            process.exit(1);
        });
    })
    .catch((err) => {
        console.error("Failed to connect to DB:", err);
        process.exit(1);
    });
