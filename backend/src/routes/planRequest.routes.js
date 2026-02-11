import { Router } from "express";
import {
    createPlanRequest,
    getUserPlanRequests,
    getPendingRequests,
    updateRequestStatus
} from "../controller/planRequest.controller.js";
import { requireAuth } from "@clerk/express";

const router = Router();

// User routes
router.post("/request", requireAuth(), createPlanRequest);
router.get("/my-requests", requireAuth(), getUserPlanRequests);

// Admin routes (TODO: Add admin middleware)
router.get("/pending", requireAuth(), getPendingRequests);
router.patch("/:id/status", requireAuth(), updateRequestStatus);

export default router;
