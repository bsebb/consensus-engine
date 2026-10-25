import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Clock, Utensils, Coffee, Wine, Film, IceCream,
  ListPlus, User, Settings, History, MapPin, Globe, Star, MessageSquarePlus, Sparkles,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import SegmentedControl from '../components/ui/SegmentedControl';
import SettingsModal from '../components/ui/SettingsModal';
import ReviewModal from '../components/ui/ReviewModal';
import LanguageMenuModal from '../components/ui/LanguageMenuModal';
import UberLocationSearchModal from '../components/location/UberLocationSearchModal';
import LobbyLoadingView from '../components/lobby/LobbyLoadingView';
import { apiUrl } from '../utils/api';
import {
  detectUserGps,
  getSavedExactGps,
  saveUserLocation,
} from '../utils/location';
import { triggerHaptic } from '../utils/haptics';
import { generateRandomUuid } from '../utils/deviceId';
import { hasUserRatedSession, recordLocalFeedback, getPendingCheckin } from '../utils/checkinReminder';
import { invalidateClientVenueInsights } from '../hooks/useVenueInsights';
import BrandLogo from '../components/ui/BrandLogo';
import CustomPollDrawer from '../components/home/CustomPollDrawer';
import JoinPinForm from '../components/home/JoinPinForm';

