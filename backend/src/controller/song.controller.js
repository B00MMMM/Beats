import { Song } from "../models/song.model.js";

export const getAllSongs = async (req, res, next) => {
    try{
        // -1 indicates descending order, 1 indicates ascending order
        const songs = await Song.find().sort({ createdAt: -1 });
        res.status(200).json(songs);
    }catch(error){
        console.error("Error fetching songs:", error);
        next(error);
    }
};

export const getFeaturedSongs = async (req, res, next) => {
    try{
        //fetch 6 random songs using mongoose aggregation pipeline
        const songs = await Song.aggregate([
            {
                $sample: { size: 6 } // Randomly select 6 songs
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    artist: 1,
                    imageUrl: 1,
                    audioUrl: 1
                }
            }
        ]);
        res.status(200).json(songs);
    }catch(error){
        console.error("Error fetching featured songs:", error);
        next(error);
    }
};

export const getMadeForYouSongs = async (req, res, next) => {
    try{
        //fetch 4 random songs using mongoose aggregation pipeline
        const songs = await Song.aggregate([
            {
                $sample: { size: 4 } // Randomly select 4 songs
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    artist: 1,
                    imageUrl: 1,
                    audioUrl: 1
                }
            }
        ]);
        res.status(200).json(songs);
    }catch(error){
        console.error("Error fetching made for you songs:", error);
        next(error);
    }
}

export const getTrendingSongs = async (req, res, next) => {
    try{
        //fetch 4 random songs using mongoose aggregation pipeline
        const songs = await Song.aggregate([
            {
                $sample: { size: 4 } // Randomly select 4 songs
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    artist: 1,
                    imageUrl: 1,
                    audioUrl: 1
                }
            }
        ]);
        res.status(200).json(songs);
    }catch(error){
        console.error("Error fetching trending songs:", error);
        next(error);
    }
}