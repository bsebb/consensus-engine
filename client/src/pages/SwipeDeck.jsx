import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ui/Toast';
import ReviewModal from '../components/ui/ReviewModal';
import ConsensusWinnerView from '../components/deck/ConsensusWinnerView';
import SwipeCard from '../components/deck/SwipeCard';
import SwipeControls from '../components/deck/SwipeControls';
import DeckHint from '../components/deck/DeckHint';
import WaitingForBallotsView from '../components/deck/WaitingForBallotsView';
import VenueDetailsModal from '../components/deck/VenueDetailsModal';
import DeckHeader from '../components/deck/DeckHeader';
import LeaveDeckModal from '../components/deck/LeaveDeckModal';
import { useSwipeDeckSync } from '../hooks/useSwipeDeckSync';
import { useDeckGestures } from '../hooks/useDeckGestures';
import { apiUrl } from '../utils/api';
import { getVenueRating, deduplicateVenues } from '../utils/venueImages';
import { calculateDistanceKm, getSavedExactGps, fetchRoadRouteMetrics, formatTravelSummary } from '../utils/location';
import { formatRegionalPriceBadge } from '../utils/regionFormat';
import { triggerHaptic } from '../utils/haptics';
import restaurantsMock from '../mocks/restaurants.json';
import { filterOutReportedVenues } from '../utils/reportedVenuesClient';
import { parseGooglePlaceMetadata, buildInitialSwipeCards } from '../utils/roomOptionsParser';
import { useConsensusOutcome, saveConsensusHistory } from '../hooks/useConsensusOutcome';

