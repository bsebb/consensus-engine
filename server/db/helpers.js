const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

function getSafeDatabaseUrl() {
    const rawUrl = (process.env.DATABASE_URL || '').trim();
    if (!rawUrl) return undefined;
    try {
        const parsed = new URL(rawUrl);
        // When using Neon's pooled endpoint (-pooler), enable PgBouncer transaction mode compatibility in Prisma
        if (parsed.hostname.includes('-pooler.') && !parsed.searchParams.has('pgbouncer')) {
            parsed.searchParams.set('pgbouncer', 'true');
        }
        // On serverless/free-tier PostgreSQL (Neon, Supabase, Render), balance concurrency and pool limits
        if (!parsed.searchParams.has('connection_limit')) {
            const defaultLimit = parsed.hostname.includes('-pooler.') ? '15' : '5';
            parsed.searchParams.set('connection_limit', defaultLimit);
        }
        if (!parsed.searchParams.has('pool_timeout')) {
            parsed.searchParams.set('pool_timeout', '15');
        }
        if (!parsed.searchParams.has('connect_timeout')) {
            parsed.searchParams.set('connect_timeout', '15');
        }
        return parsed.toString();
    } catch {
        return rawUrl;
    }
}

const safeUrl = getSafeDatabaseUrl();
const prisma = global.__prisma || new PrismaClient(
    safeUrl
        ? {
            datasources: {
                db: { url: safeUrl },
            },
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        }
        : {
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        }
);

global.__prisma = prisma;

// Global in-memory set of persisted participant keys (`${roomId}:${participantId}` and `${roomId}:dev:${deviceId}`)
// Survives lobby eviction and prevents redundant INSERT/ON CONFLICT DO UPDATE queries across socket reconnects.
const persistedParticipantCache = new Map();
const MAX_PERSISTED_CACHE_SIZE = 10000;

function markParticipantPersisted(roomId, participantId, deviceId, resolvedRecord) {
    if (persistedParticipantCache.size >= MAX_PERSISTED_CACHE_SIZE) {
        const oldestKey = persistedParticipantCache.keys().next().value;
        if (oldestKey) persistedParticipantCache.delete(oldestKey);
    }
    const record = resolvedRecord || { id: participantId, roomId, deviceId: deviceId || null };
    if (roomId && participantId) {
        persistedParticipantCache.set(`${roomId}:${participantId}`, record);
    }
    if (roomId && deviceId) {
        persistedParticipantCache.set(`${roomId}:dev:${deviceId}`, record);
    }
}

// Track in-flight background room persistence promises so any immediate DB read/write awaits completion
const pendingRoomWrites = new Map();

function registerPendingRoomWrite(roomId, pin, promise) {
    if (!promise) return;
    if (roomId) pendingRoomWrites.set(String(roomId), promise);
    if (pin) pendingRoomWrites.set(String(pin), promise);
    promise.finally(() => {
        if (roomId) pendingRoomWrites.delete(String(roomId));
        if (pin) pendingRoomWrites.delete(String(pin));
    });
}

async function ensureRoomPersisted(key) {
    if (!key) return;
    const pending = pendingRoomWrites.get(String(key));
    if (pending) {
        await pending.catch(() => {});
    }
}

