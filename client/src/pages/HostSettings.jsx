import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Compass,
  Sparkles,
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
  Check,
  Settings,
  Layers,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import SegmentedControl from '../components/ui/SegmentedControl';
import RangeSlider from '../components/ui/RangeSlider';
import StatusBadge from '../components/ui/StatusBadge';
import SettingsModal from '../components/ui/SettingsModal';

export default function HostSettings() {
  const navigate = useNavigate();
  const { isConnected, participantId } = useSocket();
  const { addToast } = useToast();

  // Settings Modal State
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  // Custom Mode State
  const [topic, setTopic] = useState('Where should we hang out tonight?');
  const [suggestionLimit, setSuggestionLimit] = useState(3);

  // Group Configuration
  const [groupSize, setGroupSize] = useState(4);
  const [loading, setLoading] = useState(false);

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

    setOpenStages({
      1: targetStage === 1,
      2: targetStage === 2,
      3: targetStage === 3,
      4: targetStage === 4,
    });
  };

  const handleSelectCategory = (catLabel) => {
    setCategory(catLabel);
    // Haptic feedback if enabled
    if (localStorage.getItem('consensus_haptics_enabled') !== 'false' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    // Auto-advance to Stage 3 after subtle tactile delay
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

    let generatedPin = String(Math.floor(1000 + Math.random() * 9000));
    let realRoom = null;

    try {
      const response = await fetch('/api/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: participantId,
          mode,
          theme: mode === 'DISCOVERY' ? category.toLowerCase() : undefined,
          radius: radiusKm * 1000,
        }),
      });

      if (response.ok) {
        realRoom = await response.json();
        generatedPin = realRoom.pin;
        addToast({
          title: 'Room Created Online',
          message: `PIN #${generatedPin} registered with server`,
          type: 'success',
        });
      }
    } catch (err) {
      console.warn('[HostSettings] Server offline, using simulated host session:', err);
      addToast({
        title: 'Local Session Created',
        message: `Offline room PIN #${generatedPin} ready`,
        type: 'info',
      });
    }

    localStorage.setItem('consensus_active_pin', generatedPin);
    setLoading(false);

    navigate(`/lobby/${generatedPin}`, {
      state: {
        mode,
        isHost: true,
        groupSize,
        topic: mode === 'CUSTOM' ? topic : category,
        category,
        radiusKm,
        priceTier,
        suggestionLimit,
        roomData: realRoom,
      },
    });
  };

  const progressPercent = calculateProgress();

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-44 select-none">
      {/* PWA Mobile Header with Progress Hairline */}
      <header className="sticky top-0 z-30 glass-surface border-b border-[var(--border-subtle)] px-4 py-3 relative">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 min-h-[36px]"
            aria-label="Back to Join"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <h1 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
            Host Configuration
          </h1>

          <div className="flex items-center gap-1.5">
            <StatusBadge
              status={isConnected ? 'success' : 'neutral'}
              label={isConnected ? 'Live' : 'Local'}
              size="sm"
            />
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Open Settings"
              title="Preferences"
            >
              <Settings size={17} />
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Top Stage Progress Hairline */}
        <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-[var(--bg-inset)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent-bg)] to-indigo-500 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Configuration Content with Staged Accordion */}
      <main className="px-4 pt-4 flex flex-col gap-3.5 flex-1">
        {/* Stepper Status Pill */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
            <Layers size={12} />
            <span>Interactive Setup Stages</span>
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
                <h3 className="text-xs font-bold text-[var(--text-primary)]">Consensus Domain</h3>
                <p className="text-[10px] text-[var(--text-secondary)]">Decision format & context</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-[var(--bg-inset)] text-[10px] font-mono font-bold text-[var(--text-primary)] border border-[var(--border-subtle)]">
                {mode === 'DISCOVERY' ? 'Local Venues' : 'Custom Topics'}
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
                  { value: 'DISCOVERY', label: 'Local Venues', icon: Compass },
                  { value: 'CUSTOM', label: 'Custom Topics', icon: Sparkles },
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
                <span>Next: Target</span>
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
                  {mode === 'DISCOVERY' ? 'Category Selection' : 'Custom Topic'}
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)]">Vibe or subject matter</p>
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
            <div className="accordion-drawer-inner p-3.5 pt-0 border-t border-[var(--border-subtle)]/50 mt-1 flex flex-col gap-3">
              {mode === 'DISCOVERY' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {categories.map((cat) => {
                    const isSelected = category === cat.label;
                    const IconComp = cat.icon;
                    return (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => handleSelectCategory(cat.label)}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-150 cursor-pointer active:scale-95 min-h-[76px] ${
                          isSelected
                            ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] shadow-[0_4px_16px_var(--accent-glow-subtle)] ring-1 ring-[var(--accent-bg)]'
                            : 'bg-[var(--bg-inset)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--text-tertiary)]'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1 transition-colors ${
                            isSelected
                              ? 'bg-[var(--accent-bg)] text-white shadow-sm'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                          }`}
                        >
                          <IconComp size={16} />
                        </div>
                        <span className="text-[11px] font-bold tracking-tight">{cat.label}</span>
                        <span className="text-[9px] text-[var(--text-tertiary)] mt-0.5">
                          {cat.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Which team offsite venue?"
                    className="w-full text-xs font-semibold rounded-xl p-3 bg-[var(--bg-inset)] border border-[var(--border-main)] focus:border-[var(--accent-bg)] outline-none text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => advanceToStage(3)}
                    className="self-end py-1.5 px-3 rounded-xl bg-[var(--accent-bg)] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                  >
                    <span>Next: Constraints</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
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
                  {mode === 'DISCOVERY' ? 'Radius & Price Ceiling' : 'Submission Limits'}
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)]">Search range & boundaries</p>
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
            <div className="accordion-drawer-inner p-3.5 pt-0 border-t border-[var(--border-subtle)]/50 mt-1 flex flex-col gap-3.5">
              {mode === 'DISCOVERY' ? (
                <>
                  {/* Radius Slider with Quick Presets */}
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)]">Search Radius</span>
                      <span className="font-mono text-xs font-extrabold text-[var(--accent-bg)]">
                        {radiusKm.toFixed(1)} km
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {radiusPresets.map((preset) => {
                        const isPresetActive = radiusKm === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setRadiusKm(preset)}
                            className={`flex-1 py-1 px-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                              isPresetActive
                                ? 'bg-[var(--accent-bg)] text-white border-[var(--accent-bg)] shadow-sm'
                                : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'
                            }`}
                          >
                            {preset} km
                          </button>
                        );
                      })}
                    </div>

                    <RangeSlider
                      min={1}
                      max={15}
                      step={0.5}
                      value={radiusKm}
                      onChange={setRadiusKm}
                      label="Maximum Distance"
                      valueDisplay={`${radiusKm.toFixed(1)} km`}
                    />
                  </div>

                  {/* Price Tier Segmented Pills */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)]">Target Price Bracket</span>
                      <span className="font-mono text-xs font-extrabold text-[var(--accent-bg)]">
                        {priceTiers.find((p) => p.value === priceTier)?.desc}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {priceTiers.map((tier) => {
                        const isActive = priceTier === tier.value;
                        return (
                          <button
                            key={tier.value}
                            type="button"
                            onClick={() => setPriceTier(tier.value)}
                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                              isActive
                                ? 'bg-[var(--accent-bg)] text-white border-[var(--accent-bg)] shadow-sm'
                                : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'
                            }`}
                          >
                            <span className="font-mono text-xs font-black">{tier.label}</span>
                            <span className="text-[9px] opacity-80 mt-0.5">{tier.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between bg-[var(--bg-inset)] p-3 rounded-xl border border-[var(--border-subtle)] pt-1">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Suggestions per Voter</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">Candidate pool capacity</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSuggestionLimit((prev) => Math.max(1, prev - 1))}
                      className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent-bg)] transition-colors cursor-pointer"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)] w-5 text-center">
                      {suggestionLimit}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSuggestionLimit((prev) => Math.min(6, prev + 1))}
                      className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent-bg)] transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => advanceToStage(4)}
                className="self-end py-1.5 px-3 rounded-xl bg-[var(--accent-bg)] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              >
                <span>Next: Quorum</span>
                <ArrowRight size={12} />
              </button>
            </div>
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
                <h3 className="text-xs font-bold text-[var(--text-primary)]">Group Quorum & Launch</h3>
                <p className="text-[10px] text-[var(--text-secondary)]">Target participant headcount</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-[var(--bg-inset)] text-[10px] font-mono font-bold text-[var(--text-primary)] border border-[var(--border-subtle)]">
                {groupSize} Voters
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
                    <span className="text-xs font-bold text-[var(--text-primary)]">Expected Headcount</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">Voting threshold</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGroupSize((prev) => Math.max(2, prev - 1))}
                    className="w-8 h-8 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent-bg)] transition-colors cursor-pointer"
                    aria-label="Decrease group size"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-mono text-sm font-extrabold text-[var(--text-primary)] w-6 text-center tabular-nums">
                    {groupSize}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGroupSize((prev) => Math.min(16, prev + 1))}
                    className="w-8 h-8 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent-bg)] transition-colors cursor-pointer"
                    aria-label="Increase group size"
                  >
                    <Plus size={14} />
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
                className="w-full h-11 shadow-[0_8px_24px_var(--accent-glow)] font-bold text-sm"
              >
                Launch Room & Enter Lobby
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
              className="w-full h-12 shadow-[0_8px_24px_var(--accent-glow)] font-bold text-sm"
            >
              Launch Room & Enter Lobby
            </Button>
          </div>
        )}
      </main>

      {/* Global Settings Modal Portal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
