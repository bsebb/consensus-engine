import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Clock,
  Compass,
  Users,
  ShieldCheck,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Utensils,
  Coffee,
  Wine,
  Film,
  Flame,
  Check,
  RotateCcw,
  MapPin,
  Star,
} from 'lucide-react';
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

  // Interactive Live Simulator State (for mentors and users to test swiping on the home page)
  const [practiceVote, setPracticeVote] = useState(null); // 'approve' | 'pass' | 'veto'
  const [practiceCardIndex, setPracticeCardIndex] = useState(0);

  const practiceCards = [
    {
      name: 'La Taverna Bistro',
      cuisine: 'Italian & Wine Bar',
      rating: '4.8',
      price: '$$',
      distance: '1.1 km',
      tags: ['Handmade Pasta', 'Outdoor Patio'],
    },
    {
      name: 'Umami Ramen Lab',
      cuisine: 'Japanese Broth & Bites',
      rating: '4.9',
      price: '$$',
      distance: '0.8 km',
      tags: ['Rich Tonkotsu', 'Late Night'],
    },
    {
      name: 'Rooftop Lounge 360',
      cuisine: 'Cocktails & Tapas',
      rating: '4.7',
      price: '$$$',
      distance: '2.4 km',
      tags: ['Panoramic View', 'Sunset Vibe'],
    },
  ];

  const handlePracticeSwipe = (type) => {
    setPracticeVote(type);
    setTimeout(() => {
      setPracticeCardIndex((prev) => (prev + 1) % practiceCards.length);
      setPracticeVote(null);
    }, 450);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    const cleanName = name.trim();

    if (cleanPin.length !== 4 || !cleanName) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/v1/rooms/${cleanPin}`);
      if (response.ok) {
        const roomData = await response.json();
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
      console.warn('[JoinRoom] Server unreachable, using local session:', err);
    }

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

  const quickPresets = [
    { label: 'Dinner & Wine', icon: Utensils, category: 'Restaurants' },
    { label: 'Coffee & Chill', icon: Coffee, category: 'Cafes' },
    { label: 'Drinks & Pubs', icon: Wine, category: 'Bars & Pubs' },
    { label: 'Cinema & Arts', icon: Film, category: 'Cinema' },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none">
      
      {/* Top Application Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-bg)] flex items-center justify-center text-white shadow-[0_4px_16px_var(--accent-glow)]">
            <Sparkles size={20} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-[var(--ios-label)]">
                Consensus Engine
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--accent-bg)]/10 text-[var(--accent-bg)]">
                v2.0
              </span>
            </div>
            <span className="text-xs text-[var(--ios-secondary-label)]">
              Multiplayer Social Choice Protocol
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Past Sessions"
          >
            <Clock size={15} />
            <span className="hidden sm:inline">Past Decisions</span>
          </button>
          
          <StatusBadge
            status={isConnected ? 'success' : 'neutral'}
            label={isConnected ? 'Live Sync' : 'Local Engine'}
            pulse={isConnected}
            size="sm"
          />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Expansive Multi-Wing Canvas */}
      <main className="w-full max-w-6xl mx-auto my-auto py-6 sm:py-10 grid lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Wing (Cols 1-7): Ingress Command Center */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="liquid-glass rounded-3xl p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.20)] border border-[var(--border-glass)] flex flex-col gap-6">
            
            {/* Header with Segmented Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ios-label)]">
                  End the Group Debate.
                </h1>
                <p className="text-xs sm:text-sm text-[var(--ios-secondary-label)] mt-1">
                  Algorithmic consensus in under 3 minutes with zero social pressure.
                </p>
              </div>

              <div className="w-full sm:w-auto">
                <SegmentedControl
                  options={[
                    { value: 'join', label: 'Join Room' },
                    { value: 'host', label: 'Host Room' },
                  ]}
                  value={activeTab}
                  onChange={setActiveTab}
                  size="sm"
                />
              </div>
            </div>

            {/* TAB 1: JOIN ROOM */}
            {activeTab === 'join' ? (
              <form onSubmit={handleJoin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="userName"
                    className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] px-1"
                  >
                    Your Nickname / Display Name
                  </label>
                  <input
                    id="userName"
                    name="userName"
                    type="text"
                    placeholder="e.g. Sebastian or Gabi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full min-h-[48px] px-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-[var(--border-main)] text-sm text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:border-[var(--accent-bg)] focus:ring-2 focus:ring-[var(--accent-glow-focus)] outline-none transition-all"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="roomPin"
                    className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] px-1"
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
                    className="w-full min-h-[54px] px-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-[var(--border-main)] text-center font-mono text-2xl tracking-[0.4em] text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:border-[var(--accent-bg)] focus:ring-2 focus:ring-[var(--accent-glow-focus)] outline-none transition-all"
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
            ) : (
              /* TAB 2: HOST QUICK START */
              <div className="flex flex-col gap-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] px-1">
                  Pick a Quick Vibe or Customize
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  {quickPresets.map((preset) => {
                    const IconComponent = preset.icon;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => navigate('/host')}
                        className="apple-card p-3.5 flex items-center gap-3 text-left hover:border-[var(--accent-bg)] hover:bg-[var(--accent-bg)]/5 transition-all cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <IconComponent size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[var(--ios-label)]">
                            {preset.label}
                          </span>
                          <span className="text-[11px] text-[var(--ios-secondary-label)]">
                            Foursquare live venues
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/host')}
                  className="w-full py-3.5 px-4 rounded-xl border border-[var(--border-main)] apple-card flex items-center justify-center gap-2 text-sm font-semibold text-[var(--ios-label)] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] active:scale-[0.98] transition-all cursor-pointer mt-1"
                >
                  <Compass size={17} className="text-[var(--accent-bg)]" />
                  <span>Open Full Host Configuration Studio</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Wing (Cols 8-12): Interactive Live Simulator / Practice Deck */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="liquid-glass rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-[var(--border-glass)] flex flex-col gap-4 relative overflow-hidden">
            
            {/* Top Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--semantic-success)] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ios-label)]">
                  Live Swipe Simulator
                </span>
              </div>
              <span className="text-[11px] text-[var(--ios-secondary-label)] font-mono">
                Card {practiceCardIndex + 1} of {practiceCards.length}
              </span>
            </div>

            {/* The Interactive Sample Card */}
            <div
              className={`relative rounded-2xl p-5 border border-[var(--border-main)] bg-[var(--ios-card)] shadow-lg transition-all duration-300 ${
                practiceVote === 'approve'
                  ? 'translate-x-12 rotate-6 opacity-0 bg-[var(--semantic-success)]/10 border-[var(--semantic-success)]'
                  : practiceVote === 'pass'
                  ? '-translate-x-12 -rotate-6 opacity-0 bg-neutral-500/10'
                  : practiceVote === 'veto'
                  ? 'translate-y-12 scale-90 opacity-0 bg-[var(--semantic-error)]/10 border-[var(--semantic-error)]'
                  : 'translate-x-0 rotate-0 opacity-100'
              }`}
            >
              {/* Overlay Vote Badges */}
              {practiceVote === 'approve' && (
                <div className="absolute top-4 right-4 px-3 py-1 rounded-lg bg-[var(--semantic-success)] text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <ThumbsUp size={14} /> Approve (+1)
                </div>
              )}
              {practiceVote === 'pass' && (
                <div className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-neutral-600 text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <ThumbsDown size={14} /> Pass (-1)
                </div>
              )}
              {practiceVote === 'veto' && (
                <div className="absolute inset-0 bg-red-600/90 rounded-2xl flex flex-col items-center justify-center text-white gap-1 z-20">
                  <ShieldAlert size={36} />
                  <span className="text-sm font-black tracking-wider uppercase">VETO ELIMINATED (-100)</span>
                </div>
              )}

              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-bg)]/10 text-[var(--accent-bg)]">
                  {practiceCards[practiceCardIndex].cuisine}
                </span>
                <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                  <Star size={13} fill="currentColor" />
                  <span>{practiceCards[practiceCardIndex].rating}</span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-[var(--ios-label)]">
                {practiceCards[practiceCardIndex].name}
              </h3>

              <div className="flex items-center gap-3 text-xs text-[var(--ios-secondary-label)] mt-1 mb-4">
                <span className="font-semibold">{practiceCards[practiceCardIndex].price}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {practiceCards[practiceCardIndex].distance}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {practiceCards[practiceCardIndex].tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.08] text-[var(--ios-secondary-label)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* 3 Interactive Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => handlePracticeSwipe('pass')}
                  className="py-2.5 px-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/10 dark:hover:bg-white/15 text-xs font-semibold text-[var(--ios-secondary-label)] flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                  title="Pass (-1 point)"
                >
                  <ThumbsDown size={14} />
                  <span>Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePracticeSwipe('veto')}
                  className="py-2.5 px-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer border border-red-500/20"
                  title="Absolute Refusal (-100 points)"
                >
                  <ShieldAlert size={14} />
                  <span>VETO</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePracticeSwipe('approve')}
                  className="py-2.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer border border-emerald-500/20"
                  title="Approve (+1 point)"
                >
                  <ThumbsUp size={14} />
                  <span>Approve</span>
                </button>
              </div>
            </div>

            {/* Explanatory Caption */}
            <p className="text-[11px] text-[var(--ios-secondary-label)] text-center">
              Try clicking the buttons above to test the 3-way consensus engine.
            </p>
          </div>
        </div>
      </main>

      {/* Three Core Architectural Value Pillars */}
      <section className="w-full max-w-6xl mx-auto py-6 border-t border-[var(--border-subtle)] grid sm:grid-cols-3 gap-6">
        <div className="flex gap-3 items-start">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="flex flex-col">
            <h4 className="text-sm font-bold text-[var(--ios-label)]">Step Zero Confidentiality</h4>
            <p className="text-xs text-[var(--ios-secondary-label)] mt-0.5">
              Privately cap your budget in the lobby. The engine silently prunes unaffordable venues before voting starts.
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-start">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div className="flex flex-col">
            <h4 className="text-sm font-bold text-[var(--ios-label)]">VETO Safety Barrier</h4>
            <p className="text-xs text-[var(--ios-secondary-label)] mt-0.5">
              Swipe down to VETO (-100). If one person has a severe allergy or refusal, the venue is mathematically disqualified.
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-start">
          <div className="p-2.5 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] shrink-0">
            <Compass size={20} />
          </div>
          <div className="flex flex-col">
            <h4 className="text-sm font-bold text-[var(--ios-label)]">Condorcet & Schulze Choice</h4>
            <p className="text-xs text-[var(--ios-secondary-label)] mt-0.5">
              Pairwise elimination beats naive majority voting, finding the compromise that makes the whole group happiest.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Info */}
      <footer className="w-full max-w-6xl mx-auto text-center text-xs text-[var(--ios-tertiary-label)] pt-4 pb-2 select-none">
        Consensus Engine • Apple HIG Design Craft Architecture • Team 1 Frontend
      </footer>
    </div>
  );
}
