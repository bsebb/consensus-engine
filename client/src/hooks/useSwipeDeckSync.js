import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../utils/api';

export function useSwipeDeckSync({
  pin,
  participantId,
  deviceId,
  isHost,
  cards,
  myVotes,
  currentIndex,
  showWinner,
  locationState,
  setCards,
  setVotesReceived,
  setQuorumTotal,
  setVotedParticipantIds,
  setServerWinner,
  setServerMatchScore,
  setServerPairwise,
  setServerStatus,
  setServerSupport,
  setServerSupportText,
  setServerTieBroken,
  setShowWinner,
  onAlreadyVoted,
  onBallotRestore,
  onRoomError,
  isConnected = false,
  emit,
  on,
  off,
}) {
  // Ensure socket is registered in the room on mount and reconnection
  useEffect(() => {
    if (!pin || showWinner) return;
    const registerSocket = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      emit('join_room', { pin, participant_id: participantId, device_id: deviceId, is_host: isHost });
    };

    registerSocket();
    on('connect', registerSocket);

    // Self-healing synchronization every 4s while swiping or awaiting quorum (stops once winner is resolved)
    const syncInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        registerSocket();
      }
    }, 15000);

    return () => {
      clearInterval(syncInterval);
      off('connect', registerSocket);
    };
  }, [pin, participantId, deviceId, isHost, isConnected, showWinner, emit, on, off]);

  const propsRef = useRef({});
  const winnerHandlerRef = useRef(null);
  useEffect(() => {
    propsRef.current = {
      cards,
      myVotes,
      locationState,
      setCards,
      setVotesReceived,
      setQuorumTotal,
      setVotedParticipantIds,
      setServerWinner,
      setServerMatchScore,
      setServerPairwise,
      setServerStatus,
      setServerSupport,
      setServerSupportText,
      setServerTieBroken,
      setShowWinner,
      onAlreadyVoted,
      onBallotRestore,
      onRoomError,
    };
  });

  // Global room resolution and real-time progress listeners
  useEffect(() => {
    if (!pin) return;

    const handleVoteProgress = (data) => {
      const { setVotesReceived, setQuorumTotal, setVotedParticipantIds } = propsRef.current;
      if (data?.voted_participants || data?.votes_received) {
        setVotesReceived(data.voted_participants || data.votes_received);
      }
      if (data?.total_participants && typeof data.total_participants === 'number') {
        setQuorumTotal(data.total_participants);
      }
      if (Array.isArray(data?.voted_participant_ids) && setVotedParticipantIds) {
        setVotedParticipantIds(data.voted_participant_ids);
      }
    };

    const handleWinner = (data) => {
      console.log('[SwipeDeck] Received winner from server:', data);
      const {
        setServerWinner, setServerMatchScore, setServerPairwise,
        setServerStatus, setServerSupport, setServerSupportText, setServerTieBroken,
        setShowWinner, cards: currentCards,
      } = propsRef.current;
      const won = data?.winning_option || data?.winner;
      if (won) {
        setServerWinner(won);
      } else if (data?.winningOptionId) {
        const found = currentCards.find((c) => c.id === data.winningOptionId);
        setServerWinner(found || { name: 'Consensus Winner', id: data.winningOptionId });
      }
      if (data?.matchScore != null || data?.match_score != null) {
        setServerMatchScore(data.matchScore ?? data.match_score);
      }
      if (data?.pairwise && Array.isArray(data.pairwise)) {
        setServerPairwise(data.pairwise);
      }
      if (setServerStatus && data?.status) {
        setServerStatus(data.status);
      }
      if (setServerSupport && data?.support) {
        setServerSupport(data.support);
      }
      if (setServerSupportText && data?.supportText) {
        setServerSupportText(data.supportText);
      }
      if (setServerTieBroken && data?.tieBroken !== undefined) {
        setServerTieBroken(data.tieBroken);
      }
      setShowWinner(true);
    };

    const handleStateRestore = (data) => {
      console.log('[SwipeDeck] State restore received:', data);
      const { setCards, setVotesReceived, setQuorumTotal, setVotedParticipantIds, onAlreadyVoted } = propsRef.current;
      if (Array.isArray(data?.options) && data.options.length > 0) {
        const currentIds = propsRef.current.cards?.map(c => c.id) || [];
        if (JSON.stringify(currentIds) !== JSON.stringify(data.options.map(c => c.id))) setCards(data.options);
        propsRef.current.onBallotRestore?.(data.options);
      }
      if (data?.voted_participants || data?.votes_received) {
        setVotesReceived(data.voted_participants || data.votes_received);
      }
      if (data?.total_participants) {
        setQuorumTotal(data.total_participants);
      }
      if (Array.isArray(data?.voted_participant_ids) && setVotedParticipantIds) {
        setVotedParticipantIds(data.voted_participant_ids);
      }
      if (data?.already_voted && onAlreadyVoted) {
        onAlreadyVoted(data.options?.length);
      }
    };

    const handleVotingStarted = (data) => {
      const { setCards } = propsRef.current;
      if (Array.isArray(data?.options) && data.options.length > 0 && !propsRef.current.myVotes?.length) {
        setCards(data.options);
      }
    };

    winnerHandlerRef.current = handleWinner;
    const handleError = data => propsRef.current.onRoomError?.(data);
    on('room_error', handleError);
    on('ballot_error', handleError);
    on('vote_progress', handleVoteProgress);
    on('vote_status_update', handleVoteProgress);
    on('MATCH_FOUND', handleWinner);
    on('winner_announced', handleWinner);
    on('state_restore', handleStateRestore);
    on('voting_started', handleVotingStarted);

    return () => {
      off('room_error', handleError);
      off('ballot_error', handleError);
      off('vote_progress', handleVoteProgress);
      off('vote_status_update', handleVoteProgress);
      off('MATCH_FOUND', handleWinner);
      off('winner_announced', handleWinner);
      off('state_restore', handleStateRestore);
      off('voting_started', handleVotingStarted);
    };
  }, [pin, isConnected, on, off]);

  const hasSubmittedRef = useRef(false);
  const [retryVersion, setRetryVersion] = useState(0);
  useEffect(() => {
    if (showWinner || !myVotes.length || currentIndex < cards.length) return;
    const retry = setInterval(() => { hasSubmittedRef.current = false; setRetryVersion(v => v + 1); }, 5000);
    return () => clearInterval(retry);
  }, [showWinner, myVotes.length, currentIndex, cards.length]);
  useEffect(() => {
    if (!isConnected) hasSubmittedRef.current = false;
  }, [isConnected]);

  // Submit votes once all cards are swiped
  useEffect(() => {
    if (isConnected && currentIndex >= cards.length && !showWinner && !hasSubmittedRef.current && myVotes.length > 0) {
      hasSubmittedRef.current = true;

      // 1. Submit ballot via real-time WebSocket
      emit('submit_ballot', {
        pin,
        participant_id: participantId,
        device_id: deviceId,
        rankings: myVotes,
      });

      emit('notify_votes_submitted', { pin, participant_id: participantId, device_id: deviceId });

      // 2. Fallback REST submission
      fetch(apiUrl(`/api/v1/rooms/${pin}/votes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          device_id: deviceId,
          rankings: myVotes,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && (data.winner || data.winning_option)) {
            winnerHandlerRef.current?.(data);
          }
        })
        .catch((err) => console.warn('[SwipeDeck] REST ballot submission notice:', err));
    }
  }, [retryVersion, isConnected, currentIndex, cards.length, showWinner, myVotes, pin, participantId, deviceId, emit, setServerWinner, setServerMatchScore, setServerPairwise, setShowWinner]);
}
