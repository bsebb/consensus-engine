const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createRoom(hostId, pin) {
    try {
        const room = await prisma.room.create({
            data: {
                hostId,
                pin,
            },
        });
        return room;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to create room");
    }
}

async function createParticipant(roomId, budgetCap) {
    try {
        const participant = await prisma.participant.create({
            data: {
                roomId,
                budgetCap,
            },
        });
        return participant;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to create participant");
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

async function getRoomById(roomId) {
    try {
        const room = await prisma.room.findUnique({
            where: { id: roomId },
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
        console.error(error);
        if (error.message === "Room not found") {
            throw error;
        }
        throw new Error("Failed to get room by ID");
    }
}

async function getRoomByPin(pin) {
    try {
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
        console.error(error);
        if (error.message === "Room not found") {
            throw error;
        }
        throw new Error("Failed to get room by PIN");
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

module.exports = {
    createRoom,
    createParticipant,
    createOption,
    getRoomById,
    getRoomByPin,
    createVote,
};
