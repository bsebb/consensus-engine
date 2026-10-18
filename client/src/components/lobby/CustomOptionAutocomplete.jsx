import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, X, Gamepad2, Trophy, Film, Utensils, Compass, Check, AlertTriangle, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import { searchCustomSuggestions, CATEGORY_META } from '../../utils/customAutocompleteDatabase';
import { triggerHaptic } from '../../utils/haptics';
import { apiUrl } from '../../utils/api';
import { cacheOptionPoster } from '../../utils/customOptionService';

const ICON_MAP = {
  Gamepad2,
  Trophy,
  Film,
  Utensils,
  Compass,
};

export default function CustomOptionAutocomplete({
  suggestion,
  setSuggestion,
  handleAddSuggestion,
  handleQuickAddSuggestion,
  topic = '',
  existingNames = [],
  duplicateMatch = null,
  mode = 'CUSTOM',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [liveSuggestions, setLiveSuggestions] = useState([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  // Debounced live query to server for Steam games, movies, and custom topics
  useEffect(() => {
    const clean = suggestion.trim();
    if (clean.length < 2) {
      setLiveSuggestions([]);
      setIsSearchingLive(false);
      return;
    }

    let isMounted = true;
    setIsSearchingLive(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/v1/options/autocomplete?query=${encodeURIComponent(clean)}&topic=${encodeURIComponent(topic)}`),
          { signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined }
        );
        if (!res.ok) throw new Error('Autocomplete failed');
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.suggestions)) {
          setLiveSuggestions(data.suggestions);
          // Prime poster cache in advance for instant card rendering
          data.suggestions.forEach((item) => {
            if (item.poster_url) {
              cacheOptionPoster(item.name, item.poster_url);
            }
          });
        }
      } catch {
        if (isMounted) setLiveSuggestions([]);
      } finally {
        if (isMounted) setIsSearchingLive(false);
      }
    }, 180);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [suggestion, topic]);

  // Combined suggestions: instant local curated matches + live search results
  const suggestions = useMemo(() => {
    const local = searchCustomSuggestions(suggestion, topic, existingNames);
    const existingSet = new Set(existingNames.map((n) => n.toLowerCase().trim()));
    const localNames = new Set(local.map((l) => l.name.toLowerCase().trim()));

    const filteredLive = liveSuggestions.filter(
      (item) => !localNames.has(item.name.toLowerCase().trim()) && !existingSet.has(item.name.toLowerCase().trim())
    );

    return [...local, ...filteredLive].slice(0, 8);
  }, [suggestion, topic, existingNames, liveSuggestions]);

  // Handle clicking outside to dismiss the popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSelectOption = (item) => {
    triggerHaptic('light');
    if (item.poster_url) {
      cacheOptionPoster(item.name, item.poster_url);
    }
    if (handleQuickAddSuggestion) {
      handleQuickAddSuggestion(item.name);
    }
    setSuggestion('');
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleCustomSubmit = (e) => {
    if (e) e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      handleSelectOption(suggestions[activeIndex]);
      return;
    }
    handleAddSuggestion(e);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        handleSelectOption(suggestions[activeIndex]);
      }
    }
  };

  const cleanQuery = suggestion.trim();
  const hasExactMatch = suggestions.some((s) => s.name.toLowerCase() === cleanQuery.toLowerCase());

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-tertiary)]">
            <Search size={14} />
          </div>
          <input
            ref={inputRef}
            type="text"
            id="lobby-custom-suggestion"
            aria-label="New candidate suggestion"
            autoComplete="off"
            disabled={disabled}
            value={suggestion}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSuggestion(e.target.value);
              setIsOpen(true);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'CUSTOM' ? 'Type or search idea (e.g. Fortnite, Padel, Inception)...' : 'Add custom option...'}
            className="w-full text-xs rounded-xl pl-9 pr-8 py-2.5 bg-[var(--bg-inset)] border border-[var(--border-main)] focus:border-[var(--accent-bg)] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors"
          />
          {suggestion && (
            <button
              type="button"
              onClick={() => {
                setSuggestion('');
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
              aria-label="Clear input"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          icon={Plus}
          disabled={disabled || !cleanQuery}
        >
          Add
        </Button>
      </form>

      {duplicateMatch && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--status-warning)] bg-[rgba(245,158,11,0.12)] px-2.5 py-1.5 rounded-lg mt-2">
          <AlertTriangle size={14} />
          <span>Already on the table: "{duplicateMatch}"</span>
        </div>
      )}

      {/* Autocomplete Dropdown Popover */}
      {isOpen && !disabled && (suggestions.length > 0 || (cleanQuery && !hasExactMatch)) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-[var(--border-main)] rounded-2xl shadow-xl overflow-hidden max-h-72 flex flex-col animate-[fadeIn_0.15s_ease-out]">
          <div className="p-2 border-b border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider bg-[var(--bg-inset)]/50">
            <span className="flex items-center gap-1.5">
              {isSearchingLive ? (
                <Loader2 size={11} className="animate-spin text-[var(--accent-bg)]" />
              ) : (
                <Search size={11} className="text-[var(--accent-bg)]" />
              )}
              <span>{isSearchingLive ? 'Searching...' : cleanQuery ? 'Suggested Matches' : 'Popular Ideas'}</span>
            </span>
            <span className="text-[10px] lowercase font-normal">tap to add</span>
          </div>

          <div className="overflow-y-auto no-scrollbar py-1">
            {/* Direct Custom Add Option if typed text is unique */}
            {cleanQuery && !hasExactMatch && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCustomSubmit}
                className="w-full px-3 py-2 text-left flex items-center justify-between gap-2.5 hover:bg-[var(--accent-bg)]/10 transition-colors border-b border-[var(--border-subtle)] cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)]/15 text-[var(--accent-bg)] flex items-center justify-center shrink-0">
                    <Plus size={15} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[var(--text-primary)] truncate block">
                      Add custom: <span className="text-[var(--accent-bg)]">"{cleanQuery}"</span>
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)] truncate block">
                      Custom group candidate
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent-bg)]/15 text-[var(--accent-bg)] uppercase">
                  Add
                </span>
              </button>
            )}

            {/* Curated Multi-Domain Suggestions */}
            {suggestions.map((item, idx) => {
              const meta = CATEGORY_META[item.category] || CATEGORY_META.activities;
              const IconComponent = ICON_MAP[meta.icon] || Compass;
              const isSelected = idx === activeIndex;

              return (
                <button
                  key={`${item.category}-${item.name}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectOption(item)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer group ${
                    isSelected ? 'bg-[var(--accent-bg)]/15' : 'hover:bg-[var(--bg-inset)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-inset)] flex items-center justify-center">
                      {item.poster_url ? (
                        <img
                          src={item.poster_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${meta.color}`}>
                          <IconComponent size={14} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {item.name}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider border ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-tertiary)] truncate block">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="w-5 h-5 rounded-full bg-[var(--bg-inset)] group-hover:bg-[var(--accent-bg)] group-hover:text-white text-[var(--text-tertiary)] flex items-center justify-center transition-colors shrink-0">
                    <Plus size={11} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
