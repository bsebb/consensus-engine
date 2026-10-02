import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Users,
  ShieldCheck,
  Coins,
  ArrowRight,
  Plus,
  Trash2,
  Lock,
  Sparkles,
  Share2,
  AlertTriangle,
  Crown,
  ArrowLeft,
  LogOut,
  Settings,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import RangeSlider from '../components/ui/RangeSlider';
import StatusBadge from '../components/ui/StatusBadge';
import MilledTray from '../components/ui/MilledTray';
import SettingsModal from '../components/ui/SettingsModal';
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
  const { isConnected, participantId, emit, on, off } = useSocket();
  const { addToast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isHost = location.state?.isHost ?? false;
  const currentUserName = location.state?.userName || (isHost ? 'Host' : 'Guest');
  const groupSize = location.state?.groupSize || 4;
  const mode = location.state?.mode || 'DISCOVERY';
  const topic = location.state?.topic || 'Where should we go?';

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
  useEffect(() => {
    if (!pin) return;

    const sendJoin = () => {
      emit('join_lobby', {
        pin,
        participant_id: participantId,
        user_name: currentUserName,
      });
    };

    // 1. Join room immediately and whenever socket connects
    sendJoin();
    on('connect', sendJoin);

    // 2. Listen for peers joining and initial roster state
    const handleParticipantJoined = (data) => {
      if (data?.participants && Array.isArray(data.participants)) {
        setParticipants(
          data.participants.map((p) => ({
            id: p.id,
            name: p.name || p.userName || 'Peer',
            isHost: Boolean(p.isHost),
            budgetSealed: Boolean(p.budgetSealed),
          }))
        );
      } else if (data?.user_name) {
        setParticipants((prev) => {
          if (prev.some((p) => p.id === data.participant_id || p.name === data.user_name)) return prev;
          return [...prev, { id: data.participant_id, name: data.user_name, isHost: false, budgetSealed: false }];
        });
      }
    };

    // 3. Listen for peer budget constraint updates
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

    // 4. Listen for peers leaving the room
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
      if (data?.user_name) {
        addToast({
          title: 'Participant Left',
          message: `${data.user_name} left the room.`,
          type: 'info',
        });
      }
    };

    // 5. Listen for host voting trigger
    const handleVotingStarted = (data) => {
      addToast({
        title: 'Voting Started',
        message: 'Entering the Swipe Deck now...',
        type: 'info',
      });

      const options = data?.options || [];
      navigate(`/deck/${pin}`, {
        state: {
          mode,
          topic,
          totalParticipants: groupSize,
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
    on('budget_updated', handleBudgetUpdated);
    on('participant_left', handleParticipantLeft);
    on('voting_started', handleVotingStarted);
    on('room_error', handleRoomError);

    return () => {
      off('connect', sendJoin);
      off('participant_joined', handleParticipantJoined);
      off('lobby_state', handleParticipantJoined);
      off('budget_updated', handleBudgetUpdated);
      off('participant_left', handleParticipantLeft);
      off('voting_started', handleVotingStarted);
      off('room_error', handleRoomError);
    };
  }, [pin, participantId, currentUserName, mode, topic, groupSize, lockedConstraint, budgetLimit, navigate, emit, on, off, addToast]);

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
      await fetch(`/api/v1/rooms/${pin}/constraints`, {
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

    setGroupPool((prev) => [...prev, clean]);
    setSuggestion('');
    addToast({
      title: 'Suggestion Added',
      message: `"${clean}" added to pool`,
      type: 'info',
    });
  };

  const handleRemoveSuggestion = (idx) => {
    setGroupPool((prev) => prev.filter((_, i) => i !== idx));
  };

  // Candidate pool resolution
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
  }, [mode, groupPool, location.state?.category]);

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
    } else {
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

      const maxLevel = budgetLimit <= 200 ? 1 : budgetLimit <= 350 ? 2 : budgetLimit <= 500 ? 3 : 4;
      const budgetFiltered = pool.filter((r) => (r.price_level || 1) <= maxLevel);
      if (budgetFiltered.length > 0) pool = budgetFiltered;

      cardsToPass = pool;
    }

    emit('host_start_voting', {
      pin,
      host_id: participantId,
      options: cardsToPass,
    });

    navigate(`/deck/${pin}`, {
      state: {
        mode,
        topic,
        totalParticipants: groupSize,
        customCards: cardsToPass,
        budgetLimit: lockedConstraint ? budgetLimit : undefined,
      },
    });
  };

  const sealedCount = participants.filter((p) => p.budgetSealed).length;

  if (!pin) {
    return (
      <div className="flex-1 flex flex-col min-h-screen pb-28 select-none">
        <header className="sticky top-0 z-30 glass-surface border-b border-[var(--border-subtle)] px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 min-h-[36px]"
              aria-label="Back to Home"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <h1 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
              Room Lobby
            </h1>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Open Settings"
                title="Preferences"
              >
                <Settings size={16} />
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="px-4 py-8 flex flex-col items-center justify-center flex-1 my-auto text-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-tertiary)] shadow-sm">
            <Users size={32} />
          </div>

          <div className="flex flex-col gap-1.5 max-w-xs">
            <h2 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
              No Active Lobby
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              You are not currently in a consensus room. Enter a 4-digit code to join, or start a new decision.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full max-w-xs pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/')}
              icon={ArrowRight}
              className="w-full"
            >
              Enter Room PIN
            </Button>

            <button
              type="button"
              onClick={() => navigate('/host')}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--bg-elevated)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-semibold transition-colors cursor-pointer min-h-[40px]"
            >
              Host New Decision
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-36 select-none">
      {/* PWA Mobile Header */}
      <header className="sticky top-0 z-30 glass-surface border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleLeaveLobby}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--status-danger)] hover:bg-rose-500/10 transition-colors cursor-pointer py-1.5 px-2.5 rounded-lg border border-transparent hover:border-rose-500/20 min-h-[36px]"
            aria-label="Leave Lobby"
          >
            <LogOut size={14} />
            <span>Leave Lobby</span>
          </button>

          <div className="flex items-center gap-1.5 font-mono text-sm font-extrabold text-[var(--text-primary)]">
            <span className="text-[var(--text-tertiary)]">#</span>
            <span>{pin}</span>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge
              status={isConnected ? 'success' : 'neutral'}
              label={isConnected ? 'Live' : 'Local'}
              pulse={isConnected}
              size="sm"
            />
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
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
      <main className="px-4 pt-4 flex flex-col gap-4 flex-1">
        {/* Hero PIN & Share Banner */}
        <section className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
              Room Passkey
            </span>
            <span className="font-mono text-2xl font-black text-[var(--accent-bg)] tracking-widest mt-0.5">
              {pin}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} className="text-[var(--status-success)]" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              type="button"
              onClick={handleShareInvite}
              className="p-2 rounded-xl bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
              title="Share Invite"
            >
              <Share2 size={16} />
            </button>
          </div>
        </section>

        {/* Active Target Banner */}
        <div className="px-1 flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Consensus Target
          </span>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {topic}
          </h2>
        </div>

        {/* Live Roll-Call Roster with Budget Sealed Indicators */}
        <section className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[var(--accent-bg)]" />
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Participant Quorum
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
              <span className="text-[var(--text-secondary)] tabular-nums">
                {participants.length} / {groupSize} joined
              </span>
              <span className="text-[var(--text-tertiary)]">•</span>
              <span className="text-emerald-500 font-bold tabular-nums flex items-center gap-0.5">
                <ShieldCheck size={13} className="text-emerald-500" />
                {sealedCount} of {participants.length} sealed
              </span>
            </div>
          </div>

          {/* Avatar chips with Step Zero shield indicators */}
          <div className="flex flex-wrap gap-2 pt-1">
            {participants.map((p, idx) => (
              <div
                key={p.id || idx}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]"
              >
                <div className="w-5 h-5 rounded-full bg-[var(--accent-bg)] text-white text-[10px] font-bold flex items-center justify-center">
                  {(p.name || 'P').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {p.name}
                </span>
                {p.isHost && (
                  <Crown size={12} className="text-[var(--status-warning)] fill-[var(--status-warning)]" />
                )}
                {p.budgetSealed && (
                  <ShieldCheck size={13} className="text-emerald-500 shrink-0" title="Budget Sealed Anonymously" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Step Zero: Anonymous Privacy Vault & Ceiling */}
        <section className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins size={16} className="text-[var(--status-warning)]" />
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Step Zero Privacy Shield
              </span>
            </div>
            {lockedConstraint ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full shadow-[0_0_16px_rgba(16,185,129,0.35)] animate-[stampPop_0.3s_var(--spring-bounce)]">
                <Lock size={12} className="text-emerald-400" />
                <span>Vault Sealed</span>
              </span>
            ) : (
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
                Anonymous Vault
              </span>
            )}
          </div>

          {/* Clear Privacy Shield Explanation */}
          <div className="p-3 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed">
            <strong className="text-[var(--text-primary)]">Anonymous Privacy Vault:</strong> Venues exceeding any peer ceiling are pruned before voting opens. No participant ever sees your personal spending boundary.
          </div>

          <RangeSlider
            min={100}
            max={600}
            step={25}
            value={budgetLimit}
            onChange={(val) => {
              setBudgetLimit(val);
              if (lockedConstraint) setHasPendingBudgetChange(true);
            }}
            label="Personal Max per Person"
            valueDisplay={`${budgetLimit} MDL`}
          />

          {!lockedConstraint ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleLockBudget}
              loading={lockingBudget}
              icon={ShieldCheck}
              className="mt-1 shadow-sm"
            >
              Seal Budget Anonymously
            </Button>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 font-semibold">
                <div className="flex items-center gap-2 min-w-0">
                  <Check size={14} className="shrink-0" />
                  <span className="truncate">Ceiling locked at {budgetLimit} MDL</span>
                </div>
                <button
                  type="button"
                  onClick={handleUnlockBudget}
                  className="text-[11px] font-bold text-[var(--accent-bg)] hover:underline cursor-pointer ml-2 shrink-0 py-1 px-1.5 rounded hover:bg-[var(--accent-bg)]/10"
                >
                  Unlock & Adjust
                </button>
              </div>

              {hasPendingBudgetChange && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleLockBudget}
                  loading={lockingBudget}
                  icon={ShieldCheck}
                  className="shadow-sm animate-[fadeIn_0.2s_var(--spring-smooth)]"
                >
                  Update Ceiling to {budgetLimit} MDL
                </Button>
              )}
            </div>
          )}
        </section>

        {/* Symmetrical Candidate Pool Preview (INV-12 Grid Modulo Symmetry) */}
        <section className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--accent-bg)]" />
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Candidate Pool Preview ({filteredCandidates.length})
              </span>
            </div>
            <span className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)]">
              Balanced 2x2 Deck
            </span>
          </div>

          {/* Confidential Step Zero Pruning Proof */}
          {lockedConstraint && prunedCount > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-500 font-semibold animate-[stampPop_0.2s_var(--spring-bounce)]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-500 shrink-0" />
                <span>Step Zero: {prunedCount} venue(s) exceeding {budgetLimit} MDL ceiling pruned</span>
              </div>
              <span className="font-mono text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">Confidential</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {filteredCandidates.slice(0, 4).map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col justify-between gap-1.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                    {item.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[var(--accent-bg)] shrink-0">
                    {'$'.repeat(item.price_level || 2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
                  <span>{item.tags?.[0] || item.category || 'Venue'}</span>
                  <span>{item.distance_km ? `${item.distance_km} km` : '~1.0 km'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Brainstorm Suggestions Input (Custom mode) */}
        {mode === 'CUSTOM' && (
          <section className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Suggest More Options
              </span>
            </div>

            <form onSubmit={handleAddSuggestion} className="flex gap-2">
              <input
                type="text"
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Suggest an option..."
                className="flex-1 text-xs rounded-xl px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border-main)] focus:border-[var(--accent-bg)] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              <Button type="submit" variant="primary" size="sm" icon={Plus}>
                Add
              </Button>
            </form>

            {duplicateMatch && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--status-warning)] bg-[rgba(245,158,11,0.12)] px-2.5 py-1.5 rounded-lg">
                <AlertTriangle size={14} />
                <span>Notice: Similar to "{duplicateMatch}"</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
              {groupPool.length === 0 ? (
                <div className="p-4 rounded-xl bg-[var(--bg-inset)] border border-dashed border-[var(--border-subtle)] text-center text-xs text-[var(--text-tertiary)]">
                  No custom suggestions added yet. Type your favorite place above!
                </div>
              ) : (
                groupPool.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)]"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSuggestion(idx)}
                      className="text-[var(--text-tertiary)] hover:text-[var(--status-danger)] transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Action Dock */}
        <div className="pt-2 pb-4 flex flex-col gap-2">
          {isHost ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleStartVoting}
              icon={ArrowRight}
              className="w-full h-12 shadow-[0_8px_24px_var(--accent-glow)] font-bold text-base"
            >
              Start Consensus Voting
            </Button>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-main)] text-center flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Waiting for Host
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Voting will automatically open when the host launches the deck.
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
    </div>
  );
}
