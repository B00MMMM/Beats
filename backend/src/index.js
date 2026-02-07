import express from "express";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import fileUpload from "express-fileupload";
import path from "path";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import { connectDB } from "./lib/db.js";
import userRoutes from "./routes/user.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import playlistRoutes from "./routes/playlist.route.js";
import chatRoutes from "./routes/chat.route.js";

// ... (deps)

// Load environment variables from .env file

dotenv.config();

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT;

// Create HTTP server and Socket.IO
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        credentials: true
    }
});

// Store online users: Map<clerkId, socketId>
const onlineUsers = new Map();

// Make io and onlineUsers available to routes
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New socket connection:', socket.id);
    
    const userId = socket.handshake.query.userId;
    
    if (userId && userId !== 'undefined') {
        onlineUsers.set(userId, socket.id);
        console.log('User connected:', userId);
        
        // Broadcast online users to all clients
        io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    }
    
    // Send current online users to the newly connected socket
    socket.emit('onlineUsers', Array.from(onlineUsers.keys()));
    
    // Handle request for online users (fallback)
    socket.on('getOnlineUsers', () => {
        socket.emit('onlineUsers', Array.from(onlineUsers.keys()));
    });
    
    // Note: Real-time message delivery is handled by the REST API (chat.controller.js)
    // The sendMessage socket event is no longer used to prevent duplicate messages
    
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
            console.log('User disconnected:', userId);
            
            // Broadcast updated online users
            io.emit('onlineUsers', Array.from(onlineUsers.keys()));
        }
    });
});

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true // Adjust this to your frontend URL
}));

app.use(express.json());
app.use(clerkMiddleware()); //this will add the Clerk middleware to handle authentication
app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: path.join(__dirname, "tmp"),
        createParentPath: true,
        limits: {
            fileSize: 10 * 1024 * 1024, //10MB maximum file size
        }
    })
);

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/chat", chatRoutes);

//error handler
app.use((err, req, res, next) => {
    res.status(500).json({ message: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message });
});

httpServer.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
    connectDB();
})