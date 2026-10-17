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
// Lilia: create or update a participant with the UUID provided by the Socket.io client
async function createParticipantWithId(roomId, participantId, budgetCap = null) {
    try {
        const participant = await prisma.participant.upsert({
            where: { id: participantId },
            update: {
                roomId,
                ...(budgetCap !== null ? { budgetCap } : {}),
            },
            create: {
                id: participantId,
                roomId,
                budgetCap,
            },
        });

        return participant;
    } catch (error) {
        if (error.code === 'P2002') {
            return await prisma.participant.findUnique({ where: { id: participantId } }).catch(() => null);
        }
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

async function getRoomById(roomId) {
    try {
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
    createRoom,
    createParticipant,
    createOption,
    getRoomById,
    getRoomByPin,
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
