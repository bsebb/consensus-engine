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


/**
 * Records user feedback and atomically recalculates continuous venue analytics
 * using Prisma transactions to prevent race conditions during concurrent voting.
 */
async function submitVenueFeedback(participant_id, option_id, satisfaction_score, price_accuracy_score) {
    try {
        return await prisma.$transaction(async (tx) => {
            const option = await tx.option.findUnique({
                where: { id: option_id }
            });

            if (!option || !option.google_place_id) {
                throw new Error("Option not found or missing google_place_id for analytics.");
            }

            // -- Recording the individual user feedback
            const feedback = await tx.feedback.create({
                data: {
                    participant_id,
                    option_id,
                    satisfaction_score,
                    price_accuracy_score
                }
            });

            const existingAnalytics = await tx.venueAnalytics.findUnique({
                where: { google_place_id: option.google_place_id }
            });

            let analytics;

            if (!existingAnalytics) {
                // Initializing analytics on first review
                analytics = await tx.venueAnalytics.create({
                    data: {
                        google_place_id: option.google_place_id,
                        name: option.name,
                        satisfaction_avg: satisfaction_score,
                        true_price_avg: price_accuracy_score,
                        total_reviews: 1
                    }
                });
            } else {
                // -- Recalculating continuous averages based on existing total
                const newCount = existingAnalytics.total_reviews + 1;
                const newSatAvg = ((existingAnalytics.satisfaction_avg * existingAnalytics.total_reviews) + satisfaction_score) / newCount;
                const newPriceAvg = ((existingAnalytics.true_price_avg * existingAnalytics.total_reviews) + price_accuracy_score) / newCount;

                analytics = await tx.venueAnalytics.update({
                    where: { id: existingAnalytics.id },
                    data: {
                        satisfaction_avg: newSatAvg,
                        true_price_avg: newPriceAvg,
                        total_reviews: newCount
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
    updateRoomConfig,
     //Lilia: export Step Zero budget helper
    updateParticipantBudget,
    //Lilia: export Step Zero pruning helper
    pruneOptionsByBudget,
    //Afina
    submitVenueFeedback,
};
