import React, { useState, useEffect, useMemo } from 'react';
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
import restaurantsMock from '../mocks/restaurants.json';

// Client-side Levenshtein distance for fuzzy duplicate detection
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

function deduplicateSuggestions(list) {
  const result = [];
  list.forEach((item) => {
    const isDup = result.some((existing) => {
      const dist = levenshteinDistance(
        existing.toLowerCase().trim(),
        item.toLowerCase().trim()
      );
      return dist <= 2;
    });
    if (!isDup) result.push(item);
  });
  return result;
}

export default function RoomLobby() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { participantId, emit, on, off } = useSocket();
  const { addToast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isHost = location.state?.isHost ?? (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`consensus_host_${pin}`) === 'true');
  const currentUserName = location.state?.userName || (isHost ? 'Host' : 'Guest');
  const [groupSize, setGroupSize] = useState(location.state?.groupSize || 4);
  const [mode, setMode] = useState(location.state?.mode || 'DISCOVERY');
  const [topic, setTopic] = useState(location.state?.topic || 'Where should we go?');

  // Live participant state with budgetSealed tracking
  const [participants, setParticipants] = useState(() => [
    { id: participantId || 'host_1', name: currentUserName, isHost, budgetSealed: false },
  ]);

  // Step Zero Budget Constraint State
  const [budgetLimit, setBudgetLimit] = useState(250);
  const [lockedConstraint, setLockedConstraint] = useState(false);
  const [lockingBudget, setLockingBudget] = useState(false);
  const [hasPendingBudgetChange, setHasPendingBudgetChange] = useState(false);

  // Suggestions state (for custom mode - clean start without hardcoded dummy options)
  const [suggestion, setSuggestion] = useState('');
  const [groupPool, setGroupPool] = useState([]);
  const [copied, setCopied] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Real room venue options loaded from database/Foursquare
  const [realOptions, setRealOptions] = useState(() => {
    return location.state?.roomData?.options || [];
  });

  useEffect(() => {
    if (pin) {
      fetch(apiUrl(`/api/v1/rooms/${pin}`))
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.options) && data.options.length > 0) {
            setRealOptions(data.options);
          }
        })
        .catch((err) => console.warn('[RoomLobby] Room options fetch notice:', err));
    }
  }, [pin]);

  // Track active PIN in localStorage for mobile navigation dock
  useEffect(() => {
    if (pin) {
      localStorage.setItem('consensus_active_pin', pin);
    }
  }, [pin]);

  const handleLeaveLobby = () => {
    if (pin) {
      emit('leave_lobby', {
        pin,
        participant_id: participantId,
        user_name: currentUserName,
      });
      localStorage.removeItem('consensus_active_pin');
      sessionStorage.removeItem('consensus_active_pin');
      addToast({
        title: 'Left Lobby',
        message: `Exited room #${pin}`,
        type: 'info',
      });
    }
    navigate('/');
  };

  // Check for real-time duplicate warning as user types
  const duplicateMatch = suggestion.trim().length >= 3
    ? groupPool.find((item) => levenshteinDistance(item.toLowerCase(), suggestion.toLowerCase().trim()) <= 2)
    : null;

  // Handle Socket.io synchronization
  useLobbySync({
    pin,
    participantId,
    currentUserName,
    isHost,
    locationState: location.state,
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
        title: 'PIN Copied',
        message: `Room code #${pin} copied to clipboard`,
        type: 'success',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({
        title: 'Copy Failed',
        message: `PIN code is ${pin}`,
        type: 'warning',
      });
    }
  };

  const handleShareInvite = async () => {
    const inviteUrl = `${window.location.origin}/?pin=${pin}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join Consensus Room #${pin}`,
          text: `Join our consensus session: "${topic}"!`,
          url: inviteUrl,
        });
      } catch {
        handleCopyPin();
      }
    } else {
      handleCopyPin();
    }
  };

  const handleLockBudget = async () => {
    setLockingBudget(true);
    const max_price_level = budgetLimit <= 200 ? 1 : budgetLimit <= 350 ? 2 : budgetLimit <= 500 ? 3 : 4;
    try {
      await fetch(apiUrl(`/api/v1/rooms/${pin}/constraints`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          max_price_level,
          max_budget: budgetLimit,
        }),
      });
    } catch (err) {
      console.warn('[RoomLobby] Backend constraint offline, saved locally:', err);
    }

    emit('update_budget', {
      pin,
      participant_id: participantId,
      budgetSealed: true,
      budgetLimit,
    });

    setLockingBudget(false);
    setLockedConstraint(true);
    setHasPendingBudgetChange(false);
    setParticipants((prev) =>
      prev.map((p) =>
        p.name === currentUserName || p.id === participantId
          ? { ...p, budgetSealed: true }
          : p
      )
    );
    addToast({
      title: 'Budget Sealed in Vault',
      message: `Max ${budgetLimit} MDL applied anonymously`,
      type: 'success',
    });
  };

  const handleUnlockBudget = () => {
    setLockedConstraint(false);
    setHasPendingBudgetChange(true);
    emit('update_budget', {
      pin,
      participant_id: participantId,
      budgetSealed: false,
      budgetLimit,
    });
    setParticipants((prev) =>
      prev.map((p) =>
        p.name === currentUserName || p.id === participantId
          ? { ...p, budgetSealed: false }
          : p
      )
    );
    addToast({
      title: 'Budget Unlocked',
      message: 'Slide to adjust your personal ceiling, then re-seal when ready.',
      type: 'info',
    });
  };

  const handleAddSuggestion = (e) => {
    e.preventDefault();
    const clean = suggestion.trim();
    if (!clean) return;

    if (duplicateMatch) {
      addToast({
        title: 'Duplicate Detected',
        message: `Similar to existing candidate "${duplicateMatch}"`,
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
    addToast({
      title: 'Suggestion Added',
      message: `"${clean}" added to pool`,
      type: 'info',
    });
  };

  const handleRemoveSuggestion = (idx) => {
    const target = groupPool[idx];
    if (target) {
      emit('remove_suggestion', { pin, suggestion: target });
    }
    setGroupPool((prev) => prev.filter((_, i) => i !== idx));
  };

  // Candidate pool resolution from live database options or custom suggestions
  const candidatePoolPreview = useMemo(() => {
    if (mode === 'CUSTOM') {
      return groupPool.map((name, idx) => ({
        id: `c-${idx}`,
        name,
        category: 'Suggestion',
        price_level: 2,
        distance_km: 1.2,
        tags: ['Custom'],
      }));
    }

    if (realOptions && realOptions.length > 0) {
      return realOptions.map((opt) => {
        let dist = null;
        let addr = 'Centru, Chișinău';
        if (opt.googlePlaceId && opt.googlePlaceId.includes('|')) {
          const parts = opt.googlePlaceId.split('|');
          const parsedDist = parseFloat(parts[1]);
          if (!isNaN(parsedDist) && parsedDist > 0) dist = parsedDist;
          if (parts[2]) addr = parts[2];
        }
        return {
          id: opt.id,
          name: opt.name,
          category: location.state?.category || 'Discovery',
          price_level: opt.priceLevel || 2,
          distance_km: dist,
          tags: [location.state?.category || 'Top Pick'],
          address: addr,
        };
      });
    }

    let pool = restaurantsMock || [];
    const category = location.state?.category;
    if (category && category !== 'Restaurants') {
      const catLower = category.toLowerCase();
      const matched = pool.filter(
        (r) =>
          r.tags?.some((t) => t.toLowerCase().includes(catLower)) ||
          r.name?.toLowerCase().includes(catLower)
      );
      if (matched.length > 0) pool = matched;
    }
    return pool;
  }, [mode, groupPool, realOptions, location.state?.category]);

  const maxBudgetLevel = budgetLimit <= 200 ? 1 : budgetLimit <= 350 ? 2 : budgetLimit <= 500 ? 3 : 4;
  const filteredCandidates = useMemo(() => {
    if (!lockedConstraint || mode === 'CUSTOM') return candidatePoolPreview;
    return candidatePoolPreview.filter((item) => (item.price_level || 1) <= maxBudgetLevel);
  }, [candidatePoolPreview, lockedConstraint, mode, maxBudgetLevel]);

  const prunedCount = lockedConstraint && mode !== 'CUSTOM'
    ? candidatePoolPreview.length - filteredCandidates.length
    : 0;

  const handleStartVoting = () => {
    let cardsToPass = [];

    if (mode === 'CUSTOM') {
      cardsToPass = deduplicateSuggestions(groupPool);
      if (cardsToPass.length < 2) {
        addToast({
          title: 'Add More Options',
          message: 'Please add at least 2 custom options so participants have choices to vote on.',
          type: 'warning',
        });
        return;
      }
    } else {
      cardsToPass = filteredCandidates.length > 0 ? filteredCandidates : candidatePoolPreview;
    }

    emit('host_start_voting', {
      pin,
      host_id: participantId,
      options: cardsToPass,
    });

    sessionStorage.setItem(`consensus_host_${pin}`, 'true');
    navigate(`/deck/${pin}`, {
      state: {
        mode,
        topic,
        isHost: true,
        totalParticipants: groupSize,
        customCards: cardsToPass,
        budgetLimit: lockedConstraint ? budgetLimit : undefined,
      },
    });
  };

  const sealedCount = participants.filter((p) => p.budgetSealed).length;

  if (!pin) {
    return <NoActiveLobbyView navigate={navigate} setSettingsOpen={setSettingsOpen} />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-36 select-none">
      {/* Consumer Mobile Header */}
      <header className="sticky top-0 z-30 glass-surface border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            type="button"
            onClick={handleLeaveLobby}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-3 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)]"
            aria-label="Leave Lobby"
          >
            <LogOut size={13} />
            <span>Leave</span>
          </button>

          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)]">
            <span className="text-[var(--text-tertiary)] font-normal">Room</span>
            <span className="text-[var(--accent-bg)] tabular-nums">{pin}</span>
          </div>

          <div className="flex items-center gap-2">
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

      {/* Main Content Area */}
      <main className="px-4 pt-4 flex flex-col gap-4 flex-1 max-w-md mx-auto w-full">
        {/* Hero PIN, Target Banner & Roll-Call Roster */}
        <LobbyRoster
          pin={pin}
          topic={topic}
          participants={participants}
          groupSize={groupSize}
          sealedCount={sealedCount}
          copied={copied}
          handleCopyPin={handleCopyPin}
          handleShareInvite={handleShareInvite}
          setQrModalOpen={setQrModalOpen}
        />

        {/* Step Zero: Anonymous Privacy Vault & Ceiling */}
        <StepZeroVault
          lockedConstraint={lockedConstraint}
          budgetLimit={budgetLimit}
          setBudgetLimit={setBudgetLimit}
          handleLockBudget={handleLockBudget}
          handleUnlockBudget={handleUnlockBudget}
          lockingBudget={lockingBudget}
          hasPendingBudgetChange={hasPendingBudgetChange}
          setHasPendingBudgetChange={setHasPendingBudgetChange}
        />

        {/* Curated Candidate Pool Deck */}
        <CandidatePoolDeck
          mode={mode}
          candidates={filteredCandidates}
          lockedConstraint={lockedConstraint}
          prunedCount={prunedCount}
          budgetLimit={budgetLimit}
          suggestion={suggestion}
          setSuggestion={setSuggestion}
          handleAddSuggestion={handleAddSuggestion}
          handleRemoveSuggestion={handleRemoveSuggestion}
          duplicateMatch={duplicateMatch}
        />

        {/* Action Dock */}
        <div className="pt-2 pb-4 flex flex-col gap-2">
          {isHost ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleStartVoting}
              icon={ArrowRight}
              className="w-full h-12 shadow-[0_8px_24px_var(--accent-glow)] font-bold text-base rounded-2xl"
            >
              Start Swiping
            </Button>
          ) : (
            <div className="p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-main)] text-center flex flex-col items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Waiting for Host to Start
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                The swipe deck will automatically launch when the host is ready.
              </span>
            </div>
          )}

          {/* Secondary Leave Lobby Action */}
          <button
            type="button"
            onClick={handleLeaveLobby}
            className="w-full text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--status-danger)] transition-colors text-center py-1.5 flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]"
          >
            <LogOut size={13} />
            <span>Leave Lobby #{pin}</span>
          </button>
        </div>
      </main>

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* QR Code Ingress Modal */}
      <QrCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        pin={pin}
        topic={topic}
      />
    </div>
  );
}
