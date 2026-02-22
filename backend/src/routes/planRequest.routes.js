import { Router } from "express";
import {
    createPlanRequest,
    getUserPlanRequests,
    getPlanRequests,
    updatePlanRequestStatus
} from "../controller/planRequest.controller.js";
import { requireAuth } from "@clerk/express";

const router = Router();

// User routes
router.post("/request", requireAuth(), createPlanRequest);
router.get("/my-requests", requireAuth(), getUserPlanRequests);

// Admin routes (TODO: Add admin middleware)
// Admin routes (TODO: Add admin middleware)
router.get("/pending", requireAuth(), getPlanRequests);
router.patch("/:id/status", requireAuth(), updatePlanRequestStatus);

export default router;
