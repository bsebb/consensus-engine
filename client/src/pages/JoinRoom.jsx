import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Clock,
  Utensils,
  Coffee,
  Wine,
  Film,
  IceCream,
  ListPlus,
  Check,
  User,
  Settings,
  History,
  MapPin,
  Navigation,
  Search,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import SegmentedControl from '../components/ui/SegmentedControl';
import SettingsModal from '../components/ui/SettingsModal';
import UberLocationSearchModal from '../components/location/UberLocationSearchModal';
import HexagonLoadingOverlay from '../components/lobby/HexagonLoadingOverlay';
import { apiUrl } from '../utils/api';
import {
  detectUserGps,
  getSavedExactGps,
  saveUserLocation,
} from '../utils/location';

const CATEGORIES = [
  { id: 'Restaurants', title: 'Restaurants', desc: 'Dinner & lunch spots', icon: Utensils, topic: 'Where are we eating?' },
  { id: 'Cafes', title: 'Coffee & Cafes', desc: 'Espresso, brunch & tea', icon: Coffee, topic: 'Where are we grabbing coffee?' },
  { id: 'Bars & Pubs', title: 'Bars & Pubs', desc: 'Craft beer, wine & drinks', icon: Wine, topic: 'Where are we getting drinks?' },
  { id: 'Cinema', title: 'Cinema', desc: 'Movie theaters & shows', icon: Film, topic: 'Which cinema are we going to?' },
  { id: 'Desserts', title: 'Desserts', desc: 'Gelato, pastries & sweets', icon: IceCream, topic: 'Where to for dessert?' },
  { id: 'Custom', title: 'Custom Poll', desc: 'Add your own options', icon: ListPlus, topic: 'What should we do?' },
];

