import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Users, DollarSign, Sparkles, Send, Play, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function RoomLobby() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode could be passed via state from HostSettings, or defaults to DISCOVERY / CUSTOM
  const mode = location.state?.mode || 'CUSTOM';
  const isHost = location.state?.isHost ?? true;
  const userName = location.state?.userName || 'Seb';

  // Step Zero State (Discovery Mode)
  const [budgetLimit, setBudgetLimit] = useState(250);
  const [submittedConstraint, setSubmittedConstraint] = useState(false);

  // Custom Suggestion State (Custom Mode)
  const [suggestion, setSuggestion] = useState('');
  const [mySuggestions, setMySuggestions] = useState([]);
  const [mockGroupSuggestions, setMockGroupSuggestions] = useState([
    "John's House",
    'Board Game Cafe',
    'Downtown Bowling Alley'
  ]);

  // Mock participants connected via socket
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
    setMockGroupSuggestions([...mockGroupSuggestions, suggestion.trim()]);
    setSuggestion('');
  };

  const handleStartVoting = () => {
    // In real app, Host emits socket event 'host_start_voting' or calls POST /rooms/:pin/start-voting
    // which triggers Levenshtein auto-merge and routes everyone to SwipeDeck
    navigate(`/deck/${pin}`, { state: { mode } });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Lobby PIN Banner */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Room PIN</span>
            <h1 className="text-3xl font-black text-indigo-600 tracking-widest font-mono">{pin}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Mode: <span className="font-semibold text-slate-800">{mode === 'DISCOVERY' ? '🔍 Discovery (API)' : '💡 Custom Suggestions'}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {participants.length} Active in Lobby
            </span>
          </div>
        </div>

        {/* Connected Participants (Roll Call) */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Lobby Roll-Call</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {participants.map((p, idx) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border ${
                  p.isMe
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {p.name} {p.isMe && '(You)'}
              </span>
            ))}
          </div>
        </div>

        {/* ================= STEP ZERO (DISCOVERY MODE) ================= */}
        {mode === 'DISCOVERY' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Step Zero: Anonymous Budget Limit</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set the maximum you are willing to spend. Options exceeding the group's lowest cap are silently pruned before voting!
                </p>
              </div>
            </div>

            {!submittedConstraint ? (
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-600">My Secret Budget Ceiling:</span>
                    <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg font-mono">
                      {budgetLimit} MDL
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="800"
                    step="25"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Tight (50 MDL)</span>
                    <span>250 MDL</span>
                    <span>No Cap (800+ MDL)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSubmittedConstraint(true)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Confirm Secret Constraint
                </button>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Your constraint ({budgetLimit} MDL) is locked in anonymously</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmittedConstraint(false)}
                  className="text-xs text-emerald-700 underline font-medium hover:text-emerald-900"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= ANONYMOUS SUGGESTIONS (CUSTOM MODE) ================= */}
        {mode === 'CUSTOM' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-purple-50 rounded-2xl text-purple-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Anonymous Suggestion Box</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submit ideas anonymously. The backend Levenshtein engine merges duplicates automatically.
                </p>
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleAddSuggestion} className="flex gap-2">
              <input
                type="text"
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Type your suggestion..."
                maxLength={40}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
              <button
                type="submit"
                disabled={!suggestion.trim() || mySuggestions.length >= 3}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Your submissions: {mySuggestions.length}/3</span>
              <span className="flex items-center gap-1 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                No names attached
              </span>
            </div>

            {/* Group suggestions stream */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Current Pool ({mockGroupSuggestions.length} Options Added)
              </span>
              <div className="flex flex-wrap gap-2">
                {mockGroupSuggestions.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200/70 rounded-full text-xs font-medium"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Start Voting Action (Host Trigger) */}
        <div className="pt-2">
          {isHost ? (
            <button
              onClick={handleStartVoting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-indigo-100 transition-all transform active:scale-[0.98]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Launch Voting Phase (All Players)</span>
            </button>
          ) : (
            <div className="p-4 bg-slate-100 rounded-2xl text-center text-xs text-slate-500 font-medium">
              Waiting for the host to start the voting phase...
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
