import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, Check, Flame, Trophy, Star, Sparkles, RotateCcw } from 'lucide-react';
import restaurantsMock from '../mocks/restaurants.json';

export default function SwipeDeck() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const mode = location.state?.mode || 'DISCOVERY';

  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myVotes, setMyVotes] = useState([]);
  const [showWinner, setShowWinner] = useState(false);

  // Mentor Post-Event Feedback
  const [satisfaction, setSatisfaction] = useState(5);
  const [priceAccuracy, setPriceAccuracy] = useState(4);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    if (mode === 'CUSTOM') {
      setCards([
        { id: 'c1', name: "John's House", emoji: '🏡', tags: ['Chill', 'Free'], distance_km: '0.8', price_level: 0 },
        { id: 'c2', name: 'Downtown Bowling', emoji: '🎳', tags: ['Activity', 'Fun'], distance_km: '3.2', price_level: 2 },
        { id: 'c3', name: 'Board Game Cafe', emoji: '🎲', tags: ['Cozy', 'Drinks'], distance_km: '1.4', price_level: 1 },
        { id: 'c4', name: 'Cinema Movie Night', emoji: '🍿', tags: ['Entertainment'], distance_km: '4.0', price_level: 2 }
      ]);
    } else {
      setCards(restaurantsMock);
    }
  }, [mode]);

  const handleVote = (score) => {
    const current = cards[currentIndex];
    setMyVotes([...myVotes, { option_id: current.id, score }]);
    setCurrentIndex((prev) => prev + 1);

    if (currentIndex + 1 >= cards.length) {
      setTimeout(() => {
        setShowWinner(true);
      }, 1200);
    }
  };

  const currentCard = cards[currentIndex];
  const winningOption = cards[0] || { name: "Luigi's Pizza", emoji: '🍕' };

  // Waiting for group
  if (currentIndex >= cards.length && !showWinner) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6 select-none">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 border border-black/[0.04] shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-[#007AFF]/10 text-[#007AFF] rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-black">Cards Complete</h2>
            <p className="text-xs text-[#6E6E73] mt-1">
              Calculating Condorcet compromise matrix...
            </p>
          </div>
          
          <div className="p-3.5 bg-[#F8F8FA] rounded-2xl space-y-2">
            <div className="flex justify-between text-xs font-semibold text-[#6E6E73]">
              <span>Votes Received</span>
              <span className="font-mono text-black">4 of 5</span>
            </div>
            <div className="w-full bg-[#E5E5EA] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#007AFF] h-full w-[80%] rounded-full animate-pulse"></div>
            </div>
          </div>

          <button
            onClick={() => setShowWinner(true)}
            className="w-full min-h-[44px] bg-black text-white text-xs font-semibold rounded-xl active:scale-[0.98] transition"
          >
            Show Consensus Result
          </button>
        </div>
      </div>
    );
  }

  // Consensus Winner Screen
  if (showWinner) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] py-10 px-4 flex items-center justify-center select-none">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-black/[0.04] overflow-hidden text-center">
          
          {/* Winner Header */}
          <div className="bg-[#007AFF] p-8 text-white">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-white/20 uppercase tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5" />
              Consensus Winner
            </span>
            <div className="text-6xl my-2">{winningOption.emoji}</div>
            <h1 className="text-2xl font-black tracking-tight">{winningOption.name}</h1>
            <p className="text-white/80 text-xs mt-1">Optimal group compromise • 0 Vetoes</p>
          </div>

          {/* Mentors' Post-Event Rating Form */}
          <div className="p-6 space-y-5">
            {!feedbackSubmitted ? (
              <div className="space-y-4 text-left">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93] block">
                    Post-Event Feedback
                  </span>
                  <h3 className="text-sm font-bold text-black mt-0.5">
                    How was this choice?
                  </h3>
                </div>

                {/* Satisfaction */}
                <div className="p-3 bg-[#F8F8FA] rounded-xl border border-black/[0.04]">
                  <span className="text-xs font-medium text-[#6E6E73] block mb-1.5">
                    Group Satisfaction
                  </span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSatisfaction(star)}
                        className={`p-1 transition ${
                          satisfaction >= star ? 'text-[#FF9500]' : 'text-[#E5E5EA]'
                        }`}
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Accuracy */}
                <div className="p-3 bg-[#F8F8FA] rounded-xl border border-black/[0.04]">
                  <span className="text-xs font-medium text-[#6E6E73] block mb-1.5">
                    Price Match Expectation
                  </span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setPriceAccuracy(star)}
                        className={`p-1 transition ${
                          priceAccuracy >= star ? 'text-[#007AFF]' : 'text-[#E5E5EA]'
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
              <div className="p-3 bg-[#34C759]/10 border border-[#34C759]/20 rounded-xl text-left text-xs text-[#28893F]">
                <p className="font-semibold">Rating Saved</p>
                <p className="text-[11px] opacity-90 mt-0.5">Recorded to VenueAnalytics to train future decisions.</p>
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              className="w-full min-h-[44px] flex items-center justify-center gap-1.5 text-[#007AFF] text-xs font-semibold hover:bg-[#F2F2F7] rounded-xl transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start New Decision</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // Active Swipe Deck
  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col justify-between select-none">
      
      {/* Top Header Bar */}
      <div className="p-4 flex justify-between items-center max-w-sm w-full mx-auto">
        <div>
          <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider block">PIN</span>
          <span className="text-sm font-black text-black font-mono">{pin}</span>
        </div>
        <span className="text-xs font-semibold text-[#6E6E73] bg-white px-3 py-1 rounded-full border border-black/[0.05] shadow-xs">
          {currentIndex + 1} of {cards.length}
        </span>
      </div>

      {/* Center Swipe Card */}
      <div className="flex-1 flex items-center justify-center p-4 max-w-sm w-full mx-auto">
        {currentCard && (
          <div className="w-full bg-white rounded-[2rem] shadow-sm border border-black/[0.05] overflow-hidden flex flex-col">
            <div className="h-64 bg-[#F8F8FA] flex items-center justify-center text-7xl select-none">
              {currentCard.emoji || '📍'}
            </div>
            
            <div className="p-6">
              <h2 className="text-2xl font-black text-black tracking-tight mb-1">{currentCard.name}</h2>
              
              <div className="flex items-center gap-2 text-xs text-[#6E6E73] font-medium mb-4">
                <span>{currentCard.distance_km} km away</span>
                <span>•</span>
                <span>{currentCard.price_level > 0 ? '$'.repeat(currentCard.price_level) : 'Free'}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {currentCard.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-[#F2F2F7] text-black rounded-lg text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Apple Liquid Glass Control Dock (Thumb Zone) */}
      <div className="p-6 pb-10 flex justify-center items-center">
        <div className="liquid-glass rounded-full px-6 py-3 flex items-center gap-6 shadow-lg shadow-black/5">
          
          {/* Pass Control (Red X) */}
          <button
            type="button"
            onClick={() => handleVote(-1)}
            aria-label="Pass option"
            className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-full bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] flex items-center justify-center active:scale-90 transition duration-150"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>

          {/* VETO Dealbreaker (Middle Flame Control) */}
          <button
            type="button"
            onClick={() => handleVote(-100)}
            aria-label="VETO option"
            className="w-15 h-15 min-w-[60px] min-h-[60px] rounded-full bg-[#FF9500] hover:bg-[#E08500] text-white flex items-center justify-center active:scale-90 shadow-md shadow-[#FF9500]/30 transition duration-150"
          >
            <Flame className="w-7 h-7 fill-current" />
          </button>

          {/* Approve Control (Green Check) */}
          <button
            type="button"
            onClick={() => handleVote(1)}
            aria-label="Approve option"
            className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-full bg-[#34C759]/10 hover:bg-[#34C759]/20 text-[#34C759] flex items-center justify-center active:scale-90 transition duration-150"
          >
            <Check className="w-6 h-6 stroke-[2.5]" />
          </button>

        </div>
      </div>

    </div>
  );
}
