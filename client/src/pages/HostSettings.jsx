import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Compass, Sparkles, MapPin, Check } from 'lucide-react';

export default function HostSettings() {
  const navigate = useNavigate();

  // Dual-Loop Mode: 'DISCOVERY' vs 'CUSTOM'
  const [mode, setMode] = useState('DISCOVERY');

  // Discovery Mode State
  const [category, setCategory] = useState('Restaurants');
  const [customKeyword, setCustomKeyword] = useState('');
  const [radiusKm, setRadiusKm] = useState(5);
  const [priceTier, setPriceTier] = useState('$$');

  // Custom Mode State
  const [topic, setTopic] = useState('Where should we hang out?');
  const [suggestionLimit, setSuggestionLimit] = useState(3);
  const [allowParticipantSuggestions, setAllowParticipantSuggestions] = useState(true);
  const [initialOptions, setInitialOptions] = useState('');

  const handleCreateRoom = (e) => {
    e.preventDefault();
    const mockPin = "4921";
    navigate(`/lobby/${mockPin}`, { state: { mode, isHost: true } });
  };

  const categories = [
    { label: 'Restaurants', icon: '🍽️' },
    { label: 'Cafes', icon: '☕' },
    { label: 'Bars', icon: '🍸' },
    { label: 'Fast Food', icon: '🍔' },
    { label: 'Desserts', icon: '🍰' },
    { label: 'Activities', icon: '🎳' },
    { label: 'Cinema', icon: '🎬' },
    { label: 'Parks', icon: '🌳' },
  ];

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-12 select-none">
      
      {/* Navigation Bar (Apple HIG Navigation Bar) */}
      <div className="sticky top-0 z-20 liquid-glass border-b border-black/[0.06] px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-[#007AFF] font-medium text-sm min-h-[44px] -ml-2 px-2 active:opacity-60 transition"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h2 className="font-semibold text-sm text-black">New Decision Room</h2>
        <div className="w-10"></div> {/* spacer for centering title */}
      </div>

      <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Apple Segmented Control (Dual-Loop Selector) */}
        <div className="bg-[#E5E5EA] p-1 rounded-xl flex shadow-inner">
          <button
            type="button"
            onClick={() => setMode('DISCOVERY')}
            className={`flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === 'DISCOVERY'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-[#6E6E73] hover:text-black'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Discovery Loop (API)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('CUSTOM')}
            className={`flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === 'CUSTOM'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-[#6E6E73] hover:text-black'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Custom Loop (Group)</span>
          </button>
        </div>

        <form onSubmit={handleCreateRoom} className="space-y-6">
          
          {/* ================= DISCOVERY MODE ================= */}
          {mode === 'DISCOVERY' && (
            <div className="space-y-5">
              
              {/* Category Grid */}
              <div className="bg-white rounded-2xl p-4 border border-black/[0.04] shadow-xs">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] mb-3">
                  Select Theme
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setCategory(cat.label)}
                      className={`min-h-[56px] flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium transition duration-150 ${
                        category === cat.label
                          ? 'bg-[#007AFF] text-white shadow-xs font-semibold'
                          : 'bg-[#F8F8FA] text-black hover:bg-[#EFEFF4]'
                      }`}
                    >
                      <span className="text-xl leading-none mb-1">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Inset Group: Keyword & Price */}
              <div className="bg-white rounded-2xl border border-black/[0.04] shadow-xs divide-y divide-black/[0.06] overflow-hidden">
                <div className="p-4">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] mb-1.5">
                    Filter Keyword <span className="normal-case font-normal text-[#8E8E93]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Italian, Sushi, Rooftop..."
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    className="w-full text-sm text-black placeholder:text-[#8E8E93] bg-transparent outline-none py-1"
                  />
                </div>

                <div className="p-4">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] mb-2.5">
                    Price Ceiling
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['$', '$$', '$$$', '$$$$'].map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setPriceTier(tier)}
                        className={`min-h-[40px] rounded-lg text-xs font-semibold transition ${
                          priceTier === tier
                            ? 'bg-black text-white'
                            : 'bg-[#F8F8FA] text-[#6E6E73] hover:bg-[#EFEFF4]'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Radius Slider Card */}
              <div className="bg-white rounded-2xl p-4 border border-black/[0.04] shadow-xs">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Search Distance
                  </span>
                  <span className="text-xs font-bold text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-full font-mono">
                    {radiusKm} km
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full h-2 bg-[#E5E5EA] rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
                />
                <div className="flex justify-between text-[11px] text-[#8E8E93] mt-1.5 font-medium">
                  <span>1 km</span>
                  <span>10 km</span>
                  <span>20 km</span>
                </div>
              </div>

            </div>
          )}

          {/* ================= CUSTOM MODE ================= */}
          {mode === 'CUSTOM' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-4 border border-black/[0.04] shadow-xs">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] mb-1.5">
                  Decision Topic / Question
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. What movie should we stream?"
                  className="w-full text-base font-medium text-black bg-transparent outline-none py-1 border-b border-black/[0.08] focus:border-[#007AFF] transition"
                  required
                />
              </div>

              <div className="bg-white rounded-2xl border border-black/[0.04] shadow-xs divide-y divide-black/[0.06] overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <span className="block text-sm font-semibold text-black">Group Anonymous Suggestions</span>
                    <span className="block text-xs text-[#6E6E73]">Let participants add their own ideas</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowParticipantSuggestions}
                    onChange={(e) => setAllowParticipantSuggestions(e.target.checked)}
                    className="w-5 h-5 rounded-md accent-[#007AFF] cursor-pointer"
                  />
                </div>

                {allowParticipantSuggestions && (
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-[#6E6E73]">Max Suggestions Per Person</span>
                      <span className="text-xs font-bold text-[#007AFF]">{suggestionLimit}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={suggestionLimit}
                      onChange={(e) => setSuggestionLimit(Number(e.target.value))}
                      className="w-full h-2 bg-[#E5E5EA] rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
                    />
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-4 border border-black/[0.04] shadow-xs">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] mb-1.5">
                  Host Pre-filled Options <span className="normal-case font-normal text-[#8E8E93]">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={initialOptions}
                  onChange={(e) => setInitialOptions(e.target.value)}
                  placeholder="Inception, Dune, Interstellar"
                  className="w-full text-sm text-black placeholder:text-[#8E8E93] bg-[#F8F8FA] rounded-xl p-3 border border-black/[0.06] outline-none focus:bg-white focus:ring-2 focus:ring-[#007AFF] transition"
                />
              </div>
            </div>
          )}

          {/* Primary Submit Button (Apple Standard 50pt touch target) */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[50px] bg-[#007AFF] hover:bg-[#0071E3] text-white font-semibold text-base rounded-2xl shadow-sm shadow-[#007AFF]/25 transition duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Generate Room PIN</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
