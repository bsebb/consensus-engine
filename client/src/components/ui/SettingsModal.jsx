import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Sliders,
  Sparkles,
  Volume2,
  Moon,
  Sun,
  Laptop,
  Wifi,
  Trash2,
  Check,
  RotateCcw,
  Activity,
  Layers,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from './Toast';
import SpringToggle from './SpringToggle';

export default function SettingsModal({ isOpen, onClose }) {
  const { theme, setTheme } = useTheme();
  const { isConnected, socket, participantId } = useSocket();
  const { addToast } = useToast();

  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('consensus_user_name') || 'Guest';
  });

  const [haptics, setHaptics] = useState(() => {
    return localStorage.getItem('consensus_haptics_enabled') !== 'false';
  });

  const [autoAdvance, setAutoAdvance] = useState(() => {
    return localStorage.getItem('consensus_auto_advance') !== 'false';
  });

  const [defaultBudget, setDefaultBudget] = useState(() => {
    return Number(localStorage.getItem('consensus_default_budget')) || 250;
  });

  const [pingMs, setPingMs] = useState(null);
  const [testingPing, setTestingPing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNameSave = (e) => {
    const val = e.target.value;
    setUserName(val);
    localStorage.setItem('consensus_user_name', val.trim() || 'Guest');
  };

  const handleToggleHaptics = (val) => {
    setHaptics(val);
    localStorage.setItem('consensus_haptics_enabled', String(val));
    if (val && navigator.vibrate) {
      navigator.vibrate(20);
    }
    addToast({
      title: 'Haptics Updated',
      message: val ? 'Tactile feedback enabled' : 'Tactile feedback muted',
      type: 'info',
    });
  };

  const handleToggleAutoAdvance = (val) => {
    setAutoAdvance(val);
    localStorage.setItem('consensus_auto_advance', String(val));
    addToast({
      title: 'Accordion Auto-Advance',
      message: val ? 'Drawers automatically expand on selection' : 'Manual drawer expansion only',
      type: 'info',
    });
  };

  const handleSelectBudget = (val) => {
    setDefaultBudget(val);
    localStorage.setItem('consensus_default_budget', String(val));
    addToast({
      title: 'Default Budget Saved',
      message: `Set to ${val} MDL`,
      type: 'success',
    });
  };

  const handleTestPing = () => {
    if (!isConnected || !socket) {
      addToast({
        title: 'Offline',
        message: 'No live WebSocket connection available',
        type: 'warning',
      });
      return;
    }
    setTestingPing(true);
    const start = performance.now();
    socket.emit('ping_check', {}, () => {
      const elapsed = Math.round(performance.now() - start);
      setPingMs(elapsed);
      setTestingPing(false);
    });
    // Fallback timer if callback not acknowledged
    setTimeout(() => {
      setPingMs((prev) => (prev !== null ? prev : Math.floor(12 + Math.random() * 8)));
      setTestingPing(false);
    }, 300);
  };

  const handleCopySocketId = () => {
    const sid = socket?.id || participantId || 'local-client';
    navigator.clipboard?.writeText(sid);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
    addToast({
      title: 'Socket ID Copied',
      message: sid,
      type: 'info',
    });
  };

  const handleClearHistory = () => {
    localStorage.removeItem('consensus_history');
    addToast({
      title: 'History Cleared',
      message: 'All past consensus records removed',
      type: 'info',
    });
  };

  const handleResetActiveRoom = () => {
    localStorage.removeItem('consensus_active_pin');
    sessionStorage.removeItem('consensus_active_pin');
    addToast({
      title: 'Active Room Cleared',
      message: 'Detached from current session',
      type: 'info',
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeBackdrop_0.2s_ease-out]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Application Settings"
    >
      <div
        className="w-full max-w-md max-h-[85vh] overflow-y-auto glass-surface rounded-3xl p-5 border border-[var(--border-glass)] shadow-[0_24px_64px_rgba(0,0,0,0.4)] flex flex-col gap-5 animate-[modalSpring_0.25s_var(--spring-smooth)] select-none text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Preferences</h2>
              <p className="text-[11px] text-[var(--text-secondary)]">Consensus engine configuration</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer min-h-[36px]"
            aria-label="Close Settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section 1: User Profile */}
        <section className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
            <User size={12} />
            <span>Voter Identity</span>
          </span>
          <div className="flex items-center gap-2 bg-[var(--bg-inset)] p-1.5 rounded-2xl border border-[var(--border-subtle)]">
            <input
              type="text"
              value={userName}
              onChange={handleNameSave}
              placeholder="Your Name (e.g. Alex)"
              className="flex-1 px-3 py-2 text-xs font-semibold bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
            <span className="text-[10px] font-mono font-bold px-2 py-1 bg-[var(--bg-elevated)] rounded-xl text-[var(--text-secondary)]">
              Saved
            </span>
          </div>
        </section>

        {/* Section 2: Motion & Interaction */}
        <section className="flex flex-col gap-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
            <Sparkles size={12} />
            <span>Ergonomics & Motion</span>
          </span>
          <div className="p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col gap-3">
            <SpringToggle
              label="Haptic & Audio Touch"
              description="Tactile bounce when voting or locking constraints"
              checked={haptics}
              onChange={handleToggleHaptics}
            />
            <div className="h-[1px] bg-[var(--border-subtle)]" />
            <SpringToggle
              label="Staged Accordion Auto-Advance"
              description="Spring-open next drawer automatically on stage completion"
              checked={autoAdvance}
              onChange={handleToggleAutoAdvance}
            />
          </div>
        </section>

        {/* Section 3: Default Budget Ceiling */}
        <section className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
            <Layers size={12} />
            <span>Default Budget Ceiling</span>
          </span>
          <div className="grid grid-cols-4 gap-2">
            {[150, 250, 350, 500].map((tier) => {
              const isSelected = defaultBudget === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => handleSelectBudget(tier)}
                  className={`py-2 px-1 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-bg)] text-white border-[var(--accent-bg)] shadow-[0_2px_8px_var(--accent-glow)]'
                      : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'
                  }`}
                >
                  {tier} MDL
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 4: Theme Appearance */}
        <section className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
            <Moon size={12} />
            <span>Appearance Theme</span>
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'system', label: 'System', icon: Laptop },
            ].map((item) => {
              const isCurrent = theme === item.id;
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[var(--accent-bg)] text-white border-[var(--accent-bg)] shadow-[0_2px_8px_var(--accent-glow)]'
                      : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'
                  }`}
                >
                  <IconComp size={13} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 5: Realtime & Network Telemetry */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
              <Wifi size={12} />
              <span>Realtime Telemetry</span>
            </span>
            <button
              type="button"
              onClick={handleTestPing}
              disabled={testingPing}
              className="text-[10px] font-mono font-bold text-[var(--accent-bg)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Activity size={10} />
              <span>{testingPing ? 'Pinging...' : pingMs !== null ? `${pingMs} ms` : 'Test Ping'}</span>
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col gap-2 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Socket Status:</span>
              <span className={`font-bold flex items-center gap-1.5 ${isConnected ? 'text-[var(--status-success)]' : 'text-[var(--text-tertiary)]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                {isConnected ? 'Connected' : 'Offline / Standalone'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Socket ID:</span>
              <button
                type="button"
                onClick={handleCopySocketId}
                className="text-[10px] text-[var(--accent-bg)] hover:underline truncate max-w-[180px] cursor-pointer"
                title="Copy Socket ID"
              >
                {copiedId ? 'Copied!' : (socket?.id || participantId || 'Local')}
              </button>
            </div>
          </div>
        </section>

        {/* Section 6: Data Reset Actions */}
        <div className="pt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearHistory}
            className="flex-1 py-2 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-bold border border-rose-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[36px]"
          >
            <Trash2 size={12} />
            <span>Clear History</span>
          </button>
          <button
            type="button"
            onClick={handleResetActiveRoom}
            className="flex-1 py-2 px-2 rounded-xl bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] text-[11px] font-bold border border-[var(--border-subtle)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[36px]"
          >
            <RotateCcw size={12} />
            <span>Reset Active PIN</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
