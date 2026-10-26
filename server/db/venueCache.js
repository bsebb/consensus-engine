const crypto = require('crypto');
const { prisma } = require('./prismaClient');

// In-memory cache for fast lookups
const venueInsightsCache = new Map();
let communityAnalyticsMapCache = { map: null, expiresAt: 0 };

async function ensureRoomPersisted(pin) {
    const helpers = require('./helpers');
    if (typeof helpers.ensureRoomPersisted === 'function') {
        await helpers.ensureRoomPersisted(pin);
    }
}

function deriveRoomParticipantUuid(roomId, participantId) {
    const hash = crypto.createHash('md5').update(`${roomId}:${participantId}`).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function invalidateVenueInsightsCache(venueName) {
    communityAnalyticsMapCache.expiresAt = 0;
    if (venueName && typeof venueName === 'string') {
        venueInsightsCache.delete(venueName.toLowerCase().trim());
    } else {
        venueInsightsCache.clear();
    }
}

async function getCachedVenuesByGrid(gridKey, limit = 50) {
    if (!gridKey || !prisma?.cachedVenue) return [];
    try {
        return await prisma.cachedVenue.findMany({
            where: { gridKey: String(gridKey) },
            take: limit,
        });
    } catch {
        return [];
    }
}

async function saveCachedVenuesBulk(gridKey, places = []) {
    if (!gridKey || !Array.isArray(places) || places.length === 0 || !prisma?.cachedVenue) return;
    try {
        const records = places
            .filter((p) => p && p.name && p.lat != null && p.lng != null)
            .map((p) => {
                const normName = String(p.name).toLowerCase().trim().replace(/[^a-z0-9\u00C0-\u024F\u0400-\u04FF]+/g, '_');
                const placeKey = `${gridKey}:${normName}`.slice(0, 140);
                const rawPhoto = typeof p.photo_url === 'string'
                    ? p.photo_url
                    : (p.photo_url && typeof p.photo_url.photo_url === 'string' ? p.photo_url.photo_url : null);
                return {
                    gridKey: String(gridKey),
                    placeKey,
                    name: String(p.name).slice(0, 120),
                    category: String(p.category || 'Restaurant').slice(0, 80),
                    address: p.address ? String(p.address).slice(0, 180) : null,
                    locality: p.locality ? String(p.locality).slice(0, 80) : null,
                    lat: Number(p.lat),
                    lng: Number(p.lng),
                    priceLevel: typeof p.priceLevel === 'number' ? p.priceLevel : 2,
                    rating: typeof p.rating === 'number' ? p.rating : 4.5,
                    reviews: typeof p.reviews === 'number' ? p.reviews : 120,
                    photoUrl: rawPhoto ? String(rawPhoto).slice(0, 500) : null,
                };
            });
        if (records.length === 0) return;
        await prisma.cachedVenue.createMany({
            data: records,
            skipDuplicates: true,
        });
    } catch {
        // Non-fatal background cache persistence
    }
}

async function getVenueCommunityInsights(venueName) {
    const cleanName = String(venueName || '').trim();
    if (!cleanName) {
        return { found: false, totalReviews: 0, satisfactionAvg: null, priceAccuracyAvg: null, recentReviews: [] };
    }
    const cacheKey = cleanName.toLowerCase();
    const cached = venueInsightsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    try {
        const [feedbacks, analyticsRows] = await Promise.all([
            prisma.feedback.findMany({
                where: {
                    option: {
                        name: { equals: cleanName, mode: 'insensitive' },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 25,
                select: {
                    id: true,
                    satisfactionScore: true,
                    priceAccuracyScore: true,
                    comment: true,
                    createdAt: true,
                },
            }),
            prisma.venueAnalytics.findMany({
                where: {
                    name: { equals: cleanName, mode: 'insensitive' },
                },
            }),
        ]);

        let totalReviews = feedbacks.length;
        let satisfactionAvg = null;
        let priceAccuracyAvg = null;

        if (feedbacks.length > 0) {
            const satSum = feedbacks.reduce((acc, f) => acc + (Number(f.satisfactionScore) || 5), 0);
            const priceSum = feedbacks.reduce((acc, f) => acc + (Number(f.priceAccuracyScore) || 5), 0);
            satisfactionAvg = Number((satSum / feedbacks.length).toFixed(1));
            priceAccuracyAvg = Number((priceSum / feedbacks.length).toFixed(1));
        }

        if (analyticsRows.length > 0) {
            const analyticsTotal = analyticsRows.reduce((acc, a) => acc + (Number(a.totalReviews) || 0), 0);
            if (analyticsTotal > totalReviews) {
                const weightedSat = analyticsRows.reduce((acc, a) => acc + (Number(a.satisfactionAvg) || 5) * (Number(a.totalReviews) || 1), 0);
                const weightedPrice = analyticsRows.reduce((acc, a) => acc + (Number(a.truePriceAvg) || 5) * (Number(a.totalReviews) || 1), 0);
                totalReviews = analyticsTotal;
                satisfactionAvg = Number((weightedSat / analyticsTotal).toFixed(1));
                priceAccuracyAvg = Number((weightedPrice / analyticsTotal).toFixed(1));
            }
        }

        const recentReviews = feedbacks
            .slice(0, 6)
            .map((f) => ({
                id: f.id,
                satisfactionScore: f.satisfactionScore,
                priceAccuracyScore: f.priceAccuracyScore,
                comment: f.comment || null,
                createdAt: f.createdAt,
            }));

        const data = {
            found: totalReviews > 0,
            venueName: cleanName,
            totalReviews,
            satisfactionAvg,
            priceAccuracyAvg,
            recentReviews,
        };

        venueInsightsCache.set(cacheKey, { data, expiresAt: Date.now() + 60000 });
        return data;
    } catch {
        return { found: false, totalReviews: 0, satisfactionAvg: null, priceAccuracyAvg: null, recentReviews: [] };
    }
}

async function getCommunityAnalyticsByNameMap() {
    if (communityAnalyticsMapCache.map && communityAnalyticsMapCache.expiresAt > Date.now()) {
        return communityAnalyticsMapCache.map;
    }
    const map = new Map();
    try {
        const rows = await prisma.venueAnalytics.findMany({
            take: 300,
            orderBy: { updatedAt: 'desc' },
        });
        for (const r of rows) {
            if (!r?.name) continue;
            const key = r.name.toLowerCase().trim();
            const existing = map.get(key);
            if (!existing) {
                map.set(key, {
                    satisfactionAvg: Number(r.satisfactionAvg) || 5,
                    truePriceAvg: Number(r.truePriceAvg) || 5,
                    totalReviews: Number(r.totalReviews) || 1,
                });
            } else {
                const combinedCount = existing.totalReviews + (Number(r.totalReviews) || 1);
                map.set(key, {
                    satisfactionAvg: ((existing.satisfactionAvg * existing.totalReviews) + (Number(r.satisfactionAvg) || 5) * (Number(r.totalReviews) || 1)) / combinedCount,
                    truePriceAvg: ((existing.truePriceAvg * existing.totalReviews) + (Number(r.truePriceAvg) || 5) * (Number(r.totalReviews) || 1)) / combinedCount,
                    totalReviews: combinedCount,
                });
            }
        }
        communityAnalyticsMapCache = { map, expiresAt: Date.now() + 120000 };
    } catch {
        // Non-fatal fallback
    }
    return map;
}

/**
 * Records user feedback and atomically recalculates continuous venue analytics.
 * Self-heals missing Option or Participant records (e.g. Custom Polls, pruned options, or multi-room sessions)
 * and avoids long-lived interactive transactions over PgBouncer transaction-mode poolers.
 */
async function submitVenueFeedback(participant_id, option_id, satisfaction_score, price_accuracy_score, meta = {}) {
    const cleanDeviceId = meta?.device_id && typeof meta.device_id === 'string' ? meta.device_id.trim().slice(0, 64) : null;
    const pin = meta?.pin ? String(meta.pin).trim() : null;
    const optionNameFallback = meta?.option_name && typeof meta.option_name === 'string'
        ? meta.option_name.trim().slice(0, 120)
        : 'Consensus Pick';
    const cleanComment = meta?.comment && typeof meta.comment === 'string' && meta.comment.trim()
        ? meta.comment.trim().slice(0, 500)
        : null;

    const executeFeedbackWrite = async () => {
        if (pin) {
            await ensureRoomPersisted(pin);
        }

        let roomByPin = null;
        if (pin) {
            roomByPin = await prisma.room.findUnique({ where: { pin } }).catch(() => null);
        }

        let option = option_id
            ? await prisma.option.findUnique({ where: { id: String(option_id) } }).catch(() => null)
            : null;

        let targetRoomId = roomByPin?.id || option?.roomId || null;

        // If option belongs to a different room than `pin`, prefer the option in `targetRoomId`
        if (option && targetRoomId && option.roomId !== targetRoomId) {
            option = null;
        }

        let participant = participant_id
            ? await prisma.participant.findUnique({ where: { id: String(participant_id) } }).catch(() => null)
            : null;

        // If the participant ID belonged to a previous room session, do not cross-link rooms
        if (participant && targetRoomId && participant.roomId !== targetRoomId) {
            participant = null;
        }

        if (!participant && targetRoomId && cleanDeviceId) {
            participant = await prisma.participant.findFirst({
                where: { roomId: targetRoomId, deviceId: cleanDeviceId },
            });
        }

        if (!targetRoomId && participant) {
            targetRoomId = participant.roomId;
        }

        if (!option) throw new Error('Option not found for analytics');

        const placeId = option.googlePlaceId || option.id;

        if (!participant || participant.roomId !== option.roomId || !cleanDeviceId || participant.deviceId !== cleanDeviceId) {
            throw new Error('Valid participant authorization is required');
        }

        let feedback = await prisma.feedback.findFirst({
            where: {
                participantId: participant.id,
                optionId: option.id,
            },
        });

        if (feedback) {
            feedback = await prisma.feedback.update({
                where: { id: feedback.id },
                data: {
                    satisfactionScore: satisfaction_score,
                    priceAccuracyScore: price_accuracy_score,
                    ...(cleanComment !== null ? { comment: cleanComment } : {}),
                },
            });
        } else {
            feedback = await prisma.feedback.create({
                data: {
                    participantId: participant.id,
                    optionId: option.id,
                    satisfactionScore: satisfaction_score,
                    priceAccuracyScore: price_accuracy_score,
                    comment: cleanComment,
                },
            });
        }

        const existingAnalytics = await prisma.venueAnalytics.findUnique({
            where: { googlePlaceId: placeId },
        });

        let analytics;
        if (!existingAnalytics) {
            analytics = await prisma.venueAnalytics.create({
                data: {
                    googlePlaceId: placeId,
                    name: option.name,
                    satisfactionAvg: satisfaction_score,
                    truePriceAvg: price_accuracy_score,
                    totalReviews: 1,
                },
            }).catch(async () => {
                return prisma.venueAnalytics.findUnique({ where: { googlePlaceId: placeId } });
            });
        } else {
            const newCount = existingAnalytics.totalReviews + 1;
            const newSatAvg = ((existingAnalytics.satisfactionAvg * existingAnalytics.totalReviews) + satisfaction_score) / newCount;
            const newPriceAvg = ((existingAnalytics.truePriceAvg * existingAnalytics.totalReviews) + price_accuracy_score) / newCount;

            analytics = await prisma.venueAnalytics.update({
                where: { id: existingAnalytics.id },
                data: {
                    satisfactionAvg: newSatAvg,
                    truePriceAvg: newPriceAvg,
                    totalReviews: newCount,
                },
            });
        }

        invalidateVenueInsightsCache(option.name);
        return { feedback, analytics, option, participant };
    };

    try {
        return await executeFeedbackWrite();
    } catch (firstError) {
        // Retry once if Neon serverless PgBouncer recycled an idle connection
        try {
            return await executeFeedbackWrite();
        } catch (retryError) {
            console.error('[submitVenueFeedback] Failed:', retryError);
            throw new Error("Failed to process venue feedback and update analytics.");
        }
    }
}

module.exports = {
    getCachedVenuesByGrid,
    saveCachedVenuesBulk,
    getVenueCommunityInsights,
    getCommunityAnalyticsByNameMap,
    invalidateVenueInsightsCache,
    submitVenueFeedback,
};
