import { deezerFetch } from '../lib/deezer.js';
import { Song } from '../models/song.model.js';
import { SongRequest } from '../models/songRequest.model.js';
import { existsInDrive, getDriveFile, getDriveStream, getDriveFileMetadata } from '../lib/drive.js';
import { DriveCollection } from '../models/driveCollection.model.js';
import { getAuth } from '@clerk/express';
import { User } from '../models/user.model.js';

export const getTrendingSongs = async (req, res, next) => {
    try {
        const dzData = await deezerFetch(`/search?q=top&limit=15`);
        if (process.env.NODE_ENV !== 'production') console.log("Trending songs data from Deezer:", JSON.stringify(dzData, null, 2));

        const tracks = [];

        // Optimisation: Get all driveIds from DriveCollection in one query
        const deezerIds = dzData.data.map(t => String(t.id));
        const driveEntries = await DriveCollection.find({ deezerId: { $in: deezerIds } });
        const driveMap = new Map(driveEntries.map(d => [d.deezerId, true]));

        for (const t of dzData.data) {
            const hasDrive = driveMap.has(String(t.id));

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

        if (process.env.NODE_ENV !== 'production') console.log("Search data from Deezer:", JSON.stringify(dzData, null, 2));

        const tracks = [];

        // Optimisation: Get all driveIds from DriveCollection in one query
        const deezerIds = dzData.data.map(t => String(t.id));
        const driveEntries = await DriveCollection.find({ deezerId: { $in: deezerIds } });
        const driveMap = new Map(driveEntries.map(d => [d.deezerId, true]));

        for (const t of dzData.data) {
            const hasDrive = driveMap.has(String(t.id));

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
        // ─── Plan Check: Determine if user can stream from Drive ───
        let canStreamDrive = false;
        try {
            const { userId: clerkId } = getAuth(req);
            if (clerkId) {
                const user = await User.findOne({ clerkId });
                const plan = user?.plan || 'iron';

                // Check expiry
                if (user?.planExpiresAt && new Date() > new Date(user.planExpiresAt)) {
                    // Plan expired, treat as iron
                    canStreamDrive = false;
                } else {
                    // gold, diamond, test can stream; iron cannot
                    canStreamDrive = ['gold', 'diamond', 'test'].includes(plan);
                }
            }
        } catch (authErr) {
            // Auth check failed — treat as iron tier
            canStreamDrive = false;
        }


        // If user can't stream from Drive, go straight to Deezer preview
        if (!canStreamDrive) {
            const trackData = await deezerFetch(`/track/${deezerId}`);
            if (trackData && trackData.preview) {
                return res.redirect(trackData.preview);
            }
            return res.status(403).json({ error: "Upgrade your plan to stream full songs." });
        }

        let fileId = null;
        let fileSize = null;

        // 1. Check DriveCollection for cached driveId
        const driveEntry = await DriveCollection.findOne({ deezerId: String(deezerId) });

        if (driveEntry) {
            fileId = driveEntry.driveId;
            const meta = await getDriveFileMetadata(fileId);
            if (meta) {
                fileSize = parseInt(meta.size);
            } else {
                fileId = null;
            }
        }

        // 2. If not in Drive, fall back to Deezer preview
        if (!fileId) {
            const trackData = await deezerFetch(`/track/${deezerId}`);
            if (trackData && trackData.preview) {
                return res.redirect(trackData.preview);
            }
            return res.status(404).json({ error: "Not in Drive Collection and no Deezer preview" });
        }

        // 3. Stream from Drive using fileId
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
            const stream = await getDriveStream(fileId, `bytes=${start}-${end}`);
            stream.data.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'audio/mpeg',
            };
            res.writeHead(200, head);
            const stream = await getDriveStream(fileId);
            stream.data.pipe(res);
        }
    } catch (err) {
        console.error("Stream error:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Stream failed" });
        }
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
