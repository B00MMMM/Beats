import express from "express";
import { protectRoute, requireAdminRole } from "../middleware/auth.middleware.js";
import {
    getDashboardStats,
    getAllUsers,
    updateUserRole,
    deleteUser,
    getRecentActivity,
    getPlanStats,
    updateUserPlan,
    getSongRequests,
    updateSongRequestStatus,
    getSongStats,
    findDuplicateSongs,
    mergeDuplicateSongs,
    bulkUpdateSongRequests
} from "../controller/admin.controller.js";
import { getPlanRequests, updatePlanRequestStatus } from "../controller/planRequest.controller.js";

const router = express.Router();

// Apply admin middleware to all routes
router.use(protectRoute, requireAdminRole);

// Dashboard
router.get("/stats", getDashboardStats);
router.get("/activity", getRecentActivity);

// User Management
router.get("/users", getAllUsers);
router.put("/users/:userId/role", updateUserRole);
router.delete("/users/:userId", deleteUser);
router.put("/users/:userId/plan", updateUserPlan);

// Plan Requests
router.get("/plan-stats", getPlanStats);
router.get("/plan-requests", getPlanRequests);
router.put("/plan-requests/:id", updatePlanRequestStatus); // Re-using controller logic but creating admin route aliases if needed, or referencing direct

// Song Management
router.get("/song-requests", getSongRequests);
router.put("/song-requests/:id", updateSongRequestStatus);
router.get("/song-stats", getSongStats);
router.get("/song-duplicates", findDuplicateSongs);
router.post("/song-duplicates/merge", mergeDuplicateSongs);
// router.post("/song-requests/bulk", bulkUpdateSongRequests); // TODO: Implement in frontend if needed

router.get("/verify", (req, res) => {
    res.json({ isAdmin: true, user: req.adminUser });
});

export default router;
