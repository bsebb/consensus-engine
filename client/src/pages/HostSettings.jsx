import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Compass,
  Utensils,
  Coffee,
  Wine,
  Film,
  Dumbbell,
  Users,
  ArrowRight,
  Minus,
  Plus,
  Flame,
  ChevronDown,
  Settings,
  Layers,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import SegmentedControl from '../components/ui/SegmentedControl';
import SettingsModal from '../components/ui/SettingsModal';
import HostCategoryPicker from '../components/host/HostCategoryPicker';
import HostConstraints from '../components/host/HostConstraints';
import UberLocationSearchModal from '../components/location/UberLocationSearchModal';
import LobbyLoadingView from '../components/lobby/LobbyLoadingView';
import { apiUrl } from '../utils/api';
import { getSavedExactGps, saveUserLocation, detectUserGps } from '../utils/location';
import { triggerHaptic } from '../utils/haptics';

export default function HostSettings() {
  const navigate = useNavigate();
  const { participantId } = useSocket();
  const { addToast } = useToast();
  const { t } = useLanguage();
  const userName = localStorage.getItem('consensus_user_name') || 'Host';

  // Settings Modal State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Progressive Staged Accordion State (1: Domain, 2: Target, 3: Constraints, 4: Quorum)
  const [openStages, setOpenStages] = useState({
    1: false,
    2: true,  // Defaults to category selection open
    3: false,
    4: false,
  });

  // Dual-Loop Mode: 'DISCOVERY' vs 'CUSTOM'
  const [mode, setMode] = useState('DISCOVERY');

  // Discovery Mode State
  const [category, setCategory] = useState('Restaurants');
  const [radiusKm, setRadiusKm] = useState(5);
  const [priceTier, setPriceTier] = useState('$$');
  const [deckSize, setDeckSize] = useState(6);

  // Custom Mode State
  const [topic, setTopic] = useState('Where should we hang out tonight?');
  const [suggestionLimit, setSuggestionLimit] = useState(3);

  // Group Configuration
  const [groupSize, setGroupSize] = useState(4);
  const [loading, setLoading] = useState(false);

  // Geolocation State for Hyper-local Hexagonal Spatial Search
  const [userLocation, setUserLocation] = useState(() => {
    const saved = getSavedExactGps();
    if (saved && saved.lat != null && saved.lng != null) {
      return {
        latitude: saved.lat,
        longitude: saved.lng,
        accuracy: saved.accuracy || 100,
        status: 'granted',
        label: saved.label || 'Saved Location',
      };
    }
    return { latitude: null, longitude: null, accuracy: null, status: 'idle', label: 'Downtown Chișinău (Default)' };
  });

  const detectLocation = async () => {
    setUserLocation((prev) => ({ ...prev, status: 'detecting' }));
    try {
      const res = await detectUserGps({ forceRefresh: true });
      if (res && res.lat != null && res.lng != null) {
        setUserLocation({
          latitude: res.lat,
          longitude: res.lng,
          accuracy: res.accuracy || 50,
          status: 'granted',
          label: res.label || 'Current GPS',
        });
      }
    } catch {
      setUserLocation((prev) => ({ ...prev, status: 'denied' }));
    }
  };

  useEffect(() => {
    const saved = getSavedExactGps();
    if (!saved) {
      detectLocation();
    }
  }, []);

  const categories = [
    { label: 'Restaurants', icon: Utensils, desc: 'Dining & Bistros' },
    { label: 'Cafes', icon: Coffee, desc: 'Espresso & Pastries' },
    { label: 'Bars & Pubs', icon: Wine, desc: 'Craft Beer & Cocktails' },
    { label: 'Cinema', icon: Film, desc: 'Movies & Showings' },
    { label: 'Activities', icon: Dumbbell, desc: 'Bowling & Arcades' },
    { label: 'Desserts', icon: Flame, desc: 'Gelato & Bakery' },
  ];

  const priceTiers = [
    { value: '$', label: '$', desc: '<150 MDL' },
    { value: '$$', label: '$$', desc: '150-300 MDL' },
    { value: '$$$', label: '$$$', desc: '300-500 MDL' },
    { value: '$$$$', label: '$$$$', desc: '500+ MDL' },
  ];

  const radiusPresets = [1, 3, 5, 10];

  const toggleStage = (stageNum) => {
    setOpenStages((prev) => ({
      ...prev,
      [stageNum]: !prev[stageNum],
    }));
  };

  const advanceToStage = (targetStage) => {
    const autoAdvanceEnabled = localStorage.getItem('consensus_auto_advance') !== 'false';
    if (!autoAdvanceEnabled) return;
    setOpenStages({ 1: targetStage === 1, 2: targetStage === 2, 3: targetStage === 3, 4: targetStage === 4 });
  };

  const handleSelectCategory = (catLabel) => {
    setCategory(catLabel);
    triggerHaptic('tap');
    setTimeout(() => {
      advanceToStage(3);
    }, 220);
  };

  const handleSelectMode = (newMode) => {
    setMode(newMode);
    advanceToStage(2);
  };

  const calculateProgress = () => {
    let completed = 1; // Stage 1 (Mode) is always decided
    if (mode === 'DISCOVERY' ? Boolean(category) : Boolean(topic.trim())) completed++;
    if (mode === 'DISCOVERY' ? (radiusKm > 0 && priceTier) : suggestionLimit > 0) completed++;
    if (groupSize >= 2) completed++;
    return (completed / 4) * 100;
  };

  const handleCreateRoom = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    const userName = localStorage.getItem('consensus_user_name') || 'Host';

    try {
      const response = await fetch(apiUrl('/api/v1/rooms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: participantId,
          mode,
          theme: mode === 'CUSTOM' ? (topic.trim() || 'What should we do?') : category.toLowerCase(),
          radius: radiusKm * 1000,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          deck_size: deckSize,
        }),
      });

      if (response.ok) {
        const realRoom = await response.json();
        const generatedPin = realRoom.pin;
        sessionStorage.setItem(`consensus_host_${generatedPin}`, 'true');
        if (realRoom.host_token) {
          sessionStorage.setItem(`consensus_host_token_${generatedPin}`, realRoom.host_token);
        }
        localStorage.setItem('consensus_active_pin', generatedPin);

        addToast({
          title: 'Room Created',
          message: `Session #${generatedPin} is ready for guests`,
          type: 'success',
        });

        setLoading(false);
        navigate(`/lobby/${generatedPin}`, {
          state: {
            mode,
            isHost: true,
            userName,
            groupSize,
            topic: mode === 'CUSTOM' ? topic : category,
            category,
            radiusKm,
            priceTier,
            deckSize,
            suggestionLimit,
            roomData: realRoom,
            userLocation,
          },
        });
        return;
      } else {
        const errData = await response.json().catch(() => ({}));
        addToast({
          title: 'Creation Failed',
          message: errData.error || 'Server rejected room creation.',
          type: 'error',
        });
      }
    } catch (err) {
      console.warn('[HostSettings] Server error creating room:', err);
      addToast({
        title: 'Connection Error',
        message: 'Could not connect to the room server. Please verify your connection.',
        type: 'error',
      });
    }

    setLoading(false);
  };

  const progressPercent = calculateProgress();

  if (loading) {
    return (
      <LobbyLoadingView
        topic={topic}
        category={category}
        userName={userName || 'Host'}
        locationLabel={userLocation?.label || 'Current Location'}
        isCustom={mode === 'CUSTOM'}
        onCancel={() => setLoading(false)}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-[max(env(safe-area-inset-bottom,0px),2.5rem)] select-none">
      {/* Consumer Mobile Header with Progress Hairline */}
      <header className="sticky top-0 z-30 bg-[var(--bg-root)] border-b border-[var(--border-main)] px-4 safe-pt-header pb-3 relative">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-3 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)]"
            aria-label={t('back')}
          >
            <ArrowLeft size={15} />
            <span>{t('back')}</span>
          </button>

          <h1 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
            {t('createRoomBtn')}
          </h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label={t('prefTitle')}
              title={t('prefTitle')}
            >
              <Settings size={16} />
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Top Stage Progress Hairline */}
        <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-[var(--bg-inset)] overflow-hidden">
          <div
            className="h-full bg-[var(--accent-bg)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Configuration Content with Staged Accordion */}
      <main className="px-4 pt-4 flex flex-col gap-3.5 flex-1 max-w-md mx-auto w-full">
        {/* Stepper Status Pill */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
            <Layers size={12} />
            <span>{t('setupStages')}</span>
          </span>
          <span className="text-[11px] font-mono font-bold text-[var(--accent-bg)]">
            {Math.round(progressPercent)}% Configured
          </span>
        </div>

        {/* STAGE 1: Consensus Domain & Mode */}
        <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] shadow-sm overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleStage(1)}
            className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors min-h-[44px]"
            aria-expanded={openStages[1]}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] text-[11px] font-mono font-black flex items-center justify-center">
                01
              </span>
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)]">{t('consensusDomain')}</h3>
                <p className="text-[10px] text-[var(--text-secondary)]">{t('decisionFormatContext')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-[var(--bg-inset)] text-[10px] font-mono font-bold text-[var(--text-primary)] border border-[var(--border-subtle)]">
                {mode === 'DISCOVERY' ? t('localVenues') : t('customTopics')}
              </span>
              <ChevronDown
                size={16}
                className={`text-[var(--text-tertiary)] transition-transform duration-200 ${
                  openStages[1] ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </div>
          </button>

          <div className={`accordion-drawer ${openStages[1] ? 'open' : ''}`}>
            <div className="accordion-drawer-inner p-3.5 pt-0 border-t border-[var(--border-subtle)]/50 mt-1 flex flex-col gap-3">
              <SegmentedControl
                options={[
                  { value: 'DISCOVERY', label: t('localVenues'), icon: Compass },
                  { value: 'CUSTOM', label: t('customTopics'), icon: Layers },
                ]}
                value={mode}
                onChange={handleSelectMode}
                size="md"
              />
              <button
                type="button"
                onClick={() => advanceToStage(2)}
                className="self-end py-1.5 px-3 rounded-xl bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{t('nextTarget')}</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* STAGE 2: Category or Topic */}
        <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] shadow-sm overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleStage(2)}
            className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors min-h-[44px]"
            aria-expanded={openStages[2]}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] text-[11px] font-mono font-black flex items-center justify-center">
                02
              </span>
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)]">
                  {mode === 'DISCOVERY' ? t('categorySelection') : t('customTopic')}
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)]">{t('vibeSubjectMatter')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-[var(--bg-inset)] text-[10px] font-mono font-bold text-[var(--accent-bg)] border border-[var(--border-subtle)] max-w-[120px] truncate">
                {mode === 'DISCOVERY' ? category : topic}
              </span>
              <ChevronDown
                size={16}
                className={`text-[var(--text-tertiary)] transition-transform duration-200 ${
                  openStages[2] ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </div>
          </button>

          <div className={`accordion-drawer ${openStages[2] ? 'open' : ''}`}>
            <HostCategoryPicker
              mode={mode}
              categories={categories}
              category={category}
              handleSelectCategory={handleSelectCategory}
              topic={topic}
              setTopic={setTopic}
              advanceToStage={advanceToStage}
            />
          </div>
        </div>

        {/* STAGE 3: Boundaries, Radius & Price Filter */}
        <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] shadow-sm overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleStage(3)}
            className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors min-h-[44px]"
            aria-expanded={openStages[3]}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] text-[11px] font-mono font-black flex items-center justify-center">
                03
              </span>
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)]">
                  {mode === 'DISCOVERY' ? t('radiusPriceCeiling') : t('submissionLimits')}
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)]">{t('searchRangeBoundaries')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-[var(--bg-inset)] text-[10px] font-mono font-bold text-[var(--text-primary)] border border-[var(--border-subtle)]">
                {mode === 'DISCOVERY' ? `${radiusKm} km · ${priceTier}` : `${suggestionLimit} options`}
              </span>
              <ChevronDown
                size={16}
                className={`text-[var(--text-tertiary)] transition-transform duration-200 ${
                  openStages[3] ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </div>
          </button>

          <div className={`accordion-drawer ${openStages[3] ? 'open' : ''}`}>
            <HostConstraints
              mode={mode}
              radiusKm={radiusKm}
              setRadiusKm={setRadiusKm}
              radiusPresets={radiusPresets}
              priceTier={priceTier}
              setPriceTier={setPriceTier}
              priceTiers={priceTiers}
              userLocation={userLocation}
              detectLocation={detectLocation}
              onOpenLocationSearch={() => setIsLocationModalOpen(true)}
              suggestionLimit={suggestionLimit}
              setSuggestionLimit={setSuggestionLimit}
              advanceToStage={advanceToStage}
              deckSize={deckSize}
              setDeckSize={setDeckSize}
            />
          </div>
        </div>

        {/* STAGE 4: Group Quorum & Launch */}
        <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] shadow-sm overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleStage(4)}
            className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors min-h-[44px]"
            aria-expanded={openStages[4]}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] text-[11px] font-mono font-black flex items-center justify-center">
                04
              </span>
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)]">{t('groupQuorumLaunch')}</h3>
                <p className="text-[10px] text-[var(--text-secondary)]">{t('targetHeadcount')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-[var(--bg-inset)] text-[10px] font-mono font-bold text-[var(--text-primary)] border border-[var(--border-subtle)]">
                {groupSize} {t('historyVoters')}
              </span>
              <ChevronDown
                size={16}
                className={`text-[var(--text-tertiary)] transition-transform duration-200 ${
                  openStages[4] ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </div>
          </button>

          <div className={`accordion-drawer ${openStages[4] ? 'open' : ''}`}>
            <div className="accordion-drawer-inner p-3.5 pt-0 border-t border-[var(--border-subtle)]/50 mt-1 flex flex-col gap-4">
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[var(--bg-inset)] flex items-center justify-center text-[var(--accent-bg)]">
                    <Users size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{t('expectedHeadcount')}</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">{t('votingThreshold')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGroupSize((prev) => Math.max(2, prev - 1))}
                    className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent-bg)] transition-transform active:scale-95 cursor-pointer"
                    aria-label="Decrease group size"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="font-mono text-sm font-extrabold text-[var(--text-primary)] w-7 text-center tabular-nums">
                    {groupSize}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGroupSize((prev) => Math.min(16, prev + 1))}
                    className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent-bg)] transition-transform active:scale-95 cursor-pointer"
                    aria-label="Increase group size"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Primary CTA Inside Staged Accordion */}
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleCreateRoom}
                loading={loading}
                icon={ArrowRight}
                className="w-full h-12 rounded-2xl shadow-[0_8px_24px_var(--accent-glow)] font-bold text-base"
              >
                {t('launchRoomLobby')}
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Launch Card when Accordion is Collapsed */}
        {!openStages[4] && (
          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleCreateRoom}
              loading={loading}
              icon={ArrowRight}
              className="w-full h-12 rounded-2xl shadow-[0_8px_24px_var(--accent-glow)] font-bold text-base"
            >
              {t('launchRoomLobby')}
            </Button>
          </div>
        )}
      </main>

      {/* Global Settings Modal Portal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <UberLocationSearchModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={{
          lat: userLocation.latitude,
          lng: userLocation.longitude,
          label: userLocation.label,
        }}
        onSelectLocation={(loc) => {
          saveUserLocation(loc);
          setUserLocation({
            latitude: loc.lat,
            longitude: loc.lng,
            accuracy: loc.accuracy || 100,
            status: 'granted',
            label: loc.label,
          });
        }}
      />
    </div>
  );
}
