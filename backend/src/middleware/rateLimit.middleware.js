import { getAuth } from "@clerk/express";
import { User } from "../models/user.model.js";
import { RateUsage } from "../models/rateUsage.model.js";

// ─── Tier Limits Configuration ───────────────────────────────────────
const TIER_LIMITS = {
    iron: { searches: 20, streams: 20, aiMessages: 2 }, // Default/Basic Plan
    gold: { searches: 50, streams: 100, aiMessages: 10 },
    diamond: { searches: 100, streams: 500, aiMessages: 50 }, // High limit for personal use
    test: { searches: Infinity, streams: 200, aiMessages: Infinity },
};




// Cooldowns in milliseconds
const COOLDOWNS = {
    search: 6000,   // 5 seconds between searches
    stream: 500,    // 0.5s cooldown (prevent rapid-fire but allow skipping)
    aiMessage: 4000,   // no cooldown for AI messages
};

// Map action types to the RateUsage field names
const ACTION_FIELD_MAP = {
    search: 'searches',
    stream: 'streams',
    aiMessage: 'aiMessages',
};

const COOLDOWN_FIELD_MAP = {
    search: 'lastSearchAt',
    stream: 'lastStreamAt',
};

// ─── Helper: Get today's date string ─────────────────────────────────
const getTodayString = () => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
};

// ─── Helper: Get or create today's usage record ──────────────────────
const getOrCreateUsage = async (clerkId) => {
    const today = getTodayString();
    let usage = await RateUsage.findOne({ clerkId, date: today });

    if (!usage) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Auto-expire in 7 days
        usage = await RateUsage.create({ clerkId, date: today, expiresAt });
    }

    return usage;
};

// ─── Helper: Check if user plan has expired ──────────────────────────
const getEffectivePlan = async (user) => {
    if (!user) return 'iron'; // Default to iron for unauthenticated

    const plan = user.plan || 'iron';

    // Check if plan has expired
    if (user.planExpiresAt && new Date() > new Date(user.planExpiresAt)) {
        // Plan expired — revert to iron
        await User.findByIdAndUpdate(user._id, {
            plan: 'iron',
            planExpiresAt: null,
        });
        return 'iron';
    }

    return plan;
};


// ─── Rate Limiter Middleware Factory ─────────────────────────────────
export const rateLimiter = (actionType) => {
    return async (req, res, next) => {
        try {
            const { userId: clerkId } = getAuth(req);
            if (!clerkId) {
                // No auth — allow request through without rate limiting
                // (some routes like song streaming are public)
                return next();
            }

            // Get user and determine effective plan
            const user = await User.findOne({ clerkId });
            const plan = await getEffectivePlan(user);
            const limits = TIER_LIMITS[plan] || TIER_LIMITS.iron;


            // Get the field name for this action
            const field = ACTION_FIELD_MAP[actionType];
            if (!field) {
                return next(); // Unknown action type, let it through
            }

            // Get daily limit for this action
            const dailyLimit = limits[field];

            // Test tier with Infinity limit — skip all checks
            if (dailyLimit === Infinity) {
                return next();
            }

            // Check if this action is allowed at all (e.g., free tier can't stream)
            if (dailyLimit === 0) {
                return res.status(429).json({
                    message: `Your ${plan} plan does not include this feature. Upgrade your plan to access it.`,
                    limitType: 'feature_locked',
                    plan,
                });
            }

            // Get today's usage
            const usage = await getOrCreateUsage(clerkId);
            const currentCount = usage[field] || 0;

            // Check daily limit
            // For streams, check if this is a Range request (seeking/buffering)
            // If it is a range request starting > 0, we don't count it as a new stream usage
            let shouldIncrement = true;
            if (actionType === 'stream' && req.headers.range) {
                const rangeStart = parseInt(req.headers.range.replace(/bytes=/, "").split("-")[0], 10);
                if (!isNaN(rangeStart) && rangeStart > 0) {
                    shouldIncrement = false;
                }
            }

            if (currentCount >= dailyLimit && shouldIncrement) {
                return res.status(429).json({
                    message: actionType === 'stream'
                        ? "Daily streaming limit reached — previews still available."
                        : actionType === 'aiMessage'
                            ? "Daily AI limit reached. Try again tomorrow."
                            : "Daily limit reached. Try again tomorrow.",
                    limitType: 'daily_limit',
                    plan,
                    used: currentCount,
                    limit: dailyLimit,
                });
            }

            // Check cooldown
            const cooldownMs = COOLDOWNS[actionType] || 0;
            if (cooldownMs > 0 && shouldIncrement) { // Only force cooldown on new streams? Or all? Let's say all for DOS protection
                const cooldownField = COOLDOWN_FIELD_MAP[actionType];
                if (cooldownField && usage[cooldownField]) {
                    const elapsed = Date.now() - new Date(usage[cooldownField]).getTime();
                    if (elapsed < cooldownMs) {
                        const waitSec = Math.ceil((cooldownMs - elapsed) / 1000);
                        return res.status(429).json({
                            message: `Please wait ${waitSec} second${waitSec > 1 ? 's' : ''} before trying again.`,
                            limitType: 'cooldown',
                            retryAfterMs: cooldownMs - elapsed,
                        });
                    }
                }
            }

            // Update cooldown timestamp
            const cooldownField = COOLDOWN_FIELD_MAP[actionType];
            if (cooldownField && shouldIncrement) {
                updateFields.$set = { [cooldownField]: new Date() };
                updateFields.$inc = { [field]: 1 };
            } else if (shouldIncrement) {
                updateFields.$inc = { [field]: 1 };
            }

            // Execute update
            await RateUsage.updateOne(
                { clerkId, date: getTodayString() },
                updateFields
            );


            // Attach usage info to request for downstream use
            req.rateLimit = {
                plan,
                used: currentCount + 1,
                limit: dailyLimit,
                remaining: dailyLimit - currentCount - 1,
            };

            next();
        } catch (error) {
            console.error("Rate limiter error:", error);
            // Don't block the request on rate limiter failure
            next();
        }
    };
};

// ─── Get Usage Stats (for /api/users/usage endpoint) ─────────────────
export const getUserUsageStats = async (req, res) => {
    try {
        const { userId: clerkId } = getAuth(req);
        if (!clerkId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await User.findOne({ clerkId });
        const plan = await getEffectivePlan(user);
        const limits = TIER_LIMITS[plan] || TIER_LIMITS.iron;

        const usage = await getOrCreateUsage(clerkId);

        res.json({
            plan,
            planExpiresAt: user?.planExpiresAt || null,
            today: {
                searches: { used: usage.searches, limit: limits.searches },
                streams: { used: usage.streams, limit: limits.streams },
                aiMessages: { used: usage.aiMessages, limit: limits.aiMessages },
            },
        });
    } catch (error) {
        console.error("Error fetching usage stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
