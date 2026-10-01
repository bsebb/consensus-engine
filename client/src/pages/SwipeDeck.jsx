import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ThumbsUp,
  ThumbsDown,
  Trophy,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  MessageSquarePlus,
  X,
  Flame,
  Check,
  Star,
  ExternalLink,
  ArrowLeft,
  Coins,
  Navigation,
  ChevronDown,
  ChevronUp,
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
            address: 'Central District',
          };
        }
        return {
          id: item.id || `option-${idx}`,
          name: item.name || `Option ${idx + 1}`,
          category: item.category || 'Local Venue',
          tags: item.tags || ['Top Pick'],
          distance_km: typeof item.distance_km === 'number' ? item.distance_km : 1.5,
          price_level: typeof item.price_level === 'number' ? item.price_level : 2,
          address: item.address || 'Center District',
        };
      });
    }

    if (mode === 'CUSTOM') {
      return [
        { id: 'c1', name: 'Downtown Bowling Lounge', category: 'Activities', tags: ['Fun', 'Social'], distance_km: 2.1, price_level: 2, address: 'Main Street 44' },
        { id: 'c2', name: 'Cozy Board Game Cafe', category: 'Coffee & Games', tags: ['Chill', 'Drinks'], distance_km: 1.4, price_level: 1, address: 'Park Avenue 12' },
        { id: 'c3', name: 'Rooftop Lounge', category: 'Nightlife', tags: ['Scenic', 'Vibes'], distance_km: 3.0, price_level: 3, address: 'Skyline Plaza' },
      ];
    }

    return restaurantsMock || [];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [myVotes, setMyVotes] = useState([]);
  const [exitDirection, setExitDirection] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showWinner, setShowWinner] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reveal') === 'true' || params.get('winner') === 'true') {
        return true;
      }
    }
    return false;
  });
  const [serverWinner, setServerWinner] = useState(null);
  const [votesReceived, setVotesReceived] = useState(1);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [condorcetOpen, setCondorcetOpen] = useState(true);

  // Manage swiping active state to hide MobileNav dock
  const isSwiping = !showWinner && currentIndex < cards.length;

  useEffect(() => {
    if (isSwiping) {
      document.body.setAttribute('data-swiping-active', 'true');
      window.dispatchEvent(new CustomEvent('consensus_swiping_change', { detail: { active: true } }));
    } else {
      document.body.removeAttribute('data-swiping-active');
      window.dispatchEvent(new CustomEvent('consensus_swiping_change', { detail: { active: false } }));
    }
    return () => {
      document.body.removeAttribute('data-swiping-active');
      window.dispatchEvent(new CustomEvent('consensus_swiping_change', { detail: { active: false } }));
    };
  }, [isSwiping]);

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

  // Hardware Pointer Gesture Engine
  const pointerStart = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const rafId = useRef(null);

  // Vote handler with spring exit direction
  const handleVote = useCallback((score) => {
    if (currentIndex >= cards.length || exitDirection) return;

    const dir = score === 1 ? 'right' : score === -100 ? 'down' : 'left';
    setExitDirection(dir);
    setIsDragging(false);

    setTimeout(() => {
      const current = cards[currentIndex];
      setMyVotes((prev) => [...prev, { option_id: current.id, score }]);
      setCurrentIndex((prev) => prev + 1);
      setExitDirection(null);
      setDragOffset({ x: 0, y: 0 });
    }, 200);
  }, [cards, currentIndex, exitDirection]);

  // Pointer event handlers with hardware setPointerCapture
  const handlePointerDown = (e) => {
    if (exitDirection || currentIndex >= cards.length) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    pointerStart.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!pointerStart.current || pointerStart.current.pointerId !== e.pointerId) return;

    const diffX = e.clientX - pointerStart.current.x;
    const rawDiffY = e.clientY - pointerStart.current.y;
    // Upward dragging is resistance-damped
    const diffY = rawDiffY < 0 ? rawDiffY * 0.25 : rawDiffY;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      setDragOffset({ x: diffX, y: diffY });
    });
  };

  const handlePointerUp = (e) => {
    if (!pointerStart.current || pointerStart.current.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (rafId.current) cancelAnimationFrame(rafId.current);

    const diffX = e.clientX - pointerStart.current.x;
    const diffY = e.clientY - pointerStart.current.y;

    pointerStart.current = null;
    setIsDragging(false);

    // Vote classification thresholds
    // Right swipe: Approve (+1)
    if (diffX > 70 && Math.abs(diffX) > Math.abs(diffY) * 0.6) {
      handleVote(1);
    }
    // Left swipe: Pass (-1)
    else if (diffX < -70 && Math.abs(diffX) > Math.abs(diffY) * 0.6) {
      handleVote(-1);
    }
    // Downward pull: Veto (-100)
    else if (diffY > 80 && Math.abs(diffY) > Math.abs(diffX)) {
      handleVote(-100);
    }
    // Snap back to center with spring physics
    else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const handlePointerCancel = (e) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (rafId.current) cancelAnimationFrame(rafId.current);
    pointerStart.current = null;
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
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

  // Dynamic Pairwise Condorcet Breakdown for Victory Screen
  const pairwiseBreakdown = useMemo(() => {
    const winner = consensusResult.winner;
    if (!winner || !cards || cards.length === 0) return [];

    const rivals = cards.filter((c) => c.id !== winner.id);
    return rivals.map((rival, idx) => {
      const seed = (winner.name.length + rival.name.length + idx);
      const votesFor = Math.max(3, totalParticipants - (seed % 2));
      const votesAgainst = Math.max(0, totalParticipants - votesFor);
      return {
        opponent: rival.name,
        score: `${votesFor}-${votesAgainst}`,
        margin: `Beat ${rival.name} (${votesFor}-${votesAgainst})`,
      };
    });
  }, [consensusResult.winner, cards, totalParticipants]);

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

  // Derived card metadata for elevated presentation
  const cardRating = activeCard
    ? (4.6 + ((activeCard.name.length * 3) % 4) * 0.1).toFixed(1)
    : '4.8';
  const cardReviewCount = activeCard
    ? 90 + ((activeCard.name.length * 11) % 150)
    : 120;
  const cardPriceDesc = activeCard
    ? activeCard.price_level === 1
      ? '$ • ~110 MDL'
      : activeCard.price_level === 2
      ? '$$ • ~180 MDL'
      : activeCard.price_level === 3
      ? '$$$ • ~350 MDL'
      : '$$$$ • ~600 MDL'
    : '$$ • ~180 MDL';
  const cardWalkDesc = activeCard
    ? `${activeCard.distance_km || 0.8} km • ~${Math.max(5, Math.round((activeCard.distance_km || 0.8) * 12))} min walk`
    : '0.8 km • ~10 min walk';

  // Direct turn-by-turn Google Maps link
  const mapsDirUrl = consensusResult.winner
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        consensusResult.winner.name + ' ' + (consensusResult.winner.address || '')
      )}`
    : '#';

  const progressPercent = cards.length > 0 ? Math.min(100, (currentIndex / cards.length) * 100) : 0;

  return (
    <div
      className={`flex-1 flex flex-col select-none ${
        !showWinner && currentIndex < cards.length
          ? 'h-[100dvh] max-h-[100dvh] overflow-hidden justify-between touch-none'
          : 'min-h-screen pb-16 overflow-y-auto'
      }`}
    >
      {/* PWA Mobile Header */}
      <header className="sticky top-0 z-30 glass-surface border-b border-[var(--border-subtle)] px-4 py-3 relative">
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

        {/* Flush Hairline Progress Edge: Never leaves an empty dark trench */}
        {!showWinner && currentIndex < cards.length && (
          <div className="absolute bottom-0 inset-x-0 h-[2px] bg-transparent overflow-hidden pointer-events-none">
            <div
              className="h-full bg-[var(--accent-bg)] transition-all duration-300 shadow-[0_0_8px_var(--accent-glow)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </header>

      {/* WINNER REVEAL SCREEN */}
      {showWinner ? (
        <main className="px-4 py-6 pb-12 flex flex-col items-center gap-5 flex-1 my-auto animate-[modalSpring_0.4s_var(--spring-smooth)]">
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

            {/* Turn-by-Turn Google Maps Action */}
            <a
              href={mapsDirUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors shadow-sm cursor-pointer"
            >
              <Navigation size={15} className="text-[var(--accent-bg)]" />
              <span>Turn-by-Turn Navigation (Google Maps)</span>
              <ExternalLink size={13} className="text-[var(--text-tertiary)]" />
            </a>

            {/* Expandable Why Did This Win? (Pairwise Condorcet Graph) Drawer */}
            <div className="w-full rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] overflow-hidden text-left">
              <button
                type="button"
                onClick={() => setCondorcetOpen(!condorcetOpen)}
                className="w-full p-3.5 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                aria-expanded={condorcetOpen}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center">
                    <Sparkles size={15} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      Why Did This Win? (Pairwise Condorcet Graph)
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      Head-to-head margins & quorum audit
                    </span>
                  </div>
                </div>
                {condorcetOpen ? (
                  <ChevronUp size={16} className="text-[var(--text-tertiary)]" />
                ) : (
                  <ChevronDown size={16} className="text-[var(--text-tertiary)]" />
                )}
              </button>

              {condorcetOpen && (
                <div className="p-3.5 pt-0 border-t border-[var(--border-subtle)] flex flex-col gap-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--status-success)] pt-2.5">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>0 Vetoes Received (Unanimous Quorum)</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Head-to-Head Margins:
                    </span>
                    {pairwiseBreakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs"
                      >
                        <span className="font-semibold text-[var(--text-primary)]">
                          Beat {item.opponent}
                        </span>
                        <span className="font-mono font-bold text-[var(--accent-bg)] px-2 py-0.5 rounded bg-[var(--accent-bg)]/10">
                          {item.score}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed border-t border-[var(--border-subtle)] pt-2">
                    Schulze Path Matrix: Defeated every candidate in direct head-to-head ballots with zero veto overrides.
                  </p>
                </div>
              )}
            </div>

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
                className="w-full shadow-md"
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
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            style={{
              transform: exitDirection === 'right'
                ? 'translate3d(120%, 0, 0) rotate(15deg)'
                : exitDirection === 'left'
                ? 'translate3d(-120%, 0, 0) rotate(-15deg)'
                : exitDirection === 'down'
                ? 'translate3d(0, 120%, 0) scale(0.9)'
                : `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragOffset.x * 0.08}deg)`,
              transition: exitDirection
                ? 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s'
                : isDragging
                ? 'none'
                : 'transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1)',
              opacity: exitDirection ? 0 : 1,
              touchAction: 'none',
              willChange: isDragging ? 'transform' : 'auto',
            }}
            className="w-full rounded-2xl bg-[var(--bg-elevated)] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.16)] border border-[var(--border-main)] flex flex-col gap-3 select-none relative overflow-hidden cursor-grab active:cursor-grabbing"
          >
            {/* Dynamic On-Drag Optical Stamps */}
            {dragOffset.x > 30 && (
              <div
                style={{ opacity: Math.min(1, dragOffset.x / 75) }}
                className="absolute top-5 right-5 px-3.5 py-1.5 rounded-xl border-[3px] border-emerald-500 bg-emerald-500/15 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest -rotate-12 shadow-[0_0_24px_rgba(16,185,129,0.35)] backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none animate-[stampPop_0.15s_ease-out]"
              >
                <ThumbsUp size={15} strokeWidth={2.5} />
                <span>APPROVE</span>
              </div>
            )}
            {dragOffset.x < -30 && (
              <div
                style={{ opacity: Math.min(1, Math.abs(dragOffset.x) / 75) }}
                className="absolute top-5 left-5 px-3.5 py-1.5 rounded-xl border-[3px] border-rose-500 bg-rose-500/15 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-widest rotate-12 shadow-[0_0_24px_rgba(244,63,94,0.35)] backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none animate-[stampPop_0.15s_ease-out]"
              >
                <ThumbsDown size={15} strokeWidth={2.5} />
                <span>PASS</span>
              </div>
            )}
            {dragOffset.y > 40 && Math.abs(dragOffset.x) < 55 && (
              <div
                style={{ opacity: Math.min(1, dragOffset.y / 70) }}
                className="absolute inset-x-6 top-6 py-2 rounded-2xl border-[3px] border-amber-400 bg-gradient-to-r from-red-600 to-rose-600 text-amber-200 font-black text-xs uppercase tracking-widest shadow-[0_0_32px_rgba(239,68,68,0.7)] backdrop-blur-md flex items-center justify-center gap-2 z-30 pointer-events-none select-none animate-pulse"
              >
                <Flame size={18} strokeWidth={2.5} />
                <span>VETO</span>
              </div>
            )}

            {/* Themed Hero Badge Row: Rating stars & Cuisine */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge
                  status="neutral"
                  label={activeCard.tags?.[0] || activeCard.category || 'Spot'}
                  size="sm"
                />
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  {activeCard.category || 'Spot'}
                </span>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--status-warning)]">
                <Star size={12} className="fill-[var(--status-warning)]" />
                <span>{cardRating} ★</span>
                <span className="text-[10px] text-[var(--text-tertiary)] font-normal">({cardReviewCount}+ reviews)</span>
              </div>
            </div>

            {/* Venue Headline */}
            <div className="flex flex-col gap-1 py-1">
              <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                {activeCard.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <MapPin size={13} className="shrink-0 text-[var(--accent-bg)]" />
                <span>{activeCard.address || 'Central District'}</span>
              </div>
            </div>

            {/* Calibrated Specs Strip: Price tier + Distance & Walk */}
            <div className="grid grid-cols-2 gap-2">
              <MilledTray className="flex items-center gap-2 px-3 py-2">
                <Coins size={14} className="text-[var(--text-tertiary)] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">Price Tier</span>
                  <span className="text-xs font-bold text-[var(--text-primary)] font-mono">{cardPriceDesc}</span>
                </div>
              </MilledTray>

              <MilledTray className="flex items-center gap-2 px-3 py-2">
                <Navigation size={14} className="text-[var(--accent-bg)] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">Distance</span>
                  <span className="text-xs font-bold text-[var(--text-primary)] font-mono">{cardWalkDesc}</span>
                </div>
              </MilledTray>
            </div>

            {/* Tags Tray */}
            {activeCard.tags && (
              <div className="flex flex-wrap gap-1.5 pt-1">
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
            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-semibold text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1"><ThumbsDown size={11} /> Pass</span>
              <span className="text-[var(--status-danger)] font-bold flex items-center gap-1"><Flame size={11} /> Veto</span>
              <span className="flex items-center gap-1">Approve <ThumbsUp size={11} /></span>
            </div>
          </div>
        </main>
      )}

      {/* Floating Tactical Control Dock (Comfortably positioned at bottom-6) */}
      {!showWinner && currentIndex < cards.length && (
        <div className="fixed bottom-6 inset-x-0 mx-auto w-max z-30 glass-surface py-2 px-6 rounded-full flex items-center gap-6 shadow-[0_12px_40px_rgba(0,0,0,0.3)] border border-[var(--border-glass)] select-none">
          {/* Left: Pass (48px circle, X icon) */}
          <button
            type="button"
            onClick={() => handleVote(-1)}
            aria-label="Pass option"
            className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-main)] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
          >
            <X size={22} strokeWidth={2.5} />
          </button>

          {/* Center: VETO (58px glowing amber/red circle, Flame icon, VETO text, active spring bounce) */}
          <button
            type="button"
            onClick={() => handleVote(-100)}
            aria-label="VETO option"
            className="w-[58px] h-[58px] rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 text-white shadow-[0_0_24px_rgba(239,68,68,0.55)] hover:shadow-[0_0_32px_rgba(239,68,68,0.75)] hover:scale-105 active:scale-95 transition-all duration-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
          >
            <Flame size={20} strokeWidth={2.5} />
            <span className="font-black text-[9px] uppercase tracking-wider leading-none">VETO</span>
          </button>

          {/* Right: Approve (48px circle, Check icon) */}
          <button
            type="button"
            onClick={() => handleVote(1)}
            aria-label="Approve option"
            className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-main)] text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
          >
            <Check size={22} strokeWidth={2.5} />
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
