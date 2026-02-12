# 🔒 Simple Admin Panel for Resume Project

## Overview
This guide provides a straightforward admin panel implementation for your Beats music streaming application. It maintains good security practices while keeping the complexity appropriate for a portfolio project.

## 1. Basic Role-Based Authentication

### Song Request Tracking Model

```javascript
// backend/src/models/songRequest.model.js
import mongoose from "mongoose";

const songRequestSchema = new mongoose.Schema(
    {
        deezerId: {
            type: String,
            required: true,
            unique: true, // Ensure no duplicate Deezer IDs
            index: true   // Add index for faster queries
        },
        title: {
            type: String,
            required: true,
        },
        artist: {
            type: String,
            required: true,
        },
        album: {
            type: String,
            default: '',
        },
        duration: {
            type: Number, // in seconds
            default: 0,
        },
        imageUrl: {
            type: String,
            default: '',
        },
        playCount: {
            type: Number,
            default: 1,
        },
        isPreviewOnly: {
            type: Boolean,
            default: true,
        },
        isChecked: {
            type: Boolean,
            default: false,
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
        },
        adminNotes: {
            type: String,
            default: '',
        },
        checkedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        checkedAt: {
            type: Date,
        },
        lastPlayed: {
            type: Date,
            default: Date.now,
        },
        downloadUrl: {
            type: String, // For storing the full download URL once added
            default: '',
        },
        isDownloaded: {
            type: Boolean,
            default: false,
        }
    },
    { timestamps: true }
);

// Index for efficient queries and duplicate prevention
songRequestSchema.index({ deezerId: 1 }, { unique: true });
songRequestSchema.index({ playCount: -1 });
songRequestSchema.index({ isChecked: 1, playCount: -1 });
songRequestSchema.index({ priority: 1, playCount: -1 });
songRequestSchema.index({ title: 1, artist: 1 }); // For finding potential duplicates by title/artist

export const SongRequest = mongoose.model("SongRequest", songRequestSchema);
```

### Simple User Model Update

```javascript
// backend/src/models/user.model.js - Add these fields to existing schema
const userSchema = new mongoose.Schema({
    // ... existing fields (fullName, imageUrl, clerkId, etc.)
    
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
    // ... rest of existing schema
});
```

### Basic Admin Middleware

```javascript
// backend/src/middleware/auth.middleware.js - Add this new function

// Simple admin check
export const requireAdminRole = async (req, res, next) => {
    try {
        const { userId } = getAuth(req);
        const user = await User.findOne({ clerkId: userId });
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: "Admin access required" });
        }
        
        req.adminUser = user;
        next();
    } catch (error) {
        res.status(500).json({ message: "Authorization error" });
    }
};
```

## 2. Simple Admin Controller & Routes

### Basic Admin Controller

