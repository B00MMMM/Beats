import { User } from "../models/user.model.js";
import { SongRequest } from "../models/songRequest.model.js";
import { PlanRequest } from "../models/planRequest.model.js";
import { Song } from "../models/song.model.js";
import { Playlist } from "../models/playlist.model.js";

// Dashboard Stats
export const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalSongs = await Song.countDocuments();
        const totalPlaylists = await Playlist.countDocuments();

        // Count new users in last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const newUsersToday = await User.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } });

        res.json({
            totalUsers,
            totalSongs,
            totalPlaylists,
            newUsersToday
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// User Management
export const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;

        const filter = {};
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { uniqueId: { $regex: search, $options: 'i' } },
                { clerkId: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(filter)
            .select('-password') // Exclude sensitive data if any (though we use Clerk)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(filter);

        res.json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "User role updated", user });
    } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent deleting self (simple check, ideally check against req.auth.userId)
        // For now, let's assume frontend handles safety or we check token

        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Ideally cleaning up related data (playlists, etc.) would happen here

        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Activity Logs (Simple version: recently active users)
export const getRecentActivity = async (req, res) => {
    try {
        // Fetch users who have 'currentActivity' set, sorted by updated time
        const activeUsers = await User.find({
            'currentActivity.title': { $ne: null }
        })
            .select('fullName imageUrl currentActivity updatedAt')
            .sort({ updatedAt: -1 })
            .limit(10);

        res.json(activeUsers);
    } catch (error) {
        console.error("Error fetching activity:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Plan Stats
export const getPlanStats = async (req, res) => {
    try {
        const pendingRequests = await PlanRequest.countDocuments({ status: 'pending' });

        const usersByPlan = await User.aggregate([
            { $group: { _id: "$plan", count: { $sum: 1 } } }
        ]);

        const formattedStats = {
            iron: 0,
            gold: 0,
            diamond: 0,
            free: 0
        };

        usersByPlan.forEach(stat => {
            if (formattedStats.hasOwnProperty(stat._id)) {
                formattedStats[stat._id] = stat.count;
            }
        });

        res.json({
            pendingRequests,
            usersByPlan: formattedStats
        });
    } catch (error) {
        console.error("Error fetching plan stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateUserPlan = async (req, res) => {
    try {
        const { userId } = req.params;
        const { plan } = req.body;

        if (!['free', 'iron', 'gold', 'diamond'].includes(plan)) {
            return res.status(400).json({ message: "Invalid plan" });
        }

        const user = await User.findByIdAndUpdate(userId, { plan }, { new: true });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "User plan updated", user });
    } catch (error) {
        console.error("Error updating user plan:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Song Management
export const getSongRequests = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'all', sortBy = 'playCount', order = 'desc', minPlayCount } = req.query;

        const filter = { isPreviewOnly: true }; // Only fetch requests/preview songs

        if (status === 'pending') filter.isChecked = false;
        if (status === 'checked') filter.isChecked = true;

        if (minPlayCount) {
            filter.playCount = { $gte: parseInt(minPlayCount) };
        }

        const sortOptions = {};
        sortOptions[sortBy] = order === 'asc' ? 1 : -1;

        const requests = await SongRequest.find(filter)
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await SongRequest.countDocuments(filter);

        res.json({
            requests,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error("Error fetching song requests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateSongRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isChecked, priority } = req.body;

        const request = await SongRequest.findByIdAndUpdate(
            id,
            { isChecked, priority },
            { new: true }
        );

        if (!request) {
            return res.status(404).json({ message: "Song request not found" });
        }

        res.json(request);
    } catch (error) {
        console.error("Error updating song request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getSongStats = async (req, res) => {
    try {
        const totalRequests = await SongRequest.countDocuments({ isPreviewOnly: true });
        const pendingRequests = await SongRequest.countDocuments({ isPreviewOnly: true, isChecked: false });
        const checkedRequests = await SongRequest.countDocuments({ isPreviewOnly: true, isChecked: true });
        const highPriorityRequests = await SongRequest.countDocuments({ priority: { $in: ['high', 'urgent'] } });

        // Count songs with more than 5 plays (arbitrary "popular" threshold)
        const popularSongs = await SongRequest.countDocuments({ playCount: { $gt: 5 } });

        res.json({
            totalRequests,
            pendingRequests,
            checkedRequests,
            highPriorityRequests,
            popularSongs
        });
    } catch (error) {
        console.error("Error fetching song stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const findDuplicateSongs = async (req, res) => {
    try {
        // Find songs with same title and artist
        const duplicates = await SongRequest.aggregate([
            {
                $group: {
                    _id: { title: "$title", artist: "$artist" },
                    count: { $sum: 1 },
                    songs: { $push: { _id: "$_id", playCount: "$playCount", title: "$title", artist: "$artist" } }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        res.json({ duplicates });
    } catch (error) {
        console.error("Error finding duplicates:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const mergeDuplicateSongs = async (req, res) => {
    try {
        const { keepId, mergeIds } = req.body; // mergeIds is array of IDs to delete

        if (!keepId || !mergeIds || !Array.isArray(mergeIds)) {
            return res.status(400).json({ message: "Invalid merge parameters" });
        }

        const keepSong = await SongRequest.findById(keepId);
        if (!keepSong) return res.status(404).json({ message: "Target song not found" });

        // Calculate total plays from merged songs
        const songsToMerge = await SongRequest.find({ _id: { $in: mergeIds } });
        const additionalPlays = songsToMerge.reduce((sum, song) => sum + (song.playCount || 0), 0);

        // Update kept song
        keepSong.playCount += additionalPlays;
        await keepSong.save();

        // Delete merged songs
        await SongRequest.deleteMany({ _id: { $in: mergeIds } });

        res.json({ message: "Songs merged successfully", keptSong: keepSong });
    } catch (error) {
        console.error("Error merging songs:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const bulkUpdateSongRequests = async (req, res) => {
    try {
        const { ids, action } = req.body; // action: 'mark_checked', 'mark_pending', 'delete'

        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ message: "Invalid IDs" });
        }

        if (action === 'delete') {
            await SongRequest.deleteMany({ _id: { $in: ids } });
        } else if (action === 'mark_checked') {
            await SongRequest.updateMany({ _id: { $in: ids } }, { isChecked: true });
        } else if (action === 'mark_pending') {
            await SongRequest.updateMany({ _id: { $in: ids } }, { isChecked: false });
        } else {
            return res.status(400).json({ message: "Invalid action" });
        }

        res.json({ message: "Bulk action completed" });
    } catch (error) {
        console.error("Error executing bulk action:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
