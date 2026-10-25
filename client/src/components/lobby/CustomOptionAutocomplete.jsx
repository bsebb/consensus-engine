import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, X, Gamepad2, Trophy, Film, Utensils, Compass, Check, AlertTriangle, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import { searchCustomSuggestions, CATEGORY_META } from '../../utils/customAutocompleteDatabase';
import { inferDiscoveryDomain } from '../../utils/smartPlaceResolver';
import { triggerHaptic } from '../../utils/haptics';
import { apiUrl } from '../../utils/api';
import { cacheOptionPoster } from '../../utils/customOptionService';
import { useLanguage } from '../../context/LanguageContext';

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
  category = '',
  extraPoolOptions = [],
  existingNames = [],
  duplicateMatch = null,
  mode = 'CUSTOM',
  disabled = false,
  placeholder,
  autoFocus = false,
  inputClassName = '',
  onOptionAdded,
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [liveSuggestions, setLiveSuggestions] = useState([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  const activeDomain = useMemo(() => inferDiscoveryDomain(category || topic), [category, topic]);

  // Debounced live query to server for Steam games, movies, and custom topics
  useEffect(() => {
    const clean = suggestion.trim();
    if (clean.length < 2 || (mode !== 'CUSTOM' && activeDomain !== 'activities')) {
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
  }, [suggestion, topic, mode, activeDomain]);

  // Combined suggestions: instant local curated matches + live search results
  const suggestions = useMemo(() => {
    const local = searchCustomSuggestions(suggestion, topic, existingNames, {
      mode,
      category,
      extraPoolOptions,
    });
    const existingSet = new Set(existingNames.map((n) => n.toLowerCase().trim()));
    const localNames = new Set(local.map((l) => l.name.toLowerCase().trim()));

    const filteredLive = liveSuggestions.filter(
      (item) => !localNames.has(item.name.toLowerCase().trim()) && !existingSet.has(item.name.toLowerCase().trim())
    );

    return [...local, ...filteredLive].slice(0, 8);
  }, [suggestion, topic, category, mode, extraPoolOptions, existingNames, liveSuggestions]);

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
    onOptionAdded?.(item.name);
    setSuggestion('');
    setIsOpen(false);
    setActiveIndex(-1);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleCustomSubmit = (e) => {
    if (e) e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      handleSelectOption(suggestions[activeIndex]);
      return;
    }
    const addedText = suggestion.trim();
    handleAddSuggestion(e);
    if (addedText) onOptionAdded?.(addedText);
    setIsOpen(false);
    setActiveIndex(-1);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
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

  const discoveryPlaceholderByDomain = {
    cafes: t('discoverySearchCafes') || 'Add a specific cafe (e.g. Tucano, Starbucks)...',
    bars: t('discoverySearchBars') || 'Add a bar or pub (e.g. Smokehouse, Draft)...',
    desserts: t('discoverySearchDesserts') || 'Add a dessert spot (e.g. Gioelia, Dulcinella)...',
    activities: t('discoverySearchActivities') || 'Add an activity (e.g. Bowling, Cinema, VR)...',
    restaurants: t('discoverySearchRestaurants') || "Add a specific spot (e.g. McDonald's, KFC, Andy's)...",
  };

  const effectivePlaceholder = placeholder || (
    mode === 'CUSTOM'
      ? (t('customSearchPlaceholder') || "Type or search idea (e.g. McDonald's, KFC, Catan)...")
      : (discoveryPlaceholderByDomain[activeDomain] || discoveryPlaceholderByDomain.restaurants)
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-tertiary)]">
            <Search size={15} />
          </div>
          <input
            ref={inputRef}
            type="text"
            id="lobby-custom-suggestion"
            aria-label="New candidate suggestion"
            autoComplete="off"
            autoFocus={autoFocus}
            disabled={disabled}
            value={suggestion}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSuggestion(e.target.value);
              setIsOpen(true);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder={effectivePlaceholder}
            className={`w-full text-xs sm:text-sm rounded-xl pl-9.5 pr-8 py-2.5 bg-[var(--bg-inset)] border border-[var(--border-main)] focus:border-[var(--accent-bg)] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors min-h-[42px] ${inputClassName}`}
          />
          {suggestion && (
            <button
              type="button"
              onClick={() => {
                setSuggestion('');
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
              aria-label="Clear input"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          icon={Plus}
          disabled={disabled || !cleanQuery}
          className="h-[42px] px-3.5 rounded-xl font-bold shrink-0"
        >
          {t('customAddBtn') || 'Add'}
        </Button>
      </form>

      {/* Autocomplete Dropdown Popover */}
      {isOpen && !disabled && (suggestions.length > 0 || (cleanQuery && !hasExactMatch)) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-[var(--border-main)] rounded-2xl shadow-xl overflow-hidden max-h-72 flex flex-col animate-popover">
          <div className="p-2 px-3 border-b border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider bg-[var(--bg-inset)]/50">
            <span className="flex items-center gap-1.5">
              {isSearchingLive ? (
                <Loader2 size={11} className="animate-spin text-[var(--accent-bg)]" />
              ) : (
                <Search size={11} className="text-[var(--accent-bg)]" />
              )}
              <span>{isSearchingLive ? (t('searching') || 'Searching...') : cleanQuery ? (t('suggestedMatches') || 'Suggested Matches') : (t('popularIdeas') || 'Popular Ideas')}</span>
            </span>
            <span className="text-[10px] lowercase font-normal">{t('tapToAdd') || 'tap to add'}</span>
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
                      {t('addCustom') || 'Add custom:'} <span className="text-[var(--accent-bg)]">"{cleanQuery}"</span>
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)] truncate block">
                      {t('customCandidate') || 'Custom group choice'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent-bg)]/15 text-[var(--accent-bg)] uppercase">
                  {t('customAddBtn') || 'Add'}
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
