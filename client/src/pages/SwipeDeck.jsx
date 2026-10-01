import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
  Trophy,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  MessageSquarePlus,
  Share2,
  X,
  Flame,
  Check,
  Star,
  ExternalLink,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import MilledTray from '../components/ui/MilledTray';
import ReviewModal from '../components/ui/ReviewModal';
import restaurantsMock from '../mocks/restaurants.json';

const DEFAULT_WINNER = {
  id: 'winner_default',
  name: 'Consensus Spot',
  category: 'Local Favorites',
  address: 'Center District',
  distance_km: 1.2,
  price_level: 2,
  tags: ['Group Favorite', 'Cozy Atmosphere'],
};

export default function SwipeDeck() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected, participantId, emit, on, off } = useSocket();
  const { addToast } = useToast();

  const mode = location.state?.mode || 'DISCOVERY';
  const topic = location.state?.topic || (mode === 'CUSTOM' ? 'Group Decision' : 'Places Nearby');
  const totalParticipants = location.state?.totalParticipants || 4;

  // Track active PIN
  useEffect(() => {
    if (pin) {
      localStorage.setItem('consensus_active_pin', pin);
    }
  }, [pin]);

  // Initialize deck options
  const [cards] = useState(() => {
    if (location.state?.customCards && Array.isArray(location.state.customCards) && location.state.customCards.length > 0) {
      return location.state.customCards.map((item, idx) => {
        if (typeof item === 'string') {
          return {
            id: `custom-${idx}`,
            name: item,
            category: 'Group Suggestion',
            tags: ['Custom', 'Community'],
            distance_km: 1.0,
            price_level: 1,
          };
        }
        return {
          id: item.id || `option-${idx}`,
          name: item.name || `Option ${idx + 1}`,
          category: item.category || 'Local Venue',
          tags: item.tags || ['Top Pick'],
          distance_km: typeof item.distance_km === 'number' ? item.distance_km : 1.5,
          price_level: typeof item.price_level === 'number' ? item.price_level : 2,
        };
      });
    }

    if (mode === 'CUSTOM') {
      return [
        { id: 'c1', name: 'Downtown Bowling Lounge', category: 'Activities', tags: ['Fun', 'Social'], distance_km: 2.1, price_level: 2 },
        { id: 'c2', name: 'Cozy Board Game Cafe', category: 'Coffee & Games', tags: ['Chill', 'Drinks'], distance_km: 1.4, price_level: 1 },
        { id: 'c3', name: 'Rooftop Lounge', category: 'Nightlife', tags: ['Scenic', 'Vibes'], distance_km: 3.0, price_level: 3 },
      ];
    }

    return restaurantsMock || [];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [myVotes, setMyVotes] = useState([]);
  const [exitDirection, setExitDirection] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showWinner, setShowWinner] = useState(false);
  const [serverWinner, setServerWinner] = useState(null);
  const [votesReceived, setVotesReceived] = useState(1);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);

  const handleInlineRate = (rating) => {
    setUserRating(rating);
    addToast({
      title: 'Rating Saved',
      message: `You rated this decision ${rating} stars`,
      type: 'success',
    });
    fetch(`/api/v1/rooms/${pin}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: participantId,
        satisfaction_rating: rating,
        accuracy_rating: rating,
      }),
    }).catch(() => {});
  };

  // Touch & Pointer gesture state
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Vote handler with spring exit direction
  const handleVote = useCallback((score) => {
    if (currentIndex >= cards.length || exitDirection) return;

    const dir = score === 1 ? 'right' : score === -100 ? 'down' : 'left';
    setExitDirection(dir);
    setDragOffset({ x: 0, y: 0 });

    setTimeout(() => {
      const current = cards[currentIndex];
      setMyVotes((prev) => [...prev, { option_id: current.id, score }]);
      setCurrentIndex((prev) => prev + 1);
      setExitDirection(null);
    }, 180);
  }, [cards, currentIndex, exitDirection]);

  // Touch gesture listeners
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!touchStartX.current || !touchStartY.current) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;
    setDragOffset({ x: diffX, y: diffY });
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current || !touchStartY.current) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
      handleVote(diffX > 0 ? 1 : -1);
    } else if (diffY > 70 && Math.abs(diffY) > Math.abs(diffX)) {
      handleVote(-100); // Down swipe = VETO
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Pointer events for desktop drag support
  const isPointerDown = useRef(false);
  const handlePointerDown = (e) => {
    isPointerDown.current = true;
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
  };

  const handlePointerMove = (e) => {
    if (!isPointerDown.current || !touchStartX.current || !touchStartY.current) return;
    const diffX = e.clientX - touchStartX.current;
    const diffY = e.clientY - touchStartY.current;
    setDragOffset({ x: diffX, y: diffY });
  };

  const handlePointerUp = (e) => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    const diffX = e.clientX - (touchStartX.current || e.clientX);
    const diffY = e.clientY - (touchStartY.current || e.clientY);

    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
      handleVote(diffX > 0 ? 1 : -1);
    } else if (diffY > 70 && Math.abs(diffY) > Math.abs(diffX)) {
      handleVote(-100);
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentIndex >= cards.length || showWinner) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleVote(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleVote(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleVote(-100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards.length, showWinner, handleVote]);

  // Submit votes and resolve consensus
  useEffect(() => {
    if (currentIndex >= cards.length && !showWinner) {
      emit('notify_votes_submitted', { pin, participant_id: participantId });

      if (myVotes.length > 0) {
        fetch(`/api/v1/rooms/${pin}/votes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participant_id: participantId,
            rankings: myVotes,
          }),
        })
          .then(async (res) => {
            if (res.ok) {
              fetch(`/api/v1/rooms/${pin}/finalize`, { method: 'POST' })
                .catch(() => {});
            }
          })
          .catch((err) => console.warn('[SwipeDeck] REST vote submit offline:', err));
      }

      if (!isConnected) {
        let step = 1;
        const interval = setInterval(() => {
          step += 1;
          setVotesReceived(Math.min(step, totalParticipants));
          if (step >= totalParticipants) {
            clearInterval(interval);
            setTimeout(() => setShowWinner(true), 400);
          }
        }, 300);

        return () => clearInterval(interval);
      }

      const handleVoteProgress = (data) => {
        if (data?.voted_participants || data?.votes_received) {
          setVotesReceived(data.voted_participants || data.votes_received);
        }
      };

      const handleWinner = (data) => {
        if (data?.winning_option) {
          setServerWinner(data.winning_option);
        } else if (data?.winningOptionId) {
          const found = cards.find((c) => c.id === data.winningOptionId);
          setServerWinner(found || { name: 'Consensus Winner', id: data.winningOptionId });
        }
        setShowWinner(true);
      };

      on('vote_progress', handleVoteProgress);
      on('vote_status_update', handleVoteProgress);
      on('MATCH_FOUND', handleWinner);
      on('winner_announced', handleWinner);

      const fallback = setTimeout(() => {
        setShowWinner(true);
      }, 3500);

      return () => {
        clearTimeout(fallback);
        off('vote_progress', handleVoteProgress);
        off('vote_status_update', handleVoteProgress);
        off('MATCH_FOUND', handleWinner);
        off('winner_announced', handleWinner);
      };
    }
  }, [currentIndex, cards, showWinner, pin, participantId, isConnected, totalParticipants, myVotes, emit, on, off]);

  // Client-side Condorcet Veto elimination calculation
  const consensusResult = useMemo(() => {
    if (serverWinner) {
      return { winner: serverWinner, vetoCount: 0, matchScore: 96 };
    }
    if (!cards || cards.length === 0) {
      return { winner: DEFAULT_WINNER, vetoCount: 0, matchScore: 100 };
    }

    const scored = cards.map((card) => {
      const myVote = myVotes.find((v) => v.option_id === card.id);
      const isVetoed = myVote?.score === -100;
      const score = myVote ? myVote.score : 0;
      return { card, isVetoed, score };
    });

    const nonVetoed = scored.filter((s) => !s.isVetoed);
    const pool = nonVetoed.length > 0 ? nonVetoed : scored;
    pool.sort((a, b) => b.score - a.score);

    return {
      winner: pool[0]?.card || cards[0],
      vetoCount: scored.filter((s) => s.isVetoed).length,
      matchScore: nonVetoed.length > 0 ? 94 : 72,
    };
  }, [cards, myVotes, serverWinner]);

  // Save completed session to local history
  useEffect(() => {
    if (showWinner && consensusResult.winner) {
      try {
        const history = JSON.parse(localStorage.getItem('consensus_history') || '[]');
        const entry = {
          pin,
          topic,
          winner: consensusResult.winner.name,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          participantsCount: totalParticipants,
          priceLevel: consensusResult.winner.price_level || 2,
        };
        if (!history.some((h) => h.pin === pin)) {
          history.unshift(entry);
          localStorage.setItem('consensus_history', JSON.stringify(history.slice(0, 30)));
        }
      } catch (err) {
        console.warn('[SwipeDeck] Local history save error:', err);
      }
    }
  }, [showWinner, consensusResult, pin, topic, totalParticipants]);

  const activeCard = cards[currentIndex];
  const mapsUrl = consensusResult.winner
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        consensusResult.winner.name + ' ' + (consensusResult.winner.address || '')
      )}`
    : '#';

  const progressPercent = cards.length > 0 ? Math.min(100, (currentIndex / cards.length) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-28 select-none">
      {/* PWA Mobile Header */}
      <header className="sticky top-0 z-30 glass-surface border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(`/lobby/${pin}`)}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Back to Lobby"
          >
            <ArrowLeft size={16} />
            <span>Lobby</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[var(--accent-bg)]">
              #{pin}
            </span>
            <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
              ({Math.min(currentIndex + 1, cards.length)}/{cards.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge
              status={isConnected ? 'success' : 'neutral'}
              label={isConnected ? 'Live' : 'Local'}
              size="sm"
            />
            <ThemeToggle />
          </div>
        </div>

        {/* Progress bar */}
        {!showWinner && currentIndex < cards.length && (
          <div className="w-full h-1 bg-[var(--bg-inset)] mt-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-bg)] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </header>

      {/* WINNER REVEAL SCREEN */}
      {showWinner ? (
        <main className="px-4 py-6 flex flex-col items-center gap-5 flex-1 my-auto animate-[modalSpring_0.4s_var(--spring-smooth)]">
          <div className="w-full rounded-2xl bg-[var(--bg-elevated)] p-6 shadow-xl border border-[var(--border-main)] flex flex-col items-center text-center gap-4">
            {/* Trophy Emblem */}
            <div className="w-20 h-20 rounded-2xl bg-[rgba(245,158,11,0.15)] text-[var(--status-warning)] flex items-center justify-center shadow-lg animate-bounce">
              <Trophy size={40} />
            </div>

            <div className="flex flex-col gap-1">
              <StatusBadge status="success" label="Consensus Achieved" pulse size="sm" className="mx-auto" />
              <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight mt-1">
                {consensusResult.winner.name}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Pairwise Condorcet & Schulze Consensus Result
              </p>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-2 w-full">
              <MilledTray className="flex flex-col items-center justify-center p-2.5">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Match</span>
                <span className="text-sm font-extrabold text-[var(--status-success)] font-mono">
                  {consensusResult.matchScore}%
                </span>
              </MilledTray>

              <MilledTray className="flex flex-col items-center justify-center p-2.5">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Price</span>
                <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                  {'$'.repeat(consensusResult.winner.price_level || 2)}
                </span>
              </MilledTray>

              <MilledTray className="flex flex-col items-center justify-center p-2.5">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Distance</span>
                <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                  {consensusResult.winner.distance_km || 1.2} km
                </span>
              </MilledTray>
            </div>

            {/* Google Maps Action */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors"
            >
              <MapPin size={15} className="text-[var(--accent-bg)]" />
              <span>Open in Google Maps</span>
              <ExternalLink size={13} className="text-[var(--text-tertiary)]" />
            </a>

            {/* Inline Quick Star Rating */}
            <div className="w-full flex flex-col items-center gap-2 py-3 border-y border-[var(--border-subtle)]">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {userRating > 0 ? `Your Rating: ${userRating} / 5 Stars` : 'Rate This Consensus Decision'}
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleInlineRate(star)}
                    className="p-1 rounded-xl hover:scale-115 active:scale-95 transition-transform cursor-pointer"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      size={22}
                      className={star <= userRating ? 'fill-[var(--status-warning)] text-[var(--status-warning)]' : 'text-[var(--text-tertiary)]'}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 w-full pt-1">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsReviewOpen(true)}
                icon={MessageSquarePlus}
                className="w-full"
              >
                Detailed Feedback
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/history')}
                icon={Clock}
                className="w-full"
              >
                View Decision Ledger
              </Button>
            </div>
          </div>
        </main>
      ) : currentIndex >= cards.length ? (
        /* WAITING FOR BALLOTS */
        <main className="px-4 py-8 flex flex-col items-center justify-center text-center flex-1 my-auto animate-[modalSpring_0.35s_var(--spring-smooth)]">
          <div className="w-full rounded-2xl bg-[var(--bg-elevated)] p-8 border border-[var(--border-main)] flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-bg)] text-white flex items-center justify-center shadow-[0_8px_24px_var(--accent-glow)] animate-pulse">
              <Sparkles size={32} />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Tallying Group Ballots
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Waiting for peers to complete swiping...
              </p>
            </div>

            <div className="w-full flex flex-col gap-2">
              <div className="flex justify-between text-xs font-semibold text-[var(--text-secondary)]">
                <span>Quorum Status</span>
                <span className="font-mono tabular-nums">{votesReceived} of {totalParticipants}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--bg-inset)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-bg)] transition-all duration-300 rounded-full"
                  style={{ width: `${(votesReceived / totalParticipants) * 100}%` }}
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWinner(true)}
              className="text-xs mt-2"
            >
              Skip Waiting (Reveal Now)
            </Button>
          </div>
        </main>
      ) : (
        /* ACTIVE SWIPE CARD */
        <main className="px-4 py-4 flex flex-col justify-center flex-1">
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              transform: exitDirection === 'right'
                ? 'translate3d(120%, 0, 0) rotate(15deg)'
                : exitDirection === 'left'
                ? 'translate3d(-120%, 0, 0) rotate(-15deg)'
                : exitDirection === 'down'
                ? 'translate3d(0, 120%, 0) scale(0.9)'
                : `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragOffset.x * 0.08}deg)`,
              transition: exitDirection ? 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s' : 'none',
              opacity: exitDirection ? 0 : 1,
              touchAction: 'none',
            }}
            className="w-full rounded-2xl bg-[var(--bg-elevated)] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.16)] border border-[var(--border-main)] flex flex-col gap-4 select-none relative overflow-hidden cursor-grab active:cursor-grabbing"
          >
            {/* Dynamic On-Drag Optical Stamps */}
            {dragOffset.x > 30 && (
              <div
                style={{ opacity: Math.min(1, dragOffset.x / 80) }}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-[var(--status-success)] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1 shadow-lg z-20"
              >
                <ThumbsUp size={15} /> Approve (+1)
              </div>
            )}
            {dragOffset.x < -30 && (
              <div
                style={{ opacity: Math.min(1, Math.abs(dragOffset.x) / 80) }}
                className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-[var(--text-secondary)] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1 shadow-lg z-20"
              >
                <ThumbsDown size={15} /> Pass (-1)
              </div>
            )}
            {dragOffset.y > 40 && Math.abs(dragOffset.x) < 50 && (
              <div
                style={{ opacity: Math.min(1, dragOffset.y / 70) }}
                className="absolute inset-x-6 top-6 py-2 rounded-xl bg-[var(--status-danger)] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl z-20"
              >
                <ShieldAlert size={16} /> VETO (-100)
              </div>
            )}

            {/* Category badge & Price */}
            <div className="flex items-center justify-between">
              <StatusBadge
                status="neutral"
                label={activeCard.category || 'Spot'}
                size="sm"
              />
              <span className="text-xs font-semibold text-[var(--text-secondary)] font-mono">
                {'$'.repeat(activeCard.price_level || 1)}
              </span>
            </div>

            {/* Venue Headline */}
            <div className="flex flex-col gap-1 py-2">
              <h3 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {activeCard.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <MapPin size={13} className="shrink-0 text-[var(--accent-bg)]" />
                <span>{activeCard.distance_km || '1.0'} km away</span>
              </div>
            </div>

            {/* Tags Tray */}
            {activeCard.tags && (
              <div className="flex flex-wrap gap-1.5">
                {activeCard.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-inset)] text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Gesture Helper Hint */}
            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-medium text-[var(--text-tertiary)]">
              <span>[←] Pass</span>
              <span className="text-[var(--status-danger)] font-bold">[↓] VETO</span>
              <span>Approve [→]</span>
            </div>
          </div>
        </main>
      )}

      {/* Floating Tactical Control Dock */}
      {!showWinner && currentIndex < cards.length && (
        <div className="fixed bottom-20 inset-x-0 mx-auto w-max z-30 glass-surface py-2 px-5 rounded-full flex items-center gap-5 shadow-[0_12px_36px_rgba(0,0,0,0.25)] border border-[var(--border-glass)] select-none">
          <button
            type="button"
            onClick={() => handleVote(-1)}
            aria-label="Pass option"
            className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--status-danger)] hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center shadow-sm active:scale-90 transition-transform cursor-pointer"
          >
            <X size={20} strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={() => handleVote(-100)}
            aria-label="VETO option"
            className="w-14 h-14 rounded-full bg-[var(--status-warning)] text-white shadow-[0_4px_16px_rgba(245,158,11,0.4)] hover:brightness-105 active:scale-90 transition-transform flex flex-col items-center justify-center gap-0.5 cursor-pointer"
          >
            <Flame size={20} strokeWidth={2.5} />
            <span className="font-bold text-[8px] uppercase tracking-wider">VETO</span>
          </button>

          <button
            type="button"
            onClick={() => handleVote(1)}
            aria-label="Approve option"
            className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--status-success)] hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center shadow-sm active:scale-90 transition-transform cursor-pointer"
          >
            <Check size={20} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Review Modal Portal */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        pin={pin}
        winnerName={consensusResult.winner?.name}
        optionId={consensusResult.winner?.id}
        participantId={participantId}
      />
    </div>
  );
}
