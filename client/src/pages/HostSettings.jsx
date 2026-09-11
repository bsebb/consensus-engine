import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Sparkles, MapPin, Sliders, Users, ArrowRight } from 'lucide-react';

export default function HostSettings() {
  const navigate = useNavigate();

  // Dual-Loop Mode: 'DISCOVERY' (Google Places API) vs 'CUSTOM' (Crowdsourced Suggestions)
  const [mode, setMode] = useState('DISCOVERY');

  // Discovery Mode State
  const [category, setCategory] = useState('Restaurant');
  const [customKeyword, setCustomKeyword] = useState('');
  const [radiusKm, setRadiusKm] = useState(5);
  const [maxPrice, setMaxPrice] = useState('$$');

  // Custom Mode State
  const [topic, setTopic] = useState('Where should we hang out tonight?');
  const [suggestionLimit, setSuggestionLimit] = useState(3);
  const [allowParticipantSuggestions, setAllowParticipantSuggestions] = useState(true);
  const [initialOptions, setInitialOptions] = useState('');

  const handleCreateRoom = (e) => {
    e.preventDefault();
    const mockPin = "4921";

    const payload = {
      mode,
      hostName: 'Host',
      ...(mode === 'DISCOVERY'
        ? { category, customKeyword, radiusKm, maxPrice }
        : { topic, suggestionLimit, allowParticipantSuggestions, initialOptions }
      )
    };

    console.log('Room created with payload:', payload);

    // Navigate to the Lobby / Step Zero / Suggestion phase before the swipe deck
    navigate(`/lobby/${mockPin}`, { state: { mode, isHost: true } });
  };

  const discoveryCategories = [
    { label: 'Restaurant', icon: '🍽️' },
    { label: 'Cafe / Coffee', icon: '☕' },
    { label: 'Bar / Drinks', icon: '🍸' },
    { label: 'Fast Food', icon: '🍔' },
    { label: 'Dessert & Bakery', icon: '🍰' },
    { label: 'Fun Activity', icon: '🎳' },
    { label: 'Cinema / Movies', icon: '🎬' },
    { label: 'Parks & Outdoor', icon: '🌳' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-8 text-white text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md uppercase tracking-wider mb-2">
            Host Control Panel
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Create a Decision Room</h1>
          <p className="text-indigo-100 text-sm mt-1">Pick an engine loop to curate options for your group</p>
        </div>

        {/* Loop Selector (Dual-Loop Tabs) */}
        <div className="p-6 sm:p-8">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Choose Decision Loop
          </label>
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl mb-8">
            <button
              type="button"
              onClick={() => setMode('DISCOVERY')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                mode === 'DISCOVERY'
                  ? 'bg-white text-indigo-600 shadow-md scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Discovery Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('CUSTOM')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                mode === 'CUSTOM'
                  ? 'bg-white text-purple-600 shadow-md scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Custom Loop</span>
            </button>
          </div>

          <form onSubmit={handleCreateRoom} className="space-y-6">
            {/* ================= DISCOVERY MODE (PLACES API) ================= */}
            {mode === 'DISCOVERY' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs text-indigo-900 flex items-start gap-3">
                  <span className="text-lg">🗺️</span>
                  <div>
                    <p className="font-semibold text-indigo-950">Places API Automated Fetch</p>
                    <p className="text-indigo-700/90 mt-0.5">
                      The consensus engine automatically queries venues around your GPS location. "Step Zero" will anonymously prune venues that exceed participants' secret budgets.
                    </p>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">
                    Category Theme
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {discoveryCategories.map((cat) => (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setCategory(cat.label)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                          category === cat.label
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xl mb-1">{cat.icon}</span>
                        <span className="text-center leading-tight">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Keyword / Filter */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Specific Cuisine / Keyword <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sushi, Vegan, Rooftop, Italian..."
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition"
                  />
                </div>

                {/* Search Radius Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      Search Radius
                    </label>
                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                      {radiusKm} km
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    step="1"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Walking (1km)</span>
                    <span>5km</span>
                    <span>Driving (25km)</span>
                  </div>
                </div>

                {/* Host Starting Price Ceiling */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Default Price Guide
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['$', '$$', '$$$', '$$$$'].map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setMaxPrice(tier)}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          maxPrice === tier
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= CUSTOM MODE (ANONYMOUS SUGGESTIONS) ================= */}
            {mode === 'CUSTOM' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl text-xs text-purple-950 flex items-start gap-3">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="font-semibold text-purple-950">Crowdsourced Anonymous Loop</p>
                    <p className="text-purple-700/90 mt-0.5">
                      Participants anonymously type suggestions onto a blank canvas. Our backend Levenshtein fuzzy engine merges duplicates automatically (e.g. "Johns House" & "John's house").
                    </p>
                  </div>
                </div>

                {/* Decision Topic */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Question / Topic Prompt
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. What movie should we stream? / What activity next?"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm transition"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Everyone sees this question when they join your PIN.
                  </p>
                </div>

                {/* Anonymous Suggestion Settings */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Allow Group Suggestions</p>
                      <p className="text-xs text-slate-500">Let joined participants add anonymous options</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowParticipantSuggestions}
                      onChange={(e) => setAllowParticipantSuggestions(e.target.checked)}
                      className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                    />
                  </div>

                  {allowParticipantSuggestions && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Max Suggestions Per Person: <span className="text-purple-600 font-bold">{suggestionLimit}</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={suggestionLimit}
                        onChange={(e) => setSuggestionLimit(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                  )}
                </div>

                {/* Host Pre-seeded Options */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Host Pre-filled Options <span className="text-slate-400 font-normal">(Comma separated, optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={initialOptions}
                    onChange={(e) => setInitialOptions(e.target.value)}
                    placeholder="e.g. Inception, Interstellar, Dune, The Matrix"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    You can kick off the room with ideas, and friends can add theirs.
                  </p>
                </div>
              </div>
            )}

            {/* Submit / Generate PIN */}
            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                className={`w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all transform active:scale-[0.98] ${
                  mode === 'DISCOVERY'
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                    : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
                }`}
              >
                <span>Generate PIN & Open Lobby</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