```javascript
// backend/src/controller/admin.controller.js
import { User } from "../models/user.model.js";
import { Song } from "../models/song.model.js";
import { Playlist } from "../models/playlist.model.js";
import { PlanRequest } from "../models/planRequest.model.js";
import { SongRequest } from "../models/songRequest.model.js";

// Simple dashboard stats
export const getDashboardStats = async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            totalSongs: await Song.countDocuments(),
            totalPlaylists: await Playlist.countDocuments(),
            newUsersToday: await User.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            })
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
};

// Get all users with simple pagination
export const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        
        const filter = {};
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { uniqueId: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(filter)
            .select('-clerkId')
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
        res.status(500).json({ message: "Failed to fetch users" });
    }
};

// Simple user role update
export const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }
        
        const user = await User.findByIdAndUpdate(
            id, 
            { role, isAdmin: role === 'admin' }, 
            { new: true }
        ).select('-clerkId');

        res.json({ user, message: "Role updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to update role" });
    }
};

// Delete user
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await User.findByIdAndDelete(id);
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete user" });
    }
};

// Get recent activity
export const getRecentActivity = async (req, res) => {
    try {
        const recentUsers = await User.find()
            .select('fullName createdAt currentActivity')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json(recentUsers);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch recent activity" });
    }
};

// Premium Plan Management
// Get all plan requests
export const getPlanRequests = async (req, res) => {
    try {
        const { status = 'all', page = 1, limit = 20 } = req.query;
        
        const filter = {};
        if (status !== 'all') {
            filter.status = status;
        }

        const requests = await PlanRequest.find(filter)
            .populate('userId', 'fullName imageUrl uniqueId')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await PlanRequest.countDocuments(filter);

        res.json({
            requests,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch plan requests" });
    }
};

// Approve or deny plan request
export const updatePlanRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
        }

        const planRequest = await PlanRequest.findByIdAndUpdate(
            id,
            {
                status,
                adminNotes,
                reviewedBy: req.adminUser._id,
                reviewedAt: new Date()
            },
            { new: true }
        ).populate('userId', 'fullName plan');

        if (!planRequest) {
            return res.status(404).json({ message: "Plan request not found" });
        }

        // If approved, update user's plan
        if (status === 'approved') {
            await User.findByIdAndUpdate(planRequest.userId._id, {
                plan: planRequest.requestedPlan
            });
        }

        res.json({ planRequest, message: `Plan request ${status} successfully` });
    } catch (error) {
        res.status(500).json({ message: "Failed to update plan request" });
    }
};

// Get plan statistics
export const getPlanStats = async (req, res) => {
    try {
        const stats = {
            totalRequests: await PlanRequest.countDocuments(),
            pendingRequests: await PlanRequest.countDocuments({ status: 'pending' }),
            approvedRequests: await PlanRequest.countDocuments({ status: 'approved' }),
            rejectedRequests: await PlanRequest.countDocuments({ status: 'rejected' }),
            usersByPlan: {
                iron: await User.countDocuments({ plan: 'iron' }),
                gold: await User.countDocuments({ plan: 'gold' }),
                diamond: await User.countDocuments({ plan: 'diamond' })
            }
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch plan statistics" });
    }
};

// Manually update user plan
export const updateUserPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { plan } = req.body;
        
        if (!['iron', 'gold', 'diamond'].includes(plan)) {
            return res.status(400).json({ message: "Invalid plan. Must be 'iron', 'gold', or 'diamond'" });
        }
        
        const user = await User.findByIdAndUpdate(
            id, 
            { plan }, 
            { new: true }
        ).select('-clerkId');

        res.json({ user, message: "User plan updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to update user plan" });
    }
};

// Song Content Management
// Track song requests for popular preview-only songs with duplicate prevention
export const trackSongRequest = async (deezerId, songData) => {
    try {
        // Validate input to prevent invalid data
        if (!deezerId || !songData?.title || !songData?.artist) {
            console.warn('Invalid song data provided for tracking:', { deezerId, songData });
            return;
        }

        // Use atomic upsert to prevent race conditions and duplicates
        const updateResult = await SongRequest.findOneAndUpdate(
            { deezerId }, // Find by Deezer ID
            {
                $inc: { playCount: 1 }, // Increment play count
                $set: { 
                    lastPlayed: new Date(),
                    // Update song metadata if it has changed
                    title: songData.title,
                    artist: songData.artist?.name || songData.artist,
                    album: songData.album?.title || songData.album || '',
                    duration: songData.duration || 0,
                    imageUrl: songData.album?.cover_medium || songData.imageUrl || ''
                }
            },
            { 
                upsert: true, // Create if doesn't exist
                new: true,    // Return updated document
                runValidators: true // Run schema validation
            }
        );

        // If this was a new creation (playCount = 1), set initial values
        if (updateResult.playCount === 1) {
            await SongRequest.findByIdAndUpdate(updateResult._id, {
                isPreviewOnly: true,
                isChecked: false,
                priority: 'medium'
            });
        }

        console.log(`Song tracked: ${songData.title} by ${songData.artist} (Play count: ${updateResult.playCount})`);
        
    } catch (error) {
        // Handle duplicate key errors gracefully
        if (error.code === 11000) {
            console.warn('Duplicate song request detected, trying to update existing:', deezerId);
            try {
                // Fallback: just increment existing record
                await SongRequest.findOneAndUpdate(
                    { deezerId },
                    { 
                        $inc: { playCount: 1 },
                        $set: { lastPlayed: new Date() }
                    }
                );
            } catch (fallbackError) {
                console.error('Failed to update existing song request:', fallbackError);
            }
        } else {
            console.error('Failed to track song request:', error);
        }
    }
};

// Get song requests for admin review
export const getSongRequests = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            sortBy = 'playCount', 
            order = 'desc',
            status = 'all',
            minPlayCount = 1
        } = req.query;
        
        const filter = {
            playCount: { $gte: parseInt(minPlayCount) }
        };
        
        if (status === 'pending') {
            filter.isChecked = false;
        } else if (status === 'checked') {
            filter.isChecked = true;
        }
        
        const sortOptions = {};
        sortOptions[sortBy] = order === 'desc' ? -1 : 1;

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
        res.status(500).json({ message: "Failed to fetch song requests" });
    }
};

// Mark song as checked for download
export const updateSongRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isChecked, adminNotes, priority } = req.body;

        const songRequest = await SongRequest.findByIdAndUpdate(
            id,
            {
                isChecked,
                adminNotes,
                priority: priority || 'medium',
                checkedBy: req.adminUser._id,
                checkedAt: isChecked ? new Date() : null
            },
            { new: true }
        );

        if (!songRequest) {
            return res.status(404).json({ message: "Song request not found" });
        }

        res.json({ songRequest, message: "Song request updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to update song request" });
    }
};

// Get song request statistics
export const getSongRequestStats = async (req, res) => {
    try {
        const stats = {
            totalRequests: await SongRequest.countDocuments(),
            pendingRequests: await SongRequest.countDocuments({ isChecked: false }),
            checkedRequests: await SongRequest.countDocuments({ isChecked: true }),
            highPriorityRequests: await SongRequest.countDocuments({ 
                priority: 'high', 
                isChecked: false 
            }),
            popularSongs: await SongRequest.countDocuments({ playCount: { $gte: 5 } }),
            averagePlaysPerSong: await SongRequest.aggregate([
                { $group: { _id: null, avg: { $avg: "$playCount" } } }
            ])
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch song request statistics" });
    }
};

// Check for potential duplicate songs by title and artist
export const findDuplicateSongs = async (req, res) => {
    try {
        const duplicates = await SongRequest.aggregate([
            {
                $group: {
                    _id: {
                        title: { $toLower: "$title" },
                        artist: { $toLower: "$artist" }
                    },
                    count: { $sum: 1 },
                    songs: { $push: {
                        _id: "$_id",
                        deezerId: "$deezerId",
                        title: "$title",
                        artist: "$artist",
                        playCount: "$playCount"
                    }}
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            },
            {
                $sort: { "_id.title": 1 }
            }
        ]);
        
        res.json({ duplicates, total: duplicates.length });
    } catch (error) {
        res.status(500).json({ message: "Failed to find duplicate songs" });
    }
};

// Merge duplicate song entries
export const mergeDuplicateSongs = async (req, res) => {
    try {
        const { keepId, mergeIds } = req.body;
        
        if (!keepId || !mergeIds || mergeIds.length === 0) {
            return res.status(400).json({ message: "Keep ID and merge IDs are required" });
        }
        
        // Get all songs to merge
        const songsToMerge = await SongRequest.find({ _id: { $in: mergeIds } });
        const keepSong = await SongRequest.findById(keepId);
        
        if (!keepSong) {
            return res.status(404).json({ message: "Song to keep not found" });
        }
        
        // Calculate total play count
        const totalPlayCount = songsToMerge.reduce((sum, song) => sum + song.playCount, 0) + keepSong.playCount;
        
        // Update the song to keep with merged data
        await SongRequest.findByIdAndUpdate(keepId, {
            playCount: totalPlayCount,
            lastPlayed: new Date(), // Use current time as last played
            // Keep the highest priority
            priority: ['urgent', 'high', 'medium', 'low'].find(p => 
                [keepSong, ...songsToMerge].some(s => s.priority === p)
            ) || 'medium'
        });
        
        // Delete the duplicate songs
        await SongRequest.deleteMany({ _id: { $in: mergeIds } });
        
        res.json({ 
            message: `Successfully merged ${mergeIds.length} duplicate songs`,
            totalPlayCount 
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to merge duplicate songs" });
    }
};

// Bulk update song requests
export const bulkUpdateSongRequests = async (req, res) => {
    try {
        const { songIds, action, priority } = req.body;
        
        const updateData = {
            checkedBy: req.adminUser._id,
            checkedAt: new Date()
        };
        
        if (action === 'check') {
            updateData.isChecked = true;
            if (priority) updateData.priority = priority;
        } else if (action === 'uncheck') {
            updateData.isChecked = false;
            updateData.checkedAt = null;
        }
        
        await SongRequest.updateMany(
            { _id: { $in: songIds } },
            updateData
        );
        
        res.json({ message: `Successfully ${action}ed ${songIds.length} songs` });
    } catch (error) {
        res.status(500).json({ message: "Failed to bulk update songs" });
    }
};
```