async function createRoom(hostId, pin, theme = null, radius = null, hostDeviceId = null, preGeneratedId = null) {
    try {
        const room = await prisma.room.create({
            data: {
                ...(preGeneratedId ? { id: preGeneratedId } : {}),
                hostId,
                hostDeviceId: hostDeviceId ? String(hostDeviceId).slice(0, 64) : null,
                pin,
                theme: theme ? String(theme) : null,
                radius: typeof radius === 'number' ? radius : null,
            },
        });
        return room;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to create room");
    }
}
async function createParticipant(roomId, budgetCap, deviceId = null) {
    try {
        const participant = await prisma.participant.create({
            data: {
                roomId,
                deviceId: deviceId ? String(deviceId).slice(0, 64) : null,
                budgetCap,
            },
        });

        return participant;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to create participant");
    }
}
function deriveRoomParticipantUuid(roomId, participantId) {
    const hex = crypto.createHash('sha256').update(`${roomId}:${participantId}`).digest('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// Create or reuse a participant without triggering redundant ON CONFLICT DO UPDATE writes on reconnects
async function createParticipantWithId(roomId, participantId, budgetCap = null, deviceId = null, options = {}) {
    const cleanDeviceId = deviceId && typeof deviceId === 'string' ? deviceId.trim().slice(0, 64) : null;
    const isNewRoom = Boolean(options && options.isNewRoom);
    let targetId = participantId;
    try {
        if (!isNewRoom) {
            await ensureRoomPersisted(roomId);
        }
        if (budgetCap === null) {
            if (cleanDeviceId && persistedParticipantCache.has(`${roomId}:dev:${cleanDeviceId}`)) {
                return persistedParticipantCache.get(`${roomId}:dev:${cleanDeviceId}`);
            }
            if (persistedParticipantCache.has(`${roomId}:${participantId}`)) {
                return persistedParticipantCache.get(`${roomId}:${participantId}`);
            }
        }

        // 1. Per-room device idempotency: if the same (roomId, deviceId) already joined this room, reuse that participant slot
        // (Skipped when isNewRoom=true since a freshly created room has 0 existing participants)
        if (cleanDeviceId && !isNewRoom) {
            const existingByDevice = await prisma.participant.findFirst({
                where: { roomId, deviceId: cleanDeviceId },
            });
            if (existingByDevice) {
                if (budgetCap !== null && existingByDevice.budgetCap !== budgetCap) {
                    const updated = await prisma.participant.update({
                        where: { id: existingByDevice.id },
                        data: { budgetCap },
                    });
                    markParticipantPersisted(roomId, updated.id, cleanDeviceId, updated);
                    return updated;
                }
                markParticipantPersisted(roomId, existingByDevice.id, cleanDeviceId, existingByDevice);
                return existingByDevice;
            }
        }

        // 2. Fast-path insert: attempt direct creation first (saves a round-trip on every new room / new participant)
        try {
            const created = await prisma.participant.create({
                data: {
                    id: targetId,
                    roomId,
                    deviceId: cleanDeviceId,
                    budgetCap,
                },
            });
            markParticipantPersisted(roomId, created.id, created.deviceId, created);
            return created;
        } catch (insertErr) {
            if (insertErr.code !== 'P2002') throw insertErr;
        }

        // 3. P2002 conflict resolution: participantId already exists in DB
        let existingById = await prisma.participant.findUnique({
            where: { id: targetId },
        });
        if (existingById && existingById.roomId !== roomId) {
            // Caller passed a global participantId already used in another room; scope deterministically to this roomId
            targetId = deriveRoomParticipantUuid(roomId, participantId);
            existingById = await prisma.participant.findUnique({
                where: { id: targetId },
            });
            if (!existingById) {
                const scopedCreated = await prisma.participant.create({
                    data: {
                        id: targetId,
                        roomId,
                        deviceId: cleanDeviceId,
                        budgetCap,
                    },
                });
                markParticipantPersisted(roomId, scopedCreated.id, scopedCreated.deviceId, scopedCreated);
                return scopedCreated;
            }
        }
        if (existingById) {
            const needsDeviceBackfill = cleanDeviceId && !existingById.deviceId;
            const needsBudgetUpdate = budgetCap !== null && existingById.budgetCap !== budgetCap;
            if (needsDeviceBackfill || needsBudgetUpdate) {
                const updated = await prisma.participant.update({
                    where: { id: existingById.id },
                    data: {
                        ...(needsDeviceBackfill ? { deviceId: cleanDeviceId } : {}),
                        ...(needsBudgetUpdate ? { budgetCap } : {}),
                    },
                });
                markParticipantPersisted(roomId, updated.id, updated.deviceId, updated);
                return updated;
            }
            markParticipantPersisted(roomId, existingById.id, existingById.deviceId, existingById);
            return existingById;
        }
        return null;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to create participant with ID");
    }
}

async function createOption(roomId, name, source, googlePlaceId, priceLevel) {
    try {
        const option = await prisma.option.create({
            data: {
                roomId,
                name,
                source,
                googlePlaceId,
                priceLevel,
            },
        });
        return option;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to create option");
    }
}

async function createOptionsBulk(optionsData) {
    try {
        if (!Array.isArray(optionsData) || optionsData.length === 0) return [];
        const sanitized = optionsData.map(opt => ({
            id: opt.id || crypto.randomUUID(),
            roomId: opt.roomId,
            name: opt.name,
            source: opt.source || "GOOGLE_API",
            googlePlaceId: opt.googlePlaceId || opt.fsq_id || opt.fsq_place_id || null,
            priceLevel: opt.priceLevel ?? null,
        }));
        await prisma.option.createMany({
            data: sanitized,
            skipDuplicates: true,
        });
        return sanitized;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to create options in bulk");
    }
}

async function createVotesBulk(votesData) {
    try {
        if (!Array.isArray(votesData) || votesData.length === 0) return [];
        const sanitized = votesData.map(v => ({
            id: v.id || crypto.randomUUID(),
            participantId: v.participantId,
            optionId: v.optionId,
            score: v.score,
        }));
        return await prisma.vote.createMany({
            data: sanitized,
            skipDuplicates: true,
        });
    } catch (error) {
        console.error(error);
        throw new Error("Failed to create votes in bulk");
    }
}

async function getRoomById(roomId) {
    try {
        await ensureRoomPersisted(roomId);
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
                participants: {
                    include: { votes: true } 
                },
                options: true,
            },
        });
        if (!room) {
            throw new Error("Room not found");
        }
        return room;
    } catch (error) {
        if (error.message !== "Room not found") {
            console.error(error);
        }
        throw error;
    }
}

