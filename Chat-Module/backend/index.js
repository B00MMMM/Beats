import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import socketHandler from "./socket.js";

import userRoutes from "./routes/user.routes.js";
import friendRoutes from "./routes/friend.routes.js";
import chatRoutes from "./routes/chat.routes.js";

mongoose.connect("mongodb://localhost:27017/music-chat");

const app = express();
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/chats", chatRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

socketHandler(io);

server.listen(5000);