### Simple Admin Routes

```javascript
// backend/src/routes/admin.route.js
import { Router } from "express";
import { protectRoute, requireAdminRole } from "../middleware/auth.middleware.js";
import {
    getDashboardStats,
    getAllUsers,
    updateUserRole,
    deleteUser,
    getRecentActivity,
    getPlanRequests,
    updatePlanRequestStatus,
    getPlanStats,
    updateUserPlan,
    getSongRequests,
    updateSongRequestStatus,
    getSongRequestStats,
    bulkUpdateSongRequests,
    findDuplicateSongs,
    mergeDuplicateSongs
} from "../controller/admin.controller.js";

const router = Router();

// Apply basic security
router.use(protectRoute);
router.use(requireAdminRole);

// Dashboard routes
router.get("/stats", getDashboardStats);
router.get("/activity", getRecentActivity);

// User management
router.get("/users", getAllUsers);
router.put("/users/:id/role", updateUserRole);
router.put("/users/:id/plan", updateUserPlan);
router.delete("/users/:id", deleteUser);

// Premium plan management
router.get("/plan-requests", getPlanRequests);
router.put("/plan-requests/:id", updatePlanRequestStatus);
router.get("/plan-stats", getPlanStats);

// Song content management
router.get("/song-requests", getSongRequests);
router.put("/song-requests/:id", updateSongRequestStatus);
router.post("/song-requests/bulk", bulkUpdateSongRequests);
router.get("/song-stats", getSongRequestStats);
router.get("/song-duplicates", findDuplicateSongs);
router.post("/song-duplicates/merge", mergeDuplicateSongs);

// Admin verification
router.get("/verify", (req, res) => {
    res.json({
        isAdmin: true,
        user: req.adminUser
    });
});

export default router;
```

## 3. Simple Frontend Admin Panel

### Basic Admin Route Protection

```jsx
// frontend/src/components/AdminRoute.jsx
import { useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axiosInstance from '../api/axios';

const AdminRoute = ({ children }) => {
    const { user, isLoaded } = useUser();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const response = await axiosInstance.get('/api/admin/verify');
                setIsAdmin(response.data.isAdmin);
            } catch (error) {
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        if (isLoaded && user) {
            checkAdminStatus();
        } else if (isLoaded) {
            setLoading(false);
        }
    }, [user, isLoaded]);

    if (!isLoaded || loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default AdminRoute;
```

### Simple Admin Dashboard

```jsx
// frontend/src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminStats from '../components/admin/AdminStats';
import UserManagement from '../components/admin/UserManagement';
import PlanManagement from '../components/admin/PlanManagement';
import SongManagement from '../components/admin/SongManagement';
import AdminRoute from '../components/AdminRoute';
import axiosInstance from '../api/axios';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axiosInstance.get('/api/admin/stats');
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <AdminRoute>
            <div className="flex h-screen bg-gray-100">
                <AdminSidebar />
                
                <main className="flex-1 overflow-y-auto p-8">
                    <Routes>
                        <Route path="/" element={<AdminStats stats={stats} />} />
                        <Route path="/users" element={<UserManagement />} />
                        <Route path="/plans" element={<PlanManagement />} />
                        <Route path="/songs" element={<SongManagement />} />
                    </Routes>
                </main>
            </div>
        </AdminRoute>
    );
};

export default AdminDashboard;
```

### Simple Admin Sidebar

```jsx
// frontend/src/components/admin/AdminSidebar.jsx
import { Link, useLocation } from 'react-router-dom';
import { FiUsers, FiBarChart3, FiLogOut, FiStar, FiMusic } from 'react-icons/fi';

const AdminSidebar = () => {
    const location = useLocation();

    const menuItems = [
        { path: '/admin', icon: FiBarChart3, label: 'Dashboard' },
        { path: '/admin/users', icon: FiUsers, label: 'Users' },
        { path: '/admin/plans', icon: FiStar, label: 'Premium Plans' },
        { path: '/admin/songs', icon: FiMusic, label: 'Song Requests' }
    ];

    const handleLogout = () => {
        window.location.href = '/';
    };

    return (
        <aside className="w-64 bg-gray-900 text-white">
            <div className="p-4">
                <h2 className="font-bold text-xl">Admin Panel</h2>
            </div>

            <nav className="mt-8">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center px-4 py-3 hover:bg-gray-800 transition-colors ${
                                isActive ? 'bg-gray-800 border-r-4 border-blue-500' : ''
                            }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="ml-3">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="absolute bottom-4 left-4 right-4">
                <button 
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 text-red-400 hover:bg-gray-800 rounded transition-colors"
                >
                    <FiLogOut className="w-5 h-5" />
                    <span className="ml-3">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
```

