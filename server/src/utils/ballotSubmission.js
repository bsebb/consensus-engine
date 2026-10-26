const { prisma } = require('../../db/helpers');

// REST retries and Socket.IO delivery share the same immutable, durable ballot.
async function recordSessionBallot(session, participantId, votes) {
  if (!session || session.isResolved || session.isResolving || session.submissions.has(participantId)) return false;
  if (session.eligibleParticipantIds && !session.eligibleParticipantIds.has(participantId)) return false;
  if (!session.ballotWrites) session.ballotWrites = new Map();
  const pending = session.ballotWrites.get(participantId);
  if (pending) { await pending; return false; }
  const write = (async () => {
    if (session.roomId) {
      await prisma.vote.createMany({
        data: votes.map(v => ({ participantId, optionId: v.option_id, score: v.score })),
        skipDuplicates: true,
      });
    }
    session.submissions.set(participantId, { participant_id: participantId, votes });
  })();
  session.ballotWrites.set(participantId, write);
  try { await write; return true; }
  finally { session.ballotWrites.delete(participantId); }
}

module.exports = { recordSessionBallot };
