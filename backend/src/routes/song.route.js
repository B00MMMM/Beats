import { Router } from "express";
import { getTrendingSongs, searchSongs, streamSong } from "../controller/song.controller.js";

const router = Router();

router.get("/trending", getTrendingSongs);
router.get("/search", searchSongs);
router.get("/stream/:deezerId", streamSong);

export default router;