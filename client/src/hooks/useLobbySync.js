import { useEffect } from 'react';

export function useLobbySync({
  pin,
  participantId,
  currentUserName,
  isHost,
  setIsHost,
  onTransitionToDeck,
  locationState,
  lockedConstraint,
  budgetLimit,
  setMode,
  setTopic,
  setGroupSize,
  setGroupPool,
  setParticipants,
  navigate,
  emit,
  on,
  off,
  addToast,
}) {
  useEffect(() => {
    if (!pin) return;

    const sendJoin = () => {
      emit('join_lobby', {
        pin,
        participant_id: participantId,
        user_name: currentUserName,
        mode: locationState?.mode,
        topic: locationState?.topic,
        group_size: locationState?.groupSize,
      });
    };

    sendJoin();
    on('connect', sendJoin);

    const handleParticipantJoined = (data) => {
      if (data?.mode) setMode(data.mode);
      if (data?.topic) setTopic(data.topic);
      if (data?.group_size) setGroupSize(data.group_size);
      if (Array.isArray(data?.suggestions)) {
        setGroupPool(data.suggestions);
      }
      if (data?.participants && Array.isArray(data.participants)) {
        setParticipants(
          data.participants.map((p) => ({
            id: p.id,
            name: p.name || p.userName || 'Peer',
            isHost: Boolean(p.isHost),
            budgetSealed: Boolean(p.budgetSealed),
          }))
        );

        if (setIsHost) {
          const myRecord = data.participants.find((p) => p.id === participantId);
          if (myRecord?.isHost) {
            setIsHost(true);
            sessionStorage.setItem(`consensus_host_${pin}`, 'true');
          }
        }
      } else if (data?.user_name) {
        setParticipants((prev) => {
          if (prev.some((p) => p.id === data.participant_id || p.name === data.user_name)) return prev;
          return [...prev, { id: data.participant_id, name: data.user_name, isHost: false, budgetSealed: false }];
        });
      }
    };

    const handleSuggestionsUpdated = (data) => {
      if (Array.isArray(data?.suggestions)) {
        setGroupPool(data.suggestions);
      }
      if (data?.added && data.user_name && data.user_name !== currentUserName) {
        addToast({
          title: 'Option Added',
          message: `${data.user_name} suggested "${data.added}"`,
          type: 'info',
        });
      }
    };

    const handleBudgetUpdated = (data) => {
      if (data?.participants && Array.isArray(data.participants)) {
        setParticipants(
          data.participants.map((p) => ({
            id: p.id,
            name: p.name || p.userName || 'Peer',
            isHost: Boolean(p.isHost),
            budgetSealed: Boolean(p.budgetSealed),
          }))
        );
      } else if (data?.participant_id) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === data.participant_id
              ? { ...p, budgetSealed: Boolean(data.budgetSealed) }
              : p
          )
        );
      }
    };

    const handleParticipantLeft = (data) => {
      if (data?.participants && Array.isArray(data.participants)) {
        setParticipants(
          data.participants.map((p) => ({
            id: p.id,
            name: p.name || p.userName || 'Peer',
            isHost: Boolean(p.isHost),
            budgetSealed: Boolean(p.budgetSealed),
          }))
        );
      } else if (data?.participant_id) {
        setParticipants((prev) => prev.filter((p) => p.id !== data.participant_id));
      }

      if (setIsHost) {
        const amIHost = Boolean(
          data?.host_id === participantId ||
          (data?.participants && data.participants.find((p) => p.id === participantId)?.isHost)
        );
        if (amIHost) {
          setIsHost(true);
          sessionStorage.setItem(`consensus_host_${pin}`, 'true');
          addToast({
            title: 'You Are Now Host',
            message: 'The previous host left. You can now start voting when ready.',
            type: 'info',
          });
        }
      }

      if (data?.user_name) {
        addToast({
          title: 'Participant Left',
          message: `${data.user_name} left the room.`,
          type: 'info',
        });
      }
    };

    const handleVotingStarted = (data) => {
      if (onTransitionToDeck) {
        onTransitionToDeck();
      }

      addToast({
        title: 'Voting Started',
        message: 'Entering the Swipe Deck now...',
        type: 'info',
      });

      const options = data?.options || [];
      const sessionTopic = data?.topic || locationState?.topic;
      const sessionMode = data?.mode || locationState?.mode;
      if (isHost) {
        sessionStorage.setItem(`consensus_host_${pin}`, 'true');
      }
      navigate(`/deck/${pin}`, {
        state: {
          mode: sessionMode,
          topic: sessionTopic,
          isHost: Boolean(isHost),
          totalParticipants: data?.total_participants || 1,
          customCards: options.length > 0 ? options : undefined,
          budgetLimit: lockedConstraint ? budgetLimit : undefined,
        },
      });
    };

    const handleRoomError = (data) => {
      console.warn('[RoomLobby] Room notice from server:', data?.message);
      addToast({
        title: 'Room Notice',
        message: data?.message || 'Notice from server',
        type: 'warning',
      });
    };

    on('participant_joined', handleParticipantJoined);
    on('lobby_state', handleParticipantJoined);
    on('suggestions_updated', handleSuggestionsUpdated);
    on('budget_updated', handleBudgetUpdated);
    on('participant_left', handleParticipantLeft);
    on('voting_started', handleVotingStarted);
    on('room_error', handleRoomError);

    return () => {
      off('connect', sendJoin);
      off('participant_joined', handleParticipantJoined);
      off('lobby_state', handleParticipantJoined);
      off('suggestions_updated', handleSuggestionsUpdated);
      off('budget_updated', handleBudgetUpdated);
      off('participant_left', handleParticipantLeft);
      off('voting_started', handleVotingStarted);
      off('room_error', handleRoomError);
    };
  }, [pin, participantId, currentUserName, isHost, setIsHost, onTransitionToDeck, locationState, lockedConstraint, budgetLimit, navigate, emit, on, off, addToast, setMode, setTopic, setGroupSize, setGroupPool, setParticipants]);
}
