import { useEffect, useRef } from 'react';

export function useLobbySync({
  pin,
  participantId,
  setParticipantId,
  deviceId,
  currentUserName,
  isHost,
  setIsHost,
  setIsVotingActive,
  onTransitionToDeck,
  locationState,
  participants,
  lockedConstraint,
  budgetLimit,
  setMode,
  setTopic,
  setGroupSize,
  setGroupPool,
  setParticipants,
  setVisiblePlacesCount,
  setRemovedPlaceIds,
  setRealOptions,
  navigate,
  emit,
  on,
  off,
  addToast,
}) {
  const propsRef = useRef({});
  propsRef.current = {
    pin,
    participantId,
    setParticipantId,
    deviceId,
    currentUserName,
    isHost,
    setIsHost,
    setIsVotingActive,
    onTransitionToDeck,
    locationState,
    participants,
    lockedConstraint,
    budgetLimit,
    setMode,
    setTopic,
    setGroupSize,
    setGroupPool,
    setParticipants,
    setVisiblePlacesCount,
    setRemovedPlaceIds,
    setRealOptions,
    navigate,
    emit,
    on,
    off,
    addToast,
  };

  const hasNavigatedToDeckRef = useRef(false);
  const lastJoinEmitTsRef = useRef(0);

  useEffect(() => {
    if (!pin) return;
    hasNavigatedToDeckRef.current = false;

    const sendJoin = () => {
      const now = Date.now();
      // Debounce rapid socket connect/mount signals within 1.5s to prevent redundant join emissions
      if (now - lastJoinEmitTsRef.current < 1500) return;
      lastJoinEmitTsRef.current = now;

      const { currentUserName: uName, locationState: lState, participantId: currentPid, deviceId: currentDeviceId } = propsRef.current;
      const hostToken = sessionStorage.getItem(`consensus_host_token_${pin}`);
      emit('join_lobby', {
        pin,
        participant_id: currentPid || participantId,
        device_id: currentDeviceId || deviceId,
        user_name: uName,
        host_token: hostToken || undefined,
        mode: lState?.mode,
        topic: lState?.topic,
        group_size: lState?.groupSize,
        deck_size: lState?.deckSize,
        initial_suggestions: lState?.initialCustomOptions,
      });
    };

    sendJoin();
    on('connect', sendJoin);

    const handleParticipantJoined = (data) => {
      const {
        participantId: currentPid,
        setParticipantId: updatePid,
        deviceId: currentDeviceId,
        setMode,
        setTopic,
        setGroupSize,
        setVisiblePlacesCount,
        setRemovedPlaceIds,
        setGroupPool,
        setParticipants,
        setIsHost,
        locationState,
      } = propsRef.current;

      // Reconcile room-scoped participantId if the server matched our persistent deviceId to an existing participant slot
      if (
        updatePid &&
        data?.participant_id &&
        ((data?.claimed_participant_id && data.claimed_participant_id === currentPid) ||
          (currentDeviceId && data?.device_id === currentDeviceId)) &&
        data.participant_id !== currentPid
      ) {
        updatePid(data.participant_id);
      }

      if (data?.mode) setMode(data.mode);
      if (data?.topic && data.topic !== 'custom' && data.topic !== 'poll') {
        const isBare = ['bars & pubs', 'bars', 'cafes', 'restaurants', 'cinema', 'desserts'].includes(String(data.topic).toLowerCase().trim());
        setTopic((prev) => ((isBare && prev && prev !== 'Where should we go?') ? prev : data.topic));
      }
      if (data?.group_size) setGroupSize(data.group_size);
      if (typeof data?.visible_places_count === 'number' && setVisiblePlacesCount) {
        setVisiblePlacesCount(data.visible_places_count);
      }
      if (Array.isArray(data?.removed_place_ids) && setRemovedPlaceIds) {
        setRemovedPlaceIds(new Set(data.removed_place_ids.map(String)));
      }
      if (Array.isArray(data?.removedOptionIds) && setRemovedPlaceIds) {
        setRemovedPlaceIds(new Set(data.removedOptionIds.map(String)));
      }
      if (Array.isArray(data?.suggestions)) {
        if (data.suggestions.length > 0 || !locationState?.initialCustomOptions?.length) {
          setGroupPool(data.suggestions);
        }
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
          const myRecord = data.participants.find((p) => p.id === (propsRef.current.participantId || participantId));
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
      const { setGroupPool, addToast, currentUserName: uName } = propsRef.current;
      if (Array.isArray(data?.suggestions)) {
        setGroupPool(data.suggestions);
      }
      if (data?.added && data.user_name && data.user_name !== uName) {
        addToast({
          title: 'Option Added',
          message: `${data.user_name} suggested "${data.added}"`,
          type: 'info',
        });
      }
    };

    const handleBudgetUpdated = (data) => {
      const { setParticipants } = propsRef.current;
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
      const { setParticipants, setIsHost, addToast } = propsRef.current;
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
        const myPid = propsRef.current.participantId || participantId;
        const amIHost = Boolean(
          data?.host_id === myPid ||
          (data?.participants && data.participants.find((p) => p.id === myPid)?.isHost)
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
      if (hasNavigatedToDeckRef.current) return;
      const {
        locationState,
        setIsVotingActive,
        onTransitionToDeck,
        addToast,
        isHost,
        navigate,
        lockedConstraint,
        budgetLimit,
      } = propsRef.current;

      if (locationState?.pausedVoting || sessionStorage.getItem(`consensus_pause_voting_${pin}`) === 'true') {
        sessionStorage.setItem(`consensus_pause_voting_${pin}`, 'true');
        console.log('[RoomLobby] User paused voting deck redirect; remaining in lobby.');
        if (setIsVotingActive) setIsVotingActive(true);
        return;
      }

      hasNavigatedToDeckRef.current = true;

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
          participants: (Array.isArray(propsRef.current.participants) ? propsRef.current.participants : []).map((p) => ({
            id: p.id,
            name: p.name,
            isHost: Boolean(p.isHost),
          })),
        },
      });
    };

    const handleRoomError = (data) => {
      const { addToast } = propsRef.current;
      console.warn('[RoomLobby] Room notice from server:', data?.message);
      addToast({
        title: 'Room Notice',
        message: data?.message || 'Notice from server',
        type: 'warning',
      });
    };

    const handleTablePlacesUpdated = (data) => {
      const { setVisiblePlacesCount, setRemovedPlaceIds } = propsRef.current;
      if (typeof data?.visiblePlacesCount === 'number' && setVisiblePlacesCount) {
        setVisiblePlacesCount(data.visiblePlacesCount);
      }
      if (Array.isArray(data?.removedOptionIds) && setRemovedPlaceIds) {
        setRemovedPlaceIds(new Set(data.removedOptionIds.map(String)));
      } else if (data?.removedOptionId && setRemovedPlaceIds) {
        setRemovedPlaceIds((prev) => new Set([...prev, String(data.removedOptionId)]));
      }
    };

    const handleOptionsExpanded = (data) => {
      const { setRealOptions } = propsRef.current;
      const incoming = Array.isArray(data?.newOptions)
        ? data.newOptions
        : Array.isArray(data?.options)
          ? data.options
          : [];
      if (incoming.length > 0 && setRealOptions) {
        setRealOptions((prev) => {
          const existingIds = new Set(prev.map((o) => String(o.id)));
          const toAdd = incoming.filter((o) => !existingIds.has(String(o.id)));
          return [...prev, ...toAdd];
        });
      }
    };

    on('participant_joined', handleParticipantJoined);
    on('lobby_state', handleParticipantJoined);
    on('table_places_updated', handleTablePlacesUpdated);
    on('options_expanded', handleOptionsExpanded);
    on('suggestions_updated', handleSuggestionsUpdated);
    on('budget_updated', handleBudgetUpdated);
    on('participant_left', handleParticipantLeft);
    on('voting_started', handleVotingStarted);
    on('room_error', handleRoomError);

    return () => {
      off('connect', sendJoin);
      off('participant_joined', handleParticipantJoined);
      off('lobby_state', handleParticipantJoined);
      off('table_places_updated', handleTablePlacesUpdated);
      off('options_expanded', handleOptionsExpanded);
      off('suggestions_updated', handleSuggestionsUpdated);
      off('budget_updated', handleBudgetUpdated);
      off('participant_left', handleParticipantLeft);
      off('voting_started', handleVotingStarted);
      off('room_error', handleRoomError);
    };
  }, [pin, emit, on, off]);
}
