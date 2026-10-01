import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Clock, Plus, LogIn, Compass, Users } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import SegmentedControl from '../components/ui/SegmentedControl';

export default function JoinRoom() {
  const [activeTab, setActiveTab] = useState('join'); // 'join' | 'host'
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isConnected, participantId, emit } = useSocket();
  const { addToast } = useToast();

  const handleJoin = async (e) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    const cleanName = name.trim();

    if (cleanPin.length !== 4 || !cleanName) return;

    setLoading(true);

    try {
      // 1. Verify room existence on backend if online
      const response = await fetch(`/api/v1/rooms/${cleanPin}`);
      
      if (response.ok) {
        const roomData = await response.json();
        
        // Register join via Socket.io
        emit('join_lobby', {
          pin: cleanPin,
          participant_id: participantId,
          user_name: cleanName,
        });

        addToast({
          title: 'Connected to Room',
          message: `Joined session #${cleanPin}`,
          type: 'success',
        });

        navigate(`/lobby/${cleanPin}`, {
          state: {
            isHost: false,
            userName: cleanName,
            roomData,
          },
        });
        return;
      }
    } catch (err) {
      console.warn('[JoinRoom] Backend unreachable, entering simulated session:', err);
    }

    // 2. Offline / simulated fallback
    addToast({
      title: 'Local Room Session',
      message: `Entering room #${cleanPin} in local mode`,
      type: 'info',
    });

    navigate(`/lobby/${cleanPin}`, {
      state: {
        isHost: false,
        userName: cleanName,
      },
    });

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-5 sm:p-8 select-none">
      
      {/* Top Bar with Specular Badge & Theme Controls */}
      <header className="relative z-10 flex justify-between items-center w-full max-w-md mx-auto">
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Past Decisions"
        >
          <Clock size={16} />
          <span>Past Sessions</span>
        </button>

        <div className="flex items-center gap-2.5">
          <StatusBadge
            status={isConnected ? 'success' : 'neutral'}
            label={isConnected ? 'Live Sync' : 'Local Engine'}
            pulse={isConnected}
            size="sm"
          />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Focus Glass Card Frame */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-[var(--border-glass)] flex flex-col gap-6">
          
          {/* Brand Symbol & Monogram */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-bg)] flex items-center justify-center text-white shadow-[0_8px_24px_var(--accent-glow)] mb-1">
              <Sparkles size={28} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ios-label)]">
              Consensus Engine
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ios-secondary-label)] max-w-xs">
              Algorithmic social agreement without endless debate
            </p>
          </div>

          {/* Join Form */}
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="userName"
                className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ios-secondary-label)] px-1"
              >
                Your Display Name
              </label>
              <input
                id="userName"
                name="userName"
                type="text"
                placeholder="e.g. Sebastian"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-[var(--border-main)] text-sm text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:border-[var(--accent-bg)] focus:ring-2 focus:ring-[var(--accent-glow-focus)] outline-none transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="roomPin"
                className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ios-secondary-label)] px-1"
              >
                4-Digit Room PIN
              </label>
              <input
                id="roomPin"
                name="roomPin"
                type="text"
                placeholder="0000"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full min-h-[50px] px-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-[var(--border-main)] text-center font-mono text-2xl tracking-[0.35em] text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:border-[var(--accent-bg)] focus:ring-2 focus:ring-[var(--accent-glow-focus)] outline-none transition-all"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={pin.length !== 4 || !name.trim()}
              icon={ArrowRight}
              className="w-full mt-2"
            >
              Enter Room Lobby
            </Button>
          </form>

          {/* Bottom Thumb-Zone Host CTA */}
          <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col items-center gap-2">
            <span className="text-xs text-[var(--ios-secondary-label)]">Starting a new group vote?</span>
            <button
              type="button"
              onClick={() => navigate('/host')}
              className="w-full py-3 px-4 rounded-xl border border-[var(--border-main)] apple-card flex items-center justify-center gap-2 text-sm font-semibold text-[var(--ios-label)] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Compass size={17} className="text-[var(--accent-bg)]" />
              <span>Host a New Session</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-md mx-auto text-center text-xs text-[var(--ios-tertiary-label)] pb-2 select-none">
        Condorcet Pairwise Elimination & Schulze Consensus
      </footer>
    </div>
  );
}
