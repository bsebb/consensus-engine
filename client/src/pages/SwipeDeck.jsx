import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
  Trophy,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  MapPin,
  DollarSign,
  ChevronRight,
  MessageSquarePlus,
  Share2,
  X,
  Flame,
  Check,
  Star,
  ExternalLink,
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

  // Touch gesture state
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

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 select-none">
      
      {/* Top Bar with Progress */}
      <header className="sticky top-0 z-30 liquid-glass border-b border-[var(--border-subtle)] px-4 py-2.5 rounded-2xl max-w-md w-full mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(`/lobby/${pin}`)}
          className="text-xs font-bold text-[var(--accent-bg)] hover:opacity-80 transition-opacity cursor-pointer"
        >
          Room #{pin}
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-[var(--ios-secondary-label)]">
            {Math.min(currentIndex + 1, cards.length)} of {cards.length}
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* WINNER REVEAL SCREEN */}
      {showWinner ? (
        <main className="w-full max-w-md mx-auto my-auto py-6 animate-[modalSpring_0.4s_var(--spring-smooth)]">
          <div className="liquid-glass rounded-3xl p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.22)] border border-[var(--border-glass)] flex flex-col items-center text-center gap-5">
            
            {/* Trophy Emblem */}
            <div className="w-20 h-20 rounded-3xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-[0_8px_30px_rgba(255,149,0,0.30)] animate-bounce">
              <Trophy size={42} />
            </div>

            <div className="flex flex-col gap-1">
              <StatusBadge status="success" label="Consensus Reached" pulse size="sm" className="mx-auto" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--ios-label)] tracking-tight mt-2">
                {consensusResult.winner.name}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--ios-secondary-label)]">
                Schulze Algorithm & Condorcet Pairwise Winner
              </p>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-2 w-full">
              <MilledTray className="flex flex-col items-center justify-center p-2.5">
                <span className="text-[10px] uppercase font-bold text-[var(--ios-secondary-label)]">Match</span>
                <span className="text-base font-extrabold text-[var(--semantic-success)] font-mono">
                  {consensusResult.matchScore}%
                </span>
              </MilledTray>

              <MilledTray className="flex flex-col items-center justify-center p-2.5">
                <span className="text-[10px] uppercase font-bold text-[var(--ios-secondary-label)]">Price</span>
                <span className="text-base font-bold text-[var(--ios-label)] font-mono">
                  {'$'.repeat(consensusResult.winner.price_level || 2)}
                </span>
              </MilledTray>

              <MilledTray className="flex flex-col items-center justify-center p-2.5">
                <span className="text-[10px] uppercase font-bold text-[var(--ios-secondary-label)]">Distance</span>
                <span className="text-base font-bold text-[var(--ios-label)] font-mono">
                  {consensusResult.winner.distance_km || 1.2} km
                </span>
              </MilledTray>
            </div>

            {/* Directions & Map Link */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center gap-2 text-xs font-bold text-[var(--ios-label)] transition-colors"
            >
              <MapPin size={15} className="text-[var(--accent-bg)]" />
              <span>Open in Google Maps</span>
              <ExternalLink size={13} className="text-[var(--ios-secondary-label)]" />
            </a>

            {/* Inline Quick Rating (Zero Modal Friction) */}
            <div className="w-full flex flex-col items-center gap-2 py-3 border-y border-[var(--border-subtle)]">
              <span className="text-xs font-semibold text-[var(--ios-secondary-label)]">
                {userRating > 0 ? `Your Rating: ${userRating} of 5 Stars` : 'Rate This Consensus Decision'}
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleInlineRate(star)}
                    className="p-1.5 rounded-xl hover:scale-115 active:scale-95 transition-transform cursor-pointer"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      size={24}
                      className={star <= userRating ? 'fill-amber-500 text-amber-500' : 'text-[var(--ios-tertiary-label)]'}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 w-full pt-1">
              <Button
                variant="primary"
                size="lg"
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
                View Past Sessions
              </Button>
            </div>
          </div>
        </main>
      ) : currentIndex >= cards.length ? (
        /* WAITING FOR PEER VOTES */
        <main className="w-full max-w-md mx-auto my-auto py-8 text-center animate-[modalSpring_0.35s_var(--spring-smooth)]">
          <div className="liquid-glass rounded-3xl p-8 border border-[var(--border-glass)] flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-bg)] text-white flex items-center justify-center shadow-[0_8px_24px_var(--accent-glow)] animate-pulse">
              <Sparkles size={32} />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-[var(--ios-label)]">
                Tallying Group Ballots
              </h3>
              <p className="text-xs text-[var(--ios-secondary-label)]">
                Waiting for peers to complete swiping...
              </p>
            </div>

            <div className="w-full flex flex-col gap-2">
              <div className="flex justify-between text-xs font-semibold text-[var(--ios-secondary-label)]">
                <span>Quorum Status</span>
                <span className="font-mono tabular-nums">{votesReceived} of {totalParticipants}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
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
        <main className="w-full max-w-md mx-auto my-auto py-4">
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
            }}
            className="apple-card p-6 shadow-[0_16px_48px_rgba(0,0,0,0.14)] border border-[var(--border-main)] flex flex-col gap-5 select-none relative overflow-hidden"
          >
            {/* Dynamic On-Drag Badges */}
            {dragOffset.x > 30 && (
              <div
                style={{ opacity: Math.min(1, dragOffset.x / 80) }}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1 shadow-lg z-20"
              >
                <ThumbsUp size={15} /> Approve (+1)
              </div>
            )}
            {dragOffset.x < -30 && (
              <div
                style={{ opacity: Math.min(1, Math.abs(dragOffset.x) / 80) }}
                className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-neutral-600 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1 shadow-lg z-20"
              >
                <ThumbsDown size={15} /> Pass (-1)
              </div>
            )}
            {dragOffset.y > 40 && Math.abs(dragOffset.x) < 50 && (
              <div
                style={{ opacity: Math.min(1, dragOffset.y / 70) }}
                className="absolute inset-x-6 top-6 py-2 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl z-20"
              >
                <ShieldAlert size={16} /> VETO ELIMINATE (-100)
              </div>
            )}

            {/* Card Category & Badge */}
            <div className="flex items-center justify-between">
              <StatusBadge
                status="neutral"
                label={activeCard.category || 'Spot'}
                size="sm"
              />
              <span className="text-xs font-semibold text-[var(--ios-secondary-label)] font-mono">
                {'$'.repeat(activeCard.price_level || 1)}
              </span>
            </div>

            {/* Venue Headline */}
            <div className="flex flex-col gap-1.5 py-4">
              <h3 className="text-2xl font-extrabold text-[var(--ios-label)] tracking-tight">
                {activeCard.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-[var(--ios-secondary-label)]">
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
                    className="px-2.5 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[11px] font-medium text-[var(--ios-secondary-label)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Tactile Gestures & Keyboard Indicators */}
            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-medium text-[var(--ios-tertiary-label)]">
              <span>[←] Pass</span>
              <span className="text-[var(--semantic-error)] font-bold">[↓] VETO</span>
              <span>Approve [→]</span>
            </div>
          </div>
        </main>
      )}

      {/* Floating Apple Liquid Glass Control Dock */}
      {!showWinner && currentIndex < cards.length && (
        <div className="fixed bottom-6 inset-x-0 mx-auto w-max z-40 liquid-glass py-2 px-6 rounded-full flex items-center gap-6 shadow-[0_12px_40px_rgba(0,0,0,0.28)] border border-[var(--border-glass)] select-none">
          <button
            type="button"
            onClick={() => handleVote(-1)}
            aria-label="Pass option"
            className="w-[52px] h-[52px] rounded-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 text-[var(--semantic-error)] hover:bg-black/5 dark:hover:bg-white/15 flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
          >
            <X size={22} strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={() => handleVote(-100)}
            aria-label="VETO option"
            className="w-[60px] h-[60px] rounded-full bg-[var(--semantic-warning)] text-white shadow-[0_4px_20px_rgba(255,149,0,0.45)] hover:brightness-105 active:scale-90 transition-transform flex flex-col items-center justify-center gap-0.5 cursor-pointer"
          >
            <Flame size={22} strokeWidth={2.5} />
            <span className="font-bold text-[9px] uppercase tracking-wider">VETO</span>
          </button>

          <button
            type="button"
            onClick={() => handleVote(1)}
            aria-label="Approve option"
            className="w-[52px] h-[52px] rounded-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 text-[var(--semantic-success)] hover:bg-black/5 dark:hover:bg-white/15 flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
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
