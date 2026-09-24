import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('consensus_history');
      return saved ? JSON.parse(saved).reverse() : [];
    } catch (e) {
      console.error('Failed to parse history', e);
      return [];
    }
  });
  const [expandedId, setExpandedId] = useState(null);

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your decision history?")) {
      localStorage.removeItem('consensus_history');
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black transition-colors select-none pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 liquid-glass border-b border-black/[0.06] dark:border-white/[0.08] px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-[#007AFF] font-medium active:opacity-70 flex items-center min-h-[44px] -ml-1 px-1"
        >
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span>Back</span>
        </button>
        <h2 className="font-semibold text-black dark:text-white">Past Decisions</h2>
        <ThemeToggle />
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4 mt-2">
        {history.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-black/[0.03] dark:bg-white/[0.05] rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-[#8E8E93]" />
            </div>
            <h3 className="text-lg font-bold text-black dark:text-white mb-1">No History Yet</h3>
            <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">
              Your completed group decisions will appear here automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center px-1 mb-2">
              <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">
                Saved locally on this device
              </span>
              <button 
                type="button"
                onClick={clearHistory}
                className="text-xs text-[#FF3B30] font-medium min-h-[44px] flex items-center hover:opacity-80 transition-opacity duration-100"
              >
                Clear
              </button>
            </div>

            {history.map((session) => {
              const isExpanded = expandedId === session.id;
              const formattedDate = new Date(session.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div 
                  key={session.id} 
                  className="apple-card overflow-hidden cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <span className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
                        {formattedDate} • {session.topic}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{session.winner?.emoji}</span>
                        <h3 className="text-lg font-black text-black dark:text-white tracking-tight">
                          {session.winner?.name}
                        </h3>
                      </div>
                    </div>
                    <div className="text-[#8E8E93] pl-3">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-black/[0.04] dark:border-white/[0.06] pt-3 bg-[#F8F8FA]/50 dark:bg-[#1C1C1E]/50">
                      <h4 className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                        Other Options Evaluated
                      </h4>
                      <div className="space-y-1.5">
                        {session.options?.filter(o => o.id !== session.winner?.id).map((opt) => (
                          <div key={opt.id} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-1.5 text-black dark:text-white">
                              <span>{opt.emoji}</span>
                              <span className="font-medium">{opt.name}</span>
                            </div>
                            <span className="text-xs text-[#8E8E93] bg-black/[0.03] dark:bg-white/[0.05] px-2 py-0.5 rounded-md">
                              Passed
                            </span>
                          </div>
                        ))}
                        {(!session.options || session.options.length <= 1) && (
                          <p className="text-xs text-[#8E8E93]">No other options.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
