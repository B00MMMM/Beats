import express from "express";
import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";

const router = express.Router();

// send request
router.post("/request", async (req, res) => {
  const { from, to } = req.body;
  await FriendRequest.create({ from, to });
  res.json({ success: true });
});

// accept request
router.post("/accept", async (req, res) => {
  const { requestId } = req.body;
  const reqDoc = await FriendRequest.findById(requestId);

  await User.findByIdAndUpdate(reqDoc.from, {
    $push: { friends: reqDoc.to }
  });
  await User.findByIdAndUpdate(reqDoc.to, {
    $push: { friends: reqDoc.from }
  });

  await Chat.create({
    members: [reqDoc.from, reqDoc.to]
  });

  await FriendRequest.findByIdAndDelete(requestId);
  res.json({ success: true });
});

export default router;
