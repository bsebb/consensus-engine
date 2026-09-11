import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { X, Check, Flame } from 'lucide-react';
import restaurantsMock from '../mocks/restaurants.json';

export default function SwipeDeck() {
  const { pin } = useParams();
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // In Sprint 2, you will fetch this from the real API
    setCards(restaurantsMock);
  }, []);

  const handleVote = (score) => {
    // Score mapping: 1 (Approve), -1 (Pass), -100 (VETO)
    console.log(`Voted ${score} on ${cards[currentIndex].name}`);
    setCurrentIndex(prev => prev + 1);
    
    // In Sprint 2, save these scores to an array, and send to backend when finished
  };

  if (currentIndex >= cards.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Waiting for others...</h2>
          <p className="text-gray-500">You've swiped all the options!</p>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white shadow-sm flex justify-between items-center">
        <h1 className="font-bold text-gray-800">Room: {pin}</h1>
        <span className="text-sm text-gray-500">{currentIndex + 1} / {cards.length}</span>
      </div>

      {/* Card Area (Absolute Positioning to stack them later) */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        
        {/* The active card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all">
          <div className="h-64 bg-gray-200 flex items-center justify-center text-6xl">
            {currentCard.emoji}
          </div>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">{currentCard.name}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <span>{currentCard.distance_km} km away</span>
              <span>•</span>
              <span>{'$'.repeat(currentCard.price_level)}</span>
            </div>
            <div className="flex gap-2">
              {currentCard.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 3-Way Action Buttons */}
      <div className="p-6 pb-12 flex justify-center items-center gap-6">
        {/* Pass (Swipe Left) */}
        <button 
          onClick={() => handleVote(-1)}
          className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 transition"
        >
          <X className="w-8 h-8" />
        </button>

        {/* VETO (Middle Button) */}
        <button 
          onClick={() => handleVote(-100)}
          className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-orange-500 hover:bg-orange-50 transition border-2 border-orange-100"
        >
          <Flame className="w-6 h-6" />
        </button>

        {/* Approve (Swipe Right) */}
        <button 
          onClick={() => handleVote(1)}
          className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-emerald-500 hover:bg-emerald-50 transition"
        >
          <Check className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}
