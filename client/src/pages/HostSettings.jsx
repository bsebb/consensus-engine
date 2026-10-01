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
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import SegmentedControl from '../components/ui/SegmentedControl';
import RangeSlider from '../components/ui/RangeSlider';
import StatusBadge from '../components/ui/StatusBadge';

export default function HostSettings() {
  const navigate = useNavigate();
  const { isConnected, participantId } = useSocket();
  const { addToast } = useToast();

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

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-44 select-none">
      {/* PWA Mobile Header */}
      <header className="sticky top-0 z-30 glass-surface border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Back to Join"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <h1 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
            Host Configuration
          </h1>

          <div className="flex items-center gap-2">
            <StatusBadge
              status={isConnected ? 'success' : 'neutral'}
              label={isConnected ? 'Online' : 'Local'}
              size="sm"
            />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Configuration Content */}
      <main className="px-4 pt-5 flex flex-col gap-5 flex-1">
        {/* Mode Selector */}
        <section className="flex flex-col gap-1.5">
          <span className="section-label">Consensus Domain</span>
          <SegmentedControl
            options={[
              { value: 'DISCOVERY', label: 'Local Venues', icon: Compass },
              { value: 'CUSTOM', label: 'Custom Topics', icon: Sparkles },
            ]}
            value={mode}
            onChange={setMode}
            size="md"
          />
        </section>

        {/* Discovery Mode Settings */}
        {mode === 'DISCOVERY' ? (
          <>
            {/* Category Symmetrical 2x3 Grid with Rich Tactile Visual Feedback */}
            <section className="flex flex-col gap-1.5">
              <span className="section-label">Category Selection</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {categories.map((cat) => {
                  const isSelected = category === cat.label;
                  const IconComp = cat.icon;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setCategory(cat.label)}
                      className={`relative flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all duration-200 cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] shadow-[0_4px_16px_var(--accent-glow-subtle)] ring-1 ring-[var(--accent-bg)]'
                          : 'bg-[var(--bg-elevated)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--text-tertiary)]'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 rounded-2xl bg-[var(--accent-bg)]/5 pointer-events-none -z-10 animate-[stampPop_0.2s_ease-out]" />
                      )}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                          isSelected
                            ? 'bg-[var(--accent-bg)] text-white shadow-sm'
                            : 'bg-[var(--bg-inset)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <IconComp size={20} />
                      </div>
                      <span className="text-xs font-bold tracking-tight">{cat.label}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                        {cat.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Radius Slider with Quick Preset Buttons */}
            <section className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="section-label m-0 p-0">Search Radius</span>
                <span className="font-mono text-xs font-extrabold text-[var(--accent-bg)]">
                  {radiusKm.toFixed(1)} km
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2">
                {radiusPresets.map((preset) => {
                  const isPresetActive = radiusKm === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRadiusKm(preset)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-mono font-bold border transition-all duration-150 cursor-pointer active:scale-95 ${
                        isPresetActive
                          ? 'bg-[var(--accent-bg)] text-white border-[var(--accent-bg)] shadow-[0_2px_8px_var(--accent-glow)] scale-[1.02]'
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
            </section>

            {/* Price Tier Segmented Pills with Exact Price Descriptions */}
            <section className="flex flex-col gap-1.5">
              <span className="section-label">Target Budget Tier</span>
              <div className="grid grid-cols-4 gap-2">
                {priceTiers.map((tier) => {
                  const isSelected = priceTier === tier.value;
                  return (
                    <button
                      key={tier.value}
                      type="button"
                      onClick={() => setPriceTier(tier.value)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] shadow-[0_2px_10px_var(--accent-glow-subtle)] ring-1 ring-[var(--accent-bg)]'
                          : 'bg-[var(--bg-elevated)] border-[var(--border-main)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                      }`}
                    >
                      <span className="font-mono text-sm font-black">{tier.label}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)] font-mono mt-0.5">
                        {tier.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          /* Custom Brainstorm Mode */
          <section className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="custom-topic" className="section-label">
                Decision Prompt
              </label>
              <input
                id="custom-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Which movie should we stream?"
                className="w-full text-sm font-semibold rounded-xl p-3 bg-[var(--bg-inset)] border border-[var(--border-main)] focus:border-[var(--accent-bg)] focus:ring-2 focus:ring-[var(--accent-glow-focus)] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="section-label">Max Suggestions per Peer</span>
              <div className="flex items-center justify-between bg-[var(--bg-inset)] p-2 rounded-xl">
                <span className="text-xs font-medium text-[var(--text-secondary)] pl-2">
                  Allowed Candidates
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSuggestionLimit((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent-bg)] transition-colors cursor-pointer"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-mono text-sm font-bold text-[var(--text-primary)] w-6 text-center tabular-nums">
                    {suggestionLimit}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSuggestionLimit((prev) => Math.min(6, prev + 1))}
                    className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent-bg)] transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Expected Group Size Stepper */}
        <section className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--bg-inset)] flex items-center justify-center text-[var(--accent-bg)]">
              <Users size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--text-primary)]">Group Quorum</span>
              <span className="text-[10px] text-[var(--text-secondary)]">Target voter size</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGroupSize((prev) => Math.max(2, prev - 1))}
              className="w-9 h-9 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent-bg)] transition-colors cursor-pointer"
              aria-label="Decrease group size"
            >
              <Minus size={16} />
            </button>
            <span className="font-mono text-base font-extrabold text-[var(--text-primary)] w-8 text-center tabular-nums">
              {groupSize}
            </span>
            <button
              type="button"
              onClick={() => setGroupSize((prev) => Math.min(16, prev + 1))}
              className="w-9 h-9 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent-bg)] transition-colors cursor-pointer"
              aria-label="Increase group size"
            >
              <Plus size={16} />
            </button>
          </div>
        </section>

        {/* Primary CTA */}
        <div className="pt-3 pb-8">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleCreateRoom}
            loading={loading}
            icon={ArrowRight}
            className="w-full h-12 shadow-[0_8px_24px_var(--accent-glow)] font-bold text-base"
          >
            Launch Room & Enter Lobby
          </Button>
        </div>
      </main>
    </div>
  );
}
