import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import RangeSlider from '../components/ui/RangeSlider';
import StatusBadge from '../components/ui/StatusBadge';
import MilledTray from '../components/ui/MilledTray';
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

  const isHost = location.state?.isHost ?? false;
  const currentUserName = location.state?.userName || (isHost ? 'Host' : 'Guest');
  const groupSize = location.state?.groupSize || 4;
  const mode = location.state?.mode || 'DISCOVERY';
  const topic = location.state?.topic || 'Where should we go?';

  // Live participant state
  const [participants, setParticipants] = useState(() => [
    { id: participantId || 'host_1', name: currentUserName, isHost },
  ]);

  // Step Zero Budget Constraint State
  const [budgetLimit, setBudgetLimit] = useState(250);
  const [lockedConstraint, setLockedConstraint] = useState(false);
  const [lockingBudget, setLockingBudget] = useState(false);

  // Suggestions state
  const [suggestion, setSuggestion] = useState('');
  const [groupPool, setGroupPool] = useState(['Art Cafe', 'Old Town Pub', 'Burger Craft']);
  const [copied, setCopied] = useState(false);

  // Handle Socket.io synchronization
  useEffect(() => {
    // 1. Join room
    emit('join_lobby', {
      pin,
      participant_id: participantId,
      user_name: currentUserName,
    });

    // 2. Listen for peers joining
    const handleParticipantJoined = (data) => {
      if (data?.participants && Array.isArray(data.participants)) {
        setParticipants(
          data.participants.map((p) => ({
            id: p.id,
            name: p.name || p.userName || 'Peer',
            isHost: p.id === data.host_id,
          }))
        );
      } else if (data?.user_name) {
        setParticipants((prev) => {
          if (prev.some((p) => p.name === data.user_name)) return prev;
          return [...prev, { id: data.participant_id, name: data.user_name, isHost: false }];
        });
      }
    };

    // 3. Listen for host voting trigger
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

    on('participant_joined', handleParticipantJoined);
    on('voting_started', handleVotingStarted);

    return () => {
      off('participant_joined', handleParticipantJoined);
      off('voting_started', handleVotingStarted);
    };
  }, [pin, participantId, currentUserName, mode, topic, groupSize, lockedConstraint, budgetLimit, navigate, emit, on, off, addToast]);

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    addToast({
      title: 'PIN Copied',
      message: `Room #${pin} copied to clipboard`,
      type: 'success',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Submit Step Zero constraint to backend
  const handleLockConstraint = async () => {
    setLockingBudget(true);

    // Map 50-800 MDL slider into price level 1-4
    const priceLevel = budgetLimit <= 200 ? 1 : budgetLimit <= 350 ? 2 : budgetLimit <= 500 ? 3 : 4;

    try {
      const response = await fetch(`http://localhost:3000/api/v1/rooms/${pin}/constraints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          max_price_level: priceLevel,
        }),
      });

      if (response.ok) {
        addToast({
          title: 'Budget Constraint Locked',
          message: 'Backend pruned options above group budget',
          type: 'success',
        });
      }
    } catch (err) {
      console.warn('[Lobby] Backend constraint call offline, locking locally:', err);
    }

    setLockingBudget(false);
    setLockedConstraint(true);
  };

  const handleAddSuggestion = (e) => {
    e.preventDefault();
    const clean = suggestion.trim();
    if (!clean) return;

    const deduplicated = deduplicateSuggestions([...groupPool, clean]);
    setGroupPool(deduplicated);
    setSuggestion('');
  };

  const handleRemoveSuggestion = (idx) => {
    setGroupPool((prev) => prev.filter((_, i) => i !== idx));
  };

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

      // Filter by secret budget cap
      const maxLevel = budgetLimit <= 200 ? 1 : budgetLimit <= 350 ? 2 : budgetLimit <= 500 ? 3 : 4;
      const budgetFiltered = pool.filter((r) => (r.price_level || 1) <= maxLevel);
      if (budgetFiltered.length > 0) pool = budgetFiltered;

      cardsToPass = pool;
    }

    // Broadcast via socket
    emit('host_start_voting', {
      pin,
      host_id: participantId,
      options: cardsToPass,
    });

    // Fallback navigation
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

  return (
    <div className="min-h-screen pb-24 select-none">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 liquid-glass border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[var(--ios-secondary-label)] uppercase tracking-wider">
                Room PIN
              </span>
              <button
                type="button"
                onClick={handleCopyPin}
                className="flex items-center gap-1.5 font-mono text-xl font-extrabold text-[var(--accent-bg)] hover:opacity-80 transition-opacity cursor-pointer"
                title="Click to copy PIN"
              >
                <span>{pin}</span>
                {copied ? <Check size={16} className="text-[var(--semantic-success)]" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <StatusBadge
              status={isConnected ? 'success' : 'neutral'}
              label={isConnected ? 'Live Room' : 'Local Room'}
              pulse={isConnected}
              size="sm"
            />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 pt-6 flex flex-col gap-6">
        
        {/* Room Headline & Topic */}
        <section className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ios-secondary-label)]">
            Consensus Topic
          </span>
          <h2 className="text-2xl font-bold text-[var(--ios-label)] tracking-tight">
            {topic}
          </h2>
        </section>

        {/* Live Roll-Call Roster */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="settings-section-label !p-0 !m-0">Participants Roll-Call</span>
            <span className="text-xs font-mono font-semibold text-[var(--ios-secondary-label)]">
              {participants.length} / {groupSize} Quorum
            </span>
          </div>

          <div className="settings-card-group p-3 flex flex-wrap gap-2">
            {participants.map((p, idx) => (
              <div
                key={p.id || idx}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-[var(--border-subtle)]"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--accent-bg)] text-white text-xs font-bold flex items-center justify-center">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-[var(--ios-label)]">{p.name}</span>
                {p.isHost && (
                  <StatusBadge status="info" label="Host" size="sm" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Step Zero: Secret Budget Cap */}
        <section className="flex flex-col gap-2">
          <div className="settings-section-label">Step Zero: Confidential Budget Guard</div>
          <div className="settings-card-group p-4 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[rgba(255,149,0,0.12)] text-[var(--semantic-warning)] shrink-0 mt-0.5">
                <Coins size={20} />
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-semibold text-[var(--ios-label)]">
                  Private Spending Ceiling
                </h4>
                <p className="text-xs text-[var(--ios-secondary-label)] leading-relaxed">
                  Your budget limit is sealed. Options exceeding the group's lowest constraint are pruned from the deck.
                </p>
              </div>
            </div>

            {lockedConstraint ? (
              <MilledTray className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--semantic-success)]">
                  <ShieldCheck size={16} />
                  <span>Constraint Sealed: Max {budgetLimit} MDL</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLockedConstraint(false)}
                  className="text-xs text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)] underline cursor-pointer"
                >
                  Adjust
                </button>
              </MilledTray>
            ) : (
              <div className="flex flex-col gap-4">
                <RangeSlider
                  min={50}
                  max={800}
                  step={25}
                  value={budgetLimit}
                  onChange={setBudgetLimit}
                  unit="MDL"
                  label="My Personal Maximum"
                />

                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleLockConstraint}
                  loading={lockingBudget}
                  icon={Lock}
                >
                  Lock Secret Limit ({budgetLimit} MDL)
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Custom Suggestions Pool (if Custom mode) */}
        {mode === 'CUSTOM' && (
          <section className="flex flex-col gap-2">
            <div className="settings-section-label">Crowdsourced Suggestions</div>
            <div className="settings-card-group p-4 flex flex-col gap-4">
              <form onSubmit={handleAddSuggestion} className="flex gap-2">
                <input
                  type="text"
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="Propose an option..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-[var(--border-main)] text-sm text-[var(--ios-label)] outline-none focus:border-[var(--accent-bg)]"
                />
                <Button type="submit" variant="primary" size="sm" icon={Plus}>
                  Add
                </Button>
              </form>

              <div className="flex flex-wrap gap-2">
                {groupPool.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-xs font-medium text-[var(--ios-label)] border border-[var(--border-subtle)]"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSuggestion(idx)}
                      className="text-[var(--ios-tertiary-label)] hover:text-[var(--semantic-error)] cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Sticky Host Action Bar */}
      {isHost && (
        <footer className="fixed bottom-0 inset-x-0 z-30 liquid-glass border-t border-[var(--border-subtle)] p-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--ios-label)]">
                Host Control
              </span>
              <span className="text-[11px] text-[var(--ios-secondary-label)]">
                {participants.length} connected
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleStartVoting}
              icon={ArrowRight}
              className="px-6"
            >
              Start Swiping
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
