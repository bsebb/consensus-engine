import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Clock,
  Compass,
  Users,
  Utensils,
  Coffee,
  Wine,
  Film,
  Plus,
  Minus,
  Check,
  User,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import SegmentedControl from '../components/ui/SegmentedControl';

export default function JoinRoom() {
  const [activeTab, setActiveTab] = useState('join'); // 'join' | 'create'
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [name, setName] = useState(() => localStorage.getItem('consensus_user_name') || '');
  const [loading, setLoading] = useState(false);
  const [recentSession, setRecentSession] = useState(null);

  // Host quick setup states
  const [quickCategory, setQuickCategory] = useState('Restaurants');
  const [groupSize, setGroupSize] = useState(4);

  const digitInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const navigate = useNavigate();
  const { isConnected, participantId, emit } = useSocket();
  const { addToast } = useToast();

  const pin = pinDigits.join('');

  // Load recent session from history
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('consensus_history') || '[]');
      if (Array.isArray(history) && history.length > 0) {
        setRecentSession(history[0]);
      }
    } catch (err) {
      console.warn('[JoinRoom] Local history check:', err);
    }
  }, []);

  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);

    if (digit && index < 3) {
      digitInputRefs[index + 1].current?.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      digitInputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length > 0) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setPinDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 3);
      digitInputRefs[nextIndex].current?.focus();
    }
  };

  const handleJoin = async (e) => {
    if (e) e.preventDefault();
    const cleanPin = pin.trim();
    const cleanName = name.trim();

    if (cleanPin.length !== 4 || !cleanName) return;

    localStorage.setItem('consensus_user_name', cleanName);
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
          title: 'Connected',
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
      console.warn('[JoinRoom] Server unreachable, entering local session:', err);
    }

    addToast({
      title: 'Local Session',
      message: `Entering room #${cleanPin}`,
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

  const handleQuickHost = async () => {
    const cleanName = name.trim() || 'Host';
    localStorage.setItem('consensus_user_name', cleanName);
    setLoading(true);

    let generatedPin = '4921';
    let realRoom = null;

    try {
      const response = await fetch('/api/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: participantId,
          mode: 'DISCOVERY',
          theme: quickCategory.toLowerCase(),
          radius: 5000,
        }),
      });

      if (response.ok) {
        realRoom = await response.json();
        generatedPin = realRoom.pin;
      }
    } catch (err) {
      console.warn('[JoinRoom] Server offline, using local host PIN:', err);
    }

    setLoading(false);

    navigate(`/lobby/${generatedPin}`, {
      state: {
        mode: 'DISCOVERY',
        isHost: true,
        userName: cleanName,
        groupSize,
        category: quickCategory,
        topic: `Where should we go for ${quickCategory}?`,
        radiusKm: 5,
        roomData: realRoom,
      },
    });
  };

  const quickCategories = [
    { label: 'Restaurants', title: 'Dinner', icon: Utensils, desc: 'Dining & Bistros' },
    { label: 'Cafes', title: 'Coffee', icon: Coffee, desc: 'Espresso & Sweets' },
    { label: 'Bars & Pubs', title: 'Drinks', icon: Wine, desc: 'Beer & Cocktails' },
    { label: 'Cinema', title: 'Movies', icon: Film, desc: 'Films & Shows' },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none">
      
      {/* Top Application Bar */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-bg)] flex items-center justify-center text-white shadow-[0_4px_16px_var(--accent-glow)]">
            <Sparkles size={18} />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-[var(--ios-label)]">
            Consensus
          </span>
        </div>

        <div className="flex items-center gap-2.5">
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
            label={isConnected ? 'Live' : 'Local'}
            pulse={isConnected}
            size="sm"
          />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Product Window Frame */}
      <main className="w-full max-w-xl mx-auto my-auto py-2">
        <div className="apple-card shadow-[0_32px_80px_rgba(0,0,0,0.18)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.55)] border border-[var(--border-main)] rounded-3xl overflow-hidden">
          
          {/* Subtle Window Title Bar */}
          <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/40" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/40" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/40" />
            </div>
            <span className="text-[11px] font-semibold text-[var(--ios-secondary-label)] uppercase tracking-wider font-mono">
              Consensus Protocol
            </span>
            <div className="w-12" />
          </div>

          <div className="p-6 sm:p-8 flex flex-col gap-6">
            {/* Segmented Control Pill */}
            <SegmentedControl
              options={[
                { value: 'join', label: 'Join Room' },
                { value: 'create', label: 'Start Session' },
              ]}
              value={activeTab}
              onChange={setActiveTab}
              size="md"
            />

            {/* User Name Input */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="userName"
                className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] px-1"
              >
                Your Nickname
              </label>
              <div className="relative">
                <input
                  id="userName"
                  name="userName"
                  type="text"
                  placeholder="e.g. Sebastian"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-[var(--border-main)] text-sm font-medium text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:border-[var(--accent-bg)] focus:ring-2 focus:ring-[var(--accent-glow-focus)] outline-none transition-all"
                  required
                />
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ios-tertiary-label)] pointer-events-none" />
              </div>
            </div>

            {/* TAB 1: JOIN WITH 4-BOX OTP PASSKEY */}
            {activeTab === 'join' ? (
              <form onSubmit={handleJoin} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)]">
                      4-Digit Room Code
                    </label>
                    <span className="text-[11px] text-[var(--ios-tertiary-label)] font-mono">
                      Enter PIN from host
                    </span>
                  </div>

                  {/* 4 Distinct OTP Passkey Cells */}
                  <div className="grid grid-cols-4 gap-3" onPaste={handlePaste}>
                    {pinDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={digitInputRefs[index]}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(index, e)}
                        className={`h-16 text-center font-mono text-2xl font-black rounded-2xl border transition-all outline-none ${
                          digit
                            ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/10 text-[var(--ios-label)] shadow-[0_0_16px_var(--accent-glow-subtle)]'
                            : 'border-[var(--border-main)] bg-black/[0.03] dark:bg-white/[0.06] text-[var(--ios-label)]'
                        } focus:border-[var(--accent-bg)] focus:ring-2 focus:ring-[var(--accent-glow-focus)]`}
                        aria-label={`Digit ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  disabled={pin.length !== 4 || !name.trim()}
                  icon={ArrowRight}
                  className="w-full mt-1 min-h-[50px] shadow-[0_4px_16px_var(--accent-glow)]"
                >
                  Enter Room Lobby
                </Button>
              </form>
            ) : (
              /* TAB 2: INSTANT ROOM CREATION */
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] px-1">
                    Select Activity Domain
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    {quickCategories.map((cat) => {
                      const isSelected = quickCategory === cat.label;
                      const IconComp = cat.icon;
                      return (
                        <button
                          key={cat.label}
                          type="button"
                          onClick={() => setQuickCategory(cat.label)}
                          className={`p-3.5 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] shadow-[0_2px_12px_var(--accent-glow-subtle)]'
                              : 'bg-black/[0.02] dark:bg-white/[0.04] border-[var(--border-subtle)] text-[var(--ios-label)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-[var(--accent-bg)]/20 text-[var(--accent-bg)]' : 'bg-black/[0.04] dark:bg-white/[0.08] text-[var(--ios-secondary-label)]'
                          }`}>
                            <IconComp size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold leading-tight">{cat.title}</span>
                            <span className="text-[10px] text-[var(--ios-secondary-label)]">{cat.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Group Size Row */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2.5">
                    <Users size={16} className="text-[var(--accent-bg)]" />
                    <span className="text-xs font-semibold text-[var(--ios-label)]">Expected Group Size</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGroupSize((p) => Math.max(2, p - 1))}
                      className="w-8 h-8 rounded-lg bg-black/[0.05] dark:bg-white/[0.1] text-[var(--ios-label)] flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-6 text-center font-bold text-sm font-mono">{groupSize}</span>
                    <button
                      type="button"
                      onClick={() => setGroupSize((p) => Math.min(12, p + 1))}
                      className="w-8 h-8 rounded-lg bg-black/[0.05] dark:bg-white/[0.1] text-[var(--ios-label)] flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  loading={loading}
                  disabled={!name.trim()}
                  onClick={handleQuickHost}
                  icon={ArrowRight}
                  className="w-full min-h-[50px] shadow-[0_4px_16px_var(--accent-glow)]"
                >
                  Launch Consensus Session
                </Button>

                <button
                  type="button"
                  onClick={() => navigate('/host')}
                  className="text-xs text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)] text-center underline cursor-pointer"
                >
                  Custom Search Parameters (Radius, Custom Topics)
                </button>
              </div>
            )}

            {/* Quick Resume Recent Session */}
            {recentSession && activeTab === 'join' && (
              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)]">
                    Previous Decision
                  </span>
                  <span className="text-xs font-semibold text-[var(--ios-label)]">
                    #{recentSession.pin} • {recentSession.topic}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const digits = recentSession.pin.split('').slice(0, 4);
                    setPinDigits(digits);
                  }}
                  className="text-xs font-bold text-[var(--accent-bg)] hover:underline cursor-pointer"
                >
                  Fill Code
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Clean Mobile Safe Area Footer */}
      <footer className="w-full text-center text-xs text-[var(--ios-tertiary-label)] pb-2">
        Consensus Engine • Apple HIG Design Craft Architecture
      </footer>
    </div>
  );
}