async function getRoomByPin(pin) {
    try {
        await ensureRoomPersisted(pin);
        const room = await prisma.room.findUnique({
            where: { pin },
            include: {
                participants: true,
                options: true,
            },
        });
        if (!room) {
            throw new Error("Room not found");
        }
        return room;
    } catch (error) {
        if (error.message !== "Room not found") {
            console.error(error);
        }
        throw error;
    }
}

async function getRoomWithVotesByPin(pin) {
    try {
        await ensureRoomPersisted(pin);
        const room = await prisma.room.findUnique({
            where: { pin },
            include: {
                participants: {
                    include: { votes: true }
                },
                options: true,
            },
        });
        if (!room) {
            throw new Error("Room not found");
        }
        return room;
    } catch (error) {
        if (error.message !== "Room not found") {
            console.error(error);
        }
        throw error;
    }
}

// Lightweight query without nested joins for fast socket room validation & auth checks
async function getRoomSummaryByPin(pin) {
    try {
        await ensureRoomPersisted(pin);
        const room = await prisma.room.findUnique({
            where: { pin },
            select: {
                id: true,
                pin: true,
                hostId: true,
                hostDeviceId: true,
                status: true,
                theme: true,
                radius: true,
            },
        });
        return room;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function createVote(participantId, optionId, score) {
    try {
        const vote = await prisma.vote.create({
            data: {
                participantId,
                optionId,
                score,
            },
        });
        return vote;
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            throw new Error("User has already voted for this option");
        }
        throw new Error("Failed to create vote");
    }
}
async function updateRoomConfig(roomId, updateData) {
    try {
        const room = await prisma.room.update({
            where: { id: roomId },
            data: updateData,
        });
        return room;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to update room configuration");
    }
}

//Lilia: update the participant's budget limit for Step Zero
async function updateParticipantBudget(participantId, budgetCap) {
    try {
        const participant = await prisma.participant.update({
            where: { id: participantId },
            data: { budgetCap },
        });

        return participant;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to update participant budget");
    }
}

//Lilia: remove options that exceed the group's budget limit
async function pruneOptionsByBudget(roomId, maxPriceLevel) {
    try {
        await prisma.option.deleteMany({
            where: {
                roomId,
                priceLevel: {
                    gt: maxPriceLevel,
                },
            },
        });
    } catch (error) {
        console.error(error);
        throw new Error("Failed to prune options by budget");
    }
}



//Lilia: count unique participants who have submitted votes in a room
async function countVotedParticipants(roomId) {
    try {
        const result = await prisma.vote.findMany({
            where: {
                participant: {
                    roomId,
                },
            },
            select: {
                participantId: true,
            },
            distinct: ['participantId'],
        });

        return result.length;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to count voted participants");
    }
}



/** AFINA:
 * Records user feedback and atomically recalculates continuous venue analytics
 * using Prisma transactions to prevent race conditions during concurrent voting.
 */
async function submitVenueFeedback(participant_id, option_id, satisfaction_score, price_accuracy_score) {
    try {
        return await prisma.$transaction(async (tx) => {
            const option = await tx.option.findUnique({
                where: { id: option_id }
            });

            if (!option) {
                throw new Error("Option not found for analytics.");
            }

            const placeId = option.googlePlaceId || option.id;

            // Ensure participant exists in database to satisfy foreign key constraint
            let participant = await tx.participant.findUnique({
                where: { id: participant_id }
            });
            if (!participant) {
                participant = await tx.participant.create({
                    data: {
                        id: participant_id,
                        roomId: option.roomId
                    }
                });
            }

            // Recording individual user feedback (findFirst + update or create)
            let feedback = await tx.feedback.findFirst({
                where: {
                    participantId: participant_id,
                    optionId: option_id
                }
            });

            if (feedback) {
                feedback = await tx.feedback.update({
                    where: { id: feedback.id },
                    data: {
                        satisfactionScore: satisfaction_score,
                        priceAccuracyScore: price_accuracy_score
                    }
                });
            } else {
                feedback = await tx.feedback.create({
                    data: {
                        participantId: participant_id,
                        optionId: option_id,
                        satisfactionScore: satisfaction_score,
                        priceAccuracyScore: price_accuracy_score
                    }
                });
            }

            const existingAnalytics = await tx.venueAnalytics.findUnique({
                where: { googlePlaceId: placeId }
            });

            let analytics;

            if (!existingAnalytics) {
                analytics = await tx.venueAnalytics.create({
                    data: {
                        googlePlaceId: placeId,
                        name: option.name,
                        satisfactionAvg: satisfaction_score,
                        truePriceAvg: price_accuracy_score,
                        totalReviews: 1
                    }
                });
            } else {
                const newCount = existingAnalytics.totalReviews + 1;
                const newSatAvg = ((existingAnalytics.satisfactionAvg * existingAnalytics.totalReviews) + satisfaction_score) / newCount;
                const newPriceAvg = ((existingAnalytics.truePriceAvg * existingAnalytics.totalReviews) + price_accuracy_score) / newCount;

                analytics = await tx.venueAnalytics.update({
                    where: { id: existingAnalytics.id },
                    data: {
                        satisfactionAvg: newSatAvg,
                        truePriceAvg: newPriceAvg,
                        totalReviews: newCount
                    }
                });
            }

            return { feedback, analytics };
        });
    } catch (error) {
        console.error(error);
        throw new Error("Failed to process venue feedback and update analytics.");
    }
}


module.exports = {
    prisma,
    persistedParticipantCache,
    registerPendingRoomWrite,
    ensureRoomPersisted,
    createRoom,
    createParticipant,
    createOption,
    createOptionsBulk,
    createVotesBulk,
    getRoomById,
    getRoomByPin,
    getRoomWithVotesByPin,
    getRoomSummaryByPin,
    createVote,
    //Lilia: export vote progress helper
    countVotedParticipants,
    updateRoomConfig,
    updateParticipantBudget,
    //Lilia: export Step Zero pruning helper
    pruneOptionsByBudget,
    //Lilia: export participant creation helper for Socket.io room joining
    createParticipantWithId,
    //Afina
    submitVenueFeedback,
};
