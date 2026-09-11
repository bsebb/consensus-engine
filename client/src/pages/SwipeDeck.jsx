import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, Check, Flame, Trophy, Star, Sparkles, ArrowRight, RotateCcw } from 'lucide-react';
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

  // Post-Event Feedback State (Mentor Suggestion)
  const [satisfaction, setSatisfaction] = useState(5);
  const [priceAccuracy, setPriceAccuracy] = useState(4);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    if (mode === 'CUSTOM') {
      setCards([
        { id: 'c1', name: "John's House", emoji: '🏡', tags: ['Chill', 'Free'], distance_km: 'In Town', price_level: 0 },
        { id: 'c2', name: 'Downtown Bowling Alley', emoji: '🎳', tags: ['Activity', 'Fun'], distance_km: '3.2', price_level: 2 },
        { id: 'c3', name: 'Board Game Cafe', emoji: '🎲', tags: ['Cozy', 'Drinks'], distance_km: '1.4', price_level: 1 },
        { id: 'c4', name: 'Cinema Movie Night', emoji: '🍿', tags: ['Entertainment'], distance_km: '4.0', price_level: 2 }
      ]);
    } else {
      setCards(restaurantsMock);
    }
  }, [mode]);

  const handleVote = (score) => {
    const currentCard = cards[currentIndex];
    const updated = [...myVotes, { option_id: currentCard.id, score }];
    setMyVotes(updated);
    setCurrentIndex((prev) => prev + 1);

    // If this was the last card, auto-trigger resolution after a short delay
    if (currentIndex + 1 >= cards.length) {
      setTimeout(() => {
        setShowWinner(true);
      }, 1500);
    }
  };

  const currentCard = cards[currentIndex];

  // Winner calculation fallback mock
  const winningOption = cards[0] || { name: "Luigi's Pizza", emoji: '🍕' };

  // Screen when swiping is done
  if (currentIndex >= cards.length && !showWinner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 border border-slate-200/80 shadow-lg text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">You're All Done!</h2>
          <p className="text-xs text-slate-500">
            Waiting for remaining friends to complete their deck. Running Condorcet Graph algorithm...
          </p>
          
          <div className="p-3 bg-slate-100 rounded-2xl">
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span>Votes Gathered</span>
              <span>4 / 5 Finished</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full w-[80%] rounded-full animate-pulse"></div>
            </div>
          </div>

          <button
            onClick={() => setShowWinner(true)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Reveal Winner Now (Preview)
          </button>
        </div>
      </div>
    );
  }

  // ================= CONSENSUS WINNER + POST-EVENT FEEDBACK =================
  if (showWinner) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden text-center">
          
          {/* Winner Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-8 text-white relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-widest mb-2">
              <Trophy className="w-3.5 h-3.5" />
              Consensus Reached!
            </div>
            <div className="text-6xl mb-2">{winningOption.emoji}</div>
            <h1 className="text-3xl font-black tracking-tight">{winningOption.name}</h1>
            <p className="text-amber-100 text-xs mt-1">Optimal Group Compromise (0 Vetoes)</p>
          </div>

          {/* Post-Event Feedback Loop (Mentor Requirement) */}
          <div className="p-6 sm:p-8 space-y-6">
            {!feedbackSubmitted ? (
              <div className="space-y-4">
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Proprietary Feedback Loop
                  </span>
                  <h3 className="text-base font-bold text-slate-800 mt-0.5">
                    Rate This Group Choice
                  </h3>
                  <p className="text-xs text-slate-500">
                    Your ratings train our recommendation engine so we don't rely solely on Google Places API.
                  </p>
                </div>

                {/* Satisfaction */}
                <div className="text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    How satisfied is the group with this choice?
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSatisfaction(star)}
                        className={`p-1.5 rounded-lg transition ${
                          satisfaction >= star ? 'text-amber-400' : 'text-slate-300'
                        }`}
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Accuracy */}
                <div className="text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Did the actual price match expectations?
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setPriceAccuracy(star)}
                        className={`p-1.5 rounded-lg transition ${
                          priceAccuracy >= star ? 'text-indigo-600' : 'text-slate-300'
                        }`}
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFeedbackSubmitted(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-100"
                >
                  Submit Proprietary Review
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs space-y-1">
                <p className="font-bold text-sm text-emerald-900">Feedback Saved to Database!</p>
                <p className="text-emerald-700">Data recorded to VenueAnalytics table to optimize future decisions.</p>
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start New Decision Room</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ================= CARD SWIPING PHASE =================
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-xs">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Lobby</span>
          <h1 className="font-black text-slate-800 font-mono text-sm">PIN: {pin}</h1>
        </div>

        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          Card {currentIndex + 1} of {cards.length}
        </span>
      </div>

      {/* Card Deck Area */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        {currentCard && (
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden transform transition-all duration-300">
            <div className="h-56 bg-gradient-to-br from-slate-100 to-indigo-50/50 flex items-center justify-center text-7xl select-none">
              {currentCard.emoji || '📍'}
            </div>
            
            <div className="p-6">
              <h2 className="text-2xl font-black text-slate-800 mb-1">{currentCard.name}</h2>
              
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-4">
                <span>{currentCard.distance_km} km away</span>
                <span>•</span>
                <span>{currentCard.price_level > 0 ? '$'.repeat(currentCard.price_level) : 'Free / Custom'}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {currentCard.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3-Way Action Buttons (Approve / Pass / Veto) */}
      <div className="p-6 pb-10 flex justify-center items-center gap-6">
        {/* Pass (Left) */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => handleVote(-1)}
            className="w-16 h-16 bg-white rounded-2xl shadow-md border border-rose-100 flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:scale-105 active:scale-95 transition"
            title="Pass / Disapprove"
          >
            <X className="w-8 h-8 stroke-[2.5]" />
          </button>
          <span className="text-[10px] font-bold text-slate-400 mt-1 block uppercase tracking-wider">Pass</span>
        </div>

        {/* VETO (Middle Dealbreaker) */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => handleVote(-100)}
            className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg shadow-orange-200 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition border-2 border-orange-300"
            title="VETO (Dealbreaker)"
          >
            <Flame className="w-8 h-8 fill-current" />
          </button>
          <span className="text-[10px] font-black text-orange-600 mt-1 block uppercase tracking-wider">Veto</span>
        </div>

        {/* Approve (Right) */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => handleVote(1)}
            className="w-16 h-16 bg-white rounded-2xl shadow-md border border-emerald-100 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 hover:scale-105 active:scale-95 transition"
            title="Approve"
          >
            <Check className="w-8 h-8 stroke-[2.5]" />
          </button>
          <span className="text-[10px] font-bold text-slate-400 mt-1 block uppercase tracking-wider">Approve</span>
        </div>
      </div>
    </div>
  );
}
