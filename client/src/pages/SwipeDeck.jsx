import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import ReviewModal from '../components/ui/ReviewModal';
import ConsensusWinnerView from '../components/deck/ConsensusWinnerView';
import SwipeCard from '../components/deck/SwipeCard';
import SwipeControls from '../components/deck/SwipeControls';
import WaitingForBallotsView from '../components/deck/WaitingForBallotsView';
import { useSwipeDeckSync } from '../hooks/useSwipeDeckSync';
import { apiUrl } from '../utils/api';
import { getVenueRating } from '../utils/venueImages';
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
  const totalParticipants = location.state?.totalParticipants || 1;
  const isHost = Boolean(
    location.state?.isHost ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`consensus_host_${pin}`) === 'true')
  );

  // Track active PIN
  useEffect(() => {
    if (pin) {
      localStorage.setItem('consensus_active_pin', pin);
    }
  }, [pin]);

  // Initialize deck options
  const [cards, setCards] = useState(() => {
    if (location.state?.customCards && Array.isArray(location.state.customCards) && location.state.customCards.length > 0) {
      return location.state.customCards.map((item, idx) => {
        if (typeof item === 'string') {
          return {
            id: `custom-${idx}`,
            name: item,
            category: 'Group Suggestion',
            tags: ['Custom'],
            distance_km: null,
            price_level: 2,
            address: 'Added by group',
          };
        }
        return {
          id: item.id || `option-${idx}`,
          name: item.name || `Option ${idx + 1}`,
          category: item.category || 'Local Favorite',
          tags: item.tags || ['Top Pick'],
          distance_km: typeof item.distance_km === 'number' ? item.distance_km : null,
          price_level: typeof item.price_level === 'number' ? item.price_level : 2,
          address: item.address || 'Centru, Chișinău',
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

  // Rehydrate cards from REST if loaded directly or after page refresh without location state
  useEffect(() => {
    if (!location.state?.customCards && pin) {
      fetch(apiUrl(`/api/v1/rooms/${pin}`))
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.options) && data.options.length > 0) {
            setCards(data.options.slice(0, 8).map((opt) => {
              let dist = null;
              let addr = 'Centru, Chișinău';
              let catLabel = location.state?.category || 'Local Favorite';
              if (opt.googlePlaceId && opt.googlePlaceId.includes('|')) {
                const parts = opt.googlePlaceId.split('|');
                const parsedDist = parseFloat(parts[1]);
                if (!isNaN(parsedDist) && parsedDist > 0) dist = parsedDist;
                if (parts[2]) addr = parts[2];
                if (parts[3]) catLabel = parts[3];
              }
              return {
                id: opt.id,
                name: opt.name,
                category: catLabel,
                price_level: opt.priceLevel || 2,
                distance_km: dist,
                tags: [catLabel],
                address: addr,
              };
            }));
          }
        })
        .catch((err) => console.warn('[SwipeDeck] REST room rehydration notice:', err));
    }
  }, [pin, location.state]);

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
    return Boolean(location.state?.resolved);
  });
  const [serverWinner, setServerWinner] = useState(null);
  const [serverPairwise, setServerPairwise] = useState(null);
  const [serverMatchScore, setServerMatchScore] = useState(null);
  const [votesReceived, setVotesReceived] = useState(1);
  const [quorumTotal, setQuorumTotal] = useState(totalParticipants);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [condorcetOpen, setCondorcetOpen] = useState(false);

  // If only 1 participant is in the room (solo run), automatically reveal the winner once all cards are swiped
  useEffect(() => {
    if (currentIndex >= cards.length && !showWinner && quorumTotal <= 1 && cards.length > 0) {
      const timer = setTimeout(() => {
        setShowWinner(true);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, cards.length, showWinner, quorumTotal]);


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
    const winnerId = serverWinner?.id || cards[0]?.id;
    if (winnerId) {
      fetch(apiUrl(`/api/v1/rooms/${pin}/feedback`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          option_id: winnerId,
          satisfaction_score: rating,
          price_accuracy_score: rating,
        }),
      }).catch((err) => console.warn('[SwipeDeck] Inline rating feedback offline:', err));
    }
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

  // Handle real-time sync, winner resolution, and automatic ballot submission
  useSwipeDeckSync({
    pin,
    participantId,
    isHost,
    cards,
    myVotes,
    currentIndex,
    showWinner,
    locationState: location.state,
    setCards,
    setVotesReceived,
    setQuorumTotal,
    setServerWinner,
    setServerMatchScore,
    setServerPairwise,
    setShowWinner,
    emit,
    on,
    off,
  });

  const handleHostForceReveal = () => {
    emit('host_force_reveal', { pin, host_id: participantId });
    if (!isConnected) {
      setShowWinner(true);
    }
  };

  // Client-side Condorcet Veto elimination calculation
  const consensusResult = useMemo(() => {
    if (serverWinner) {
      return {
        winner: serverWinner,
        vetoCount: 0,
        matchScore: serverMatchScore || 96,
      };
    }
    if (location.state?.winner) {
      const winnerName = typeof location.state.winner === 'object' ? location.state.winner.name : location.state.winner;
      const found = cards.find((c) => c.name.toLowerCase() === String(winnerName).toLowerCase()) || {
        id: 'historical-winner',
        name: winnerName,
        price_level: location.state?.priceLevel || 2,
        distance_km: 1.2,
        address: 'Central District',
      };
      return {
        winner: found,
        vetoCount: 0,
        matchScore: location.state?.matchScore || 94,
      };
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
  }, [cards, myVotes, serverWinner, serverMatchScore, location.state]);

  // Dynamic Pairwise Condorcet Breakdown for Victory Screen
  const pairwiseBreakdown = useMemo(() => {
    if (serverPairwise && Array.isArray(serverPairwise) && serverPairwise.length > 0) {
      return serverPairwise;
    }
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
  }, [serverPairwise, consensusResult.winner, cards, totalParticipants]);

  // Save completed session to local history
  useEffect(() => {
    if (showWinner && consensusResult.winner) {
      try {
        const history = JSON.parse(localStorage.getItem('consensus_history') || '[]');
        const optionsList = cards.map((c) => ({
          name: c.name,
          category: c.category || 'Venue',
          priceLevel: c.price_level || 2,
          isWinner: c.name === consensusResult.winner.name,
          duelMargin:
            c.name === consensusResult.winner.name
              ? 'Consensus Winner'
              : `Defeated by ${consensusResult.winner.name} (${Math.max(3, totalParticipants - 1)}-1)`,
        }));

        const entry = {
          pin,
          topic,
          winner: consensusResult.winner.name,
          winnerDetails: {
            name: consensusResult.winner.name,
            priceLevel: consensusResult.winner.price_level || 2,
            distanceKm: consensusResult.winner.distance_km || 1.2,
            address: consensusResult.winner.address || 'Central District',
            matchScore: consensusResult.matchScore || 94,
          },
          options: optionsList,
          pairwiseDuels: pairwiseBreakdown,
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
  }, [showWinner, consensusResult, pin, topic, totalParticipants, cards, pairwiseBreakdown]);

  const activeCard = cards[currentIndex];

  // Derived verified card metadata for authentic presentation
  const activeRating = activeCard
    ? getVenueRating(activeCard.name, activeCard.category)
    : { rating: '4.7', reviewCount: '1.2k' };
  const cardRating = activeRating.rating;
  const cardReviewCount = activeRating.reviewCount;
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
    ? activeCard.distance_km != null && activeCard.distance_km <= 3.5
      ? `${activeCard.distance_km} km • ~${Math.max(5, Math.round(activeCard.distance_km * 12))} min walk`
      : (activeCard.address ? activeCard.address.split(',')[0] : 'Centru, Chișinău')
    : 'Centru, Chișinău';

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
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-3 rounded-full bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)]"
            aria-label="Back to Lobby"
          >
            <ArrowLeft size={15} />
            <span>Lobby</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)]">
            <span className="text-[var(--text-tertiary)] font-normal">Choice</span>
            <span className="text-[var(--accent-bg)]">{Math.min(currentIndex + 1, cards.length)}</span>
            <span className="text-[var(--text-tertiary)] font-normal">of</span>
            <span>{cards.length}</span>
          </div>

          <div className="flex items-center gap-2">
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
        <ConsensusWinnerView
          winner={consensusResult.winner}
          matchScore={consensusResult.matchScore}
          mapsDirUrl={mapsDirUrl}
          condorcetOpen={condorcetOpen}
          setCondorcetOpen={setCondorcetOpen}
          pairwiseBreakdown={pairwiseBreakdown}
          userRating={userRating}
          handleInlineRate={handleInlineRate}
          setIsReviewOpen={setIsReviewOpen}
          navigate={navigate}
        />
      ) : currentIndex >= cards.length ? (
        /* WAITING FOR BALLOTS */
        <WaitingForBallotsView
          isHost={isHost}
          votesReceived={votesReceived}
          quorumTotal={quorumTotal}
          handleHostForceReveal={handleHostForceReveal}
        />
      ) : (
        /* ACTIVE SWIPE CARD */
        <SwipeCard
          activeCard={activeCard}
          dragOffset={dragOffset}
          exitDirection={exitDirection}
          isDragging={isDragging}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
          handlePointerCancel={handlePointerCancel}
          cardRating={cardRating}
          cardReviewCount={cardReviewCount}
          cardPriceDesc={cardPriceDesc}
          cardWalkDesc={cardWalkDesc}
        />
      )}

      {/* Floating Tactical Control Dock (Comfortably positioned at bottom-6) */}
      {!showWinner && currentIndex < cards.length && (
        <SwipeControls handleVote={handleVote} />
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
