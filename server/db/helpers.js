/**
 * In-memory store - replaces Prisma/PostgreSQL for demo.
 * Exports the same function signatures as the original helpers.js.
 * All data lives in process memory and resets on server restart.
 */
const { randomUUID } = require('crypto');
const uuidv4 = () => randomUUID();

// Core in-memory tables
const rooms = new Map();        // pin -> room object
const roomsById = new Map();    // id  -> room object
const participants = new Map(); // id  -> participant object
const options = new Map();      // id  -> option object
const votes = new Map();        // id  -> vote object
const feedbacks = new Map();    // id  -> feedback object
const venueAnalytics = new Map(); // google_place_id -> analytics object

// ─── ROOMS ──────────────────────────────────────────────────────────────────

async function createRoom(hostId, pin) {
    const room = {
        id: uuidv4(),
        pin,
        hostId,
        status: 'CONFIGURING',
        theme: null,
        radius: null,
        winnerOptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [],
        options: [],
    };
    rooms.set(pin, room);
    roomsById.set(room.id, room);
    return room;
}

async function getRoomByPin(pin) {
    const room = rooms.get(pin);
    if (!room) throw new Error('Room not found');
    // Hydrate with live participant/option/vote data
    return _hydrateRoom(room);
}

async function getRoomById(roomId) {
    const room = roomsById.get(roomId);
    if (!room) throw new Error('Room not found');
    return _hydrateRoom(room);
}

function _hydrateRoom(room) {
    const hydratedParticipants = room.participants.map((pid) => {
        const p = participants.get(pid);
        if (!p) return null;
        const pVotes = [...votes.values()].filter(v => v.participantId === pid);
        return { ...p, votes: pVotes };
    }).filter(Boolean);

    const hydratedOptions = room.options.map((oid) => options.get(oid)).filter(Boolean);

    return { ...room, participants: hydratedParticipants, options: hydratedOptions };
}

async function updateRoomConfig(roomId, updateData) {
    const room = roomsById.get(roomId);
    if (!room) throw new Error('Room not found');
    Object.assign(room, updateData, { updatedAt: new Date() });
    return room;
}

// ─── PARTICIPANTS ────────────────────────────────────────────────────────────

async function createParticipant(roomId, budgetCap) {
    return createParticipantWithId(roomId, uuidv4(), budgetCap);
}

async function createParticipantWithId(roomId, participantId, budgetCap = null) {
    // Find room
    const room = roomsById.get(roomId);
    if (!room) throw new Error('Room not found');

    const participant = {
        id: participantId,
        roomId,
        budgetCap,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    participants.set(participantId, participant);

    if (!room.participants.includes(participantId)) {
        room.participants.push(participantId);
    }

    return participant;
}

async function updateParticipantBudget(participantId, budgetCap) {
    const participant = participants.get(participantId);
    if (!participant) throw new Error('Participant not found');
    participant.budgetCap = budgetCap;
    participant.updatedAt = new Date();
    return participant;
}

// ─── OPTIONS ─────────────────────────────────────────────────────────────────

async function createOption(roomId, name, source, googlePlaceId, priceLevel) {
    const room = roomsById.get(roomId);
    if (!room) throw new Error('Room not found');

    const option = {
        id: uuidv4(),
        roomId,
        name,
        source: source || 'USER_CUSTOM',
        googlePlaceId: googlePlaceId || null,
        priceLevel: priceLevel || null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    options.set(option.id, option);
    if (!room.options.includes(option.id)) {
        room.options.push(option.id);
    }

    return option;
}

async function pruneOptionsByBudget(roomId, maxPriceLevel) {
    const room = roomsById.get(roomId);
    if (!room) return;

    room.options = room.options.filter((oid) => {
        const opt = options.get(oid);
        if (!opt) return false;
        if (opt.priceLevel != null && opt.priceLevel > maxPriceLevel) {
            options.delete(oid);
            return false;
        }
        return true;
    });
}

// ─── VOTES ───────────────────────────────────────────────────────────────────

async function createVote(participantId, optionId, score) {
    // Enforce unique(participantId, optionId)
    const existing = [...votes.values()].find(
        v => v.participantId === participantId && v.optionId === optionId
    );
    if (existing) throw new Error('User has already voted for this option');

    const vote = {
        id: uuidv4(),
        participantId,
        optionId,
        score,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    votes.set(vote.id, vote);
    return vote;
}

async function countVotedParticipants(roomId) {
    const room = roomsById.get(roomId);
    if (!room) return 0;

    const participantIds = new Set(
        [...votes.values()]
            .filter(v => room.participants.includes(v.participantId))
            .map(v => v.participantId)
    );
    return participantIds.size;
}

// ─── FEEDBACK / ANALYTICS ────────────────────────────────────────────────────

async function submitVenueFeedback(participant_id, option_id, satisfaction_score, price_accuracy_score) {
    const option = options.get(option_id);
    if (!option) throw new Error('Option not found');

    const feedback = {
        id: uuidv4(),
        participantId: participant_id,
        optionId: option_id,
        satisfactionScore: satisfaction_score,
        priceAccuracyScore: price_accuracy_score,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    feedbacks.set(feedback.id, feedback);

    // Update running averages
    const placeKey = option.googlePlaceId || option_id;
    const existing = venueAnalytics.get(placeKey);
    if (!existing) {
        venueAnalytics.set(placeKey, {
            id: uuidv4(),
            google_place_id: placeKey,
            name: option.name,
            satisfaction_avg: satisfaction_score,
            true_price_avg: price_accuracy_score,
            total_reviews: 1,
        });
    } else {
        const n = existing.total_reviews + 1;
        existing.satisfaction_avg = ((existing.satisfaction_avg * existing.total_reviews) + satisfaction_score) / n;
        existing.true_price_avg = ((existing.true_price_avg * existing.total_reviews) + price_accuracy_score) / n;
        existing.total_reviews = n;
    }

    return { feedback, analytics: venueAnalytics.get(placeKey) };
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

module.exports = {
    createRoom,
    createParticipant,
    createParticipantWithId,
    createOption,
    getRoomById,
    getRoomByPin,
    createVote,
    countVotedParticipants,
    updateRoomConfig,
    updateParticipantBudget,
    pruneOptionsByBudget,
    submitVenueFeedback,
};
