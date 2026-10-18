import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, X, Building2, Check, Loader2 } from 'lucide-react';
import { POPULAR_LOCATIONS, searchLocationByQuery, detectUserGps } from '../../utils/location';

export default function UberLocationSearchModal({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(POPULAR_LOCATIONS);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) {
      setResults(POPULAR_LOCATIONS);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const hits = await searchLocationByQuery(clean);
        if (isMounted) {
          setResults(hits);
          setIsSearching(false);
        }
      } catch {
        if (isMounted) setIsSearching(false);
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 180);
  };

  if (!isOpen && !isClosing) return null;

  const handleUseGps = async () => {
    setIsDetectingGps(true);
    try {
      const gpsRes = await detectUserGps({ forceRefresh: true });
      onSelectLocation(gpsRes);
      handleClose();
    } catch (err) {
      console.warn('[Location] GPS detection error:', err);
    } finally {
      setIsDetectingGps(false);
    }
  };

  const handlePickResult = (item) => {
    const payload = {
      status: 'exact',
      lat: item.lat,
      lng: item.lng,
      accuracy: 100,
      isExact: true,
      label: item.title ? `${item.title}${item.subtitle ? `, ${item.subtitle.split(',')[0]}` : ''}` : item.label,
      source: 'manual',
      ts: Date.now(),
    };
    onSelectLocation(payload);
    handleClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-backdrop-ios ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Location Search"
    >
      <div
        className={`w-full sm:max-w-md bg-[var(--bg-elevated)] border border-[var(--border-main)] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-0 ${
          isClosing ? 'animate-sheet-down sm:animate-scale-down' : 'animate-sheet-up sm:animate-modal-spring'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Search Input */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-inset)]/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
              <MapPin size={13} className="text-[var(--accent-bg)]" />
              <span>Select Voting Location</span>
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city, neighborhood, or address..."
              className="w-full min-h-[46px] pl-10 pr-10 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-bg)] outline-none shadow-xs transition-all"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                aria-label="Clear input"
              >
                <X size={14} />
              </button>
            ) : isSearching ? (
              <Loader2 size={16} className="absolute right-3.5 text-[var(--accent-bg)] animate-spin pointer-events-none" />
            ) : null}
          </div>
        </div>

        {/* Quick Location Actions */}
        <div className="p-3 border-b border-[var(--border-subtle)] flex flex-col gap-2">
          {/* Use GPS Action Button */}
          <button
            type="button"
            onClick={handleUseGps}
            disabled={isDetectingGps}
            className="w-full p-3 rounded-2xl bg-[var(--accent-bg)]/10 hover:bg-[var(--accent-bg)]/15 border border-[var(--accent-bg)]/20 flex items-center justify-between text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)] text-white flex items-center justify-center shrink-0 shadow-xs">
                {isDetectingGps ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--accent-bg)]">
                  {isDetectingGps ? 'Acquiring GPS coordinates...' : 'Use My Current Location'}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Live hardware GPS • Automatic hex grid
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--accent-bg)]/20 text-[var(--accent-bg)]">
              GPS
            </span>
          </button>

          {/* Quick Popular City Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider shrink-0 mr-1">
              Popular:
            </span>
            {POPULAR_LOCATIONS.map((loc) => {
              const isSelected = currentLocation?.label?.toLowerCase().includes(loc.title.toLowerCase());
              return (
                <button
                  key={loc.title}
                  type="button"
                  onClick={() => handlePickResult(loc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[var(--accent-bg)] text-white border-[var(--accent-bg)]'
                      : 'bg-[var(--bg-inset)] hover:bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{loc.title}</span>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Uber-Style Place Suggestions List */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 min-h-[220px]">
          {results.length === 0 && !isSearching ? (
            <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
              No matching locations found. Try searching for a city, street, or township.
            </div>
          ) : (
            results.map((item, idx) => {
              const isCurrent =
                currentLocation?.lat != null &&
                Math.abs(currentLocation.lat - item.lat) < 0.04 &&
                Math.abs(currentLocation.lng - item.lng) < 0.04;

              return (
                <button
                  key={`${item.lat}-${item.lng}-${idx}`}
                  type="button"
                  onClick={() => handlePickResult(item)}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between text-left cursor-pointer transition-colors ${
                    isCurrent
                      ? 'bg-[var(--accent-bg)]/10 border border-[var(--accent-bg)]/30'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? 'bg-[var(--accent-bg)] text-white'
                          : 'bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {item.type === 'city' || item.type === 'administrative' ? (
                        <Building2 size={15} />
                      ) : (
                        <MapPin size={15} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {item.title || item.label}
                      </div>
                      <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                        {item.subtitle || item.fullLabel || 'Local Destination'}
                      </div>
                    </div>
                  </div>

                  {isCurrent && (
                    <span className="w-5 h-5 rounded-full bg-[var(--accent-bg)] text-white flex items-center justify-center shrink-0 ml-2">
                      <Check size={11} />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