### Simple Stats Component

```jsx
// frontend/src/components/admin/AdminStats.jsx
import { useEffect, useState } from 'react';
import axiosInstance from '../../api/axios';

const AdminStats = ({ stats: initialStats }) => {
    const [stats, setStats] = useState(initialStats);
    const [recentActivity, setRecentActivity] = useState([]);
    const [planStats, setPlanStats] = useState(null);

    useEffect(() => {
        const fetchRecentActivity = async () => {
            try {
                const response = await axiosInstance.get('/api/admin/activity');
                setRecentActivity(response.data);
            } catch (error) {
                console.error('Failed to fetch recent activity:', error);
            }
        };

        const fetchPlanStats = async () => {
            try {
                const response = await axiosInstance.get('/api/admin/plan-stats');
                setPlanStats(response.data);
            } catch (error) {
                console.error('Failed to fetch plan stats:', error);
            }
        };

        fetchRecentActivity();
        fetchPlanStats();
    }, []);

    if (!stats) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">Total Songs</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalSongs}</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">Total Playlists</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalPlaylists}</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">New Users Today</h3>
                    <p className="text-2xl font-bold text-green-600">{stats.newUsersToday}</p>
                </div>
            </div>

            {/* Premium Plan Overview */}
            {planStats && (
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">Premium Plans Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-orange-50 rounded">
                            <h3 className="text-sm font-medium text-orange-600">Pending Requests</h3>
                            <p className="text-2xl font-bold text-orange-700">{planStats.pendingRequests}</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded">
                            <h3 className="text-sm font-medium text-gray-600">Iron Users</h3>
                            <p className="text-2xl font-bold text-gray-700">{planStats.usersByPlan.iron}</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded">
                            <h3 className="text-sm font-medium text-yellow-600">Gold Users</h3>
                            <p className="text-2xl font-bold text-yellow-700">{planStats.usersByPlan.gold}</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded">
                            <h3 className="text-sm font-medium text-blue-600">Diamond Users</h3>
                            <p className="text-2xl font-bold text-blue-700">{planStats.usersByPlan.diamond}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Recent User Activity</h2>
                <div className="space-y-3">
                    {recentActivity.map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div>
                                <p className="font-medium">{user.fullName}</p>
                                <p className="text-sm text-gray-500">
                                    Joined {new Date(user.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            {user.currentActivity?.title && (
                                <p className="text-sm text-blue-600">
                                    Listening to: {user.currentActivity.title}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminStats;
```

### User Management Component

```jsx
// frontend/src/components/admin/UserManagement.jsx
import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchUsers();
    }, [page, search]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('/api/admin/users', {
                params: { page, search, limit: 10 }
            });
            setUsers(response.data.users);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await axiosInstance.put(`/api/admin/users/${userId}/role`, {
                role: newRole
            });
            fetchUsers(); // Refresh the list
        } catch (error) {
            console.error('Failed to update role:', error);
        }
    };

    const handlePlanChange = async (userId, newPlan) => {
        try {
            await axiosInstance.put(`/api/admin/users/${userId}/plan`, {
                plan: newPlan
            });
            fetchUsers(); // Refresh the list
        } catch (error) {
            console.error('Failed to update plan:', error);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await axiosInstance.delete(`/api/admin/users/${userId}`);
                fetchUsers(); // Refresh the list
            } catch (error) {
                console.error('Failed to delete user:', error);
            }
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-lg shadow">
                <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user._id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <img
                                            src={user.imageUrl}
                                            alt={user.fullName}
                                            className="h-10 w-10 rounded-full"
                                        />
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {user.fullName}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {user.uniqueId}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                        className="border border-gray-300 rounded px-2 py-1"
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={user.plan}
                                        onChange={(e) => handlePlanChange(user._id, e.target.value)}
                                        className="border border-gray-300 rounded px-2 py-1"
                                    >
                                        <option value="iron">Iron</option>
                                        <option value="gold">Gold</option>
                                        <option value="diamond">Diamond</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => handleDeleteUser(user._id)}
                                        className="text-red-600 hover:text-red-900 ml-4"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
```

### Premium Plan Management Component

