import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, Check, Flame, Trophy, Star, Sparkles, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import restaurantsMock from '../mocks/restaurants.json';
import { useSocket } from '../context/SocketContext';
import ThemeToggle from '../components/ThemeToggle';

const DEFAULT_WINNER = { name: "Selected Option", emoji: '🎯' };

export default function SwipeDeck() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const mode = location.state?.mode || 'DISCOVERY';
  const topic = location.state?.topic || (mode === 'CUSTOM' ? 'Group Decision' : 'Places Nearby');
  const totalParticipants = location.state?.totalParticipants || 2;

  // Initialize cards synchronously to prevent initial render 0-length race condition
  const [cards] = useState(() => {
    if (location.state?.customCards && Array.isArray(location.state.customCards) && location.state.customCards.length > 0) {
      return location.state.customCards.map((item, idx) => ({
        id: `custom-${idx}`,
        name: typeof item === 'string' ? item : item.name || `Option ${idx + 1}`,
        emoji: '💡',
        tags: ['Custom', 'Group Suggestion'],
        distance_km: 'Local',
        price_level: 0
      }));
    }

    if (mode === 'CUSTOM') {
      return [
        { id: 'c1', name: "Local Spot", emoji: '🏡', tags: ['Chill', 'Free'], distance_km: '0.8', price_level: 0 },
        { id: 'c2', name: 'Downtown Bowling', emoji: '🎳', tags: ['Activity', 'Fun'], distance_km: '3.2', price_level: 2 },
        { id: 'c3', name: 'Board Game Cafe', emoji: '🎲', tags: ['Cozy', 'Drinks'], distance_km: '1.4', price_level: 1 }
      ];
    }

    return restaurantsMock || [];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [_myVotes, setMyVotes] = useState([]);
  const [showWinner, setShowWinner] = useState(false);

  // Mentor Post-Event Feedback
  const [satisfaction, setSatisfaction] = useState(5);
  const [priceAccuracy, setPriceAccuracy] = useState(4);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [skipVoted, setSkipVoted] = useState(false);
  const { isConnected, participantId, emit, on, off } = useSocket();
  const [votesReceived, setVotesReceived] = useState(1);
  const [serverWinner, setServerWinner] = useState(null);

  // Real-time socket event handling for voting completion
  useEffect(() => {
    if (currentIndex >= cards.length && !showWinner) {
      // Notify server that this participant completed their card votes
      emit('notify_votes_submitted', { pin, participant_id: participantId });

      // Listen for live room progress
      const handleVoteStatus = (data) => {
        if (data?.votes_received) {
          setVotesReceived(data.votes_received);
        }
      };

      // Listen for server announcing the consensus winner
      const handleWinnerAnnounced = (data) => {
        console.log('[Socket] winner_announced received:', data);
        if (data?.winning_option) {
          setServerWinner(data.winning_option);
        }
        setShowWinner(true);
      };

      on('vote_status_update', handleVoteStatus);
      on('winner_announced', handleWinnerAnnounced);

      return () => {
        off('vote_status_update', handleVoteStatus);
        off('winner_announced', handleWinnerAnnounced);
      };
    }
  }, [currentIndex, cards.length, showWinner, pin, participantId, emit, on, off]);

  const handleVote = (score) => {
    if (currentIndex >= cards.length) return;
    const current = cards[currentIndex];
    setMyVotes((prev) => [...prev, { option_id: current.id, score }]);
    setCurrentIndex((prev) => prev + 1);
  };

  const winningOption = serverWinner || cards[0] || DEFAULT_WINNER;
  const currentCard = cards[currentIndex] || null;

  // Save to history when winner is shown
  useEffect(() => {
    if (showWinner) {
      try {
        const existing = JSON.parse(localStorage.getItem('consensus_history') || '[]');
        const newEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          topic,
          winner: winningOption,
          options: cards
        };
        localStorage.setItem('consensus_history', JSON.stringify([...existing, newEntry]));
      } catch (e) {
        console.error('Failed to save history', e);
      }
    }
  }, [showWinner, topic, cards, winningOption]);

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

  // 2. Waiting for other participants
  if (currentIndex >= cards.length && !showWinner) {
    const finishedCount = Math.max(1, votesReceived);
    const progressPercent = Math.min(100, Math.round((finishedCount / totalParticipants) * 100));

    return (
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex items-center justify-center p-6 select-none transition-colors">
        <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 border border-black/[0.04] dark:border-white/[0.08] shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-[#007AFF]/10 text-[#007AFF] rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white">Cards Complete</h2>
            <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-1">
              Calculating Condorcet compromise matrix for "{topic}"...
            </p>
          </div>
          
          <div className="p-3.5 bg-[#F8F8FA] dark:bg-[#2C2C2E] rounded-2xl space-y-2">
            <div className="flex justify-between text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93]">
              <span>Votes Gathered</span>
              <span className="font-mono text-black dark:text-white">{finishedCount} of {totalParticipants}</span>
            </div>
            <div className="w-full bg-[#E5E5EA] dark:bg-[#3A3A3C] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#007AFF] h-full rounded-full animate-pulse transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <button
            onClick={() => {
              setSkipVoted(true);
              // Mocking a network delay to simulate other participants skipping
              setTimeout(() => setShowWinner(true), 1200);
            }}
            disabled={skipVoted}
            className={`w-full min-h-[44px] text-xs font-semibold rounded-xl transition ${
              skipVoted 
                ? 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93] cursor-default'
                : 'bg-black dark:bg-white text-white dark:text-black transition active:scale-[0.98]'
            }`}
          >
            {skipVoted ? 'Skip Voted! Waiting for others...' : 'Vote to Skip / Finish Early'}
          </button>
        </div>
      </div>
    );
  }

  // 3. Consensus Winner Screen
  if (showWinner) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-black py-10 px-4 flex items-center justify-center select-none transition-colors">
        <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-sm border border-black/[0.04] dark:border-white/[0.08] overflow-hidden text-center">
          
          {/* Winner Header */}
          <div className="bg-[#007AFF] p-8 text-white">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-white/20 uppercase tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5" />
              Consensus Winner
            </span>
            <div className="text-6xl my-2">{winningOption.emoji}</div>
            <h1 className="text-2xl font-black tracking-tight">{winningOption.name}</h1>
            <p className="text-white/80 text-xs mt-1">{topic} • 0 Vetoes</p>
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
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSatisfaction(star)}
                        className={`p-1 transition ${
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
                    Price Match Expectation
                  </span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setPriceAccuracy(star)}
                        className={`p-1 transition ${
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
                  onClick={() => setFeedbackSubmitted(true)}
                  className="w-full min-h-[44px] bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold rounded-xl transition active:scale-[0.98]"
                >
                  Save Group Rating
                </button>
              </div>
            ) : (
              <div className="p-3 bg-[#34C759]/10 border border-[#34C759]/20 rounded-xl text-left text-xs text-[#30D158]">
                <p className="font-semibold">Rating Saved</p>
                <p className="text-[11px] opacity-90 mt-0.5">Recorded to VenueAnalytics to train future decisions.</p>
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              className="w-full min-h-[44px] flex items-center justify-center gap-1.5 text-[#007AFF] text-xs font-semibold hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] rounded-xl transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start New Decision</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // 4. Active Swipe Deck
  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex flex-col justify-between select-none transition-colors">
      
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
      <div className="flex-1 flex items-center justify-center p-4 max-w-sm w-full mx-auto">
        {currentCard && (
          <div className="w-full bg-white dark:bg-[#1C1C1E] rounded-[2rem] shadow-sm border border-black/[0.05] dark:border-white/[0.08] overflow-hidden flex flex-col transition-colors">
            <div className="h-64 bg-[#F8F8FA] dark:bg-[#2C2C2E] flex items-center justify-center text-7xl select-none">
              {currentCard.emoji || '📍'}
            </div>
            
            <div className="p-6">
              <h2 className="text-2xl font-black text-black dark:text-white tracking-tight mb-1">{currentCard.name}</h2>
              
              <div className="flex items-center gap-2 text-xs text-[#6E6E73] dark:text-[#8E8E93] font-medium mb-4">
                <span>{currentCard.distance_km}</span>
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
            className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-full bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] flex items-center justify-center transition active:scale-90 transition duration-150"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={() => handleVote(-100)}
            aria-label="VETO option"
            className="w-15 h-15 min-w-[60px] min-h-[60px] rounded-full bg-[#FF9500] hover:bg-[#E08500] text-white flex items-center justify-center transition active:scale-90 shadow-md shadow-[#FF9500]/30 transition duration-150"
          >
            <Flame className="w-7 h-7 fill-current" />
          </button>

          <button
            type="button"
            onClick={() => handleVote(1)}
            aria-label="Approve option"
            className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-full bg-[#34C759]/10 hover:bg-[#34C759]/20 text-[#34C759] flex items-center justify-center transition active:scale-90 transition duration-150"
          >
            <Check className="w-6 h-6 stroke-[2.5]" />
          </button>

        </div>
      </div>

    </div>
  );
}
