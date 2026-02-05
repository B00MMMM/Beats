import express from "express";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

const router = express.Router();

router.get("/:userId", async (req, res) => {
  const chats = await Chat.find({
    members: req.params.userId
  }).populate("members", "username");

  res.json(chats);
});

router.get("/messages/:chatId", async (req, res) => {
  const msgs = await Message.find({
    chatId: req.params.chatId
  });
  res.json(msgs);
});

export default router;
