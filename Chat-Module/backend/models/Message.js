import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, enum: ["text", "music"] },
  text: String,
  music: {
    trackId: String,
    title: String,
    artist: String,
    cover: String
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Message", MessageSchema);
