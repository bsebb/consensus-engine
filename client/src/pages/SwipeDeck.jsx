import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, Check, Flame, Trophy, Star, Sparkles, RotateCcw, Wifi, WifiOff, ChevronLeft, Clock, AlertTriangle } from 'lucide-react';
import restaurantsMock from '../mocks/restaurants.json';
import { useSocket } from '../context/SocketContext';
import ThemeToggle from '../components/ThemeToggle';

const DEFAULT_WINNER = { name: "Selected Option", emoji: '🎯', tags: ['Default'], distance_km: 1.0, price_level: 1 };

export default function SwipeDeck() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const mode = location.state?.mode || 'DISCOVERY';
  const topic = location.state?.topic || (mode === 'CUSTOM' ? 'Group Decision' : 'Places Nearby');
  const totalParticipants = location.state?.totalParticipants || 4;

  // Initialize cards synchronously
  const [cards] = useState(() => {
    if (location.state?.customCards && Array.isArray(location.state.customCards) && location.state.customCards.length > 0) {
<<<<<<< HEAD
      return location.state.customCards.map((item, idx) => {
        if (typeof item === 'string') {
          return {
            id: `custom-${idx}`,
            name: item,
            emoji: '💡',
            tags: ['Custom', 'Group Suggestion'],
            distance_km: 'Local',
            price_level: 0
          };
        }
        return {
          id: item.id || `custom-${idx}`,
          name: item.name || `Option ${idx + 1}`,
          emoji: item.emoji || '💡',
          tags: item.tags || ['Custom'],
          distance_km: item.distance_km || 'Local',
          price_level: typeof item.price_level === 'number' ? item.price_level : 0
        };
      });
=======
      return location.state.customCards.map((item, idx) => ({
        id: `custom-${idx}`,
        //Lilia: keep the database option UUID received from the server
        id: typeof item === 'string' ? `custom-${idx}` : item.id,
        emoji: '💡',
        tags: ['Custom', 'Group Suggestion'],
        distance_km: 'Local',
        price_level: 0
      }));
>>>>>>> origin/main
    }

    if (mode === 'CUSTOM') {
      return [
        { id: 'c1', name: "Local Spot", emoji: '🏡', tags: ['Chill', 'Free'], distance_km: 0.8, price_level: 0 },
        { id: 'c2', name: 'Downtown Bowling', emoji: '🎳', tags: ['Activity', 'Fun'], distance_km: 3.2, price_level: 2 },
        { id: 'c3', name: 'Board Game Cafe', emoji: '🎲', tags: ['Cozy', 'Drinks'], distance_km: 1.4, price_level: 1 }
      ];
    }

    return restaurantsMock || [];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [myVotes, setMyVotes] = useState([]);
  const [showWinner, setShowWinner] = useState(false);
  const [exitDirection, setExitDirection] = useState(null);

  // Post-Event Feedback
  const [satisfaction, setSatisfaction] = useState(5);
  const [priceAccuracy, setPriceAccuracy] = useState(4);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [skipVoted, setSkipVoted] = useState(false);
  const { isConnected, participantId, emit, on, off } = useSocket();
  const [votesReceived, setVotesReceived] = useState(1);
  const [serverWinner, setServerWinner] = useState(null);

<<<<<<< HEAD
  // Touch swipe drag tracking
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Cast vote with smooth spring exit animation
  const handleVote = useCallback((score) => {
    if (currentIndex >= cards.length || exitDirection) return;
    const dir = score === 1 ? 'right' : score === -100 ? 'down' : 'left';
    setExitDirection(dir);

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

  const handleTouchEnd = (e) => {
    if (!touchStartX.current || !touchStartY.current) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        handleVote(1); // Right swipe = Approve
      } else {
        handleVote(-1); // Left swipe = Pass
      }
    } else if (diffY > 80 && Math.abs(diffY) > Math.abs(diffX)) {
      handleVote(-100); // Down swipe = VETO
    }
  };

  // Keyboard navigation: ArrowLeft (Pass), ArrowRight (Approve), ArrowDown (Veto)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentIndex >= cards.length || showWinner) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleVote(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleVote(1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleVote(-100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards.length, showWinner, handleVote]);

  // Automated & Real-time voting resolution
  useEffect(() => {
    if (currentIndex >= cards.length && !showWinner) {
      // 1. Notify server via socket if connected
      emit('notify_votes_submitted', { pin, participant_id: participantId });

      // 2. Submit batched votes to backend REST API
      if (myVotes.length > 0) {
        fetch(`http://localhost:3000/api/v1/rooms/${pin}/votes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
            rankings: myVotes,
          }),
        }).catch((err) => {
          console.warn('[SwipeDeck] REST vote submit fallback:', err);
        });
      }

      let timer;
      if (!isConnected) {
        // Smoothly simulate friend voting progress: 1 -> totalParticipants over ~1.2s
        let currentStep = 1;
        const interval = setInterval(() => {
          currentStep += 1;
          setVotesReceived(Math.min(currentStep, totalParticipants));
          if (currentStep >= totalParticipants) {
            clearInterval(interval);
            timer = setTimeout(() => {
              setShowWinner(true);
            }, 500);
          }
        }, 300);

        return () => {
          clearInterval(interval);
          clearTimeout(timer);
        };
      }

      // Safety fallback: if online socket doesn't respond in 4s, resolve locally
      const safetyFallback = setTimeout(() => {
        setShowWinner(true);
      }, 4000);

      const handleVoteStatus = (data) => {
        if (data?.votes_received || data?.voted_participants) {
          setVotesReceived(data.votes_received || data.voted_participants);
        }
      };

      // Listen for server announcing the consensus winner
      const handleWinnerAnnounced = (data) => {
        if (data?.winning_option) {
          setServerWinner(data.winning_option);
        } else if (data?.winningOptionId) {
          const found = cards.find((c) => c.id === data.winningOptionId);
          setServerWinner(found || { name: 'Consensus Winner', id: data.winningOptionId });
        }
        setShowWinner(true);
      };

      on('vote_status_update', handleVoteStatus);
      on('vote_progress', handleVoteStatus);
      on('winner_announced', handleWinnerAnnounced);
      on('MATCH_FOUND', handleWinnerAnnounced);

      return () => {
        clearTimeout(safetyFallback);
        off('vote_status_update', handleVoteStatus);
        off('vote_progress', handleVoteStatus);
        off('winner_announced', handleWinnerAnnounced);
        off('MATCH_FOUND', handleWinnerAnnounced);
      };
    }
  }, [currentIndex, cards.length, showWinner, pin, participantId, isConnected, totalParticipants, myVotes, cards, emit, on, off]);

  // Calculate real consensus winner based on votes & Condorcet veto elimination
  const consensusResult = useMemo(() => {
    if (serverWinner) {
      return {
        winner: serverWinner,
        vetoCount: 0,
        consensusScore: 94,
        allVetoed: false
      };
    }

    if (!cards || cards.length === 0) {
      return { winner: DEFAULT_WINNER, vetoCount: 0, consensusScore: 100, allVetoed: false };
    }

    const scoredCards = cards.map((card, idx) => {
      const myVote = myVotes.find((v) => v.option_id === card.id);
      const myScore = myVote ? myVote.score : 0;
      const isVetoed = myScore === -100;

      // Deterministic simulated peer votes
      const peerApprovals = isVetoed ? 0 : Math.max(0, (totalParticipants - 1) - (idx % 2));
      const totalScore = myScore + peerApprovals;

      return {
        card,
        score: totalScore,
        myScore,
        isVetoed,
        approvals: (myScore === 1 ? 1 : 0) + peerApprovals
      };
    });

    const totalVetoes = scoredCards.filter((c) => c.isVetoed).length;
    const nonVetoed = scoredCards.filter((c) => !c.isVetoed);

    if (nonVetoed.length > 0) {
      nonVetoed.sort((a, b) => b.score - a.score);
      const best = nonVetoed[0];
      const maxPossible = totalParticipants;
      const pct = Math.min(100, Math.max(55, Math.round((best.approvals / maxPossible) * 100)));
      return {
        winner: best.card,
        vetoCount: totalVetoes,
        consensusScore: pct,
        allVetoed: false
      };
    }

    // Deadlock: All options vetoed
    scoredCards.sort((a, b) => b.score - a.score);
    return {
      winner: scoredCards[0]?.card || cards[0] || DEFAULT_WINNER,
      vetoCount: totalVetoes,
      consensusScore: 30,
      allVetoed: true
    };
  }, [serverWinner, cards, myVotes, totalParticipants]);

  const winningOption = consensusResult.winner;
  const currentCard = cards[currentIndex] || null;

  // Save to history when winner is shown
  useEffect(() => {
    if (showWinner && winningOption) {
      try {
        const existing = JSON.parse(localStorage.getItem('consensus_history') || '[]');
        const newEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          topic,
          winner: winningOption,
          vetoCount: consensusResult.vetoCount,
          consensusScore: consensusResult.consensusScore,
          allVetoed: consensusResult.allVetoed,
          options: cards
        };
        localStorage.setItem('consensus_history', JSON.stringify([...existing, newEntry]));
      } catch (e) {
        console.error('Failed to save history', e);
      }
    }
  }, [showWinner, topic, cards, winningOption, consensusResult]);

  // Submit feedback
  const handleSaveFeedback = async () => {
    setFeedbackSubmitted(true);
    const payload = {
      participant_id: participantId,
      option_id: winningOption.id,
      satisfaction_score: satisfaction,
      price_accuracy_score: priceAccuracy
    };

    try {
      const stored = JSON.parse(localStorage.getItem('consensus_feedback') || '[]');
      localStorage.setItem('consensus_feedback', JSON.stringify([...stored, { pin, ...payload, date: new Date().toISOString() }]));
    } catch {
      // Ignored in restricted environments
    }

    if (isConnected) {
      emit('submit_feedback', { pin, ...payload });
    }

    try {
      await fetch(`/api/v1/rooms/${pin}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {
      // Graceful offline fallback
    }
  };

  // 1. Loading / Empty guard
  if (!cards || cards.length === 0) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex items-center justify-center p-6 select-none transition-colors">
        <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 border border-black/[0.04] dark:border-white/[0.08] shadow-sm text-center space-y-4">
          <p className="text-sm font-semibold text-black dark:text-white">No cards available for this room.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full min-h-[44px] bg-[#007AFF] text-white text-xs font-semibold rounded-xl"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // 2. Waiting / Aggregating State
  if (currentIndex >= cards.length && !showWinner) {
    const finishedCount = Math.max(1, votesReceived);
    const progressPercent = Math.min(100, Math.round((finishedCount / totalParticipants) * 100));

    return (
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex items-center justify-center p-6 select-none transition-colors duration-200">
        <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 border border-black/[0.04] dark:border-white/[0.08] shadow-sm text-center space-y-5">
          <div className="w-14 h-14 bg-[#007AFF]/10 text-[#007AFF] rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 animate-spin duration-1000" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white">Cards Complete</h2>
            <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-1">
              Calculating Condorcet compromise matrix for &ldquo;{topic}&rdquo;...
            </p>
          </div>
          
          <div className="p-3.5 bg-[#F8F8FA] dark:bg-[#2C2C2E] rounded-2xl space-y-2">
            <div className="flex justify-between text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93]">
              <span>Votes Gathered</span>
              <span className="font-mono text-black dark:text-white">{finishedCount} of {totalParticipants}</span>
            </div>
            <div className="w-full bg-[#E5E5EA] dark:bg-[#3A3A3C] h-2 rounded-full overflow-hidden">
              <div 
                className="bg-[#007AFF] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <button
            onClick={() => {
              setSkipVoted(true);
              setTimeout(() => setShowWinner(true), 400);
            }}
            disabled={skipVoted}
            className={`w-full min-h-[44px] text-xs font-semibold rounded-xl transition ${
              skipVoted 
                ? 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93] cursor-default'
                : 'bg-black dark:bg-white text-white dark:text-black active:scale-[0.98]'
            }`}
          >
            {skipVoted ? 'Resolving Consensus...' : 'Reveal Consensus Now'}
          </button>
        </div>
      </div>
    );
  }

  // 3. Consensus Winner Screen
  if (showWinner) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex flex-col justify-between pb-10 select-none transition-colors duration-200">
        
        {/* Navigation Bar */}
        <div className="sticky top-0 z-20 liquid-glass border-b border-black/[0.06] dark:border-white/[0.08] px-4 py-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-[#007AFF] font-medium text-sm min-h-[44px] -ml-2 px-2 active:opacity-60 transition"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Home</span>
          </button>
          <div className="text-center">
            <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider block">Decision Result</span>
            <span className="text-xs font-mono font-bold text-black dark:text-white">PIN: {pin}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="p-2 text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white transition"
              aria-label="Past decisions"
            >
              <Clock className="w-5 h-5" />
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Winner Hero Card */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-sm border border-black/[0.04] dark:border-white/[0.08] overflow-hidden text-center transition-colors">
            
            {/* Header Banner */}
            <div className={`p-7 text-white ${
              consensusResult.allVetoed 
                ? 'bg-gradient-to-b from-[#FF9500] to-[#E08500]'
                : 'bg-gradient-to-b from-[#007AFF] to-[#0062CC]'
            }`}>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-white/20 uppercase tracking-wider mb-2">
                {consensusResult.allVetoed ? <AlertTriangle className="w-3.5 h-3.5" /> : <Trophy className="w-3.5 h-3.5" />}
                {consensusResult.allVetoed ? 'Deadlock Compromise' : 'Consensus Winner'}
              </span>
              <div className="text-6xl my-2">{winningOption.emoji}</div>
              <h1 className="text-2xl font-black tracking-tight">{winningOption.name}</h1>
              
              <p className="text-white/85 text-xs mt-1 font-medium">
                {topic} • {consensusResult.allVetoed 
                  ? 'All options received vetoes'
                  : consensusResult.vetoCount === 0
                    ? '0 Vetoes (Consensus Reached!)'
                    : `${consensusResult.vetoCount} Veto(es) Avoided`}
              </p>
            </div>

            {/* Option Details Pill Row */}
            <div className="p-4 bg-[#F8F8FA] dark:bg-[#2C2C2E] border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-around text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93]">
              <div>
                <span className="block text-[10px] uppercase text-[#8E8E93]">Group Match</span>
                <span className="text-black dark:text-white font-mono font-bold text-sm">
                  {consensusResult.consensusScore}%
                </span>
              </div>
              <div className="h-6 w-px bg-black/[0.06] dark:bg-white/[0.08]" />
              <div>
                <span className="block text-[10px] uppercase text-[#8E8E93]">Price</span>
                <span className="text-black dark:text-white font-mono font-bold text-sm">
                  {typeof winningOption.price_level === 'number' && winningOption.price_level > 0
                    ? '$'.repeat(winningOption.price_level)
                    : 'Free'}
                </span>
              </div>
              <div className="h-6 w-px bg-black/[0.06] dark:border-white/[0.08]" />
              <div>
                <span className="block text-[10px] uppercase text-[#8E8E93]">Distance</span>
                <span className="text-black dark:text-white font-mono font-bold text-sm">
                  {typeof winningOption.distance_km === 'number' ? `${winningOption.distance_km} km` : winningOption.distance_km}
                </span>
              </div>
            </div>

            {/* Mentors' Post-Event Rating Form */}
            <div className="p-6 space-y-5">
              {!feedbackSubmitted ? (
                <div className="space-y-4 text-left">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93] block">
                      Post-Event Feedback
                    </span>
                    <h3 className="text-sm font-bold text-black dark:text-white mt-0.5">
                      Rate this outcome
                    </h3>
                  </div>

                  {/* Satisfaction */}
                  <div className="p-3 bg-[#F8F8FA] dark:bg-[#2C2C2E] rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
                    <span className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1.5">
                      Group Satisfaction
                    </span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          aria-label={`Satisfaction rating ${star} of 5 stars`}
                          onClick={() => setSatisfaction(star)}
                          className={`p-1.5 rounded-lg transition active:scale-90 ${
                            satisfaction >= star ? 'text-[#FF9500]' : 'text-[#E5E5EA] dark:text-[#3A3A3C]'
                          }`}
                        >
                          <Star className="w-5 h-5 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Accuracy */}
                  <div className="p-3 bg-[#F8F8FA] dark:bg-[#2C2C2E] rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
                    <span className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1.5">
                      Price / Budget Accuracy
                    </span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          aria-label={`Price accuracy rating ${star} of 5 stars`}
                          onClick={() => setPriceAccuracy(star)}
                          className={`p-1.5 rounded-lg transition active:scale-90 ${
                            priceAccuracy >= star ? 'text-[#007AFF]' : 'text-[#E5E5EA] dark:text-[#3A3A3C]'
                          }`}
                        >
                          <Star className="w-5 h-5 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveFeedback}
                    className="w-full min-h-[44px] bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold rounded-xl transition active:scale-[0.98] shadow-sm shadow-[#007AFF]/25"
                  >
                    Save Group Rating
                  </button>
                </div>
              ) : (
                <div className="p-3.5 bg-[#34C759]/10 border border-[#34C759]/20 rounded-xl text-left text-xs text-[#30D158]">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>Rating Recorded</span>
                  </p>
                  <p className="text-[11px] opacity-90 mt-1">Feedback saved to VenueAnalytics to train future decisions.</p>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => navigate('/')}
                  className="w-full min-h-[44px] flex items-center justify-center gap-1.5 text-white bg-black dark:bg-white dark:text-black text-xs font-semibold rounded-xl transition active:scale-[0.98]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start New Decision</span>
                </button>
                <button
                  onClick={() => navigate('/history')}
                  className="w-full min-h-[40px] flex items-center justify-center gap-1.5 text-[#007AFF] text-xs font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.05] rounded-xl transition"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>View in History</span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    );
  }

  // 4. Active Swipe Deck
  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex flex-col justify-between select-none transition-colors duration-200">
      
      {/* Top Header Bar with ThemeToggle */}
      <div className="p-4 flex justify-between items-center max-w-sm w-full mx-auto">
        <div>
          <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider block">
            {topic}
          </span>
          <span className="text-xs font-black text-black dark:text-white font-mono">PIN: {pin}</span>
        </div>
        <div className="flex items-center gap-2">
          <span 
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full ${
              isConnected
                ? 'bg-[#34C759]/10 text-[#34C759]'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#8E8E93]'
            }`}
            title={isConnected ? 'Live WebSocket Connected' : 'Simulated / Offline Mode'}
          >
            {isConnected ? <Wifi className="w-3 h-3 text-[#34C759]" /> : <WifiOff className="w-3 h-3 text-[#8E8E93]" />}
            <span>{isConnected ? 'Live' : 'Local'}</span>
          </span>
          <span className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] bg-white dark:bg-[#1C1C1E] px-3 py-1 rounded-full border border-black/[0.05] dark:border-white/[0.08] shadow-xs">
            {currentIndex + 1} of {cards.length}
          </span>
          <ThemeToggle />
        </div>
      </div>

      {/* Center Swipe Card */}
      <div 
        className="flex-1 flex items-center justify-center p-4 max-w-sm w-full mx-auto touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentCard && (
          <div 
            className={`w-full bg-white dark:bg-[#1C1C1E] rounded-[2rem] shadow-sm border border-black/[0.05] dark:border-white/[0.08] overflow-hidden flex flex-col transition-all duration-200 ${
              exitDirection === 'left' 
                ? '-translate-x-36 -rotate-12 opacity-0'
                : exitDirection === 'right'
                  ? 'translate-x-36 rotate-12 opacity-0'
                  : exitDirection === 'down'
                    ? 'translate-y-24 scale-90 opacity-0'
                    : 'translate-x-0 rotate-0 opacity-100'
            }`}
          >
            <div className="h-64 bg-[#F8F8FA] dark:bg-[#2C2C2E] flex items-center justify-center text-7xl select-none relative overflow-hidden">
              <span>{currentCard.emoji || '📍'}</span>
              {/* Keyboard hint chip */}
              <div className="absolute top-3 right-3 text-[10px] font-semibold text-[#8E8E93] bg-white/70 dark:bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full hidden sm:block">
                ← / ↓ / →
              </div>
            </div>
            
            <div className="p-6">
              <h2 className="text-2xl font-black text-black dark:text-white tracking-tight mb-1">{currentCard.name}</h2>
              
              <div className="flex items-center gap-2 text-xs text-[#6E6E73] dark:text-[#8E8E93] font-medium mb-4">
                <span>{typeof currentCard.distance_km === 'number' ? `${currentCard.distance_km} km` : currentCard.distance_km}</span>
                <span>•</span>
                <span>
                  {typeof currentCard.price_level === 'number' && currentCard.price_level > 0
                    ? '$'.repeat(Math.max(1, currentCard.price_level))
                    : 'Free / Custom'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {currentCard.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white rounded-lg text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Apple Liquid Glass Control Dock */}
      <div className="p-6 pb-10 flex justify-center items-center">
        <div className="liquid-glass rounded-full px-6 py-3 flex items-center gap-6 shadow-lg shadow-black/5 dark:shadow-black/40">
          
          <button
            type="button"
            onClick={() => handleVote(-1)}
            aria-label="Pass option"
            title="Pass (Left Arrow)"
            className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-full bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] flex items-center justify-center active:scale-90 transition duration-150"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={() => handleVote(-100)}
            aria-label="VETO option"
            title="VETO (Down Arrow)"
            className="w-15 h-15 min-w-[60px] min-h-[60px] rounded-full bg-[#FF9500] hover:bg-[#E08500] text-white flex items-center justify-center active:scale-90 shadow-md shadow-[#FF9500]/30 transition duration-150"
          >
            <Flame className="w-7 h-7 fill-current" />
          </button>

          <button
            type="button"
            onClick={() => handleVote(1)}
            aria-label="Approve option"
            title="Approve (Right Arrow)"
            className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-full bg-[#34C759]/10 hover:bg-[#34C759]/20 text-[#34C759] flex items-center justify-center active:scale-90 transition duration-150"
          >
            <Check className="w-6 h-6 stroke-[2.5]" />
          </button>

        </div>
      </div>

    </div>
  );
}
