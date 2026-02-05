import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.get("/search", async (req, res) => {
  const q = req.query.q;
  const users = await User.find({
    username: { $regex: q, $options: "i" }
  }).select("_id username");

  res.json(users);
});

export default router;
