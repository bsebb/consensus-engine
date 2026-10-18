import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Clock,
  Users,
  Utensils,
  Coffee,
  Wine,
  Film,
  Plus,
  Minus,
  Check,
  User,
  Settings,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import SegmentedControl from '../components/ui/SegmentedControl';
import SettingsModal from '../components/ui/SettingsModal';
import { apiUrl } from '../utils/api';

export default function JoinRoom() {
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const [searchParams] = useSearchParams();
  const { participantId, emit } = useSocket();
  const { addToast } = useToast();

  // Auto-populate PIN from URL query param if present (e.g. ?pin=1234)
  useEffect(() => {
    const pinParam = searchParams.get('pin');
    if (pinParam && /^\d{4}$/.test(pinParam)) {
      setPinDigits(pinParam.split(''));
    }
  }, [searchParams]);

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

    // Silent background wake-up ping for sleeping cloud containers
    fetch(apiUrl('/health')).catch(() => {});
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
      const response = await fetch(apiUrl(`/api/v1/rooms/${cleanPin}`));
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
            mode: roomData?.mode,
            topic: roomData?.topic,
          },
        });
        setLoading(false);
        return;
      } else {
        const errData = await response.json().catch(() => ({}));
        addToast({
          title: 'Room Not Found',
          message: errData.error || `Room #${cleanPin} does not exist or has expired.`,
          type: 'error',
        });
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('[JoinRoom] Server connection error joining room:', err);
      addToast({
        title: 'Connection Error',
        message: 'Could not connect to the room server. Please check your internet connection.',
        type: 'error',
      });
      setLoading(false);
      return;
    }
  };

  const handleQuickHost = async () => {
    const cleanName = name.trim() || 'Host';
    localStorage.setItem('consensus_user_name', cleanName);
    setLoading(true);

    let lat = null;
    let lng = null;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 3000,
            maximumAge: 60000,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}
    }

    try {
      const response = await fetch(apiUrl('/api/v1/rooms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: participantId,
          mode: 'DISCOVERY',
          theme: quickCategory.toLowerCase(),
          radius: 5000,
          latitude: lat,
          longitude: lng,
        }),
      });

      if (response.ok) {
        const realRoom = await response.json();
        const generatedPin = realRoom.pin;
        sessionStorage.setItem(`consensus_host_${generatedPin}`, 'true');

        const topicTitle = quickCategory === 'Cinema'
          ? 'Which cinema are we going to?'
          : quickCategory === 'Cafes'
          ? 'Where are we grabbing coffee?'
          : quickCategory === 'Bars & Pubs'
          ? 'Where are we getting drinks?'
          : 'Where are we eating tonight?';

        setLoading(false);
        navigate(`/lobby/${generatedPin}`, {
          state: {
            mode: 'DISCOVERY',
            isHost: true,
            userName: cleanName,
            groupSize,
            category: quickCategory,
            topic: topicTitle,
            radiusKm: 5,
            roomData: realRoom,
          },
        });
        return;
      } else {
        const errData = await response.json().catch(() => ({}));
        addToast({
          title: 'Creation Failed',
          message: errData.error || 'Failed to initialize session room.',
          type: 'error',
        });
      }
    } catch (err) {
      console.warn('[JoinRoom] Server connection error creating room:', err);
      addToast({
        title: 'Connection Error',
        message: 'Could not reach server to create room. Please verify your connection.',
        type: 'error',
      });
    }

    setLoading(false);
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
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Open Settings"
            title="Preferences"
          >
            <Settings size={17} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Form Content */}
      <main className="w-full my-auto flex flex-col items-center max-w-sm mx-auto">
        {/* Hero Branding */}
        <div className="text-center mb-6 space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
            Where are we eating?
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            Vote on dinner with friends. Fast, democratic, and zero endless group chat debates.
          </p>
        </div>

        {/* Tactical Card */}
        <div className="w-full rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] shadow-[0_20px_50px_rgba(0,0,0,0.08)] p-6 sm:p-7 flex flex-col gap-5">
          {/* Segmented Control Pill */}
          <SegmentedControl
            options={[
              { value: 'join', label: 'Join Room' },
              { value: 'create', label: 'New Room' },
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
              Your Name
            </label>
            <div className="relative">
              <input
                id="userName"
                name="userName"
                type="text"
                placeholder="What should friends call you?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[46px] pl-10 pr-4 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-bg)] outline-none transition-all"
                required
              />
              {name.trim() ? (
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--accent-bg)] text-white text-[10px] font-bold flex items-center justify-center pointer-events-none shadow-sm">
                  {name.trim().slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
              )}
            </div>
          </div>

          {/* TAB 1: JOIN WITH 4-BOX OTP PASSKEY */}
          {activeTab === 'join' ? (
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    4-Digit Room PIN
                  </label>
                  <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
                    Ask the room host
                  </span>
                </div>

                {/* 4 Clean PIN Cells */}
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
                      className={`w-full h-14 text-center font-bold text-2xl rounded-2xl border transition-all duration-150 outline-none select-all tabular-nums ${
                        digit
                          ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/10 text-[var(--accent-bg)]'
                          : 'border-[var(--border-main)] bg-[var(--bg-inset)] text-[var(--text-primary)] focus:border-[var(--accent-bg)]'
                      }`}
                      aria-label={`Digit ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Real-time Room Resolution Card */}
              {pin.length === 4 && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Check size={15} className="shrink-0 text-emerald-500" />
                    <span>PIN #{pin} ready to join</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/20 px-2 py-0.5 rounded-full">Ready</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={pin.length !== 4 || !name.trim() || loading}
                loading={loading}
                icon={ArrowRight}
                className="w-full h-12 rounded-2xl font-bold text-base shadow-[0_8px_24px_var(--accent-glow)]"
              >
                Join Room
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
                    aria-label="Decrease group size"
                    className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-md bg-white dark:bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] disabled:opacity-30 cursor-pointer active:scale-95 transition-transform"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="font-mono text-sm font-bold w-6 text-center text-[var(--text-primary)]">
                    {groupSize}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGroupSize(Math.min(12, groupSize + 1))}
                    disabled={groupSize >= 12}
                    aria-label="Increase group size"
                    className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-md bg-white dark:bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] disabled:opacity-30 cursor-pointer active:scale-95 transition-transform"
                  >
                    <Plus size={15} />
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
                  className="w-full h-12 rounded-2xl font-black text-base shadow-[0_8px_24px_var(--accent-glow)]"
                >
                  Start Group Pick
                </Button>

                <button
                  type="button"
                  onClick={() => navigate('/host')}
                  className="text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--accent-bg)] hover:underline text-center py-1 cursor-pointer transition-colors"
                >
                  Custom topics & options
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Past Decisions Fast Recovery */}
        {recentSession && (
          <div className="w-full mt-4 p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[var(--text-tertiary)]" />
              <div className="text-xs">
                <span className="text-[var(--text-tertiary)]">Recent Pick: </span>
                <span className="font-semibold text-[var(--text-primary)]">{recentSession.winner || 'Past Venue'}</span>
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
        <p className="text-[11px] text-[var(--text-tertiary)] font-medium">
          Fast, democratic picks for groups of friends
        </p>
      </footer>

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
