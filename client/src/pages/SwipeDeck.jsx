import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ui/Toast';
import ReviewModal from '../components/ui/ReviewModal';
import ConsensusWinnerView from '../components/deck/ConsensusWinnerView';
import SwipeCard from '../components/deck/SwipeCard';
import SwipeControls from '../components/deck/SwipeControls';
import WaitingForBallotsView from '../components/deck/WaitingForBallotsView';
import VenueDetailsModal from '../components/deck/VenueDetailsModal';
import DeckHeader from '../components/deck/DeckHeader';
import LeaveDeckModal from '../components/deck/LeaveDeckModal';
import { useSwipeDeckSync } from '../hooks/useSwipeDeckSync';
import { apiUrl } from '../utils/api';
import { getVenueRating, deduplicateVenues } from '../utils/venueImages';
import { calculateDistanceKm, getSavedExactGps, fetchRoadRouteMetrics, formatTravelSummary } from '../utils/location';
import { triggerHaptic } from '../utils/haptics';
import restaurantsMock from '../mocks/restaurants.json';
import { filterOutReportedVenues } from '../utils/reportedVenuesClient';
import { parseGooglePlaceMetadata, buildInitialSwipeCards } from '../utils/roomOptionsParser';

const DEFAULT_WINNER = {
  id: 'winner_default', name: 'Consensus Spot', category: 'Local Favorites',
  address: 'Local Venue', distance_km: null, price_level: 2, tags: ['Group Favorite'],
};

