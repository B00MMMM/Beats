import { deezerFetch } from '../lib/deezer.js';
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