```jsx
// frontend/src/components/admin/PlanManagement.jsx
import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';

const PlanManagement = () => {
    const [requests, setRequests] = useState([]);
    const [planStats, setPlanStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchPlanRequests();
        fetchPlanStats();
    }, [page, statusFilter]);

    const fetchPlanRequests = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('/api/admin/plan-requests', {
                params: { page, status: statusFilter, limit: 10 }
            });
            setRequests(response.data.requests);
        } catch (error) {
            console.error('Failed to fetch plan requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlanStats = async () => {
        try {
            const response = await axiosInstance.get('/api/admin/plan-stats');
            setPlanStats(response.data);
        } catch (error) {
            console.error('Failed to fetch plan stats:', error);
        }
    };

    const handleRequestAction = async (requestId, status, adminNotes = '') => {
        try {
            await axiosInstance.put(`/api/admin/plan-requests/${requestId}`, {
                status,
                adminNotes
            });
            fetchPlanRequests(); // Refresh the list
            fetchPlanStats(); // Refresh stats
        } catch (error) {
            console.error('Failed to update request:', error);
        }
    };

    const getPlanBadgeColor = (plan) => {
        const colors = {
            iron: 'bg-gray-100 text-gray-800',
            gold: 'bg-yellow-100 text-yellow-800',
            diamond: 'bg-blue-100 text-blue-800'
        };
        return colors[plan] || 'bg-gray-100 text-gray-800';
    };

    const getStatusBadgeColor = (status) => {
        const colors = {
            pending: 'bg-orange-100 text-orange-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className=\"space-y-6\">
            <div className=\"flex justify-between items-center\">
                <h1 className=\"text-3xl font-bold text-gray-900\">Premium Plan Management</h1>
            </div>

            {/* Plan Statistics */}
            {planStats && (
                <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6\">
                    <div className=\"bg-white p-6 rounded-lg shadow\">
                        <h3 className=\"text-sm font-medium text-gray-500\">Pending Requests</h3>
                        <p className=\"text-2xl font-bold text-orange-600\">{planStats.pendingRequests}</p>
                    </div>
                    
                    <div className=\"bg-white p-6 rounded-lg shadow\">
                        <h3 className=\"text-sm font-medium text-gray-500\">Iron Users</h3>
                        <p className=\"text-2xl font-bold text-gray-600\">{planStats.usersByPlan.iron}</p>
                    </div>
                    
                    <div className=\"bg-white p-6 rounded-lg shadow\">
                        <h3 className=\"text-sm font-medium text-gray-500\">Gold Users</h3>
                        <p className=\"text-2xl font-bold text-yellow-600\">{planStats.usersByPlan.gold}</p>
                    </div>
                    
                    <div className=\"bg-white p-6 rounded-lg shadow\">
                        <h3 className=\"text-sm font-medium text-gray-500\">Diamond Users</h3>
                        <p className=\"text-2xl font-bold text-blue-600\">{planStats.usersByPlan.diamond}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className=\"bg-white p-4 rounded-lg shadow\">
                <label className=\"block text-sm font-medium text-gray-700 mb-2\">
                    Filter by Status:
                </label>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className=\"border border-gray-300 rounded px-3 py-2\"
                >
                    <option value=\"all\">All Requests</option>
                    <option value=\"pending\">Pending</option>
                    <option value=\"approved\">Approved</option>
                    <option value=\"rejected\">Rejected</option>
                </select>
            </div>

            {/* Plan Requests Table */}
            <div className=\"bg-white rounded-lg shadow overflow-hidden\">
                <table className=\"w-full\">
                    <thead className=\"bg-gray-50\">
                        <tr>
                            <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase\">User</th>
                            <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Requested Plan</th>
                            <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Status</th>
                            <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Date</th>
                            <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Actions</th>
                        </tr>
                    </thead>
                    <tbody className=\"divide-y divide-gray-200\">
                        {requests.map((request) => (
                            <tr key={request._id}>
                                <td className=\"px-6 py-4 whitespace-nowrap\">
                                    <div className=\"flex items-center\">
                                        <img
                                            src={request.userId.imageUrl}
                                            alt={request.userId.fullName}
                                            className=\"h-10 w-10 rounded-full\"
                                        />
                                        <div className=\"ml-4\">
                                            <div className=\"text-sm font-medium text-gray-900\">
                                                {request.userId.fullName}
                                            </div>
                                            <div className=\"text-sm text-gray-500\">
                                                {request.userId.uniqueId}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className=\"px-6 py-4 whitespace-nowrap\">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(request.requestedPlan)}`}>
                                        {request.requestedPlan.toUpperCase()}
                                    </span>
                                </td>
                                <td className=\"px-6 py-4 whitespace-nowrap\">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(request.status)}`}>
                                        {request.status}
                                    </span>
                                </td>
                                <td className=\"px-6 py-4 whitespace-nowrap text-sm text-gray-500\">
                                    {new Date(request.createdAt).toLocaleDateString()}
                                </td>
                                <td className=\"px-6 py-4 whitespace-nowrap text-sm font-medium\">
                                    {request.status === 'pending' && (
                                        <div className=\"space-x-2\">
                                            <button
                                                onClick={() => handleRequestAction(request._id, 'approved')}
                                                className=\"text-green-600 hover:text-green-900\"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const notes = prompt('Rejection reason (optional):');
                                                    handleRequestAction(request._id, 'rejected', notes || '');
                                                }}
                                                className=\"text-red-600 hover:text-red-900\"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                    {request.status !== 'pending' && (
                                        <span className=\"text-gray-500\">
                                            {request.status === 'approved' ? 'Approved' : 'Rejected'}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Request Details Modal would go here */}
            {requests.length === 0 && (
                <div className=\"bg-white p-8 rounded-lg shadow text-center\">
                    <p className=\"text-gray-500\">No plan requests found.</p>
                </div>
            )}
        </div>
    );
};

export default PlanManagement;
```

### Song Request Management Component

```jsx
// frontend/src/components/admin/SongManagement.jsx
import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';

