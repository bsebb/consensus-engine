import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import SettingsModal from '../components/ui/SettingsModal';
import QrCodeModal from '../components/ui/QrCodeModal';
import StepZeroVault from '../components/lobby/StepZeroVault';
import CandidatePoolDeck from '../components/lobby/CandidatePoolDeck';
import LobbyRoster from '../components/lobby/LobbyRoster';
import LobbyHeader from '../components/lobby/LobbyHeader';
import NoActiveLobbyView from '../components/lobby/NoActiveLobbyView';
import { useLobbySync } from '../hooks/useLobbySync';
import { apiUrl } from '../utils/api';
import { detectUserGps, getSavedExactGps, fetchRoadRouteMetrics } from '../utils/location';
import { triggerHaptic } from '../utils/haptics';
import restaurantsMock from '../mocks/restaurants.json';
import { levenshteinDistance } from '../utils/levenshtein';
import { buildCandidatePool } from '../utils/roomOptionsParser';

export default function RoomLobby() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected, participantId, emit, on, off } = useSocket();
  const { addToast } = useToast();
  const { t } = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isTransitioningToDeckRef = useRef(false);
  const isPrefetchingRef = useRef(false);

  const [isHost, setIsHost] = useState(() => Boolean(
    location.state?.isHost || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`consensus_host_${pin}`) === 'true')
  ));
  const currentUserName = location.state?.userName || localStorage.getItem('consensus_user_name') || (isHost ? 'Host' : 'Friend');
  const [groupSize, setGroupSize] = useState(location.state?.groupSize || 2);
  const [mode, setMode] = useState(location.state?.mode || 'DISCOVERY');
  const [topic, setTopic] = useState(location.state?.topic || 'Where should we go?');

  const [participants, setParticipants] = useState(() => [
    { id: participantId || 'host_1', name: currentUserName, isHost, budgetSealed: false },
  ]);

  // Instant 1-tap Budget Filter State
  const [budgetLimit, setBudgetLimit] = useState(600);
  const [lockedConstraint, setLockedConstraint] = useState(false);

  // Custom Suggestions State
  const [suggestion, setSuggestion] = useState('');
  const [groupPool, setGroupPool] = useState(() => {
    return Array.isArray(location.state?.initialCustomOptions) && location.state.initialCustomOptions.length > 0
      ? location.state.initialCustomOptions
      : [];
  });
  const [copied, setCopied] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Real room venue options loaded from database/Foursquare
  const [realOptions, setRealOptions] = useState(() => location.state?.roomData?.options || []);
  const [loadingOptions, setLoadingOptions] = useState(() => (
    (location.state?.mode || 'DISCOVERY') !== 'CUSTOM' &&
    (!location.state?.roomData?.options || location.state?.roomData?.options.length === 0)
  ));
  const [userGps, setUserGps] = useState(() => getSavedExactGps());
  const [roadRoutes, setRoadRoutes] = useState({});
  const [visiblePlacesCount, setVisiblePlacesCount] = useState(() => location.state?.deckSize || 12);
  const [removedPlaceIds, setRemovedPlaceIds] = useState(() => new Set());
  const [isVotingActive, setIsVotingActive] = useState(() => (
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`consensus_pause_voting_${pin}`) === 'true'
  ));

  useEffect(() => {
    let mounted = true;
    detectUserGps().then((res) => {
      if (mounted && res.isExact && res.lat != null && res.lng != null) {
        setUserGps({ lat: res.lat, lng: res.lng });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!pin) return;
    // Optimization: Skip network fetch if options were already passed in navigation state
    if (location.state?.roomData?.options && location.state.roomData.options.length > 0) {
      setLoadingOptions(false);
      return;
    }

    setLoadingOptions(true);
    fetch(apiUrl(`/api/v1/rooms/${pin}`))
      .then((res) => {
        if (!res.ok) throw new Error('ROOM_NOT_FOUND');
        return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.mode) setMode(data.mode);
          const safeTopic = (data.topic && data.topic !== 'custom' && data.topic !== 'poll')
            ? data.topic
            : (data.theme && data.theme.startsWith('custom:')
              ? data.theme.replace(/^custom:/, '').trim()
              : null);
          if (safeTopic && safeTopic !== 'custom' && safeTopic !== 'poll') {
            setTopic(safeTopic);
          }
          if (Array.isArray(data.options) && data.options.length > 0) {
            setRealOptions(data.options);
          }
        }
      })
      .catch((err) => {
        console.warn('[RoomLobby] Room fetch notice:', err.message);
        addToast({
          title: 'Room Not Found',
          message: `Room #${pin} could not be loaded or is expired.`,
          type: 'error',
        });
        localStorage.removeItem('consensus_active_pin');
        sessionStorage.removeItem('consensus_active_pin');
        sessionStorage.removeItem(`consensus_host_${pin}`);
        navigate('/');
      })
      .finally(() => setLoadingOptions(false));
  }, [pin]);

  useEffect(() => {
    if (pin) localStorage.setItem('consensus_active_pin', pin);

    const handleBeforeUnload = () => {
      if (pin && participantId) {
        emit('leave_lobby', { pin, participant_id: participantId, user_name: currentUserName });
      }
    };

    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (!isTransitioningToDeckRef.current && pin) {
        emit('leave_lobby', { pin, participant_id: participantId, user_name: currentUserName });
        emit('leave_room', { pin, participant_id: participantId });
        localStorage.removeItem('consensus_active_pin');
        sessionStorage.removeItem('consensus_active_pin');
        sessionStorage.removeItem(`consensus_host_${pin}`);
        sessionStorage.removeItem(`consensus_pause_voting_${pin}`);
      }
    };
  }, [pin, participantId, currentUserName, emit]);

  const handleLeaveLobby = () => {
    isTransitioningToDeckRef.current = false;
    if (pin) {
      emit('leave_lobby', { pin, participant_id: participantId, user_name: currentUserName });
      emit('leave_room', { pin, participant_id: participantId });
      localStorage.removeItem('consensus_active_pin');
      sessionStorage.removeItem('consensus_active_pin');
      sessionStorage.removeItem(`consensus_host_${pin}`);
      sessionStorage.removeItem(`consensus_pause_voting_${pin}`);
    }
    navigate('/');
  };

  const handleResumeVoting = () => {
    sessionStorage.removeItem(`consensus_pause_voting_${pin}`);
    isTransitioningToDeckRef.current = true;
    navigate(`/deck/${pin}`, {
      state: {
        mode,
        topic,
        isHost: Boolean(isHost),
        totalParticipants: Math.max(1, participants.length),
        customCards: displayedCandidates.length > 0 ? displayedCandidates : undefined,
        budgetLimit: lockedConstraint ? budgetLimit : undefined,
      },
    });
  };

  useLobbySync({
    pin,
    participantId,
    currentUserName,
    isHost,
    setIsHost,
    setIsVotingActive,
    onTransitionToDeck: () => {
      isTransitioningToDeckRef.current = true;
    },
    locationState: location.state,
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
  });

  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      triggerHaptic('tap');
      setCopied(true);
      addToast({ title: 'Room Code Copied', message: `Code #${pin} copied to clipboard`, type: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({ title: 'Room Code', message: `Share code ${pin} with your friends`, type: 'info' });
    }
  };

  const handleShareInvite = async () => {
    const inviteUrl = `${window.location.origin}/?pin=${pin}`;
    if (navigator.share) {
      try {
        triggerHaptic('tap');
        await navigator.share({ title: `Join Room #${pin}`, text: `Vote on "${topic}" with me!`, url: inviteUrl });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      triggerHaptic('tap');
      setCopied(true);
      addToast({ title: 'Invite Link Copied', message: 'Paste the link in your group chat!', type: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      handleCopyPin();
    }
  };

  // Instant 1-tap budget tier handler
  const handleSelectBudgetTier = async (newLimit, shouldFilter) => {
    setBudgetLimit(newLimit);
    setLockedConstraint(shouldFilter);
    const max_price_level = !shouldFilter ? 4 : newLimit <= 180 ? 1 : newLimit <= 350 ? 2 : 3;
    if (shouldFilter) {
      fetch(apiUrl(`/api/v1/rooms/${pin}/constraints`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: participantId, max_price_level, max_budget: newLimit }),
      }).catch(() => {});
    }
    emit('update_budget', { pin, participant_id: participantId, budgetSealed: shouldFilter, budgetLimit: newLimit });
    setParticipants((prev) =>
      prev.map((p) => (p.name === currentUserName || p.id === participantId ? { ...p, budgetSealed: shouldFilter } : p))
    );
  };

  // Candidate pool resolution from live database options + custom suggestions
  const candidatePoolPreview = useMemo(() => {
    return buildCandidatePool({
      mode,
      groupPool,
      realOptions,
      category: location.state?.category,
      userGps,
      roadRoutes,
      mockPool: restaurantsMock,
    });
  }, [mode, groupPool, realOptions, location.state?.category, userGps, roadRoutes]);

  // Query OSRM street network for real road distance & travel time from user's exact coordinates
  useEffect(() => {
    if (!userGps || mode === 'CUSTOM') return;
    const venuesWithCoords = candidatePoolPreview.filter((v) => !v.isCustom && v.lat != null && v.lng != null);
    if (venuesWithCoords.length === 0) return;

    let cancelled = false;
    fetchRoadRouteMetrics(userGps.lat, userGps.lng, venuesWithCoords).then((map) => {
      if (!cancelled && map && Object.keys(map).length > 0) {
        setRoadRoutes((prev) => ({ ...prev, ...map }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userGps, realOptions, mode]);

  // Duplicate check across both custom and discovery options
  const duplicateMatch = useMemo(() => {
    const clean = suggestion.trim().toLowerCase();
    if (clean.length < 3) return null;
    const match = candidatePoolPreview.find(
      (item) => levenshteinDistance(item.name.toLowerCase(), clean) <= 2
    );
    return match ? match.name : null;
  }, [suggestion, candidatePoolPreview]);

  const handleAddSuggestion = (e) => {
    e.preventDefault();
    const clean = suggestion.trim();
    if (!clean) return;

    if (duplicateMatch) {
      addToast({
        title: 'Already Listed',
        message: `"${duplicateMatch}" is already on the table.`,
        type: 'warning',
      });
      return;
    }

    emit('add_suggestion', {
      pin,
      suggestion: clean,
      participant_id: participantId,
      user_name: currentUserName,
    });

    setGroupPool((prev) => (prev.some((s) => s.toLowerCase() === clean.toLowerCase()) ? prev : [...prev, clean]));
    setSuggestion('');
  };

  const handleQuickAddSuggestion = (ideaText) => {
    const clean = String(ideaText || '').trim();
    if (!clean || groupPool.some((s) => s.toLowerCase() === clean.toLowerCase())) return;
    emit('add_suggestion', { pin, suggestion: clean, participant_id: participantId, user_name: currentUserName });
    setGroupPool((prev) => [...prev, clean]);
  };

  const handleRemoveSuggestion = (idx) => {
    const target = groupPool[idx];
    if (target) emit('remove_suggestion', { pin, suggestion: target });
    setGroupPool((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleShuffleCandidates = () => {
    triggerHaptic('selection');
    const shuffleList = (prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };
    if (realOptions && realOptions.length > 0) setRealOptions(shuffleList);
    else if (groupPool && groupPool.length > 0) setGroupPool(shuffleList);
    addToast({ title: t('placesShuffledTitle'), message: t('placesShuffledDesc'), type: 'info' });
  };

  const handleReportClosedVenue = (venue) => {
    if (!venue?.name) return;
    setRealOptions((prev) => prev.filter((opt) => opt.name !== venue.name));
    setGroupPool((prev) => prev.filter((name) => name !== venue.name));
    addToast({ title: t('closedReportedTitle'), message: t('closedReportedDesc'), type: 'info' });
  };

  useEffect(() => {
    if (isHost && Array.isArray(location.state?.initialCustomOptions) && location.state.initialCustomOptions.length > 0) {
      location.state.initialCustomOptions.forEach((opt) => {
        emit('add_suggestion', {
          pin,
          suggestion: opt,
          participant_id: participantId,
          user_name: currentUserName,
        });
      });
    }
  }, []);

  const maxBudgetLevel = !lockedConstraint ? 4 : budgetLimit <= 180 ? 1 : budgetLimit <= 350 ? 2 : 3;
  const filteredCandidates = useMemo(() => {
    if (!lockedConstraint || mode === 'CUSTOM') return candidatePoolPreview;
    return candidatePoolPreview.filter((item) => (item.price_level || 2) <= maxBudgetLevel);
  }, [candidatePoolPreview, lockedConstraint, mode, maxBudgetLevel]);

  const activePool = useMemo(() => {
    if (mode === 'CUSTOM') return filteredCandidates;
    return filteredCandidates.filter((item) => !removedPlaceIds.has(String(item.id)) && !removedPlaceIds.has(item.id));
  }, [mode, filteredCandidates, removedPlaceIds]);

  const displayedCandidates = useMemo(() => {
    if (mode === 'CUSTOM') return activePool;
    return activePool.slice(0, visiblePlacesCount);
  }, [mode, activePool, visiblePlacesCount]);

  const remainingPoolCount = useMemo(() => {
    if (mode === 'CUSTOM') return 0;
    return Math.max(0, activePool.length - displayedCandidates.length);
  }, [mode, activePool.length, displayedCandidates.length]);

  const prunedCount = lockedConstraint && mode !== 'CUSTOM'
    ? candidatePoolPreview.length - filteredCandidates.length
    : 0;

  const handleAddNextPlace = (count = 1) => {
    if (mode === 'CUSTOM' || remainingPoolCount <= 0) return;
    triggerHaptic('selection');
    const inc = typeof count === 'number' ? count : 1;
    const nextCount = Math.min(activePool.length, visiblePlacesCount + inc);
    setVisiblePlacesCount(nextCount);
    emit('add_discovery_place', { pin, count: inc });

    // When remaining pool gets low (<= 5 remaining), prefetch 10 more locations in the background!
    if (remainingPoolCount <= 5 && realOptions.length < 50 && !isPrefetchingRef.current) {
      isPrefetchingRef.current = true;
      fetch(apiUrl(`/api/v1/rooms/${pin}/more-places`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: userGps?.lat, longitude: userGps?.lng, is_exact_gps: Boolean(userGps) }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.options && Array.isArray(data.options)) {
            setRealOptions((prev) => {
              const existingIds = new Set(prev.map((o) => String(o.id)));
              const toAdd = data.options.filter((o) => !existingIds.has(String(o.id)));
              return [...prev, ...toAdd];
            });
          }
        })
        .catch(() => {})
        .finally(() => { isPrefetchingRef.current = false; });
    }
  };

  const handleRemovePlace = (item) => {
    if (!item?.id) return;
    triggerHaptic('tap');
    const strId = String(item.id);
    setRemovedPlaceIds((prev) => new Set([...prev, strId]));
    emit('remove_discovery_place', { pin, option_id: strId });
    addToast({ title: 'Place Removed', message: `"${item.name}" removed from table`, type: 'info' });
  };

  const handleStartVoting = () => {
    triggerHaptic('selection');
    const cardsToPass = displayedCandidates;
    if (cardsToPass.length < 2) {
      addToast({ title: t('addAtLeastTwoTitle'), message: t('addAtLeastTwoMsg'), type: 'warning' });
      return;
    }
    const activeParticipantCount = Math.max(1, participants.length);
    const hostToken = sessionStorage.getItem(`consensus_host_token_${pin}`);
    emit('host_start_voting', { pin, host_id: participantId, host_token: hostToken || undefined, options: cardsToPass, topic, mode });

    isTransitioningToDeckRef.current = true;
    sessionStorage.setItem(`consensus_host_${pin}`, 'true');
    navigate(`/deck/${pin}`, {
      state: {
        mode,
        topic,
        isHost: true,
        totalParticipants: activeParticipantCount,
        customCards: cardsToPass,
        budgetLimit: lockedConstraint ? budgetLimit : undefined,
      },
    });
  };

  if (!pin) {
    return <NoActiveLobbyView navigate={navigate} setSettingsOpen={setSettingsOpen} />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-[100dvh] pb-36 sm:pb-40 select-none">
      <LobbyHeader
        pin={pin}
        copied={copied}
        onLeave={handleLeaveLobby}
        onCopyPin={handleCopyPin}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {!isConnected && (
        <div className="bg-amber-500/15 border-b border-amber-500/25 px-4 py-1.5 text-center flex items-center justify-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>{t('reconnecting')}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="px-4 pt-3.5 flex flex-col gap-3.5 flex-1 max-w-md mx-auto w-full">
        {isVotingActive && (
          <div className="bg-emerald-500/15 border border-emerald-500/25 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-emerald-700 dark:text-emerald-300 shadow-xs animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">{t('votingInProgress')}</span>
            </div>
            <button
              type="button"
              onClick={handleResumeVoting}
              className="font-bold underline cursor-pointer active:opacity-70"
            >
              {t('resume')} →
            </button>
          </div>
        )}

        {/* Compact Room Header & Roster */}
        <LobbyRoster
          topic={topic}
          participants={participants}
          handleShareInvite={handleShareInvite}
          setQrModalOpen={setQrModalOpen}
        />

        {/* 1-Tap Anonymous Price Filter (Hidden in Custom Poll mode) */}
        {mode !== 'CUSTOM' && (
          <StepZeroVault
            lockedConstraint={lockedConstraint}
            budgetLimit={budgetLimit}
            onSelectTier={handleSelectBudgetTier}
          />
        )}

        {/* Curated Places / Custom Options on the Table */}
        <CandidatePoolDeck
          mode={mode}
          topic={topic}
          isLoading={loadingOptions}
          candidates={displayedCandidates}
          remainingPoolCount={remainingPoolCount}
          lockedConstraint={lockedConstraint}
          prunedCount={prunedCount}
          suggestion={suggestion}
          setSuggestion={setSuggestion}
          handleAddSuggestion={handleAddSuggestion}
          handleQuickAddSuggestion={handleQuickAddSuggestion}
          handleRemoveSuggestion={handleRemoveSuggestion}
          handleAddNextPlace={handleAddNextPlace}
          handleRemovePlace={handleRemovePlace}
          duplicateMatch={duplicateMatch}
          onShuffle={handleShuffleCandidates}
          onReportClosed={handleReportClosedVenue}
        />
      </main>

      {/* Fixed Bottom Start Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-[var(--bg-root)]/85 backdrop-blur-xl border-t border-[var(--border-main)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.15)]">
        <div className="max-w-md mx-auto">
          {isVotingActive ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleResumeVoting}
              icon={ArrowRight}
              className="w-full h-13 shadow-[0_8px_24px_var(--accent-glow)] font-bold text-base rounded-2xl active:scale-[0.98] transition-transform bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {t('resumeVoting')}
            </Button>
          ) : isHost ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleStartVoting}
              icon={ArrowRight}
              className="w-full h-13 shadow-[0_8px_24px_var(--accent-glow)] font-bold text-base rounded-2xl active:scale-[0.98] transition-transform"
            >
              {t('startVoting')} • {displayedCandidates.length}{' '}
              {mode === 'CUSTOM' ? t('optionsSuffix') : t('placesSuffix')}
            </Button>
          ) : (
            <div className="py-2.5 px-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] text-center flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {t('waitingFriendsTitle')}
              </span>
            </div>
          )}
        </div>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <QrCodeModal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} pin={pin} topic={topic} />
    </div>
  );
}
