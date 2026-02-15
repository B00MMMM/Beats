
import mongoose from "mongoose";

const driveCollectionSchema = new mongoose.Schema(
    {
        deezerId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        driveId: {
            type: String,
            required: true,
        },
        fileName: {
            type: String,
        },
        fileSize: {
            type: Number,
        },
    },
    { timestamps: true }
);

export const DriveCollection = mongoose.model("DriveCollection", driveCollectionSchema);
