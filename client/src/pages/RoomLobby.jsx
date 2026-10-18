import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import SettingsModal from '../components/ui/SettingsModal';
import QrCodeModal from '../components/ui/QrCodeModal';
import StepZeroVault from '../components/lobby/StepZeroVault';
import CandidatePoolDeck from '../components/lobby/CandidatePoolDeck';
import LobbyRoster from '../components/lobby/LobbyRoster';
import NoActiveLobbyView from '../components/lobby/NoActiveLobbyView';
import { useLobbySync } from '../hooks/useLobbySync';
import { apiUrl } from '../utils/api';
import { calculateDistanceKm, detectUserGps, getSavedExactGps, fetchRoadRouteMetrics } from '../utils/location';
import restaurantsMock from '../mocks/restaurants.json';
import { deduplicateVenues } from '../utils/venueImages';
import { getDefaultSeedOptions, resolveCuratedOptionPhoto } from '../utils/customOptionService';

function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export default function RoomLobby() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { participantId, emit, on, off } = useSocket();
  const { addToast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isTransitioningToDeckRef = useRef(false);

  const [isHost, setIsHost] = useState(() => {
    return Boolean(
      location.state?.isHost ||
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`consensus_host_${pin}`) === 'true')
    );
  });
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
    if ((location.state?.mode || 'DISCOVERY') === 'CUSTOM') {
      return getDefaultSeedOptions(location.state?.topic);
    }
    return [];
  });
  const [copied, setCopied] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Real room venue options loaded from database/Foursquare
  const [realOptions, setRealOptions] = useState(() => {
    return location.state?.roomData?.options || [];
  });
  const [loadingOptions, setLoadingOptions] = useState(() => {
    return (
      (location.state?.mode || 'DISCOVERY') !== 'CUSTOM' &&
      (!location.state?.roomData?.options || location.state?.roomData?.options.length === 0)
    );
  });
  const [userGps, setUserGps] = useState(() => getSavedExactGps());
  const [roadRoutes, setRoadRoutes] = useState({});

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
    if (!location.state?.roomData?.options || location.state?.roomData?.options.length === 0) {
      setLoadingOptions(true);
    }
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
        localStorage.removeItem('consensus_active_pin');
        sessionStorage.removeItem('consensus_active_pin');
        sessionStorage.removeItem(`consensus_host_${pin}`);
      }
    };
  }, [pin, participantId, currentUserName, emit]);

  const handleLeaveLobby = () => {
    isTransitioningToDeckRef.current = false;
    if (pin) {
      emit('leave_lobby', { pin, participant_id: participantId, user_name: currentUserName });
      localStorage.removeItem('consensus_active_pin');
      sessionStorage.removeItem('consensus_active_pin');
      sessionStorage.removeItem(`consensus_host_${pin}`);
    }
    navigate('/');
  };

  useLobbySync({
    pin,
    participantId,
    currentUserName,
    isHost,
    setIsHost,
    onTransitionToDeck: () => {
      isTransitioningToDeckRef.current = true;
    },
    locationState: location.state,
    initialSuggestions: groupPool,
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
  });

  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      addToast({
        title: 'Room Code Copied',
        message: `Code #${pin} copied to clipboard`,
        type: 'success',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({
        title: 'Room Code',
        message: `Share code ${pin} with your friends`,
        type: 'info',
      });
    }
  };

  const handleShareInvite = async () => {
    const inviteUrl = `${window.location.origin}/?pin=${pin}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join Room #${pin}`,
          text: `Vote on "${topic}" with me!`,
          url: inviteUrl,
        });
      } catch {
        handleCopyPin();
      }
    } else {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        addToast({
          title: 'Invite Link Copied',
          message: 'Paste the link in your group chat!',
          type: 'success',
        });
        setTimeout(() => setCopied(false), 2000);
      } catch {
        handleCopyPin();
      }
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
        body: JSON.stringify({
          participant_id: participantId,
          max_price_level,
          max_budget: newLimit,
        }),
      }).catch(() => {});
    }

    emit('update_budget', {
      pin,
      participant_id: participantId,
      budgetSealed: shouldFilter,
      budgetLimit: newLimit,
    });

    setParticipants((prev) =>
      prev.map((p) =>
        p.name === currentUserName || p.id === participantId
          ? { ...p, budgetSealed: shouldFilter }
          : p
      )
    );
  };

  // Candidate pool resolution from live database options + custom suggestions
  const candidatePoolPreview = useMemo(() => {
    const customItems = groupPool.map((name, idx) => ({
      id: `custom-${idx}-${name}`,
      name,
      category: 'Group Suggestion',
      price_level: 2,
      distance_km: null,
      address: 'Added by group',
      tags: ['Custom'],
      photo_url: resolveCuratedOptionPhoto(name),
      isCustom: true,
      customIndex: idx,
    }));

    if (mode === 'CUSTOM') {
      return customItems;
    }

    let baseList = [];
    if (realOptions && realOptions.length > 0) {
      baseList = realOptions.map((opt) => {
        let dist = null;
        let addr = 'Local Venue';
        let catLabel = location.state?.category || 'Local Favorite';
        let venueLat = null;
        let venueLng = null;

        let photoUrl = null;
        if (opt.googlePlaceId && opt.googlePlaceId.includes('|')) {
          const parts = opt.googlePlaceId.split('|');
          const parsedDist = parseFloat(parts[1]);
          if (!isNaN(parsedDist) && parsedDist > 0) dist = parsedDist;
          if (parts[2]) addr = parts[2];
          if (parts[3]) catLabel = parts[3];
          if (parts[4] && parts[4].includes(',')) {
            const [latStr, lngStr] = parts[4].split(',');
            const pLat = parseFloat(latStr);
            const pLng = parseFloat(lngStr);
            if (!isNaN(pLat) && !isNaN(pLng)) {
              venueLat = pLat;
              venueLng = pLng;
            }
          }
          if (parts[5] && parts[5].startsWith('http')) {
            photoUrl = parts[5];
          }
        }

        const route = roadRoutes[opt.id];
        if (route && route.roadDistanceKm != null) {
          dist = route.roadDistanceKm;
        } else if (userGps && venueLat != null && venueLng != null) {
          dist = calculateDistanceKm(userGps.lat, userGps.lng, venueLat, venueLng);
        } else if (!userGps) {
          dist = null;
        }

        return {
          id: opt.id,
          name: opt.name,
          category: catLabel,
          price_level: opt.priceLevel || 2,
          distance_km: dist,
          drive_minutes: route?.driveMinutes ?? null,
          walk_minutes: route?.walkMinutes ?? null,
          lat: venueLat,
          lng: venueLng,
          tags: [catLabel],
          address: addr,
          photo_url: photoUrl,
          isCustom: false,
        };
      });
    } else {
      let pool = restaurantsMock || [];
      const category = location.state?.category;
      if (category && category !== 'Restaurants') {
        const catLower = category.toLowerCase();
        const matched = pool.filter(
          (r) =>
            r.tags?.some((t) => t.toLowerCase().includes(catLower)) ||
            r.category?.toLowerCase().includes(catLower) ||
            r.name?.toLowerCase().includes(catLower)
        );
        if (matched.length > 0) pool = matched;
      }
      baseList = pool.map((r) => {
        const route = roadRoutes[r.id];
        const dist = route?.roadDistanceKm != null
          ? route.roadDistanceKm
          : userGps && r.lat != null && r.lng != null
          ? calculateDistanceKm(userGps.lat, userGps.lng, r.lat, r.lng)
          : null;
        return {
          ...r,
          distance_km: dist,
          drive_minutes: route?.driveMinutes ?? null,
          walk_minutes: route?.walkMinutes ?? null,
        };
      });
    }

    return deduplicateVenues([...customItems, ...baseList]);
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
    if (!clean) return;
    if (groupPool.some((s) => s.toLowerCase() === clean.toLowerCase())) return;

    emit('add_suggestion', {
      pin,
      suggestion: clean,
      participant_id: participantId,
      user_name: currentUserName,
    });

    setGroupPool((prev) => [...prev, clean]);
  };

  const handleRemoveSuggestion = (idx) => {
    const target = groupPool[idx];
    if (target) {
      emit('remove_suggestion', { pin, suggestion: target });
    }
    setGroupPool((prev) => prev.filter((_, i) => i !== idx));
  };

  const maxBudgetLevel = !lockedConstraint ? 4 : budgetLimit <= 180 ? 1 : budgetLimit <= 350 ? 2 : 3;
  const filteredCandidates = useMemo(() => {
    if (!lockedConstraint || mode === 'CUSTOM') return candidatePoolPreview;
    return candidatePoolPreview.filter((item) => item.isCustom || (item.price_level || 2) <= maxBudgetLevel);
  }, [candidatePoolPreview, lockedConstraint, mode, maxBudgetLevel]);

  const prunedCount = lockedConstraint && mode !== 'CUSTOM'
    ? candidatePoolPreview.length - filteredCandidates.length
    : 0;

  const handleStartVoting = () => {
    const cardsToPass = filteredCandidates.length > 0 ? filteredCandidates : candidatePoolPreview;

    if (cardsToPass.length < 2) {
      addToast({
        title: mode === 'CUSTOM' ? 'Add At Least 2 Options' : 'Add At Least 2 Spots',
        message: 'Add at least 2 options above so everyone can vote.',
        type: 'warning',
      });
      return;
    }

    const activeParticipantCount = Math.max(1, participants.length);

    emit('host_start_voting', {
      pin,
      host_id: participantId,
      options: cardsToPass,
      topic,
      mode,
    });

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
    <div className="flex-1 flex flex-col min-h-[100dvh] pb-28 select-none">
      {/* Solid Opaque Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-root)] border-b border-[var(--border-main)] px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            type="button"
            onClick={handleLeaveLobby}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-3 rounded-full bg-[var(--bg-surface)] border border-[var(--border-main)]"
            aria-label="Leave Room"
          >
            <LogOut size={13} />
            <span>Home</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)]">
            <span className="text-[var(--text-tertiary)] font-normal">Code</span>
            <span className="text-[var(--accent-bg)] tabular-nums">{pin}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Open Settings"
              title="Preferences"
            >
              <Settings size={16} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-3.5 flex flex-col gap-3.5 flex-1 max-w-md mx-auto w-full">
        {/* Compact Room Header & Roster */}
        <LobbyRoster
          pin={pin}
          topic={topic}
          participants={participants}
          groupSize={groupSize}
          copied={copied}
          handleCopyPin={handleCopyPin}
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
          candidates={filteredCandidates}
          lockedConstraint={lockedConstraint}
          prunedCount={prunedCount}
          budgetLimit={budgetLimit}
          suggestion={suggestion}
          setSuggestion={setSuggestion}
          handleAddSuggestion={handleAddSuggestion}
          handleQuickAddSuggestion={handleQuickAddSuggestion}
          handleRemoveSuggestion={handleRemoveSuggestion}
          duplicateMatch={duplicateMatch}
        />
      </main>

      {/* Fixed Bottom Start Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-[var(--bg-root)]/95 backdrop-blur-md border-t border-[var(--border-main)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto">
          {isHost ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleStartVoting}
              icon={ArrowRight}
              className="w-full h-13 shadow-[0_8px_24px_var(--accent-glow)] font-bold text-base rounded-2xl"
            >
              Start Voting • {Math.min(8, filteredCandidates.length)}{' '}
              {mode === 'CUSTOM'
                ? filteredCandidates.length === 1 ? 'Option' : 'Options'
                : filteredCandidates.length === 1 ? 'Place' : 'Places'}
            </Button>
          ) : (
            <div className="py-2.5 px-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] text-center flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Waiting for host to start voting...
              </span>
            </div>
          )}
        </div>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <QrCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        pin={pin}
        topic={topic}
      />
    </div>
  );
}