export default function JoinRoom() {
  const { lang, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const hasUrlPin = Boolean(searchParams.get('pin') && /^\d{4}$/.test(searchParams.get('pin')));

  const categories = useMemo(() => [
    { id: 'Restaurants', theme: 'restaurants', title: t('catRestaurants'), desc: t('catRestaurantsDesc'), icon: Utensils, topic: t('catRestaurantsTopic'), wide: true },
    { id: 'Fun & Distractions', theme: 'activities', title: t('catFun') || 'Fun & Distractions', desc: t('catFunDesc') || 'Bowling, games & nightlife', icon: Sparkles, topic: t('catFunTopic') || 'What are we doing for fun?', wide: true },
    { id: 'Cafes', theme: 'cafes', title: t('catCafes'), desc: t('catCafesDesc'), icon: Coffee, topic: t('catCafesTopic'), wide: false },
    { id: 'Bars & Pubs', theme: 'bars', title: t('catBars'), desc: t('catBarsDesc'), icon: Wine, topic: t('catBarsTopic'), wide: false },
    { id: 'Desserts', theme: 'desserts', title: t('catDesserts'), desc: t('catDessertsDesc'), icon: IceCream, topic: t('catDessertsTopic'), wide: false },
    { id: 'Custom', theme: 'custom', title: t('catCustom'), desc: t('catCustomDesc'), icon: ListPlus, topic: t('catCustomTopic'), wide: false },
  ], [t]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(hasUrlPin ? 'join' : 'create');
  const [name, setName] = useState(() => localStorage.getItem('consensus_user_name') || '');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [recentSession, setRecentSession] = useState(null);
  const [recentRating, setRecentRating] = useState(null);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);

  const navigate = useNavigate();
  const { participantId, deviceId, setRoomParticipantId, getRoomParticipantId } = useSocket();
  const { addToast } = useToast();

  // Quick setup & universal location states
  const [selectedCategory, setSelectedCategory] = useState('Restaurants');
  const [customTopic, setCustomTopic] = useState('');
  const [customOptions, setCustomOptions] = useState([]);
  const [isCustomDrawerOpen, setIsCustomDrawerOpen] = useState(false);
  const [gpsState, setGpsState] = useState(() => {
    const saved = getSavedExactGps();
    return saved
      ? { ...saved, status: 'exact', isExact: true }
      : { status: 'idle', lat: 47.0245, lng: 28.8322, accuracy: null, isExact: false, label: 'Chișinău, Moldova' };
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Auto-navigate directly into the Lobby if a 4-digit PIN is passed in the URL (?pin=1234)
  useEffect(() => {
    const pinParam = searchParams.get('pin');
    if (pinParam && /^\d{4}$/.test(pinParam)) {
      navigate(`/lobby/${pinParam}`, { replace: true });
      return;
    }
    const ratePinParam = searchParams.get('ratePin');
    if (ratePinParam) {
      setCheckinModalOpen(true);
    }
  }, [searchParams, navigate]);

  // Load recent session from history or pending check-in, wake up backend, and restore saved coordinates
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('consensus_history') || '[]');
      const pending = getPendingCheckin();
      if (Array.isArray(history) && history.length > 0) {
        const latest = history[0];
        const wName = typeof latest.winner === 'object' && latest.winner !== null
          ? latest.winner.name || latest.winner.id || 'Recent Spot'
          : String(latest.winner || 'Recent Spot');
        setRecentSession(latest);
        const existingRating = hasUserRatedSession(latest.pin, wName);
        setRecentRating(existingRating ? Number(existingRating.satisfaction_score) || 5 : null);
      } else if (pending && pending.winnerName) {
        setRecentSession({
          pin: pending.pin,
          winner: pending.winnerName,
          winnerDetails: { id: pending.optionId, name: pending.winnerName },
        });
        setRecentRating(null);
      }
    } catch (err) {
      console.warn('[JoinRoom] Local history check:', err);
    }

    fetch(apiUrl('/api/v1/health')).catch(() => {});

    const saved = getSavedExactGps();
    if (saved && saved.source === 'gps') {
      let mounted = true;
      detectUserGps().then((res) => {
        if (mounted && res && res.isExact) setGpsState(res);
      });
      return () => {
        mounted = false;
      };
    } else if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      let mounted = true;
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        if (mounted && status.state === 'granted') {
          detectUserGps().then((res) => {
            if (mounted && res && res.isExact) setGpsState(res);
          });
        }
      }).catch(() => {});
      return () => {
        mounted = false;
      };
    }
  }, []);

  const executeJoin = async (targetPin) => {
    const cleanPin = String(targetPin || '').trim();
    const cleanName = name.trim() || 'Friend';
    if (cleanPin.length !== 4 || isJoiningRoom) return { success: false };

    localStorage.setItem('consensus_user_name', cleanName);
    setIsJoiningRoom(true);

    try {
      const response = await fetch(apiUrl(`/api/v1/rooms/${cleanPin}`));
      if (response.ok) {
        const roomData = await response.json();
        navigate(`/lobby/${cleanPin}`, {
          state: { isHost: false, userName: cleanName, roomData, mode: roomData?.mode, topic: roomData?.topic },
        });
        setIsJoiningRoom(false);
        return { success: true };
      }
      const errData = await response.json().catch(() => ({}));
      const failMsg = errData.message || t('roomNotFoundDesc')?.replace('{pin}', cleanPin) || `Room #${cleanPin} wasn't found. Double-check the code with your host.`;
      addToast({
        title: t('roomNotFound') || 'Room Not Found',
        message: failMsg,
        type: 'error',
      });
      setIsJoiningRoom(false);
      return { success: false, message: failMsg };
    } catch {
      const errMsg = 'Could not reach the server. Please check your internet connection.';
      addToast({
        title: 'Connection Error',
        message: errMsg,
        type: 'error',
      });
      setIsJoiningRoom(false);
      return { success: false, message: errMsg };
    }
  };

  const handleStartRoom = async (overrideConfig = null) => {
    const hasOverride = Boolean(overrideConfig && typeof overrideConfig === 'object' && !overrideConfig.nativeEvent);
    const effectiveTopic = hasOverride && typeof overrideConfig.customTopic === 'string' ? overrideConfig.customTopic : customTopic;
    const effectiveOptions = hasOverride && Array.isArray(overrideConfig.customOptions) ? overrideConfig.customOptions : customOptions;

    if (isCustomMode && (!effectiveTopic.trim() || effectiveTopic.trim().length < 2 || effectiveOptions.length < 2)) {
      triggerHaptic('veto');
      addToast({
        title: !effectiveTopic.trim() ? (t('customQuestionRequired') || 'Question Required') : 'Options Needed',
        message: !effectiveTopic.trim()
          ? 'Please enter a question to start your custom poll.'
          : 'Please add at least 2 options for your group to vote on.',
        type: 'warning',
      });
      setIsCustomDrawerOpen(true);
      return;
    }

    const cleanName = name.trim() || 'Host';
    localStorage.setItem('consensus_user_name', cleanName);
    setIsCreatingRoom(true);

    const roomMode = isCustomMode ? 'CUSTOM' : 'DISCOVERY';
    const catConfig = categories.find((c) => c.id === selectedCategory) || categories[0];
    const topicTitle = isCustomMode ? (effectiveTopic.trim() || 'What should we do?') : catConfig.topic;

    let lat = gpsState.lat;
    let lng = gpsState.lng;
    let isExactGps = Boolean(gpsState.isExact && lat != null && lng != null);

    if (!isCustomMode && (lat == null || lng == null)) {
      const fresh = await Promise.race([
        detectUserGps(),
        new Promise((resolve) => setTimeout(() => resolve(null), 250)),
      ]);
      if (fresh && fresh.lat != null && fresh.lng != null) {
        setGpsState(fresh);
        lat = fresh.lat;
        lng = fresh.lng;
        isExactGps = Boolean(fresh.isExact && lat != null && lng != null);
      }
    }

    try {
      const freshHostParticipantId = generateRandomUuid();
      const response = await fetch(apiUrl('/api/v1/rooms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: freshHostParticipantId,
          device_id: deviceId,
          host_device_id: deviceId,
          mode: roomMode,
          theme: isCustomMode ? topicTitle : (categories.find((c) => c.id === selectedCategory)?.theme || selectedCategory.toLowerCase()),
          radius: 5000,
          latitude: lat,
          longitude: lng,
          is_exact_gps: isExactGps,
          deck_size: 10,
        }),
      });

      if (response.ok) {
        const realRoom = await response.json();
        const generatedPin = realRoom.pin;
        setRoomParticipantId(generatedPin, freshHostParticipantId);
        sessionStorage.setItem(`consensus_host_${generatedPin}`, 'true');
        if (realRoom.host_token) {
          sessionStorage.setItem(`consensus_host_token_${generatedPin}`, realRoom.host_token);
        }
        localStorage.setItem('consensus_active_pin', generatedPin);
        navigate(`/lobby/${generatedPin}`, {
          state: {
            mode: roomMode,
            isHost: true,
            userName: cleanName,
            category: selectedCategory,
            topic: topicTitle,
            radiusKm: 5,
            roomData: realRoom,
            initialCustomOptions: isCustomMode && effectiveOptions.length > 0 ? effectiveOptions : undefined,
          },
        });
        return;
      } else {
        const errData = await response.json().catch(() => ({}));
        addToast({ title: 'Could Not Create Room', message: errData.message || 'Please try again in a moment.', type: 'error' });
      }
    } catch {
      addToast({ title: 'Connection Error', message: 'Could not reach server to create room. Please check your connection.', type: 'error' });
    }
    setIsCreatingRoom(false);
  };

  const recentWinnerName = recentSession
    ? (typeof recentSession.winner === 'object' && recentSession.winner !== null
        ? recentSession.winner.name || recentSession.winner.id || 'Recent Spot'
        : String(recentSession.winner || 'Recent Spot'))
    : '';

  const handleQuickHomeRate = async (stars) => {
    if (!recentSession || !recentWinnerName) return;
    triggerHaptic('like');
    setRecentRating(stars);
    const targetPin = recentSession.pin;
    const targetOptionId = recentSession.winnerDetails?.id || `winner_${targetPin || 'home'}`;
    const targetPid = (targetPin && getRoomParticipantId ? getRoomParticipantId(targetPin) : null) || participantId || 'anon_user';

    recordLocalFeedback({
      pin: targetPin,
      winnerName: recentWinnerName,
      optionId: targetOptionId,
      participantId: targetPid,
      deviceId,
      satisfactionScore: stars,
      priceAccuracyScore: stars,
    });
    invalidateClientVenueInsights(recentWinnerName);

    if (targetPin) {
      fetch(apiUrl(`/api/v1/rooms/${targetPin}/feedback`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: targetPid,
          device_id: deviceId || undefined,
          option_id: targetOptionId,
          option_name: recentWinnerName,
          satisfaction_score: stars,
          price_accuracy_score: stars,
        }),
      }).catch(() => {});
    }

    addToast({
      title: t('feedbackSaved') || 'Rating Saved',
      message: `Rated ${recentWinnerName} ${stars}/5 ★`,
      type: 'success',
    });
  };

  const isCustomMode = selectedCategory === 'Custom';
  const activeCatObj = categories.find((c) => c.id === selectedCategory) || categories[0];

  if (isCreatingRoom) {
    return (
      <LobbyLoadingView
        topic={isCustomMode ? (customTopic.trim() || t('catCustomTopic')) : activeCatObj.topic}
        category={selectedCategory}
        userName={name.trim() || 'Host'}
        locationLabel={gpsState?.label || 'Current Location'}
        isCustom={isCustomMode}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between px-4 sm:px-6 safe-pt-page pb-safe h-full min-h-0 overflow-hidden select-none">
      <header className="w-full flex items-center justify-between pb-1.5 max-w-md mx-auto shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0F1422] to-[#05070B] border border-white/10 flex items-center justify-center shadow-xs overflow-hidden p-0.5">
            <BrandLogo size={22} />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-[var(--text-primary)] leading-tight">NoYouPick</span>
            <span className="text-[10px] font-medium text-[var(--text-tertiary)] -mt-0.5">{t('tagline')}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLanguageMenuOpen(true)}
            aria-label={t('langTitle')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-main)] transition-colors cursor-pointer"
            title={t('langTitle')}
          >
            <Globe size={12} className="text-[var(--accent-bg)]" />
            <span className="font-mono font-bold uppercase">{lang}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer touch-manipulation"
            aria-label={t('history')}
            title={t('history')}
          >
            <History size={16} />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer touch-manipulation"
            aria-label={t('settings')}
            title={t('settings')}
          >
            <Settings size={16} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="w-full flex-1 min-h-0 flex flex-col justify-center items-center max-w-md mx-auto py-1 overflow-hidden">
        <div className="text-center mb-2.5 sm:mb-3.5 h-[48px] max-h-[48px] shrink-0 flex flex-col justify-center items-center px-2 overflow-hidden select-none">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)] truncate whitespace-nowrap max-w-full leading-tight">
            {activeTab === 'create' ? (isCustomMode && customTopic.trim() ? customTopic.trim() : activeCatObj.topic) : t('joinWithCode')}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] truncate whitespace-nowrap max-w-full leading-normal mt-0.5">
            {activeTab === 'create' ? (isCustomMode && customOptions.length > 0 ? `${customOptions.length} ${t('optionsSuffix') || 'options'} ready` : activeCatObj.desc) : t('roomCodeHint')}
          </p>
        </div>

        <div className="w-full rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] shadow-[0_12px_36px_rgba(0,0,0,0.06)] p-3.5 sm:p-5 flex flex-col gap-2.5 sm:gap-3.5 shrink-0">
          <SegmentedControl
            options={[{ value: 'create', label: t('startPick') }, { value: 'join', label: t('joinWithCode') }]}
            value={activeTab}
            onChange={setActiveTab}
            size="md"
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="userName" className="text-xs font-semibold text-[var(--text-secondary)] px-1">
              {t('yourName')}
            </label>
            <div className="relative">
              <input
                id="userName"
                name="userName"
                type="text"
                placeholder={t('namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[40px] sm:min-h-[44px] pl-10 pr-4 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-bg)] outline-none transition-all"
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
            <div className="flex flex-col gap-2.5 sm:gap-3.5">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--text-secondary)] px-1">{t('whatPicking')}</span>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    const isCustom = cat.id === 'Custom';

                    const tileTitle = cat.title;
                    const tileDesc = cat.desc;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        data-theme={cat.theme}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          triggerHaptic('tap');
                          if (isCustom) {
                            setIsCustomDrawerOpen(true);
                          }
                        }}
                        className={`category-tile relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border text-left cursor-pointer min-h-[50px] sm:min-h-[58px] touch-manipulation hover:scale-[1.01] active:scale-[0.98] ${
                          cat.wide ? 'col-span-2' : 'col-span-1'
                        } ${
                          isSelected
                            ? 'is-selected text-[var(--text-primary)] shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-main)]'
                        }`}
                      >
                        <div
                          className={`cat-icon-badge w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'is-selected scale-105'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                          }`}
                        >
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1 pr-1 overflow-hidden">
                          <div className="text-xs sm:text-[13px] font-bold text-[var(--text-primary)] leading-tight truncate" title={tileTitle}>
                            {tileTitle}
                          </div>
                          <div className="text-[11px] text-[var(--text-tertiary)] leading-tight mt-0.5 truncate" title={tileDesc}>
                            {tileDesc}
                          </div>
                        </div>
                        {/* Animated selection indicator dot with smooth spring pop */}
                        <div
                          className={`cat-indicator-dot absolute top-2.5 right-2.5 w-2 h-2 rounded-full pointer-events-none ${
                            isSelected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Universal Hex Grid Location Bar or Custom Poll Config Summary Bar */}
              {selectedCategory === 'Custom' ? (
                <div
                  onClick={() => {
                    triggerHaptic('tap');
                    setIsCustomDrawerOpen(true);
                  }}
                  className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-inset)]/80 border border-[var(--border-subtle)] hover:border-[var(--border-main)] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center shrink-0">
                      <ListPlus size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-bg)] transition-colors">
                        {customTopic.trim() ? customTopic.trim() : t('catCustomTopic')}
                      </div>
                      <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                        {customOptions.length > 0
                          ? `${customOptions.length} ${t('optionsSuffix') || 'options'} ready • Tap to edit`
                          : 'Configure question & options'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent-bg)] group-hover:bg-[var(--accent-bg)] group-hover:text-white transition-all shrink-0">
                    {customOptions.length > 0 ? (t('change') || 'Edit') : (t('customAddBtn') || 'Setup')}
                  </span>
                </div>
              ) : (
                <div
                  onClick={() => setIsLocationModalOpen(true)}
                  className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-inset)]/80 border border-[var(--border-subtle)] hover:border-[var(--border-main)] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center shrink-0">
                      <MapPin size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-bg)] transition-colors">
                        {gpsState.label || t('detectingLocation')}
                      </div>
                      <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                        {gpsState.source === 'gps' ? t('locationLabel') : t('locationChangeHint')}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent-bg)] group-hover:bg-[var(--accent-bg)] group-hover:text-white transition-all shrink-0">
                    {t('change')}
                  </span>
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleStartRoom}
                disabled={isCreatingRoom}
                loading={isCreatingRoom}
                icon={ArrowRight}
                className="w-full h-11 sm:h-12 rounded-2xl font-bold text-base shadow-[0_6px_20px_var(--accent-glow)] mt-0.5"
              >
                {isCustomMode && (!customTopic.trim() || customOptions.length < 2)
                  ? (t('customConfigureBtn') || 'Configure Poll & Start')
                  : t('createRoomBtn')}
              </Button>
            </div>
          ) : (
            /* TAB 2: JOIN WITH 4-DIGIT PIN */
            <JoinPinForm
              initialPin={searchParams.get('pin') || ''}
              onJoin={executeJoin}
              loading={isJoiningRoom}
            />
          )}
        </div>

        {/* Post-Visit 1-Tap Return Check-In Banner / Recent Decision Shortcut */}
        {recentSession && (
          <div className="w-full mt-2.5 p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-between gap-2 shadow-2xs shrink-0">
            {!recentRating ? (
              <>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bg)]">
                    How did it go?
                  </span>
                  <span className="text-xs font-extrabold text-[var(--text-primary)] truncate">
                    Rate {recentWinnerName}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleQuickHomeRate(star)}
                      aria-label={`Rate ${recentWinnerName} ${star} stars`}
                      className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] hover:bg-amber-500/15 border border-[var(--border-subtle)] flex items-center justify-center text-amber-400 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <Star size={13} className="fill-amber-400 text-amber-400" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setCheckinModalOpen(true);
                    }}
                    title="Leave a note"
                    className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--accent-bg)]/15 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-bg)] transition-colors cursor-pointer ml-0.5"
                  >
                    <MessageSquarePlus size={13} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <Clock size={14} className="text-[var(--text-tertiary)] shrink-0" />
                  <div className="text-xs truncate flex items-center gap-1.5">
                    <span className="text-[var(--text-tertiary)]">{t('lastWinnerPrefix')}:</span>
                    <span className="font-bold text-[var(--text-primary)] truncate">
                      {recentWinnerName}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold shrink-0">
                      ★ {recentRating}/5
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="text-xs font-semibold text-[var(--accent-bg)] hover:underline cursor-pointer shrink-0 ml-2"
                >
                  {t('seeAll')}
                </button>
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center pt-1 pb-0.5 shrink-0">
        <p className="text-[11px] text-[var(--text-tertiary)]">
          {t('footerSubtext')}
        </p>
      </footer>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <LanguageMenuModal
        isOpen={languageMenuOpen}
        onClose={() => setLanguageMenuOpen(false)}
      />

      <UberLocationSearchModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={gpsState}
        onSelectLocation={(loc) => {
          saveUserLocation(loc);
          setGpsState(loc);
          setIsLocationModalOpen(false);
        }}
      />

      <CustomPollDrawer
        isOpen={isCustomDrawerOpen}
        onClose={() => setIsCustomDrawerOpen(false)}
        topic={customTopic}
        setTopic={setCustomTopic}
        customOptions={customOptions}
        setCustomOptions={setCustomOptions}
        onStartRoom={handleStartRoom}
        isCreatingRoom={isCreatingRoom}
      />

      {recentSession && (
        <ReviewModal
          isOpen={checkinModalOpen}
          onClose={() => setCheckinModalOpen(false)}
          onSubmitted={(satScore) => {
            setRecentRating(satScore || 5);
          }}
          pin={recentSession.pin}
          winnerName={recentWinnerName}
          optionId={recentSession.winnerDetails?.id || `winner_${recentSession.pin || 'home'}`}
          participantId={(recentSession.pin && getRoomParticipantId ? getRoomParticipantId(recentSession.pin) : null) || participantId || 'anon_user'}
          deviceId={deviceId}
        />
      )}
    </div>
  );
}
