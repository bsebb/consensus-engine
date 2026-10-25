import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Utensils, Coffee, Wine, IceCream,
  ListPlus, User, Sparkles, Check,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ui/Toast';
import SegmentedControl from '../components/ui/SegmentedControl';
import SettingsModal from '../components/ui/SettingsModal';
import ReviewModal from '../components/ui/ReviewModal';
import LanguageMenuModal from '../components/ui/LanguageMenuModal';
import UberLocationSearchModal from '../components/location/UberLocationSearchModal';
import LobbyLoadingView from '../components/lobby/LobbyLoadingView';
import { apiUrl } from '../utils/api';
import { detectUserGps, getSavedExactGps, saveUserLocation } from '../utils/location';
import { triggerHaptic } from '../utils/haptics';
import { generateRandomUuid } from '../utils/deviceId';
import { hasUserRatedSession, recordLocalFeedback, getPendingCheckin } from '../utils/checkinReminder';
import { invalidateClientVenueInsights } from '../hooks/useVenueInsights';
import CustomPollDrawer from '../components/home/CustomPollDrawer';
import JoinPinForm from '../components/home/JoinPinForm';
import CategoryQuickGrid from '../components/join/CategoryQuickGrid';
import RecentRoomsDrawer from '../components/join/RecentRoomsDrawer';
import JoinRoomHeader from '../components/join/JoinRoomHeader';

function getStoredNickname() {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem('consensus_nickname') || localStorage.getItem('consensus_user_name') || '';
}

function saveStoredNickname(value) {
  if (typeof localStorage === 'undefined') return;
  const clean = String(value || '').trim();
  if (clean) {
    localStorage.setItem('consensus_nickname', clean);
    localStorage.setItem('consensus_user_name', clean);
  }
}

