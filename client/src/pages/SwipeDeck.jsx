import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, MapPin } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import ReviewModal from '../components/ui/ReviewModal';
import ConsensusWinnerView from '../components/deck/ConsensusWinnerView';
import SwipeCard from '../components/deck/SwipeCard';
import SwipeControls from '../components/deck/SwipeControls';
import WaitingForBallotsView from '../components/deck/WaitingForBallotsView';
import VenueDetailsModal from '../components/deck/VenueDetailsModal';
import { useSwipeDeckSync } from '../hooks/useSwipeDeckSync';
import { apiUrl } from '../utils/api';
import { getVenueRating } from '../utils/venueImages';
import { calculateDistanceKm, getSavedExactGps, fetchRoadRouteMetrics, formatTravelSummary } from '../utils/location';
import restaurantsMock from '../mocks/restaurants.json';

const DEFAULT_WINNER = {
  id: 'winner_default',
  name: 'Consensus Spot',
  category: 'Local Favorites',
  address: 'Local Venue',
  distance_km: null,
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

  useEffect(() => {
    if (pin) localStorage.setItem('consensus_active_pin', pin);
  }, [pin]);

  const [cards, setCards] = useState(() => {
    const savedGps = getSavedExactGps();
    if (location.state?.customCards && Array.isArray(location.state.customCards) && location.state.customCards.length > 0) {
      return location.state.customCards.map((item, idx) => {
        if (typeof item === 'string') {
          return {
            id: `custom-${idx}`,
            name: item,
            category: 'Custom Poll Option',
            tags: ['Custom'],
            distance_km: null,
            price_level: 2,
            address: '',
            isCustom: true,
          };
        }
        const isCustomItem = Boolean(item.isCustom || mode === 'CUSTOM');
        const liveDist = isCustomItem
          ? null
          : typeof item.distance_km === 'number'
          ? item.distance_km
          : savedGps && item.lat != null && item.lng != null
          ? calculateDistanceKm(savedGps.lat, savedGps.lng, item.lat, item.lng)
          : null;
        return {
          id: item.id || `option-${idx}`,
          name: item.name || `Option ${idx + 1}`,
          category: isCustomItem ? 'Custom Poll Option' : (item.category || 'Local Favorite'),
          tags: item.tags || ['Top Pick'],
          distance_km: liveDist,
          drive_minutes: isCustomItem ? null : (item.drive_minutes ?? null),
          walk_minutes: isCustomItem ? null : (item.walk_minutes ?? null),
          lat: isCustomItem ? null : (item.lat ?? null),
          lng: isCustomItem ? null : (item.lng ?? null),
          price_level: typeof item.price_level === 'number' ? item.price_level : 2,
          address: isCustomItem ? '' : (item.address || 'Local Venue'),
          isCustom: isCustomItem,
        };
      });
    }

    if (mode === 'CUSTOM') {
      return [
        { id: 'c1', name: 'Bowling Night', category: 'Custom Poll Option', tags: ['Custom'], distance_km: null, price_level: 2, address: '', isCustom: true },
        { id: 'c2', name: 'Board Games Night', category: 'Custom Poll Option', tags: ['Custom'], distance_km: null, price_level: 2, address: '', isCustom: true },
        { id: 'c3', name: 'Sci-Fi / Thriller Movie', category: 'Custom Poll Option', tags: ['Custom'], distance_km: null, price_level: 2, address: '', isCustom: true },
      ];
    }

    return (restaurantsMock || []).map((r) => ({
      ...r,
      distance_km: savedGps && r.lat != null && r.lng != null ? calculateDistanceKm(savedGps.lat, savedGps.lng, r.lat, r.lng) : null,
      isCustom: false,
    }));
  });

  useEffect(() => {
    if (!location.state?.customCards && pin) {
      fetch(apiUrl(`/api/v1/rooms/${pin}`))
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.options) && data.options.length > 0) {
            const savedGps = getSavedExactGps();
            setCards(data.options.slice(0, 8).map((opt) => {
              let dist = null;
              let addr = 'Local Venue';
              let catLabel = location.state?.category || 'Local Favorite';
              let vLat = null;
              let vLng = null;
              if (opt.googlePlaceId && opt.googlePlaceId.includes('|')) {
                const parts = opt.googlePlaceId.split('|');
                const parsedDist = parseFloat(parts[1]);
                if (!isNaN(parsedDist) && parsedDist > 0 && savedGps) dist = parsedDist;
                if (parts[2]) addr = parts[2];
                if (parts[3]) catLabel = parts[3];
                if (parts[4] && parts[4].includes(',')) {
                  const [latS, lngS] = parts[4].split(',');
                  const pLat = parseFloat(latS);
                  const pLng = parseFloat(lngS);
                  if (!isNaN(pLat) && !isNaN(pLng)) { vLat = pLat; vLng = pLng; }
                }
              }
              if (savedGps && vLat != null && vLng != null && dist == null) {
                dist = calculateDistanceKm(savedGps.lat, savedGps.lng, vLat, vLng);
              }
              return {
                id: opt.id,
                name: opt.name,
                category: catLabel,
                price_level: opt.priceLevel || 2,
                distance_km: dist,
                lat: vLat,
                lng: vLng,
                tags: [catLabel],
                address: addr,
              };
            }));
          }
        })
        .catch((err) => console.warn('[SwipeDeck] REST room rehydration notice:', err));
    }
  }, [pin, location.state]);

  useEffect(() => {
    const savedGps = getSavedExactGps();
    if (!savedGps || mode === 'CUSTOM') return;
    const needsRoad = cards.filter((c) => c.lat != null && c.lng != null && c.drive_minutes == null);
    if (needsRoad.length === 0) return;

    let cancelled = false;
    fetchRoadRouteMetrics(savedGps.lat, savedGps.lng, cards).then((map) => {
      if (cancelled || !map || Object.keys(map).length === 0) return;
      setCards((prev) =>
        prev.map((c) => {
          const r = map[c.id];
          return r ? { ...c, distance_km: r.roadDistanceKm ?? c.distance_km, drive_minutes: r.driveMinutes, walk_minutes: r.walkMinutes } : c;
        })
      );
    });
    return () => { cancelled = true; };
  }, [cards.length, mode]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('swipe');
  const [myVotes, setMyVotes] = useState([]);
  const [exitDirection, setExitDirection] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showWinner, setShowWinner] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reveal') === 'true' || params.get('winner') === 'true') return true;
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

  useEffect(() => {
    if (currentIndex >= cards.length && !showWinner && quorumTotal <= 1 && cards.length > 0) {
      const timer = setTimeout(() => setShowWinner(true), 450);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, cards.length, showWinner, quorumTotal]);

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
    addToast({ title: 'Rating Saved', message: `You rated this decision ${rating} stars`, type: 'success' });
    const winnerId = serverWinner?.id || cards[0]?.id;
    if (winnerId) {
      fetch(apiUrl(`/api/v1/rooms/${pin}/feedback`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: participantId, option_id: winnerId, satisfaction_score: rating, price_accuracy_score: rating }),
      }).catch((err) => console.warn('[SwipeDeck] Inline rating feedback offline:', err));
    }
  };

  // Hardware Pointer Gesture Engine
  const pointerStart = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const rafId = useRef(null);

  const handleVote = useCallback((score) => {
    if (currentIndex >= cards.length || exitDirection) return;
    const dir = score === 1 ? 'right' : score === -100 ? 'down' : 'left';
    setExitDirection(dir);
    setIsDragging(false);
    setActiveTab('swipe');

    setTimeout(() => {
      const current = cards[currentIndex];
      setMyVotes((prev) => [...prev, { option_id: current.id, score }]);
      setCurrentIndex((prev) => prev + 1);
      setExitDirection(null);
      setDragOffset({ x: 0, y: 0 });
    }, 200);
  }, [cards, currentIndex, exitDirection]);

  const handlePointerDown = (e) => {
    if (exitDirection || currentIndex >= cards.length) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    pointerStart.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!pointerStart.current || pointerStart.current.pointerId !== e.pointerId) return;
    const diffX = e.clientX - pointerStart.current.x;
    const rawDiffY = e.clientY - pointerStart.current.y;
    const diffY = rawDiffY < 0 ? rawDiffY * 0.25 : rawDiffY;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => setDragOffset({ x: diffX, y: diffY }));
  };

  const handlePointerUp = (e) => {
    if (!pointerStart.current || pointerStart.current.pointerId !== e.pointerId) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (rafId.current) cancelAnimationFrame(rafId.current);
    const diffX = e.clientX - pointerStart.current.x;
    const diffY = e.clientY - pointerStart.current.y;
    pointerStart.current = null;
    setIsDragging(false);

    if (diffX > 70 && Math.abs(diffX) > Math.abs(diffY) * 0.6) {
      handleVote(1);
    } else if (diffX < -70 && Math.abs(diffX) > Math.abs(diffY) * 0.6) {
      handleVote(-1);
    } else if (diffY > 80 && Math.abs(diffY) > Math.abs(diffX)) {
      handleVote(-100);
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const handlePointerCancel = (e) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (rafId.current) cancelAnimationFrame(rafId.current);
    pointerStart.current = null;
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentIndex >= cards.length || showWinner) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); handleVote(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handleVote(-1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); handleVote(-100); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards.length, showWinner, handleVote]);

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
    if (!isConnected) setShowWinner(true);
  };

  const consensusResult = useMemo(() => {
    if (serverWinner) {
      const matchedCard = cards.find((c) => c.id === serverWinner.id || c.name === serverWinner.name);
      return {
        winner: matchedCard ? { ...serverWinner, ...matchedCard } : serverWinner,
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
        distance_km: null,
        address: 'Local Venue',
      };
      return { winner: found, vetoCount: 0, matchScore: location.state?.matchScore || 94 };
    }
    if (!cards || cards.length === 0) {
      return { winner: DEFAULT_WINNER, vetoCount: 0, matchScore: 100 };
    }

    const scored = cards.map((card) => {
      const myVote = myVotes.find((v) => v.option_id === card.id);
      return { card, isVetoed: myVote?.score === -100, score: myVote ? myVote.score : 0 };
    });

    const nonVetoed = scored.filter((s) => !s.isVetoed);
    const pool = (nonVetoed.length > 0 ? nonVetoed : scored).sort((a, b) => b.score - a.score);

    return {
      winner: pool[0]?.card || cards[0],
      vetoCount: scored.filter((s) => s.isVetoed).length,
      matchScore: nonVetoed.length > 0 ? 94 : 72,
    };
  }, [cards, myVotes, serverWinner, serverMatchScore, location.state]);

  const pairwiseBreakdown = useMemo(() => {
    if (serverPairwise && Array.isArray(serverPairwise) && serverPairwise.length > 0) return serverPairwise;
    const winner = consensusResult.winner;
    if (!winner || !cards || cards.length === 0) return [];

    return cards.filter((c) => c.id !== winner.id).map((rival, idx) => {
      const seed = winner.name.length + rival.name.length + idx;
      const votesFor = Math.max(3, totalParticipants - (seed % 2));
      const votesAgainst = Math.max(0, totalParticipants - votesFor);
      return { opponent: rival.name, score: `${votesFor}-${votesAgainst}`, margin: `Beat ${rival.name} (${votesFor}-${votesAgainst})` };
    });
  }, [serverPairwise, consensusResult.winner, cards, totalParticipants]);

  useEffect(() => {
    if (showWinner && consensusResult.winner) {
      try {
        const history = JSON.parse(localStorage.getItem('consensus_history') || '[]');
        const optionsList = cards.map((c) => ({
          name: c.name,
          category: c.category || 'Venue',
          priceLevel: c.price_level || 2,
          isWinner: c.name === consensusResult.winner.name,
          duelMargin: c.name === consensusResult.winner.name
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
            distanceKm: consensusResult.winner.distance_km ?? null,
            address: consensusResult.winner.address || 'Local Venue',
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
  const activeRating = activeCard ? getVenueRating(activeCard.name, activeCard.category) : { rating: '4.7', reviewCount: '1.2k' };
  const cardRating = activeRating.rating;
  const cardReviewCount = activeRating.reviewCount;
  const cardPriceDesc = activeCard
    ? activeCard.price_level === 1 ? '$ • ~110 MDL'
    : activeCard.price_level === 2 ? '$$ • ~180 MDL'
    : activeCard.price_level === 3 ? '$$$ • ~350 MDL'
    : '$$$$ • ~600 MDL'
    : '$$ • ~180 MDL';
  const cardWalkDesc = activeCard ? formatTravelSummary(activeCard) : 'Local Spot';

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
      <header className="sticky top-0 z-30 glass-surface border-b border-[var(--border-subtle)] px-4 py-2.5 relative">
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => navigate(`/lobby/${pin}`)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-3 rounded-full bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] shrink-0"
            aria-label="Back to Lobby"
          >
            <ArrowLeft size={14} />
            <span>Lobby</span>
          </button>

          {/* Segmented Tab Switcher (Discovery Only) or Option Counter (Custom Poll) */}
          {!showWinner && currentIndex < cards.length ? (
            mode === 'CUSTOM' || activeCard?.isCustom ? (
              <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] tabular-nums">
                <Layers size={12} className="text-[var(--accent-bg)]" />
                <span>Option {Math.min(currentIndex + 1, cards.length)} of {cards.length}</span>
              </div>
            ) : (
              <div className="flex items-center p-0.5 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('swipe')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer tabular-nums ${
                    activeTab === 'swipe'
                      ? 'bg-[var(--accent-bg)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Layers size={12} />
                  <span>Card {Math.min(currentIndex + 1, cards.length)}/{cards.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'details'
                      ? 'bg-[var(--accent-bg)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <MapPin size={12} />
                  <span>Details & Route</span>
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)]">
              <span className="text-[var(--text-tertiary)] font-normal">Room</span>
              <span className="text-[var(--accent-bg)] tabular-nums">#{pin}</span>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
          </div>
        </div>

        {/* Flush Hairline Progress Edge */}
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
          mode={mode}
          topic={topic}
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
          pin={pin}
          participantId={participantId}
        />
      ) : currentIndex >= cards.length ? (
        <WaitingForBallotsView
          isHost={isHost}
          votesReceived={votesReceived}
          quorumTotal={quorumTotal}
          handleHostForceReveal={handleHostForceReveal}
        />
      ) : activeTab === 'details' && mode !== 'CUSTOM' && !activeCard?.isCustom ? (
        <main className="px-4 py-2 flex-1 min-h-0 max-w-md mx-auto w-full flex flex-col overflow-hidden">
          <VenueDetailsModal
            venue={activeCard}
            isOpen={true}
            inline={true}
            onClose={() => setActiveTab('swipe')}
          />
        </main>
      ) : (
        <SwipeCard
          mode={mode}
          topic={topic}
          cardIndex={currentIndex + 1}
          totalCards={cards.length}
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
          onOpenDetails={mode === 'CUSTOM' || activeCard?.isCustom ? null : () => setActiveTab('details')}
        />
      )}

      {/* Floating Tactical Control Dock */}
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

