import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Users, DollarSign, Sparkles, Send, Play, CheckCircle2, Shield } from 'lucide-react';

export default function RoomLobby() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const mode = location.state?.mode || 'CUSTOM';
  const isHost = location.state?.isHost ?? true;
  const userName = location.state?.userName || 'Seb';

  const [budgetLimit, setBudgetLimit] = useState(250);
  const [confirmedConstraint, setConfirmedConstraint] = useState(false);

  const [suggestion, setSuggestion] = useState('');
  const [mySuggestions, setMySuggestions] = useState([]);
  const [groupPool, setGroupPool] = useState([
    "John's House",
    'Board Game Cafe',
    'Downtown Bowling'
  ]);

  const [participants] = useState([
    { name: userName, isMe: true },
    { name: 'Gabriel', isMe: false },
    { name: 'Afina', isMe: false },
    { name: 'Max', isMe: false },
    { name: 'Lilia', isMe: false }
  ]);

  const handleAddSuggestion = (e) => {
    e.preventDefault();
    if (!suggestion.trim() || mySuggestions.length >= 3) return;
    setMySuggestions([...mySuggestions, suggestion.trim()]);
    setGroupPool([...groupPool, suggestion.trim()]);
    setSuggestion('');
  };

  const handleStartVoting = () => {
    navigate(`/deck/${pin}`, { state: { mode } });
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-16 select-none">
      
      {/* Navigation Header */}
      <div className="sticky top-0 z-20 liquid-glass border-b border-black/[0.06] px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider block">Lobby</span>
          <span className="text-base font-black text-black font-mono tracking-widest">{pin}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#34C759]/10 text-[#34C759] text-xs font-semibold rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse"></span>
          {participants.length} Active
        </span>
      </div>

      <div className="max-w-md mx-auto p-4 sm:p-6 space-y-5">
        
        {/* Participants Inset Section */}
        <div className="bg-white rounded-2xl p-4 border border-black/[0.04] shadow-xs">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Users className="w-3.5 h-3.5 text-[#6E6E73]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73]">
              Lobby Roll-Call
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {participants.map((p, idx) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  p.isMe
                    ? 'bg-[#007AFF] text-white shadow-xs'
                    : 'bg-[#F2F2F7] text-black'
                }`}
              >
                {p.name} {p.isMe && '(You)'}
              </span>
            ))}
          </div>
        </div>

        {/* ================= DISCOVERY MODE: STEP ZERO ================= */}
        {mode === 'DISCOVERY' && (
          <div className="bg-white rounded-2xl p-5 border border-black/[0.04] shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF]">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-black">Step Zero: Secret Budget Cap</h3>
                <p className="text-[11px] text-[#6E6E73]">Over-budget venues get pruned silently</p>
              </div>
            </div>

            {!confirmedConstraint ? (
              <div className="space-y-4 pt-1">
                <div className="p-3 bg-[#F8F8FA] rounded-xl flex items-center justify-between">
                  <span className="text-xs font-medium text-[#6E6E73]">My Spending Ceiling</span>
                  <span className="text-base font-bold text-[#007AFF] font-mono">{budgetLimit} MDL</span>
                </div>

                <input
                  type="range"
                  min="50"
                  max="800"
                  step="25"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(Number(e.target.value))}
                  className="w-full h-2 bg-[#E5E5EA] rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
                />

                <button
                  type="button"
                  onClick={() => setConfirmedConstraint(true)}
                  className="w-full min-h-[44px] bg-[#007AFF] hover:bg-[#0071E3] text-white rounded-xl text-xs font-semibold transition active:scale-[0.98]"
                >
                  Lock Secret Constraint
                </button>
              </div>
            ) : (
              <div className="p-3 bg-[#34C759]/10 border border-[#34C759]/20 rounded-xl flex items-center justify-between text-xs text-[#28893F]">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                  <span>Locked in ({budgetLimit} MDL max)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmedConstraint(false)}
                  className="underline font-semibold hover:opacity-80"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= CUSTOM MODE: ANONYMOUS SUGGESTIONS ================= */}
        {mode === 'CUSTOM' && (
          <div className="bg-white rounded-2xl p-5 border border-black/[0.04] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black">Anonymous Suggestions</h3>
                  <p className="text-[11px] text-[#6E6E73]">Merged with Levenshtein fuzzy logic</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-[#8E8E93]">
                <Shield className="w-3 h-3 text-[#34C759]" />
                Anonymous
              </span>
            </div>

            <form onSubmit={handleAddSuggestion} className="flex gap-2">
              <input
                type="text"
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Suggest an option..."
                maxLength={30}
                className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#F8F8FA] border border-black/[0.06] text-xs text-black placeholder:text-[#8E8E93] outline-none focus:bg-white focus:ring-2 focus:ring-[#007AFF] transition"
              />
              <button
                type="submit"
                disabled={!suggestion.trim() || mySuggestions.length >= 3}
                className="min-h-[44px] px-4 bg-black disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition active:scale-[0.96] flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                <span>Add</span>
              </button>
            </form>

            <div className="pt-2 border-t border-black/[0.04]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93] block mb-2">
                Active Group Pool ({groupPool.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {groupPool.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-[#F2F2F7] text-black rounded-lg text-xs font-medium"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Host Launch Action */}
        <div className="pt-2">
          {isHost ? (
            <button
              onClick={handleStartVoting}
              className="w-full min-h-[50px] bg-[#007AFF] hover:bg-[#0071E3] text-white font-semibold text-base rounded-2xl shadow-sm shadow-[#007AFF]/25 transition duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Swiping Phase</span>
            </button>
          ) : (
            <div className="p-4 bg-white/60 backdrop-blur-md rounded-2xl text-center text-xs text-[#6E6E73] font-medium border border-black/[0.04]">
              Waiting for host to start voting...
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