export default function JoinRoom() {
  const { t } = useLanguage();
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
  const [recentDrawerOpen, setRecentDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(hasUrlPin ? 'join' : 'create');
  const [name, setName] = useState(getStoredNickname);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [recentSession, setRecentSession] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [recentRating, setRecentRating] = useState(null);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [activePin, setActivePin] = useState(() => localStorage.getItem('consensus_active_pin') || '');
  const [favoriteCategory, setFavoriteCategory] = useState(() => localStorage.getItem('consensus_favorite_category') || 'Restaurants');

  const navigate = useNavigate();
  const { participantId, deviceId, setRoomParticipantId, getRoomParticipantId } = useSocket();
  const { addToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState(() => {
    const savedCat = localStorage.getItem('consensus_favorite_category');
    return savedCat && savedCat !== 'Custom' ? savedCat : 'Restaurants';
  });
  const [customTopic, setCustomTopic] = useState('');
  const [customOptions, setCustomOptions] = useState([]);
  const [isCustomDrawerOpen, setIsCustomDrawerOpen] = useState(false);
  const [gpsState, setGpsState] = useState(() => {
    const saved = getSavedExactGps();
    return saved
      ? { ...saved, status: 'exact', isExact: true }
      : { status: 'idle', lat: 47.0245, lng: 28.8322, accuracy: null, isExact: false, label: 'Chisinau, Moldova' };
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  useEffect(() => {
    const pinParam = searchParams.get('pin');
    if (pinParam && /^\d{4}$/.test(pinParam)) {
      navigate(`/lobby/${pinParam}`, { replace: true });
      return;
    }
    if (searchParams.get('ratePin')) setCheckinModalOpen(true);
  }, [searchParams, navigate]);

  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('consensus_history') || '[]');
      const pending = getPendingCheckin();
      if (Array.isArray(history) && history.length > 0) {
        setHistoryList(history);
        const latest = history[0];
        const wName = typeof latest.winner === 'object' && latest.winner !== null
          ? latest.winner.name || latest.winner.id || 'Recent Spot'
          : String(latest.winner || 'Recent Spot');
        setRecentSession(latest);
        const existingRating = hasUserRatedSession(latest.pin, wName);
        setRecentRating(existingRating ? Number(existingRating.satisfaction_score) || 5 : null);
      } else if (pending?.winnerName) {
        setRecentSession({ pin: pending.pin, winner: pending.winnerName, winnerDetails: { id: pending.optionId, name: pending.winnerName } });
        setRecentRating(null);
      }
    } catch (err) {
      console.warn('[JoinRoom] Local history check:', err);
    }

    fetch(apiUrl('/api/v1/health')).catch(() => {});

    const saved = getSavedExactGps();
    let mounted = true;
    const refreshGps = () => detectUserGps().then((res) => { if (mounted && res?.isExact) setGpsState(res); });
    if (saved?.source === 'gps') {
      refreshGps();
    } else if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((s) => { if (mounted && s.state === 'granted') refreshGps(); }).catch(() => {});
    }
    return () => { mounted = false; };
  }, []);

  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    if (catId && catId !== 'Custom') {
      localStorage.setItem('consensus_favorite_category', catId);
      setFavoriteCategory(catId);
    }
  };

  const executeJoin = async (targetPin) => {
    const cleanPin = String(targetPin || '').trim();
    const cleanName = name.trim() || 'Friend';
    if (cleanPin.length !== 4 || isJoiningRoom) return { success: false };

    saveStoredNickname(cleanName);
    setIsJoiningRoom(true);
    try {
      const response = await fetch(apiUrl(`/api/v1/rooms/${cleanPin}`));
      if (response.ok) {
        const roomData = await response.json();
        navigate(`/lobby/${cleanPin}`, { state: { isHost: false, userName: cleanName, roomData, mode: roomData?.mode, topic: roomData?.topic } });
        setIsJoiningRoom(false);
        return { success: true };
      }
      const errData = await response.json().catch(() => ({}));
      const failMsg = errData.message || t('roomNotFoundDesc')?.replace('{pin}', cleanPin) || `Room #${cleanPin} wasn't found. Double-check the code with your host.`;
      addToast({ title: t('roomNotFound') || 'Room Not Found', message: failMsg, type: 'error' });
      setIsJoiningRoom(false);
      return { success: false, message: failMsg };
    } catch {
      const errMsg = t('networkErrorDesc') || 'Could not reach the server. Please check your internet connection.';
      addToast({ title: t('connectionError') || 'Connection Error', message: errMsg, type: 'error' });
      setIsJoiningRoom(false);
      return { success: false, message: errMsg };
    }
  };

  const isCustomMode = selectedCategory === 'Custom';
  const activeCatObj = categories.find((c) => c.id === selectedCategory) || categories[0];

  const handleStartRoom = async (overrideConfig = null) => {
    const hasOverride = Boolean(overrideConfig && typeof overrideConfig === 'object' && !overrideConfig.nativeEvent);
    const effectiveCategory = hasOverride && overrideConfig.category ? overrideConfig.category : selectedCategory;
    const effectiveIsCustom = effectiveCategory === 'Custom';
    const effectiveTopic = hasOverride && typeof overrideConfig.customTopic === 'string' ? overrideConfig.customTopic : customTopic;
    const effectiveOptions = hasOverride && Array.isArray(overrideConfig.customOptions) ? overrideConfig.customOptions : customOptions;

    if (effectiveIsCustom && (!effectiveTopic.trim() || effectiveTopic.trim().length < 2 || effectiveOptions.length < 2)) {
      triggerHaptic('veto');
      addToast({
        title: !effectiveTopic.trim() ? (t('customQuestionRequired') || 'Question Required') : (t('customOptionsNeeded') || 'Options Needed'),
        message: !effectiveTopic.trim() ? (t('customQuestionRequiredHint') || 'Please enter a question to start your custom poll.') : (t('customOptionsNeededHint') || 'Please add at least 2 options for your group to vote on.'),
        type: 'warning',
      });
      setIsCustomDrawerOpen(true);
      return;
    }

    const cleanName = name.trim() || 'Host';
    saveStoredNickname(cleanName);
    if (!effectiveIsCustom) {
      localStorage.setItem('consensus_favorite_category', effectiveCategory);
      setFavoriteCategory(effectiveCategory);
    }
    setIsCreatingRoom(true);

    const roomMode = effectiveIsCustom ? 'CUSTOM' : 'DISCOVERY';
    const catConfig = categories.find((c) => c.id === effectiveCategory) || categories[0];
    const topicTitle = effectiveIsCustom ? (effectiveTopic.trim() || 'What should we do?') : catConfig.topic;

    let lat = gpsState.lat;
    let lng = gpsState.lng;
    let isExactGps = Boolean(gpsState.isExact && lat != null && lng != null);

    if (!effectiveIsCustom && (lat == null || lng == null)) {
      const fresh = await Promise.race([detectUserGps(), new Promise((r) => setTimeout(() => r(null), 250))]);
      if (fresh?.lat != null && fresh?.lng != null) {
        setGpsState(fresh);
        lat = fresh.lat;
        lng = fresh.lng;
        isExactGps = Boolean(fresh.isExact);
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
          theme: effectiveIsCustom ? topicTitle : (catConfig?.theme || effectiveCategory.toLowerCase()),
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
        if (realRoom.host_token) sessionStorage.setItem(`consensus_host_token_${generatedPin}`, realRoom.host_token);
        localStorage.setItem('consensus_active_pin', generatedPin);
        setActivePin(generatedPin);
        navigate(`/lobby/${generatedPin}`, {
          state: {
            mode: roomMode, isHost: true, userName: cleanName, category: effectiveCategory,
            topic: topicTitle, radiusKm: 5, roomData: realRoom,
            initialCustomOptions: effectiveIsCustom && effectiveOptions.length > 0 ? effectiveOptions : undefined,
          },
        });
        return;
      }
      const errData = await response.json().catch(() => ({}));
      addToast({ title: t('createRoomError') || 'Could Not Create Room', message: errData.message || t('tryAgainMoment') || 'Please try again in a moment.', type: 'error' });
    } catch {
      addToast({ title: t('connectionError') || 'Connection Error', message: t('networkErrorDesc') || 'Could not reach server to create room. Please check your connection.', type: 'error' });
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

    recordLocalFeedback({ pin: targetPin, winnerName: recentWinnerName, optionId: targetOptionId, participantId: targetPid, deviceId, satisfactionScore: stars, priceAccuracyScore: stars });
    invalidateClientVenueInsights(recentWinnerName);

    if (targetPin) {
      fetch(apiUrl(`/api/v1/rooms/${targetPin}/feedback`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: targetPid, device_id: deviceId || undefined, option_id: targetOptionId, option_name: recentWinnerName, satisfaction_score: stars, price_accuracy_score: stars }),
      }).catch(() => {});
    }
    addToast({ title: t('feedbackSaved') || 'Rating Saved', message: `Rated ${recentWinnerName} ${stars}/5 stars`, type: 'success' });
  };

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
      <JoinRoomHeader
        onOpenLanguage={() => setLanguageMenuOpen(true)}
        onOpenHistory={() => navigate('/history')}
        onOpenSettings={() => setSettingsOpen(true)}
      />

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
            <div className="flex items-center justify-between px-1">
              <label htmlFor="userName" className="text-xs font-semibold text-[var(--text-secondary)]">
                {t('yourName')}
              </label>
              {name.trim() && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check size={10} />
                  <span>{t('savedBadge') || 'Saved'}</span>
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id="userName"
                name="userName"
                type="text"
                placeholder={t('namePlaceholder')}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  saveStoredNickname(e.target.value);
                }}
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
            <CategoryQuickGrid
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
              favoriteCategory={favoriteCategory}
              customTopic={customTopic}
              customOptions={customOptions}
              onOpenCustomDrawer={() => setIsCustomDrawerOpen(true)}
              gpsState={gpsState}
              onOpenLocationModal={() => setIsLocationModalOpen(true)}
              onStartRoom={handleStartRoom}
              isCreatingRoom={isCreatingRoom}
              hasSavedNickname={Boolean(name.trim())}
            />
          ) : (
            <JoinPinForm initialPin={searchParams.get('pin') || ''} onJoin={executeJoin} loading={isJoiningRoom} />
          )}
        </div>

        <RecentRoomsDrawer
          recentSession={recentSession} recentWinnerName={recentWinnerName} recentRating={recentRating}
          activePin={activePin} historyList={historyList} isOpen={recentDrawerOpen}
          onClose={() => setRecentDrawerOpen(false)} onOpenDrawer={() => setRecentDrawerOpen(true)}
          onQuickRate={handleQuickHomeRate} onOpenReviewModal={() => setCheckinModalOpen(true)}
          onNavigateHistory={() => navigate('/history')} onRejoinPin={(pinToRejoin) => navigate(`/lobby/${pinToRejoin}`)}
          onQuickSelectCategory={(item) => {
            const matchedCat = categories.find((c) => c.topic === item.topic || c.id.toLowerCase() === String(item.category || '').toLowerCase());
            const targetCat = matchedCat ? matchedCat.id : 'Restaurants';
            handleSelectCategory(targetCat);
            handleStartRoom({ category: targetCat });
          }}
        />
      </main>

      <footer className="text-center pt-1 pb-0.5 shrink-0">
        <p className="text-[11px] text-[var(--text-tertiary)]">{t('footerSubtext')}</p>
      </footer>

      <SettingsModal isOpen={settingsOpen} onClose={() => { setSettingsOpen(false); setName(getStoredNickname()); setActivePin(localStorage.getItem('consensus_active_pin') || ''); }} />
      <LanguageMenuModal isOpen={languageMenuOpen} onClose={() => setLanguageMenuOpen(false)} />
      <UberLocationSearchModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} currentLocation={gpsState} onSelectLocation={(loc) => { saveUserLocation(loc); setGpsState(loc); setIsLocationModalOpen(false); }} />
      <CustomPollDrawer isOpen={isCustomDrawerOpen} onClose={() => setIsCustomDrawerOpen(false)} topic={customTopic} setTopic={setCustomTopic} customOptions={customOptions} setCustomOptions={setCustomOptions} onStartRoom={handleStartRoom} isCreatingRoom={isCreatingRoom} />
      {recentSession && (
        <ReviewModal
          isOpen={checkinModalOpen}
          onClose={() => setCheckinModalOpen(false)}
          onSubmitted={(satScore) => setRecentRating(satScore || 5)}
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
