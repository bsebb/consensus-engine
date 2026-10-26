const crypto = require('crypto');
const { roomTransaction } = require('../src/state/transactionContext');
const { prisma } = require('./prismaClient');
const {
    getCachedVenuesByGrid,
    saveCachedVenuesBulk,
    getVenueCommunityInsights,
    getCommunityAnalyticsByNameMap,
    invalidateVenueInsightsCache,
    submitVenueFeedback,
} = require('./venueCache');

// Global in-memory set of persisted participant keys (`${roomId}:${participantId}` and `${roomId}:dev:${deviceId}`)
// Survives lobby eviction and prevents redundant INSERT/ON CONFLICT DO UPDATE queries across socket reconnects.
const persistedParticipantCache = new Map();
const MAX_PERSISTED_CACHE_SIZE = 10000;

function markParticipantPersisted(roomId, participantId, deviceId, resolvedRecord) {
    if (roomTransaction.getStore() && !roomTransaction.getStore().finished) return;
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

async function createRoom(hostId, pin, theme = null, radius = null, hostDeviceId = null, preGeneratedId = null, initialOptions = null) {
    const data = {
        ...(preGeneratedId ? { id: preGeneratedId } : {}),
        hostId,
        hostDeviceId: hostDeviceId ? String(hostDeviceId).slice(0, 64) : null,
        pin,
        theme: theme ? String(theme) : null,
        radius: typeof radius === 'number' ? radius : null,
    };
    try {
        if (initialOptions) {
            data.participants = { create: { id: hostId, deviceId: hostDeviceId } };
            if (initialOptions.length) data.options = { create: initialOptions.map(({ roomId, ...option }) => option) };
        }
        return await prisma.room.create({ data });
    } catch (error) {
        if (error?.code === 'P2002') throw error;
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
    const checkOwner = (record) => {
        if (record && record.deviceId !== cleanDeviceId) {
            const err = new Error('Participant identity belongs to another device');
            err.code = 'FORBIDDEN';
            throw err;
        }
        return record;
    };
    let targetId = participantId;
    try {
        if (!isNewRoom) {
            await ensureRoomPersisted(roomId);
        }
        if (budgetCap === null && !roomTransaction.getStore()) {
            if (cleanDeviceId && persistedParticipantCache.has(`${roomId}:dev:${cleanDeviceId}`)) {
                return persistedParticipantCache.get(`${roomId}:dev:${cleanDeviceId}`);
            }
            if (persistedParticipantCache.has(`${roomId}:${participantId}`)) {
                const cached = persistedParticipantCache.get(`${roomId}:${participantId}`);
                if (!cleanDeviceId || cached?.deviceId) {
                    return checkOwner(cached);
                }
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
            checkOwner(existingById);
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
        if (error.code === 'FORBIDDEN') throw error;
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

async function fetchRoomOrThrow(whereClause, includeVotes = false) {
    const key = whereClause.id || whereClause.pin;
    await ensureRoomPersisted(key);
    const room = await prisma.room.findUnique({
        where: whereClause,
        include: {
            participants: includeVotes ? { include: { votes: true } } : true,
            options: true,
        },
    });
    if (!room) throw new Error("Room not found");
    return room;
}

async function getRoomById(roomId) {
    try {
        return await fetchRoomOrThrow({ id: roomId }, true);
    } catch (error) {
        if (error.message !== "Room not found") console.error(error);
        throw error;
    }
}

async function getRoomByPin(pin) {
    try {
        return await fetchRoomOrThrow({ pin }, false);
    } catch (error) {
        if (error.message !== "Room not found") console.error(error);
        throw error;
    }
}

async function getRoomWithVotesByPin(pin) {
    try {
        return await fetchRoomOrThrow({ pin }, true);
    } catch (error) {
        if (error.message !== "Room not found") console.error(error);
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
                winnerOptionId: true,
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

//Lilia: update the participant's budget limit for Step Zero (and backfill deviceId if missing)
async function updateParticipantBudget(participantId, budgetCap, deviceId = null) {
    try {
        const cleanDeviceId = deviceId && typeof deviceId === 'string' ? deviceId.trim().slice(0, 64) : null;
        const participant = await prisma.participant.update({
            where: { id: participantId },
            data: {
                budgetCap,
                ...(cleanDeviceId ? { deviceId: cleanDeviceId } : {}),
            },
        });
        markParticipantPersisted(participant.roomId, participant.id, participant.deviceId, participant);
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
            where: { roomId, priceLevel: { gt: maxPriceLevel } },
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
            where: { participant: { roomId } },
            select: { participantId: true },
            distinct: ['participantId'],
        });
        return result.length;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to count voted participants");
    }
}

module.exports = {
    prisma,
    persistedParticipantCache,
    registerPendingRoomWrite,
    ensureRoomPersisted,
    getCachedVenuesByGrid,
    saveCachedVenuesBulk,
    getVenueCommunityInsights,
    getCommunityAnalyticsByNameMap,
    invalidateVenueInsightsCache,
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
