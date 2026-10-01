import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Compass,
  Sparkles,
  MapPin,
  Utensils,
  Coffee,
  Wine,
  Film,
  Dumbbell,
  Users,
  DollarSign,
  ArrowRight,
  Minus,
  Plus,
  Flame,
  Clock,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import SegmentedControl from '../components/ui/SegmentedControl';
import RangeSlider from '../components/ui/RangeSlider';
import SpringToggle from '../components/ui/SpringToggle';
import StatusBadge from '../components/ui/StatusBadge';

export default function HostSettings() {
  const navigate = useNavigate();
  const { isConnected, participantId } = useSocket();
  const { addToast } = useToast();

  // Dual-Loop Mode: 'DISCOVERY' vs 'CUSTOM'
  const [mode, setMode] = useState('DISCOVERY');

  // Discovery Mode State
  const [category, setCategory] = useState('Restaurants');
  const [customKeyword, setCustomKeyword] = useState('');
  const [radiusKm, setRadiusKm] = useState(5);
  const [priceTier, setPriceTier] = useState('$$');

  // Custom Mode State
  const [topic, setTopic] = useState('Where should we hang out tonight?');
  const [suggestionLimit, setSuggestionLimit] = useState(3);
  const [allowParticipantSuggestions, setAllowParticipantSuggestions] = useState(true);

  // Group Configuration
  const [groupSize, setGroupSize] = useState(4);
  const [loading, setLoading] = useState(false);

  const categories = [
    { label: 'Restaurants', icon: Utensils, desc: 'Dining & Bistros' },
    { label: 'Cafes', icon: Coffee, desc: 'Espresso & Pastries' },
    { label: 'Bars & Pubs', icon: Wine, desc: 'Craft Beer & Cocktails' },
    { label: 'Cinema', icon: Film, desc: 'Movies & Showings' },
    { label: 'Activities', icon: Dumbbell, desc: 'Bowling, Arcades & Games' },
    { label: 'Desserts', icon: Flame, desc: 'Gelato, Bakery & Sweets' },
  ];

  const priceTiers = [
    { value: '$', label: '$ (Budget)' },
    { value: '$$', label: '$$ (Moderate)' },
    { value: '$$$', label: '$$$ (Upscale)' },
    { value: '$$$$', label: '$$$$ (Fine)' },
  ];

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setLoading(true);

    let generatedPin = '4921';
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

    setLoading(false);

    navigate(`/lobby/${generatedPin}`, {
      state: {
        mode,
        isHost: true,
        groupSize,
        topic: mode === 'CUSTOM' ? topic : category,
        category,
        customKeyword,
        radiusKm,
        priceTier,
        suggestionLimit,
        allowParticipantSuggestions,
        roomData: realRoom,
      },
    });
  };

  return (
    <div className="min-h-screen pb-16 select-none">
      
      {/* Apple HIG Top Navigation Bar */}
      <header className="sticky top-0 z-30 liquid-glass border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm font-medium text-[var(--accent-bg)] hover:opacity-80 transition-opacity cursor-pointer"
          >
            <ChevronLeft size={18} />
            <span>Cancel</span>
          </button>
          
          <h2 className="text-base font-semibold text-[var(--ios-label)]">
            Host Configuration Studio
          </h2>

          <div className="flex items-center gap-2">
            <StatusBadge
              status={isConnected ? 'success' : 'neutral'}
              label={isConnected ? 'Server Live' : 'Local Mode'}
              size="sm"
            />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Configuration Content */}
      <main className="max-w-2xl mx-auto px-4 pt-6 flex flex-col gap-6">
        
        {/* Mode Selector */}
        <section className="flex flex-col gap-2">
          <div className="settings-section-label">Consensus Domain</div>
          <SegmentedControl
            options={[
              { value: 'DISCOVERY', label: 'Local Venues (Foursquare)', icon: Compass },
              { value: 'CUSTOM', label: 'Custom Topics (Crowdsourced)', icon: Sparkles },
            ]}
            value={mode}
            onChange={setMode}
            size="lg"
          />
        </section>

        {/* Discovery Mode Settings */}
        {mode === 'DISCOVERY' ? (
          <>
            {/* Category Grid */}
            <section className="flex flex-col gap-2">
              <div className="settings-section-label">Venue Category</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {categories.map((cat) => {
                  const isSelected = category === cat.label;
                  const IconComp = cat.icon;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setCategory(cat.label)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] shadow-[0_2px_12px_var(--accent-glow-subtle)]'
                          : 'apple-card text-[var(--ios-label)] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 transition-colors ${
                        isSelected
                          ? 'bg-[var(--accent-bg)]/20 text-[var(--accent-bg)]'
                          : 'bg-black/[0.04] dark:bg-white/[0.08] text-[var(--ios-secondary-label)]'
                      }`}>
                        <IconComp size={22} />
                      </div>
                      <span className="text-xs font-bold tracking-tight">{cat.label}</span>
                      <span className="text-[10px] text-[var(--ios-secondary-label)] mt-0.5">{cat.desc}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Foursquare Filters Group */}
            <section className="flex flex-col gap-2">
              <div className="settings-section-label">Search & Radius Parameters</div>
              <div className="settings-card-group">
                <div className="settings-item-row flex-col sm:flex-row sm:items-center gap-2 items-start">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[var(--ios-label)]">Keyword Filter</span>
                    <span className="text-xs text-[var(--ios-secondary-label)]">Optional tag (e.g. ramen, terrace, rooftop)</span>
                  </div>
                  <input
                    type="text"
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    placeholder="Search specifics..."
                    className="w-full sm:w-48 px-3.5 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] border border-[var(--border-subtle)] text-sm text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] outline-none focus:border-[var(--accent-bg)]"
                  />
                </div>

                <div className="settings-item-row flex-col gap-3 items-stretch">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[var(--ios-label)]">Search Distance Radius</span>
                    <span className="text-[var(--accent-bg)] font-mono font-bold">
                      {radiusKm} km (~{Math.round(radiusKm * 3.5)} min transit)
                    </span>
                  </div>
                  <RangeSlider
                    min={1}
                    max={25}
                    step={1}
                    value={radiusKm}
                    onChange={setRadiusKm}
                    unit="km"
                  />
                </div>

                <div className="settings-item-row flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[var(--ios-label)]">Default Price Tier</span>
                    <span className="text-xs text-[var(--ios-secondary-label)]">Baseline budget filter</span>
                  </div>
                  <SegmentedControl
                    options={priceTiers.map((p) => ({ value: p.value, label: p.value }))}
                    value={priceTier}
                    onChange={setPriceTier}
                    size="sm"
                    className="sm:w-48"
                  />
                </div>
              </div>
            </section>
          </>
        ) : (
          /* Custom Mode Settings */
          <section className="flex flex-col gap-2">
            <div className="settings-section-label">Decision Topic</div>
            <div className="settings-card-group">
              <div className="settings-item-row flex-col gap-2 items-stretch">
                <label htmlFor="topic-input" className="text-xs font-semibold uppercase tracking-wider text-[var(--ios-secondary-label)]">
                  Question for the Group
                </label>
                <input
                  id="topic-input"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Which movie should we stream?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-[var(--border-main)] text-sm text-[var(--ios-label)] focus:border-[var(--accent-bg)] outline-none"
                  required
                />
              </div>

              <div className="settings-item-row">
                <SpringToggle
                  checked={allowParticipantSuggestions}
                  onChange={setAllowParticipantSuggestions}
                  label="Allow Participant Suggestions"
                  description="Friends can submit additional options in the lobby"
                />
              </div>

              {allowParticipantSuggestions && (
                <div className="settings-item-row flex-col gap-3 items-stretch">
                  <RangeSlider
                    label="Max Suggestions per Friend"
                    min={1}
                    max={5}
                    step={1}
                    value={suggestionLimit}
                    onChange={setSuggestionLimit}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Group Size Stepper */}
        <section className="flex flex-col gap-2">
          <div className="settings-section-label">Participant Quorum</div>
          <div className="settings-card-group">
            <div className="settings-item-row">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)]">
                  <Users size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[var(--ios-label)]">Expected Group Size</span>
                  <span className="text-xs text-[var(--ios-secondary-label)]">Room computes consensus once quorum votes</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-black/[0.04] dark:bg-white/[0.08] p-1 rounded-xl border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setGroupSize((prev) => Math.max(2, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-[#2C2C2E] flex items-center justify-center text-[var(--ios-label)] shadow-xs hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer"
                  aria-label="Decrease group size"
                >
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center font-bold text-sm text-[var(--ios-label)] font-mono tabular-nums">
                  {groupSize}
                </span>
                <button
                  type="button"
                  onClick={() => setGroupSize((prev) => Math.min(12, prev + 1))}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-[#2C2C2E] flex items-center justify-center text-[var(--ios-label)] shadow-xs hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer"
                  aria-label="Increase group size"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={handleCreateRoom}
            loading={loading}
            icon={ArrowRight}
            className="w-full"
          >
            Create Consensus Room
          </Button>
        </div>
      </main>
    </div>
  );
}
