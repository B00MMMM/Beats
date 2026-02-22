import { Song } from "../models/song.model.js";
import { User } from "../models/user.model.js";
import { Playlist } from "../models/playlist.model.js";

export const getStats = async (req, res) => {
    try {
        const [totalSongs, totalUsers, totalAlbums, totalArtists] = await Promise.all([
            Song.countDocuments(),
            User.countDocuments(),
            Song.distinct("album"),
            Song.distinct("artist"),
        ]);

        res.status(200).json({
            totalSongs,
            totalUsers,
            totalAlbums: totalAlbums.length,
            totalArtists: totalArtists.length,
        });

    } catch (error) {
        console.log("Error in getStats controller", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
