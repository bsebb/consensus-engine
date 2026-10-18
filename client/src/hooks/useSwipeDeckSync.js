import { useEffect, useRef } from 'react';
import { apiUrl } from '../utils/api';

export function useSwipeDeckSync({
  pin,
  participantId,
  isHost,
  cards,
  myVotes,
  currentIndex,
  showWinner,
  locationState,
  setCards,
  setVotesReceived,
  setQuorumTotal,
  setServerWinner,
  setServerMatchScore,
  setServerPairwise,
  setShowWinner,
  emit,
  on,
  off,
}) {
  // Ensure socket is registered in the room on mount and reconnection
  useEffect(() => {
    if (!pin) return;
    const registerSocket = () => {
      emit('join_room', { pin, participant_id: participantId, is_host: isHost });
    };
    registerSocket();
    on('connect', registerSocket);
    return () => {
      off('connect', registerSocket);
    };
  }, [pin, participantId, isHost, emit, on, off]);

  // Global room resolution and real-time progress listeners
  useEffect(() => {
    if (!pin) return;

    const handleVoteProgress = (data) => {
      if (data?.voted_participants || data?.votes_received) {
        setVotesReceived(data.voted_participants || data.votes_received);
      }
      if (data?.total_participants && typeof data.total_participants === 'number') {
        setQuorumTotal(data.total_participants);
      }
    };

    const handleWinner = (data) => {
      console.log('[SwipeDeck] Received winner from server:', data);
      const won = data?.winning_option || data?.winner;
      if (won) {
        setServerWinner(won);
      } else if (data?.winningOptionId) {
        const found = cards.find((c) => c.id === data.winningOptionId);
        setServerWinner(found || { name: 'Consensus Winner', id: data.winningOptionId });
      }
      if (data?.matchScore || data?.match_score) {
        setServerMatchScore(data.matchScore || data.match_score);
      }
      if (data?.pairwise && Array.isArray(data.pairwise)) {
        setServerPairwise(data.pairwise);
      }
      setShowWinner(true);
    };

    const handleStateRestore = (data) => {
      console.log('[SwipeDeck] State restore received:', data);
      if (Array.isArray(data?.options) && data.options.length > 0 && !locationState?.customCards) {
        setCards(data.options);
      }
      if (data?.voted_participants || data?.votes_received) {
        setVotesReceived(data.voted_participants || data.votes_received);
      }
      if (data?.total_participants) {
        setQuorumTotal(data.total_participants);
      }
    };

    on('vote_progress', handleVoteProgress);
    on('vote_status_update', handleVoteProgress);
    on('MATCH_FOUND', handleWinner);
    on('winner_announced', handleWinner);
    on('state_restore', handleStateRestore);

    return () => {
      off('vote_progress', handleVoteProgress);
      off('vote_status_update', handleVoteProgress);
      off('MATCH_FOUND', handleWinner);
      off('winner_announced', handleWinner);
      off('state_restore', handleStateRestore);
    };
  }, [pin, on, off, cards, locationState, setVotesReceived, setQuorumTotal, setServerWinner, setServerMatchScore, setServerPairwise, setShowWinner, setCards]);

  const hasSubmittedRef = useRef(false);

  // Submit votes once all cards are swiped
  useEffect(() => {
    if (currentIndex >= cards.length && !showWinner && !hasSubmittedRef.current && myVotes.length > 0) {
      hasSubmittedRef.current = true;

      // 1. Submit ballot via real-time WebSocket
      emit('submit_ballot', {
        pin,
        participant_id: participantId,
        rankings: myVotes,
      });

      emit('notify_votes_submitted', { pin, participant_id: participantId });

      // 2. Fallback REST submission
      fetch(apiUrl(`/api/v1/rooms/${pin}/votes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          rankings: myVotes,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && (data.winner || data.winning_option)) {
            const won = data.winner || data.winning_option;
            setServerWinner(won);
            if (data.matchScore) setServerMatchScore(data.matchScore);
            if (data.pairwise) setServerPairwise(data.pairwise);
            setShowWinner(true);
          }
        })
        .catch((err) => console.warn('[SwipeDeck] REST ballot submission notice:', err));
    }
  }, [currentIndex, cards.length, showWinner, myVotes, pin, participantId, emit, setServerWinner, setServerMatchScore, setServerPairwise, setShowWinner]);
}