const SongManagement = () => {
    const [songRequests, setSongRequests] = useState([]);
    const [songStats, setSongStats] = useState(null);
    const [duplicates, setDuplicates] = useState([]);
    const [showDuplicates, setShowDuplicates] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedSongs, setSelectedSongs] = useState([]);
    const [filters, setFilters] = useState({
        status: 'all',
        minPlayCount: 2,
        sortBy: 'playCount',
        order: 'desc',
        page: 1
    });

    useEffect(() => {
        fetchSongRequests();
        fetchSongStats();
    }, [filters]);

    const fetchSongRequests = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('/api/admin/song-requests', {
                params: { ...filters, limit: 20 }
            });
            setSongRequests(response.data.requests);
        } catch (error) {
            console.error('Failed to fetch song requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSongStats = async () => {
        try {
            const response = await axiosInstance.get('/api/admin/song-stats');
            setSongStats(response.data);
        } catch (error) {
            console.error('Failed to fetch song stats:', error);
        }
    };

    const fetchDuplicates = async () => {
        try {
            const response = await axiosInstance.get('/api/admin/song-duplicates');
            setDuplicates(response.data.duplicates);
        } catch (error) {
            console.error('Failed to fetch duplicates:', error);
        }
    };

    const handleSongAction = async (songId, isChecked, priority = 'medium', notes = '') => {
        try {
            await axiosInstance.put(`/api/admin/song-requests/${songId}`, {
                isChecked,
                priority,
                adminNotes: notes
            });
            fetchSongRequests(); // Refresh the list
            fetchSongStats(); // Refresh stats
        } catch (error) {
            console.error('Failed to update song:', error);
        }
    };

    const handleBulkAction = async (action, priority = 'medium') => {
        try {
            await axiosInstance.post('/api/admin/song-requests/bulk', {
                songIds: selectedSongs,
                action,
                priority
            });
            setSelectedSongs([]); // Clear selection
            fetchSongRequests();
            fetchSongStats();
        } catch (error) {
            console.error('Failed to bulk update:', error);
        }
    };

    const handleMergeDuplicates = async (keepId, mergeIds) => {
        try {
            await axiosInstance.post('/api/admin/song-duplicates/merge', {
                keepId,
                mergeIds
            });
            fetchDuplicates();
            fetchSongRequests();
            fetchSongStats();
        } catch (error) {
            console.error('Failed to merge duplicates:', error);
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getPriorityColor = (priority) => {
        const colors = {
            low: 'bg-gray-100 text-gray-800',
            medium: 'bg-blue-100 text-blue-800',
            high: 'bg-orange-100 text-orange-800',
            urgent: 'bg-red-100 text-red-800'
        };
        return colors[priority] || 'bg-gray-100 text-gray-800';
    };

    const handleSelectSong = (songId) => {
        setSelectedSongs(prev => 
            prev.includes(songId) 
                ? prev.filter(id => id !== songId)
                : [...prev, songId]
        );
    };

    const handleSelectAll = () => {
        if (selectedSongs.length === songRequests.length) {
            setSelectedSongs([]);
        } else {
            setSelectedSongs(songRequests.map(song => song._id));
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Song Request Management</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={() => {
                            setShowDuplicates(!showDuplicates);
                            if (!showDuplicates) fetchDuplicates();
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg ${
                            showDuplicates 
                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                    >
                        {showDuplicates ? 'Hide Duplicates' : 'Check Duplicates'}
                    </button>
                </div>
            </div>

            {/* Statistics */}
            {songStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">Total Requests</h3>
                        <p className="text-2xl font-bold text-gray-900">{songStats.totalRequests}</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">Pending Review</h3>
                        <p className="text-2xl font-bold text-orange-600">{songStats.pendingRequests}</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">Checked Songs</h3>
                        <p className="text-2xl font-bold text-green-600">{songStats.checkedRequests}</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">High Priority</h3>
                        <p className="text-2xl font-bold text-red-600">{songStats.highPriorityRequests}</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">Popular Songs</h3>
                        <p className="text-2xl font-bold text-blue-600">{songStats.popularSongs}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({...filters, status: e.target.value})}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                            <option value="all">All Songs</option>
                            <option value="pending">Pending Review</option>
                            <option value="checked">Checked</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Min Play Count</label>
                        <input
                            type="number"
                            min="1"
                            value={filters.minPlayCount}
                            onChange={(e) => setFilters({...filters, minPlayCount: e.target.value})}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                        <select
                            value={filters.sortBy}
                            onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                            <option value="playCount">Play Count</option>
                            <option value="lastPlayed">Last Played</option>
                            <option value="createdAt">Date Added</option>
                            <option value="title">Title</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                        <select
                            value={filters.order}
                            onChange={(e) => setFilters({...filters, order: e.target.value})}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                            <option value="desc">High to Low</option>
                            <option value="asc">Low to High</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedSongs.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">
                            {selectedSongs.length} songs selected
                        </span>
                        <div className="space-x-2">
                            <button
                                onClick={() => handleBulkAction('check', 'high')}
                                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                                Mark as High Priority
                            </button>
                            <button
                                onClick={() => handleBulkAction('check', 'medium')}
                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                                Mark as Checked
                            </button>
                            <button
                                onClick={() => handleBulkAction('uncheck')}
                                className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                            >
                                Uncheck
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Songs Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={selectedSongs.length === songRequests.length && songRequests.length > 0}
                                    onChange={handleSelectAll}
                                    className="rounded border-gray-300"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Song</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plays</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deezer ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {songRequests.map((song) => (
                            <tr key={song._id} className={song.isChecked ? 'bg-green-50' : ''}>
                                <td className="px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedSongs.includes(song._id)}
                                        onChange={() => handleSelectSong(song._id)}
                                        className="rounded border-gray-300"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <img
                                            src={song.imageUrl || '/default-album.png'}
                                            alt={song.title}
                                            className="h-12 w-12 rounded object-cover"
                                        />
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{song.title}</div>
                                            <div className="text-sm text-gray-500">{song.artist}</div>
                                            <div className="text-xs text-gray-400">
                                                {song.album} • {formatDuration(song.duration)}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{song.playCount}</div>
                                    <div className="text-xs text-gray-500">
                                        Last: {new Date(song.lastPlayed).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(song.priority)}`}>
                                        {song.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">{song.deezerId}</code>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        song.isChecked 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-orange-100 text-orange-800'
                                    }`}>
                                        {song.isChecked ? 'Checked' : 'Pending'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="space-x-2">
                                        {!song.isChecked ? (
                                            <>
                                                <button
                                                    onClick={() => handleSongAction(song._id, true, 'high')}
                                                    className="text-red-600 hover:text-red-900 text-xs"
                                                >
                                                    High Priority
                                                </button>
                                                <button
                                                    onClick={() => handleSongAction(song._id, true, 'medium')}
                                                    className="text-green-600 hover:text-green-900 text-xs"
                                                >
                                                    Check
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleSongAction(song._id, false)}
                                                className="text-gray-600 hover:text-gray-900 text-xs"
                                            >
                                                Uncheck
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                const notes = prompt('Add notes:', song.adminNotes);
                                                if (notes !== null) {
                                                    handleSongAction(song._id, song.isChecked, song.priority, notes);
                                                }
                                            }}
                                            className="text-blue-600 hover:text-blue-900 text-xs"
                                        >
                                            Notes
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {songRequests.length === 0 && (
                <div className="bg-white p-8 rounded-lg shadow text-center">
                    <p className="text-gray-500">No song requests found matching your criteria.</p>
                </div>
            )}
        </div>
    );
};

export default SongManagement;
```

## 4. Basic Security Implementation

### Simple Input Validation

```javascript
// backend/src/middleware/validation.middleware.js
export const validateUserRoleUpdate = (req, res, next) => {
    const { role } = req.body;
    
    if (!role || !['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'user' or 'admin'" });
    }
    
    next();
};

export const validateMongoId = (req, res, next) => {
    const { id } = req.params;
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }
    
    next();
};
```

### Basic Error Handling

```javascript
// backend/src/middleware/errorHandler.middleware.js
export const basicErrorHandler = (err, req, res, next) => {
    console.error('Admin Panel Error:', err.message);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            message: 'Validation failed',
            details: err.message
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            message: 'Invalid ID format'
        });
    }

    res.status(500).json({
        message: 'Internal server error'
    });
};
```

## 5. Easy Integration Setup

### Create Required Component Files

First, create the directory structure and component files:

```bash
# Create admin components directory
mkdir -p frontend\src\components\admin
mkdir -p frontend\src\pages

# Create the component files (you'll copy the code from this guide into these files)
# frontend/src/components/AdminRoute.jsx
# frontend/src/components/admin/AdminSidebar.jsx  
# frontend/src/components/admin/AdminStats.jsx
# frontend/src/components/admin/UserManagement.jsx
# frontend/src/components/admin/PlanManagement.jsx
# frontend/src/components/admin/SongManagement.jsx
# frontend/src/pages/AdminDashboard.jsx
```

### Update Your User Model

```javascript
// Add to backend/src/models/user.model.js
// Just add these two fields to your existing userSchema:

role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
},
isAdmin: {
    type: Boolean,
    default: false
}
```

### Update Main Server File

```javascript
// backend/src/index.js - Add these imports and middleware
import adminRoutes from "./routes/admin.route.js";
import { basicErrorHandler } from "./middleware/errorHandler.middleware.js";

// Add admin routes (add this line with your other routes)
app.use("/api/admin", adminRoutes);

// Update error handler (place at the very end, after all other middleware)
app.use(basicErrorHandler);
```

### Update Frontend Router

```jsx
// frontend/src/App.jsx - Add admin route
import AdminDashboard from './pages/AdminDashboard';

// Add this route inside your SignedIn Routes:
<Route path="/admin/*" element={<AdminDashboard />} />
```

### Set Yourself as Admin

```javascript
// Run this in your MongoDB console or create a simple script
// Replace 'your-clerk-id-here' with your actual Clerk ID

db.users.updateOne(
    { clerkId: 'your-clerk-id-here' },
    { 
        $set: { 
            role: 'admin',
            isAdmin: true
        }
    }
);
```

## 6. Quick Setup Steps

1. **Add Admin Fields to User Model** - Update the user schema
2. **Create Admin Controller & Routes** - Copy the controller and routes code
3. **Add Admin Middleware** - Copy the basic middleware functions  
4. **Create Frontend Components** - Add the React components
5. **Update Your Routes** - Add admin routes to your main files
6. **Set Admin Role** - Make yourself an admin in the database

## 7. Access Your Admin Panel

1. Start your application
2. Sign in with your account
3. Navigate to `/admin` in your browser
4. You should see your admin dashboard!

### Troubleshooting Common Issues

**White Screen / Import Errors:**
1. **Create component files**: Make sure all component files exist in the correct directories
2. **Check exports**: Each component file must end with `export default ComponentName;`
3. **Verify imports**: Check that all import paths match your file structure
4. **React Icons**: Install react-icons if not already installed: `npm install react-icons`

**Missing Icons Error:**
```bash
npm install react-icons
```

**File Structure Check:**
```
frontend/src/
├── components/
│   ├── AdminRoute.jsx
│   └── admin/
│       ├── AdminSidebar.jsx
│       ├── AdminStats.jsx
│       ├── UserManagement.jsx
│       ├── PlanManagement.jsx
│       └── SongManagement.jsx
└── pages/
    └── AdminDashboard.jsx
```

### Integration with Song Controller

```javascript
// backend/src/controller/song.controller.js
// Add this import at the top
import { trackSongRequest } from './admin.controller.js';

// In your existing song play/stream function, add this tracking:
export const playSong = async (req, res) => {
    try {
        const { deezerId } = req.params;
        
        // Validate Deezer ID format
        if (!deezerId || typeof deezerId !== 'string') {
            return res.status(400).json({ message: "Valid Deezer ID required" });
        }
        
        // Your existing song logic here...
        const song = await Song.findOne({ deezerId });
        
        // If song is preview-only (not in Google Drive), track it
        if (!song || song.isPreviewOnly) {
            // Validate song data before tracking
            const songData = {
                title: song?.title || req.body.title,
                artist: song?.artist || req.body.artist,
                album: song?.album || req.body.album,
                duration: song?.duration || req.body.duration,
                imageUrl: song?.imageUrl || req.body.imageUrl
            };
            
            // Only track if we have valid title and artist
            if (songData.title && songData.artist) {
                // Track this song request for admin review (with duplicate prevention)
                await trackSongRequest(deezerId, songData);
            }
        }
        
        // Continue with your existing song streaming logic
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Failed to play song" });
    }
};
```

## 8. Features You'll Have

✅ **Dashboard**: Overview stats and recent activity  
✅ **User Management**: View, search, and manage all users  
✅ **Role Management**: Change user roles between user/admin  
✅ **Plan Management**: Manage user premium plans (Iron/Gold/Diamond)  
✅ **Plan Requests**: Review and approve/deny premium plan requests  
✅ **Plan Statistics**: Track premium plan distribution and requests  
✅ **Song Content Management**: Track popular preview-only songs  
✅ **Song Priority System**: Mark songs for download with priority levels  
✅ **Auto-Tracking**: Automatically track songs played more than once  
✅ **Duplicate Prevention**: Robust duplicate detection and merging system  
✅ **Bulk Operations**: Mass check/uncheck songs for download  
✅ **Download Queue**: Organized list of songs to download and add to Drive  
✅ **Song Analytics**: View play counts, priorities, and download status  
✅ **User Deletion**: Remove users from the platform  
✅ **Secure Access**: Only admins can access the panel  
✅ **Clean UI**: Professional-looking admin interface

## 9. Song Content Workflow

### How it Works:
1. **Auto-Detection**: When users play songs not in Google Drive (preview-only), they get automatically tracked
2. **Duplicate Prevention**: Uses atomic upsert operations to prevent duplicate entries by Deezer ID
3. **Play Count**: System increments play count each time the same song is played
4. **Data Validation**: Validates song data before tracking to ensure quality
5. **Admin Review**: Songs with >1 plays appear in the admin song management section
6. **Duplicate Detection**: Admin can check for potential duplicates by title/artist similarity
7. **Prioritization**: Admin can mark songs as Low/Medium/High/Urgent priority
8. **Download Queue**: Checked songs create a clear download list for manual processing
9. **Status Tracking**: Track which songs have been downloaded and added to Drive

### Admin Workflow:
1. Check **Song Requests** section in admin panel
2. Filter by play count (songs played 2+ times)
3. Sort by popularity or last played date  
4. Review song details (title, artist, Deezer ID, play count)
5. Mark high-demand songs for download
6. Use bulk actions for efficient processing
7. Add notes for tracking download status
8. Update priority based on user demand

## 10. Database Schema

### Song Request Tracking Table:
- **deezerId**: Unique identifier from Deezer API
- **title, artist, album**: Song metadata
- **playCount**: Number of times played by users
- **isChecked**: Admin has marked for download
- **priority**: Download priority (low/medium/high/urgent)
- **adminNotes**: Admin notes for tracking
- **lastPlayed**: Most recent play timestamp
- **isDownloaded**: Whether song has been added to Drive

## 11. Customization Ideas

### How it Works:
1. **Auto-Detection**: When users play songs not in Google Drive (preview-only), they get automatically tracked
2. **Play Count**: System increments play count each time the same song is played
3. **Admin Review**: Songs with >1 plays appear in the admin song management section
4. **Prioritization**: Admin can mark songs as Low/Medium/High/Urgent priority
5. **Download Queue**: Checked songs create a clear download list for manual processing
6. **Status Tracking**: Track which songs have been downloaded and added to Drive

### Admin Workflow:
1. Check **Song Requests** section in admin panel
2. Filter by play count (songs played 2+ times)
3. Sort by popularity or last played date  
4. Review song details (title, artist, Deezer ID, play count)
5. Mark high-demand songs for download
6. Use bulk actions for efficient processing
7. Add notes for tracking download status
8. Update priority based on user demand

## 10. Database Schema

### Song Request Tracking Table:
- **deezerId**: Unique identifier from Deezer API
- **title, artist, album**: Song metadata
- **playCount**: Number of times played by users
- **isChecked**: Admin has marked for download
- **priority**: Download priority (low/medium/high/urgent)
- **adminNotes**: Admin notes for tracking
- **lastPlayed**: Most recent play timestamp
- **isDownloaded**: Whether song has been added to Drive

## 11. Customization Ideas

- Add content management for songs/playlists
- Add user activity logs and detailed analytics
- Add system health monitoring
- Add bulk user operations (bulk plan updates, etc.)
- Add admin announcements and notifications
- Add user statistics and revenue charts
- Add plan revenue tracking and analytics
- Add automated plan renewal reminders
- Add plan usage analytics and insights
- Add automated download scheduling for high-priority songs
- Add integration with music download APIs
- Add song quality preferences (320kbps, FLAC, etc.)
- Add artist/genre analytics for content strategy
- Add user listening pattern analysis
- Add song recommendation engine based on popular requests
- Add automatic Google Drive integration for uploads
- Add song duplicate detection and management

This admin panel gives you comprehensive control over your music streaming platform including user management, premium plan administration, song content management with robust duplicate prevention, and business analytics - perfect for showcasing full-stack development skills in a resume project!

## 🔒 **Duplicate Prevention Summary**

The song tracking system now includes multiple layers of duplicate prevention:

**🛡️ Database Level:**
- Unique indexes on `deezerId` field
- Compound indexes for efficient querying
- Automatic constraint enforcement

**⚡ Application Level:**
- Atomic upsert operations (findOneAndUpdate with upsert)
- Input validation before tracking
- Graceful error handling for race conditions
- Fallback mechanisms for duplicate key errors

**🎯 Admin Tools:**
- Duplicate detection by title/artist similarity
- Visual duplicate management interface  
- Smart merging that combines play counts
- Bulk operations for efficient management

**✅ Key Benefits:**
- **No Duplicate Entries**: Deezer ID uniqueness guaranteed
- **Accurate Play Counts**: Atomic operations prevent race conditions  
- **Data Quality**: Validation ensures clean data entry
- **Easy Management**: Admin UI for handling edge cases
- **Performance**: Proper indexing for fast queries
- **Reliability**: Error handling prevents system failures

This ensures your song request tracking remains clean and accurate while scaling efficiently!