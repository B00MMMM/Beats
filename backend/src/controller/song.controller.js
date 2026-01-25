import { deezerFetch } from '../lib/deezer.js';
import { Song } from '../models/song.model.js';
import { existsInDrive, getDriveFile, getDriveStream } from '../lib/drive.js';

export const getTrendingSongs = async (req, res, next) => {
    try {
        const dzData = await deezerFetch(`/search?q=top&limit=15`);
        console.log("Trending songs data from Deezer:", JSON.stringify(dzData, null, 2));

        const tracks = [];

        for (const t of dzData.data) {
            const hasDrive = await existsInDrive(t.id);

            tracks.push({
                deezerId: String(t.id),
                title: t.title,
                artist: t.artist, // Send full artist object (includes name, picture, etc.)
                album: t.album,   // Send full album object (includes title, cover, etc.)
                cover: t.album ? t.album.cover_medium : 'https://via.placeholder.com/150',
                hasDrive,
                previewUrl: t.preview,
                duration: t.duration,
                explicit_lyrics: t.explicit_lyrics,
                rank: t.rank,
            });
        }

        res.json(tracks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch trending" });
    }
};

export const searchSongs = async (req, res, next) => {
    const q = req.query.q;
    if (!q) return res.json([]);

    try {
        const dzData = await deezerFetch(
            `/search?q=${encodeURIComponent(q)}&limit=10`
        );

        console.log("Search data from Deezer:", JSON.stringify(dzData, null, 2));

        const tracks = [];

        for (const t of dzData.data) {
            const hasDrive = await existsInDrive(t.id);

            tracks.push({
                deezerId: String(t.id),
                title: t.title,
                artist: t.artist,
                album: t.album,
                cover: t.album ? t.album.cover_medium : 'https://via.placeholder.com/150',
                hasDrive,
                previewUrl: t.preview,
                duration: t.duration,
                explicit_lyrics: t.explicit_lyrics,
                rank: t.rank,
            });
        }

        res.json(tracks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Search failed" });
    }
}

export const streamSong = async (req, res, next) => {
    const deezerId = req.params.deezerId;

    try {
        const file = await getDriveFile(deezerId);

        if (!file) {
            const trackData = await deezerFetch(`/track/${deezerId}`);
            if (trackData && trackData.preview) {
                return res.redirect(trackData.preview);
            }
            return res.status(404).json({ error: "Not in Drive and no Deezer preview available" });
        }

        const fileSize = file.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'audio/mpeg',
            };

            res.writeHead(206, head);
            const stream = await getDriveStream(file.id, `bytes=${start}-${end}`);
            stream.data.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'audio/mpeg',
            };
            res.writeHead(200, head);
            const stream = await getDriveStream(file.id);
            stream.data.pipe(res);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Stream failed" });
    }
}

export const getSongDetails = async (req, res) => {
    try {
        const { deezerId } = req.params;

        // 1. Check DB for enriched song
        let song = await Song.findOne({ deezerId });
        if (song && song.rank !== undefined && song.explicit_lyrics !== undefined && song.album?.release_date) {
            return res.json(song);
        }

        // 2. Fetch from Deezer
        const response = await deezerFetch(`/track/${deezerId}`);
        const trackData = response;

        if (!trackData || trackData.error) {
            return res.status(404).json({ message: "Song not found on Deezer" });
        }

        // 3. Update or Create in DB
        const updateData = {
            deezerId: String(trackData.id),
            title: trackData.title,
            artist: trackData.artist,
            album: trackData.album,
            cover: trackData.album ? trackData.album.cover_medium : null,
            duration: trackData.duration,
            preview: trackData.preview,
            explicit_lyrics: trackData.explicit_lyrics,
            rank: trackData.rank,
        };

        // Use findOneAndUpdate with upsert to handle race conditions or existing sparse entry
        song = await Song.findOneAndUpdate(
            { deezerId: String(deezerId) },
            updateData,
            { new: true, upsert: true }
        );

        res.json(song);

    } catch (error) {
        console.error("Error fetching song details:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
