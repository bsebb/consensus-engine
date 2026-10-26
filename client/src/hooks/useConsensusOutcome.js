import { useMemo } from 'react';

export const DEFAULT_WINNER = {
  id: 'winner_default',
  name: 'Consensus Spot',
  category: 'Local Favorites',
  address: 'Local Venue',
  distance_km: null,
  price_level: 2,
  tags: ['Group Favorite'],
};

export function useConsensusOutcome({
  cards = [],
  myVotes = [],
  serverWinner = null,
  serverMatchScore = null,
  serverPairwise = null,
  locationState = null,
}) {
  const consensusResult = useMemo(() => {
    if (serverWinner) {
      const matchedCard = cards.find((c) => c.id === serverWinner.id || c.name === serverWinner.name);
      return {
        winner: matchedCard ? { ...serverWinner, ...matchedCard } : serverWinner,
        vetoCount: 0,
        matchScore: serverMatchScore ?? 0,
      };
    }
    if (locationState?.winner) {
      const winnerName = typeof locationState.winner === 'object' ? locationState.winner.name : locationState.winner;
      const found = locationState?.winnerDetails || cards.find((c) => c.name?.toLowerCase() === String(winnerName).toLowerCase()) || {
        id: 'historical-winner',
        name: winnerName,
        price_level: locationState?.priceLevel || 2,
        distance_km: null,
        address: 'Local Venue',
      };
      return { winner: found, vetoCount: 0, matchScore: locationState?.matchScore ?? 0 };
    }
    if (!cards || cards.length === 0) {
      return { winner: DEFAULT_WINNER, vetoCount: 0, matchScore: 100 };
    }

    const scored = cards.map((card) => {
      const myVote = myVotes.find((v) => v.option_id === card.id);
      return { card, isVetoed: myVote?.score === -100, score: myVote ? myVote.score : 0 };
    });

    const nonVetoed = scored.filter((s) => !s.isVetoed);
    const pool = (nonVetoed.length > 0 ? nonVetoed : scored).sort((a, b) => b.score - a.score);

    return {
      winner: pool[0]?.card || cards[0],
      vetoCount: scored.filter((s) => s.isVetoed).length,
      matchScore: nonVetoed.length > 0 ? 94 : 72,
    };
  }, [cards, myVotes, serverWinner, serverMatchScore, locationState]);

  const pairwiseBreakdown = useMemo(() => {
    if (Array.isArray(serverPairwise)) return serverPairwise;
    if (locationState?.resolved) return locationState.pairwise || [];
    const winner = consensusResult.winner;
    if (!winner || !cards || cards.length === 0) return [];

    const winVoteObj = myVotes.find((v) => v.option_id === winner.id || v.name === winner.name);
    const winScore = winVoteObj ? winVoteObj.score : 1;

    return cards.filter((c) => c.id !== winner.id && c.name !== winner.name).map((rival) => {
      const rivalVoteObj = myVotes.find((v) => v.option_id === rival.id || v.name === rival.name);
      const rivalScore = rivalVoteObj ? rivalVoteObj.score : -1;
      const votesFor = winScore >= rivalScore ? 1 : 0;
      const votesAgainst = rivalScore > winScore ? 1 : 0;
      return {
        opponent: rival.name,
        score: `${votesFor}-${votesAgainst}`,
        margin: `Preferred over ${rival.name} (${votesFor}-${votesAgainst})`,
      };
    });
  }, [serverPairwise, consensusResult.winner, cards, myVotes, locationState]);

  return { consensusResult, pairwiseBreakdown };
}

export function saveConsensusHistory({
  pin,
  topic,
  consensusResult,
  cards = [],
  pairwiseBreakdown = [],
  totalParticipants = 1,
}) {
  if (typeof localStorage === 'undefined' || !consensusResult?.winner) return;
  try {
    const history = JSON.parse(localStorage.getItem('consensus_history') || '[]');
    const optionsList = cards.map((c) => {
      const pw = pairwiseBreakdown.find((p) => p.opponent === c.name);
      return {
        name: c.name,
        category: c.category || 'Venue',
        priceLevel: c.price_level || 2,
        isWinner: c.name === consensusResult.winner.name,
        duelMargin: c.name === consensusResult.winner.name
          ? 'Consensus Winner'
          : (pw ? `Compared with ${consensusResult.winner.name} (${pw.score})` : 'No head-to-head data'),
      };
    });

    const entry = {
      pin,
      topic,
      winner: consensusResult.winner.name,
      status: consensusResult.status,
      support: consensusResult.support,
      supportText: consensusResult.supportText,
      matchScore: consensusResult.matchScore,
      winnerDetails: {
        ...consensusResult.winner,
        name: consensusResult.winner.name,
        priceLevel: consensusResult.winner.price_level || 2,
        distanceKm: consensusResult.winner.distance_km ?? null,
        address: consensusResult.winner.address || 'Local Venue',
        matchScore: consensusResult.matchScore ?? 0,
      },
      options: optionsList,
      pairwiseDuels: pairwiseBreakdown,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      participantsCount: totalParticipants,
      priceLevel: consensusResult.winner.price_level || 2,
    };
    const existingIdx = history.findIndex((h) => h.pin === pin);
    if (existingIdx !== -1) {
      history[existingIdx] = entry;
    } else {
      history.unshift(entry);
    }
    localStorage.setItem('consensus_history', JSON.stringify(history.slice(0, 30)));
  } catch (err) {
    console.warn('[saveConsensusHistory] Local storage notice:', err);
  }
}