export default function JoinRoom() {
  const [searchParams] = useSearchParams();
  const hasUrlPin = Boolean(searchParams.get('pin') && /^\d{4}$/.test(searchParams.get('pin')));

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(hasUrlPin ? 'join' : 'create');
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [name, setName] = useState(() => localStorage.getItem('consensus_user_name') || '');
  const [loading, setLoading] = useState(false);
  const [recentSession, setRecentSession] = useState(null);

  // Quick setup & universal location states
  const [selectedCategory, setSelectedCategory] = useState('Restaurants');
  const [customTopic, setCustomTopic] = useState('');
  const [gpsState, setGpsState] = useState(() => {
    const saved = getSavedExactGps();
    return saved
      ? { ...saved, status: 'exact', isExact: true }
      : { status: 'detecting', lat: null, lng: null, accuracy: null, isExact: false, label: 'Detecting your area...' };
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const digitInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const navigate = useNavigate();
  const { participantId, emit } = useSocket();
  const { addToast } = useToast();

  // Auto-populate PIN from URL query param if present (e.g. ?pin=1234)
  useEffect(() => {
    const pinParam = searchParams.get('pin');
    if (pinParam && /^\d{4}$/.test(pinParam)) {
      setPinDigits(pinParam.split(''));
      setActiveTab('join');
    }
  }, [searchParams]);

  const pin = pinDigits.join('');

  // Load recent session from history, wake up backend, and acquire real user coordinates
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('consensus_history') || '[]');
      if (Array.isArray(history) && history.length > 0) {
        setRecentSession(history[0]);
      }
    } catch (err) {
      console.warn('[JoinRoom] Local history check:', err);
    }

    fetch(apiUrl('/health')).catch(() => {});

    let mounted = true;
    detectUserGps().then((res) => {
      if (mounted) setGpsState(res);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleUseMyGps = async () => {
    setGpsState((prev) => ({ ...prev, status: 'detecting', label: 'Locating via GPS...' }));
    const res = await detectUserGps({ forceRefresh: true });
    setGpsState(res);
  };

  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);
    if (digit && index < 3) digitInputRefs[index + 1].current?.focus();
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
      for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
      setPinDigits(newDigits);
      digitInputRefs[Math.min(pasted.length, 3)].current?.focus();
    }
  };

  const handleJoin = async (e) => {
    if (e) e.preventDefault();
    const cleanPin = pin.trim();
    const cleanName = name.trim() || 'Friend';
    if (cleanPin.length !== 4) return;

    localStorage.setItem('consensus_user_name', cleanName);
    setLoading(true);

    try {
      const response = await fetch(apiUrl(`/api/v1/rooms/${cleanPin}`));
      if (response.ok) {
        const roomData = await response.json();
        emit('join_lobby', { pin: cleanPin, participant_id: participantId, user_name: cleanName });
        navigate(`/lobby/${cleanPin}`, {
          state: { isHost: false, userName: cleanName, roomData, mode: roomData?.mode, topic: roomData?.topic },
        });
        setLoading(false);
        return;
      }
      const errData = await response.json().catch(() => ({}));
      addToast({
        title: 'Room Not Found',
        message: errData.message || `Room #${cleanPin} wasn't found. Double-check the code with your host.`,
        type: 'error',
      });
    } catch {
      addToast({
        title: 'Connection Error',
        message: 'Could not reach the server. Please check your internet connection.',
        type: 'error',
      });
    }
    setLoading(false);
  };

  const handleStartRoom = async () => {
    const cleanName = name.trim() || 'Host';
    localStorage.setItem('consensus_user_name', cleanName);
    setLoading(true);

    const isCustomMode = selectedCategory === 'Custom';
    const roomMode = isCustomMode ? 'CUSTOM' : 'DISCOVERY';
    const catConfig = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
    const topicTitle = isCustomMode ? (customTopic.trim() || 'What should we do?') : catConfig.topic;

    let lat = gpsState.lat;
    let lng = gpsState.lng;
    let isExactGps = Boolean(gpsState.isExact && lat != null && lng != null);

    if (!isCustomMode && (lat == null || lng == null)) {
      const fresh = await detectUserGps();
      setGpsState(fresh);
      lat = fresh.lat;
      lng = fresh.lng;
      isExactGps = Boolean(fresh.isExact && lat != null && lng != null);
    }

    try {
      const response = await fetch(apiUrl('/api/v1/rooms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: participantId,
          mode: roomMode,
          theme: isCustomMode ? 'custom' : selectedCategory.toLowerCase(),
          radius: 5000,
          latitude: lat,
          longitude: lng,
          is_exact_gps: isExactGps,
        }),
      });

      if (response.ok) {
        const realRoom = await response.json();
        const generatedPin = realRoom.pin;
        sessionStorage.setItem(`consensus_host_${generatedPin}`, 'true');
        localStorage.setItem('consensus_active_pin', generatedPin);
        setLoading(false);
        navigate(`/lobby/${generatedPin}`, {
          state: { mode: roomMode, isHost: true, userName: cleanName, category: selectedCategory, topic: topicTitle, radiusKm: 5, roomData: realRoom },
        });
        return;
      } else {
        const errData = await response.json().catch(() => ({}));
        addToast({ title: 'Could Not Create Room', message: errData.message || 'Please try again in a moment.', type: 'error' });
      }
    } catch {
      addToast({ title: 'Connection Error', message: 'Could not reach server to create room. Please check your connection.', type: 'error' });
    }
    setLoading(false);
  };

  const activeCatObj = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 min-h-[100dvh]">
      <header className="w-full flex items-center justify-between pb-3 max-w-md mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)] flex items-center justify-center text-white shadow-sm">
            <Sparkles size={16} />
          </div>
          <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">Consensus</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-main)] transition-colors cursor-pointer"
            title="Past Group Picks"
          >
            <History size={14} />
            <span>History</span>
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Open Settings"
            title="Preferences"
          >
            <Settings size={16} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="w-full my-auto flex flex-col items-center max-w-md mx-auto py-2">
        <div className="text-center mb-5 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
            {activeTab === 'create' ? activeCatObj.topic : 'Join your group'}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            {activeTab === 'create'
              ? 'Pick a category, share the code with friends, and swipe to find a spot everyone loves.'
              : 'Enter the 4-digit room code from your friend to start voting.'}
          </p>
        </div>

        <div className="w-full rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] shadow-[0_12px_36px_rgba(0,0,0,0.06)] p-5 sm:p-6 flex flex-col gap-4">
          <SegmentedControl
            options={[{ value: 'create', label: 'Start a Pick' }, { value: 'join', label: 'Join with Code' }]}
            value={activeTab}
            onChange={setActiveTab}
            size="md"
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="userName" className="text-xs font-semibold text-[var(--text-secondary)] px-1">
              Your Name
            </label>
            <div className="relative">
              <input
                id="userName"
                name="userName"
                type="text"
                placeholder="e.g. Alex (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-bg)] outline-none transition-all"
              />
              {name.trim() ? (
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--accent-bg)] text-white text-[10px] font-bold flex items-center justify-center pointer-events-none">
                  {name.trim().slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
              )}
            </div>
          </div>

          {activeTab === 'create' ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)] px-1">What are you picking?</span>
                <div className="grid grid-cols-2 gap-2.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer min-h-[54px] ${
                          isSelected
                            ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/10 text-[var(--text-primary)] shadow-xs'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-main)]'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[var(--accent-bg)] text-white'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                          }`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--text-primary)] truncate">{cat.title}</div>
                          <div className="text-[11px] text-[var(--text-tertiary)] truncate">{cat.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Universal Hex Grid Location Bar or Custom Topic Input */}
              {selectedCategory === 'Custom' ? (
                <div className="flex flex-col gap-1.5 animate-[modalSpring_0.25s_var(--spring-smooth)]">
                  <label htmlFor="customTopicInput" className="text-xs font-semibold text-[var(--text-secondary)] px-1">
                    Question or Topic
                  </label>
                  <input
                    id="customTopicInput"
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="e.g. What board game should we play?"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-bg)] outline-none transition-all"
                  />
                </div>
              ) : (
                <div
                  onClick={() => setIsLocationModalOpen(true)}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-inset)]/80 border border-[var(--border-subtle)] hover:border-[var(--border-main)] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center shrink-0">
                      <MapPin size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-bg)] transition-colors">
                        {gpsState.label || 'Detecting your area...'}
                      </div>
                      <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                        {gpsState.source === 'gps' ? 'Live device GPS • Hex grid search' : 'Tap to change city or search anywhere'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent-bg)] group-hover:bg-[var(--accent-bg)] group-hover:text-white transition-all shrink-0">
                    Change
                  </span>
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleStartRoom}
                disabled={loading}
                loading={loading}
                icon={ArrowRight}
                className="w-full h-12 rounded-2xl font-bold text-base shadow-[0_6px_20px_var(--accent-glow)] mt-1"
              >
                Create Room
              </Button>
            </div>
          ) : (
            /* TAB 2: JOIN WITH 4-DIGIT PIN */
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    4-Digit Room Code
                  </label>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    Shared by your host
                  </span>
                </div>

                {/* 4 PIN Input Boxes */}
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

              {pin.length === 4 && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Check size={15} className="shrink-0 text-emerald-500" />
                    <span>Room #{pin} ready to join</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
                    Ready
                  </span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={pin.length !== 4 || loading}
                loading={loading}
                icon={ArrowRight}
                className="w-full h-12 rounded-2xl font-bold text-base shadow-[0_6px_20px_var(--accent-glow)] mt-1"
              >
                Join Room
              </Button>
            </form>
          )}
        </div>

        {/* Recent Decision Shortcut */}
        {recentSession && (
          <div className="w-full mt-4 p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <Clock size={15} className="text-[var(--text-tertiary)] shrink-0" />
              <div className="text-xs truncate">
                <span className="text-[var(--text-tertiary)]">Last winner: </span>
                <span className="font-bold text-[var(--text-primary)]">{recentSession.winner || 'Recent Spot'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="text-xs font-semibold text-[var(--accent-bg)] hover:underline cursor-pointer shrink-0 ml-2"
            >
              See All
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center pt-2 pb-1">
        <p className="text-xs text-[var(--text-tertiary)]">
          Decide where to go in 30 seconds
        </p>
      </footer>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <UberLocationSearchModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={gpsState}
        onSelectLocation={(loc) => {
          saveUserLocation(loc);
          setGpsState(loc);
        }}
      />

      <HexagonLoadingOverlay
        isOpen={loading}
        category={selectedCategory}
        locationLabel={gpsState?.label || 'Current Location'}
        isCustom={isCustomMode}
      />
    </div>
  );
}