export default function SwipeDeck() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected, deviceId, getRoomParticipantId, emit, on, off } = useSocket();
  const participantId = useMemo(() => getRoomParticipantId(pin), [pin, getRoomParticipantId]);
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
    buildInitialSwipeCards({ locationState: location.state, mode, topic, mockPool: restaurantsMock }).slice(0, 12)
  );

  const hasCustomCards = Boolean(location.state?.customCards);
  const categoryFromState = location.state?.category;

  const [myVotes, setMyVotes] = useState(() => {
    if (typeof localStorage !== 'undefined' && pin) {
      try {
        const saved = JSON.parse(localStorage.getItem(`ballot:${pin}`) || '[]');
        if (Array.isArray(saved) && saved.length > 0) return saved;
      } catch {}
    }
    return [];
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (typeof localStorage !== 'undefined' && pin) {
      try {
        const saved = JSON.parse(localStorage.getItem(`ballot:${pin}`) || '[]');
        if (Array.isArray(saved) && saved.length > 0) return saved.length;
      } catch {}
    }
    return 0;
  });
  const [activeTab, setActiveTab] = useState('swipe');
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const resetDragRef = useRef(null);
  const winnerSoundPlayedRef = useRef(false);
  const [exitDirection, setExitDirection] = useState(null);
  const [enterDirection, setEnterDirection] = useState(null);
  const [showWinner, setShowWinner] = useState(Boolean(location.state?.resolved && location.state?.winner));
  const [serverWinner, setServerWinner] = useState(null);
  const [serverPairwise, setServerPairwise] = useState(null);
  const [serverMatchScore, setServerMatchScore] = useState(null);
  const [serverStatus, setServerStatus] = useState(location.state?.status || null);
  const [serverSupport, setServerSupport] = useState(location.state?.support || null);
  const [serverSupportText, setServerSupportText] = useState(location.state?.supportText || null);
  const [serverTieBroken, setServerTieBroken] = useState(false);
  const [votesReceived, setVotesReceived] = useState(1);
  const [quorumTotal, setQuorumTotal] = useState(totalParticipants);
  const [participants] = useState(() => (Array.isArray(location.state?.participants) ? location.state.participants : []));
  const [votedParticipantIds, setVotedParticipantIds] = useState([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [condorcetOpen, setCondorcetOpen] = useState(false);

  useEffect(() => {
    if (!hasCustomCards && pin && !showWinner) {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetch(apiUrl(`/api/v1/rooms/${pin}`))
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.status === 'RESOLVED') return;
          if (data && Array.isArray(data.options) && data.options.length > 0) {
            const savedGps = getSavedExactGps();
            const rehydrated = data.options.map((opt) => {
              const meta = parseGooglePlaceMetadata(opt.googlePlaceId);
              let dist = meta.dist;
              if (savedGps && meta.lat != null && meta.lng != null && dist == null) {
                dist = calculateDistanceKm(savedGps.lat, savedGps.lng, meta.lat, meta.lng);
              }
              const catLabel = meta.catLabel || categoryFromState || 'Local Favorite';
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
            setCards(filterOutReportedVenues(deduplicateVenues(rehydrated)).slice(0, 12));
          }
        })
        .catch((err) => console.warn('[SwipeDeck] REST room rehydration notice:', err));
    }
  }, [pin, hasCustomCards, categoryFromState, showWinner]);

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
  };

  const handleReportClosedCard = useCallback((venue) => {
    if (!venue?.name) return;
    setCards((prev) => filterOutReportedVenues(prev.filter((c) => c.name !== venue.name)));
    setActiveTab('swipe');
  }, []);

  const vetoesUsed = useMemo(() => myVotes.filter((v) => v.score === -100).length, [myVotes]);
  const superlikesUsed = useMemo(() => myVotes.filter((v) => v.score === 2).length, [myVotes]);
  const vetoesRemaining = Math.max(0, 1 - vetoesUsed);
  const superlikesRemaining = Math.max(0, 1 - superlikesUsed);

  const handleVote = useCallback((score) => {
    if (currentIndex >= cards.length || exitDirection || enterDirection) return;

    if (score === -100 && vetoesRemaining <= 0) {
      triggerHaptic('veto');
      addToast({
        title: t('vetoUsedTitle') || 'Veto Already Used (1/round)',
        message: t('vetoUsedDesc') || 'You get 1 Veto per round so no one can block every spot. Use Pass instead!',
        type: 'warning',
      });
      return;
    }

    if (score === 2 && superlikesRemaining <= 0) {
      triggerHaptic('tap');
      addToast({
        title: t('superlikeUsedTitle') || 'Superlike Already Used (1/round)',
        message: t('superlikeUsedDesc') || 'You get 1 Superlike per round for your #1 favorite. Use Like instead!',
        type: 'info',
      });
      return;
    }

    const dir = score === 1 ? 'right' : score === -100 ? 'down' : score === 2 ? 'up' : 'left';
    setExitDirection(dir);
    setActiveTab('swipe');
    triggerHaptic(score === 1 ? 'like' : score === -100 ? 'veto' : score === 2 ? 'superlike' : 'pass');

    setTimeout(() => {
      const current = cards[currentIndex];
      setMyVotes((prev) => [...prev, { option_id: current.id, name: current.name, score, direction: dir }]);
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setExitDirection(null);
      resetDragRef.current?.();

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
  }, [cards, currentIndex, exitDirection, enterDirection, vetoesRemaining, superlikesRemaining, addToast, t, pin, emit, participantId, currentUserName]);

  const cardTapCallbackRef = useRef(null);
  const handleCardTap = useCallback((tapInfo) => {
    cardTapCallbackRef.current?.(tapInfo);
  }, []);

  // Touch and pointer gesture tracking via useDeckGestures
  const {
    isDragging,
    dragOffset,
    cardRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    resetDrag,
  } = useDeckGestures({
    isSwiping,
    onVote: handleVote,
    exitDirection,
    onCardTap: handleCardTap,
  });

  useEffect(() => { resetDragRef.current = resetDrag; }, [resetDrag]);

  useEffect(() => {
    resetDrag();
  }, [currentIndex, resetDrag]);

  const handleUndo = useCallback(() => {
    if (currentIndex <= 0 || exitDirection || enterDirection) return;
    const lastVote = myVotes[myVotes.length - 1];
    const prevDir = lastVote?.direction || (lastVote?.score === 1 ? 'right' : lastVote?.score === -100 ? 'down' : lastVote?.score === 2 ? 'up' : 'left');
    triggerHaptic('tap');
    resetDrag();
    setEnterDirection(prevDir);
    setMyVotes((prev) => prev.slice(0, -1));
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setActiveTab('swipe');
    setTimeout(() => setEnterDirection(null), 360);
  }, [currentIndex, exitDirection, enterDirection, myVotes, resetDrag]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentIndex >= cards.length || showWinner) return;
      const targetTag = e.target?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable) return;

      if (e.key === 'ArrowRight') { e.preventDefault(); handleVote(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handleVote(-1); }
      else if (e.key === 'ArrowDown' || e.key === 'v' || e.key === 'V') { e.preventDefault(); handleVote(-100); }
      else if (e.key === 'ArrowUp' || e.key === 's' || e.key === 'S') { e.preventDefault(); handleVote(2); }
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

  useEffect(() => {
    if (pin && typeof localStorage !== 'undefined') {
      if (myVotes.length > 0 && !showWinner) {
        localStorage.setItem(`ballot:${pin}`, JSON.stringify(myVotes));
      } else if (showWinner) {
        localStorage.removeItem(`ballot:${pin}`);
      }
    }
  }, [pin, myVotes, showWinner]);

  useSwipeDeckSync({
    pin,
    participantId,
    deviceId,
    isHost,
    cards,
    myVotes,
    currentIndex, showWinner, locationState: location.state,
    setCards, setVotesReceived, setQuorumTotal, setVotedParticipantIds, setServerWinner,
    setServerMatchScore, setServerPairwise, setServerStatus, setServerSupport,
    setServerSupportText, setServerTieBroken, setShowWinner,
    onAlreadyVoted: count => setCurrentIndex(count || cards.length),
    onBallotRestore: snapshot => {
      const ids = new Set(snapshot.map(c => c.id));
      const valid = myVotes.filter(v => ids.has(v.option_id));
      if (valid.length !== myVotes.length) { setMyVotes(valid); setCurrentIndex(valid.length); }
    },
    onRoomError: data => {
      addToast({ title: 'Room update', message: data?.message || 'Please try again.', type: 'error' });
      if (/room not found|removed from this room|join the next pick/i.test(data?.message || '')) navigate('/', { replace: true });
    },
    isConnected,
    emit, on, off,
  });

  const handleHostForceReveal = () => {
    const hostToken = sessionStorage.getItem(`consensus_host_token_${pin}`);
    emit('host_force_reveal', { pin, host_id: participantId, host_token: hostToken || undefined });

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
      localStorage.removeItem(`ballot:${pin}`);
      sessionStorage.removeItem('consensus_active_pin');
      sessionStorage.removeItem(`consensus_host_${pin}`);
      sessionStorage.removeItem(`consensus_pause_voting_${pin}`);
    }
    navigate('/');
  };

  const handleBackClick = () => {
    if (showWinner) {
      handleLeaveRoom();
    } else {
      setLeaveModalOpen(true);
    }
  };

  const handleQuickRematch = useCallback(() => {
    if (!isHost || !isConnected) return;
    triggerHaptic('like');
    emit('quick_rematch', { pin, host_id: participantId, host_token: sessionStorage.getItem(`consensus_host_token_${pin}`) || undefined });
  }, [isHost, isConnected, emit, pin, participantId]);

  const { consensusResult, pairwiseBreakdown } = useConsensusOutcome({
    cards,
    myVotes,
    serverWinner,
    serverMatchScore,
    serverPairwise,
    locationState: location.state,
  });

  useEffect(() => {
    if (showWinner && consensusResult.winner) {
      if (!winnerSoundPlayedRef.current) {
        winnerSoundPlayedRef.current = true;
        triggerHaptic('match');
      }
      saveConsensusHistory({
        pin,
        topic,
        consensusResult: { ...consensusResult, status: serverStatus, support: serverSupport, supportText: serverSupportText },
        cards,
        pairwiseBreakdown,
        totalParticipants,
      });
    }
  }, [showWinner, consensusResult, pin, topic, totalParticipants, cards, pairwiseBreakdown, serverStatus, serverSupport, serverSupportText]);

  const activeCard = cards[currentIndex];
  const activeRating = activeCard ? getVenueRating(activeCard.name, activeCard.category) : { rating: '4.7', reviewCount: '1.2k' };
  const cardRating = activeRating.rating;
  const cardReviewCount = activeRating.reviewCount;
  const cardPriceDesc = activeCard
    ? formatRegionalPriceBadge(activeCard.price_level || 2, activeCard)
    : formatRegionalPriceBadge(2);
  const cardWalkDesc = activeCard ? formatTravelSummary(activeCard, lang) : formatTravelSummary(null, lang);

  const mapsDirUrl = consensusResult.winner
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        consensusResult.winner.name + ' ' + (consensusResult.winner.address || '')
      )}`
    : '#';

  const progressPercent = cards.length > 0 ? Math.min(100, (currentIndex / cards.length) * 100) : 0;

  return (
    <div
      className={`flex-1 flex flex-col h-full max-h-full min-h-0 overflow-hidden ${showWinner ? 'justify-start' : 'justify-between'} select-none ${
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
          deviceId={deviceId}
          emit={emit}
          vetoCount={consensusResult.vetoCount}
          status={serverStatus}
          support={serverSupport}
          supportText={serverSupportText}
          tieBroken={serverTieBroken}
          onQuickRematch={isHost && cards.length > 1 ? handleQuickRematch : undefined}
        />
      ) : currentIndex >= cards.length ? (
        <WaitingForBallotsView
          isHost={isHost}
          votesReceived={votesReceived}
          quorumTotal={quorumTotal}
          handleHostForceReveal={handleHostForceReveal}
          participants={participants}
          votedParticipantIds={votedParticipantIds}
          currentParticipantId={participantId}
        />
      ) : (
        <>
          <SwipeCard
            key={activeCard?.id ? `card-${activeCard.id}` : `card-${currentIndex}`}
            mode={mode}
            topic={topic}
            cardIndex={currentIndex + 1}
            totalCards={cards.length}
            activeCard={activeCard}
            dragOffset={dragOffset}
            exitDirection={exitDirection}
            enterDirection={enterDirection}
            isDragging={isDragging}
            cardRef={cardRef}
            handlePointerDown={handlePointerDown}
            handlePointerMove={handlePointerMove}
            handlePointerUp={handlePointerUp}
            handlePointerCancel={handlePointerCancel || resetDrag}
            cardRating={cardRating}
            cardReviewCount={cardReviewCount}
            cardPriceDesc={cardPriceDesc}
            cardWalkDesc={cardWalkDesc}
            vetoesRemaining={vetoesRemaining}
            superlikesRemaining={superlikesRemaining}
            onRegisterCardTap={(cb) => { cardTapCallbackRef.current = cb; }}
            onOpenDetails={(idx = 0) => {
              setSelectedPhotoIdx(typeof idx === 'number' ? idx : 0);
              setActiveTab('details');
            }}
          />

          <VenueDetailsModal
            key={activeCard?.id ? `details-modal-${activeCard.id}` : 'swipedeck-venue-modal'}
            venue={activeCard}
            isOpen={activeTab === 'details'}
            initialPhotoIdx={selectedPhotoIdx}
            onClose={() => setActiveTab('swipe')}
            onVote={handleVote}
            vetoesRemaining={vetoesRemaining}
            onReportClosed={handleReportClosedCard}
          />
        </>
      )}

      {/* Floating Tactical Control Dock */}
      {!showWinner && currentIndex < cards.length && (
        <div className="relative flex flex-col items-center w-full">
          {currentIndex === 0 && <DeckHint />}
          <SwipeControls
            handleVote={handleVote}
            handleUndo={handleUndo}
            canUndo={currentIndex > 0}
            vetoesRemaining={vetoesRemaining}
            superlikesRemaining={superlikesRemaining}
          />
        </div>
      )}

      {/* Review Modal Portal */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onSubmitted={(satScore) => setUserRating(satScore || 5)}
        pin={pin}
        winnerName={consensusResult.winner?.name}
        optionId={consensusResult.winner?.id}
        participantId={participantId}
        deviceId={deviceId}
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