export default function SwipeDeck() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected, participantId, emit, on, off } = useSocket();
  const { addToast } = useToast();
  const { lang, t } = useLanguage();

  const mode = location.state?.mode || 'DISCOVERY';
  const topic = location.state?.topic || (mode === 'CUSTOM' ? 'Group Decision' : 'Places Nearby');
  const totalParticipants = location.state?.totalParticipants || 1;
  const isHost = Boolean(
    location.state?.isHost ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`consensus_host_${pin}`) === 'true')
  );
  const currentUserName = location.state?.userName || localStorage.getItem('consensus_user_name') || 'Friend';

  useEffect(() => {
    if (pin) localStorage.setItem('consensus_active_pin', pin);
  }, [pin]);

  const [cards, setCards] = useState(() =>
    buildInitialSwipeCards({ locationState: location.state, mode, topic, mockPool: restaurantsMock })
  );

  useEffect(() => {
    if (!location.state?.customCards && pin) {
      fetch(apiUrl(`/api/v1/rooms/${pin}`))
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.options) && data.options.length > 0) {
            const savedGps = getSavedExactGps();
            const rehydrated = data.options.map((opt) => {
              const meta = parseGooglePlaceMetadata(opt.googlePlaceId);
              let dist = meta.dist;
              if (savedGps && meta.lat != null && meta.lng != null && dist == null) {
                dist = calculateDistanceKm(savedGps.lat, savedGps.lng, meta.lat, meta.lng);
              }
              const catLabel = meta.catLabel || location.state?.category || 'Local Favorite';
              return {
                id: opt.id,
                name: opt.name,
                category: catLabel,
                price_level: opt.priceLevel || 2,
                distance_km: dist,
                lat: meta.lat,
                lng: meta.lng,
                tags: [catLabel],
                address: meta.addr || 'Local Venue',
                photo_url: meta.photoUrl,
              };
            });
            setCards(filterOutReportedVenues(deduplicateVenues(rehydrated)));
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
  const [enterDirection, setEnterDirection] = useState(null);
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

  const handleReportClosedCard = useCallback((venue) => {
    if (!venue?.name) return;
    setCards((prev) => filterOutReportedVenues(prev.filter((c) => c.name !== venue.name)));
    setActiveTab('swipe');
  }, []);

  // Hardware Pointer Gesture Engine
  const pointerStart = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const rafId = useRef(null);

  const handleVote = useCallback((score) => {
    if (currentIndex >= cards.length || exitDirection || enterDirection) return;
    const dir = score === 1 ? 'right' : score === -100 ? 'down' : score === 2 ? 'up' : 'left';
    setExitDirection(dir);
    setIsDragging(false);
    setActiveTab('swipe');
    triggerHaptic(score === 1 ? 'like' : score === -100 ? 'veto' : score === 2 ? 'superlike' : 'pass');

    setTimeout(() => {
      const current = cards[currentIndex];
      setMyVotes((prev) => [...prev, { option_id: current.id, name: current.name, score, direction: dir }]);
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setExitDirection(null);
      setDragOffset({ x: 0, y: 0 });

      if (pin && typeof emit === 'function') {
        emit('voting_step_progress', {
          pin,
          participant_id: participantId,
          user_name: currentUserName,
          current_index: nextIdx,
          total_count: cards.length,
        });
      }
    }, 220);
  }, [cards, currentIndex, exitDirection, enterDirection, pin, emit, participantId, currentUserName]);

  const handleUndo = useCallback(() => {
    if (currentIndex <= 0 || exitDirection || enterDirection) return;
    const lastVote = myVotes[myVotes.length - 1];
    const prevDir = lastVote?.direction || (lastVote?.score === 1 ? 'right' : lastVote?.score === -100 ? 'down' : lastVote?.score === 2 ? 'up' : 'left');
    triggerHaptic('tap');
    setEnterDirection(prevDir);
    setMyVotes((prev) => prev.slice(0, -1));
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setDragOffset({ x: 0, y: 0 });
    setActiveTab('swipe');
    setTimeout(() => setEnterDirection(null), 360);
  }, [currentIndex, exitDirection, enterDirection, myVotes]);

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
    const diffY = e.clientY - pointerStart.current.y;
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
    } else if (diffY < -80 && Math.abs(diffY) > Math.abs(diffX)) {
      handleVote(2);
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
      const targetTag = e.target?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable) return;

      if (e.key === 'ArrowRight') { e.preventDefault(); handleVote(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handleVote(-1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); handleVote(-100); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); handleVote(2); }
      else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
        if (currentIndex > 0) { e.preventDefault(); handleUndo(); }
      }
      else if (e.key === 'd' || e.key === 'D' || e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'details' ? 'swipe' : 'details'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards.length, showWinner, handleVote, handleUndo]);

  useSwipeDeckSync({
    pin,
    participantId,
    isHost,
    cards,
    myVotes,
    currentIndex, showWinner, locationState: location.state,
    setCards, setVotesReceived, setQuorumTotal, setServerWinner,
    setServerMatchScore, setServerPairwise, setShowWinner,
    onAlreadyVoted: () => setCurrentIndex(cards.length),
    emit, on, off,
  });

  const handleHostForceReveal = () => {
    const hostToken = sessionStorage.getItem(`consensus_host_token_${pin}`);
    emit('host_force_reveal', { pin, host_id: participantId, host_token: hostToken || undefined });
    if (!isConnected) setShowWinner(true);
  };

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  const handleReturnToLobby = () => {
    sessionStorage.setItem(`consensus_pause_voting_${pin}`, 'true');
    setLeaveModalOpen(false);
    navigate(`/lobby/${pin}`, {
      state: { pausedVoting: true, isHost: Boolean(isHost), userName: location.state?.userName, mode, topic },
    });
  };

  const handleLeaveRoom = () => {
    setLeaveModalOpen(false);
    if (pin) {
      emit('leave_lobby', { pin, participant_id: participantId, user_name: location.state?.userName });
      emit('leave_room', { pin, participant_id: participantId });
      localStorage.removeItem('consensus_active_pin');
      sessionStorage.removeItem('consensus_active_pin');
      sessionStorage.removeItem(`consensus_host_${pin}`);
      sessionStorage.removeItem(`consensus_pause_voting_${pin}`);
    }
    navigate('/');
  };

  const handleBackClick = () => {
    if (showWinner) {
      navigate(`/lobby/${pin}`);
    } else {
      setLeaveModalOpen(true);
    }
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
      triggerHaptic('match');
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
          pin, topic, winner: consensusResult.winner.name,
          winnerDetails: {
            name: consensusResult.winner.name, priceLevel: consensusResult.winner.price_level || 2,
            distanceKm: consensusResult.winner.distance_km ?? null, address: consensusResult.winner.address || 'Local Venue',
            matchScore: consensusResult.matchScore || 94,
          },
          options: optionsList, pairwiseDuels: pairwiseBreakdown,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          participantsCount: totalParticipants, priceLevel: consensusResult.winner.price_level || 2,
        };
        const existingIdx = history.findIndex((h) => h.pin === pin);
        if (existingIdx !== -1) {
          history[existingIdx] = entry;
        } else {
          history.unshift(entry);
        }
        localStorage.setItem('consensus_history', JSON.stringify(history.slice(0, 30)));
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
    ? (activeCard.price_level === 1 ? '$ • ~110 MDL' : activeCard.price_level === 3 ? '$$$ • ~350 MDL' : activeCard.price_level === 4 ? '$$$$ • ~600 MDL' : '$$ • ~180 MDL')
    : '$$ • ~180 MDL';
  const cardWalkDesc = activeCard ? formatTravelSummary(activeCard, lang) : (lang === 'ro' ? 'Locație în apropiere' : lang === 'ru' ? 'Место поблизости' : 'Local Spot');

  const mapsDirUrl = consensusResult.winner
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        consensusResult.winner.name + ' ' + (consensusResult.winner.address || '')
      )}`
    : '#';

  const progressPercent = cards.length > 0 ? Math.min(100, (currentIndex / cards.length) * 100) : 0;

  return (
    <div
      className={`flex-1 flex flex-col h-full max-h-full min-h-0 overflow-hidden justify-between select-none ${
        !showWinner && currentIndex < cards.length && activeTab !== 'details'
          ? 'touch-none'
          : 'touch-pan-y'
      }`}
    >
      {/* PWA Mobile Header */}
      <DeckHeader
        pin={pin}
        showWinner={showWinner}
        currentIndex={currentIndex}
        cardsLength={cards.length}
        mode={mode}
        activeCard={activeCard}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        progressPercent={progressPercent}
        onBackClick={handleBackClick}
      />

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
          emit={emit}
          vetoCount={consensusResult.vetoCount}
        />
      ) : currentIndex >= cards.length ? (
        <WaitingForBallotsView
          isHost={isHost}
          votesReceived={votesReceived}
          quorumTotal={quorumTotal}
          handleHostForceReveal={handleHostForceReveal}
        />
      ) : (
        <>
          <SwipeCard
            mode={mode}
            topic={topic}
            cardIndex={currentIndex + 1}
            totalCards={cards.length}
            activeCard={activeCard}
            dragOffset={dragOffset}
            exitDirection={exitDirection}
            enterDirection={enterDirection}
            isDragging={isDragging}
            handlePointerDown={handlePointerDown}
            handlePointerMove={handlePointerMove}
            handlePointerUp={handlePointerUp}
            handlePointerCancel={handlePointerCancel}
            cardRating={cardRating}
            cardReviewCount={cardReviewCount}
            cardPriceDesc={cardPriceDesc}
            cardWalkDesc={cardWalkDesc}
            onOpenDetails={() => setActiveTab('details')}
          />

          <VenueDetailsModal
            key={activeCard?.id || activeCard?.name || 'swipedeck-venue-modal'}
            venue={activeCard}
            isOpen={activeTab === 'details'}
            onClose={() => setActiveTab('swipe')}
            onVote={handleVote}
            onReportClosed={handleReportClosedCard}
          />
        </>
      )}

      {/* Floating Tactical Control Dock */}
      {!showWinner && currentIndex < cards.length && (
        <SwipeControls
          handleVote={handleVote}
          handleUndo={handleUndo}
          canUndo={currentIndex > 0}
        />
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

      {/* Leave Deck Confirmation Action Sheet */}
      <LeaveDeckModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onReturnToLobby={handleReturnToLobby}
        onLeaveRoom={handleLeaveRoom}
      />
    </div>
  );
}

