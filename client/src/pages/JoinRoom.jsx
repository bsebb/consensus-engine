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
  LogIn,
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
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('[JoinRoom] Server offline, using simulated guest session:', err);
    }

    addToast({
      title: 'Joined Local Room',
      message: `Simulating room #${cleanPin} (Server offline)`,
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
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 pb-28">
      {/* Top Application Bar */}
      <header className="w-full flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center text-white shadow-[0_2px_10px_var(--accent-glow)]">
            <Sparkles size={16} />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">
              Consensus
            </span>
            <span className="ml-1.5 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] font-semibold">
              PWA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge
            status={isConnected ? 'success' : 'neutral'}
            label={isConnected ? 'Live' : 'Local'}
            pulse={isConnected}
            size="sm"
          />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Form Content */}
      <main className="w-full my-auto flex flex-col items-center">
        {/* Hero Branding */}
        <div className="text-center mb-6 space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Decide together in seconds
          </h1>
          <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
            Skip the endless debate. Rank choices with your group and find the optimal spot instantly.
          </p>
        </div>

        {/* Tactical Card */}
        <div className="w-full tactile-card p-5 sm:p-6 flex flex-col gap-5">
          {/* Segmented Control Pill */}
          <SegmentedControl
            options={[
              { value: 'join', label: 'Join Room' },
              { value: 'create', label: 'Quick Host' },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            size="md"
          />

          {/* User Nickname Input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="userName"
              className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-1"
            >
              Your Nickname
            </label>
            <div className="relative">
              <input
                id="userName"
                name="userName"
                type="text"
                placeholder="e.g. Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[44px] pl-10 pr-4 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-main)] text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-bg)] focus:ring-2 focus:ring-[var(--accent-glow-focus)] outline-none transition-all"
                required
              />
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
            </div>
          </div>

          {/* TAB 1: JOIN WITH 4-BOX OTP PASSKEY */}
          {activeTab === 'join' ? (
            <form onSubmit={handleJoin} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    4-Digit Room PIN
                  </label>
                  <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
                    From host invite
                  </span>
                </div>

                {/* 4 Distinct OTP Passkey Cells */}
                <div className="grid grid-cols-4 gap-2.5" onPaste={handlePaste}>
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
                      className={`w-full h-14 text-center text-xl font-bold font-mono rounded-lg border transition-all duration-150 outline-none select-all ${
                        digit
                          ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/5 text-[var(--text-primary)] ring-1 ring-[var(--accent-bg)]'
                          : 'border-[var(--border-main)] bg-[var(--bg-inset)] text-[var(--text-primary)] focus:border-[var(--accent-bg)] focus:ring-2 focus:ring-[var(--accent-glow-focus)]'
                      }`}
                      aria-label={`Digit ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={pin.length !== 4 || !name.trim() || loading}
                loading={loading}
                icon={ArrowRight}
                className="w-full"
              >
                Enter Room
              </Button>
            </form>
          ) : (
            /* TAB 2: QUICK HOST */
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-1">
                  What are we doing?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {quickCategories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = quickCategory === cat.label;
                    return (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setQuickCategory(cat.label)}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer min-h-[44px] ${
                          isSelected
                            ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] shadow-[0_2px_8px_var(--accent-glow-subtle)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className={`p-1.5 rounded-md ${isSelected ? 'bg-[var(--accent-bg)] text-white' : 'bg-black/5 dark:bg-white/10 text-[var(--text-tertiary)]'}`}>
                          <Icon size={14} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold leading-tight">{cat.title}</div>
                          <div className="text-[10px] text-[var(--text-tertiary)]">{cat.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group Size Stepper */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[var(--text-tertiary)]" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Group Size</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGroupSize(Math.max(2, groupSize - 1))}
                    disabled={groupSize <= 2}
                    className="w-7 h-7 rounded-md bg-white dark:bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="font-mono text-sm font-bold w-4 text-center text-[var(--text-primary)]">
                    {groupSize}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGroupSize(Math.min(12, groupSize + 1))}
                    disabled={groupSize >= 12}
                    className="w-7 h-7 rounded-md bg-white dark:bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleQuickHost}
                  disabled={!name.trim() || loading}
                  loading={loading}
                  icon={ArrowRight}
                  className="w-full"
                >
                  Create Instant Room
                </Button>

                <button
                  type="button"
                  onClick={() => navigate('/host')}
                  className="text-xs font-semibold text-[var(--accent-bg)] hover:underline text-center py-1 cursor-pointer"
                >
                  Advanced Host Studio (Custom options & radius)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Past Decisions Fast Recovery */}
        {recentSession && (
          <div className="w-full mt-4 p-3 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[var(--text-tertiary)]" />
              <div className="text-xs">
                <span className="text-[var(--text-tertiary)]">Recent Winner: </span>
                <span className="font-semibold text-[var(--text-primary)]">{recentSession.winnerName || 'Past Venue'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="text-xs font-semibold text-[var(--accent-bg)] hover:underline cursor-pointer"
            >
              View History
            </button>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="text-center pt-4">
        <p className="text-[11px] text-[var(--text-tertiary)] font-mono">
          Powered by Schulze Graph Consensus
        </p>
      </footer>
    </div>
  );
}
