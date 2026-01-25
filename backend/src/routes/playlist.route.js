import { Router } from "express";
import { createPlaylist, getMyPlaylists, getPlaylistById, addSongToPlaylist, removeSongFromPlaylist, updatePlaylist, checkSongInPlaylists } from "../controller/playlist.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", protectRoute, createPlaylist);
router.get("/my", protectRoute, getMyPlaylists);
router.get("/check/:deezerId", protectRoute, checkSongInPlaylists);
router.get("/:id", protectRoute, getPlaylistById);
router.put("/:id", protectRoute, updatePlaylist);
router.post("/:id/songs", protectRoute, addSongToPlaylist);
router.delete("/:id/songs/:songId", protectRoute, removeSongFromPlaylist);

export default router;
