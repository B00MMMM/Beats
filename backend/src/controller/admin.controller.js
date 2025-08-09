import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import cloudinary from "../lib/cloudinary.js";


//helper function to upload files to Cloudinary
const uploadToCloudinary = async (file) => {
    try {
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
            resource_type: "auto",
        });
        return result.secure_url;
    }catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw new Error("Cloudinary upload failed");
    }
}

export const createSong = async (req, res, next) => {
    try{
        if (!req.files || !req.files.audioFile || !req.files.imageFile) {
            return res.status(400).json({ message: "please upload all files" });
        }   

        const { title, artist, albumId, duration } = req.body;
        const audioFile = req.files.audioFile;
        const imageFile = req.files.imageFile;

        const audioUrl = await uploadToCloudinary(audioFile);
        const imageUrl = await uploadToCloudinary(imageFile);

        // Create the song in the database
        const song = new Song({
            title,
            artist,
            audioUrl,
            imageUrl,   
            duration,
            albumId: albumId || null, // If albumId is not provided, it will be set to null
        });

        await song.save();

        if (albumId) {
            // If albumId is provided, update the album with the new song
            await Album.findByIdAndUpdate(albumId, {
                $push: { songs: song._id },
            });
        }

        res.status(201).json(song);
    } catch (error) {
        console.error("Error creating song:", error);
        next(error);
    }
};

export const deleteSong = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Find the song by ID
        const song = await Song.findById(id);
        if (!song) {
            return res.status(404).json({ message: "Song not found" });
        }

        // If the song belongs to an album, remove it from the album's songs array
        if (song.albumId) {
            await Album.findByIdAndUpdate(song.albumId, {
                $pull: { songs: song._id },
            });
        }

        // Delete the song from the database
        await Song.findByIdAndDelete(id);

        res.status(200).json({ message: "Song deleted successfully" });
    } catch (error) {
        console.error("Error deleting song:", error);
        next(error);
    }
}

export const createAlbum = async (req, res, next) => {
    try {
        const { title, artist, releaseYear } = req.body;
        const { imageFile } = req.files;

        if (!imageFile) {
            return res.status(400).json({ message: "Please upload an album cover image" });
        }

        const imageUrl = await uploadToCloudinary(imageFile);

        const album = new Album({
            title,
            artist,
            imageUrl,
            releaseYear,
        });

        await album.save();

        res.status(201).json(album);
    } catch (error) {
        console.error("Error creating album:", error);
        next(error);
    }
};

export const deleteAlbum = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Find the album by ID
        const album = await Album.findById(id);
        if (!album) {
            return res.status(404).json({ message: "Album not found" });
        }
        // Remove the album's songs from the Song collection
        await Song.deleteMany({ albumId: id });
        // Delete the album from the database
        await Album.findByIdAndDelete(id);

        res.status(200).json({ message: "Album deleted successfully" });
    } catch (error) {
        console.error("Error deleting album:", error);
        next(error);
    }
};

export const checkAdmin = async (req, res, next) => {
    res.status(200).json({ admin:true });
};

