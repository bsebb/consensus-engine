import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';
import Button from '../ui/Button';

export default function JoinPinForm({
  initialPin = '',
  onJoin,
  loading = false,
}) {
  const { t } = useLanguage();
  const [pinDigits, setPinDigits] = useState(() => {
    if (initialPin && /^\d{4}$/.test(initialPin)) {
      return initialPin.split('');
    }
    return ['', '', '', ''];
  });
  const [errorText, setErrorText] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const digitRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Synchronize if initialPin changes
  useEffect(() => {
    if (initialPin && /^\d{4}$/.test(initialPin)) {
      setPinDigits(initialPin.split(''));
    }
  }, [initialPin]);

  // Autofocus first empty digit on mount
  useEffect(() => {
    const emptyIdx = pinDigits.findIndex((d) => !d);
    const targetIdx = emptyIdx === -1 ? 0 : emptyIdx;
    const timer = setTimeout(() => {
      digitRefs[targetIdx]?.current?.focus();
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  const pin = pinDigits.join('');

  const submitCode = async (code) => {
    const target = (code || pin).trim();
    if (target.length === 4 && !loading) {
      setErrorText('');
      const result = await onJoin?.(target);
      if (result && result.success === false) {
        triggerHaptic('veto');
        setIsShaking(true);
        setErrorText(
          result.message ||
          t('roomNotFoundDesc')?.replace('{pin}', target) ||
          `Room #${target} not found`
        );
        setTimeout(() => setIsShaking(false), 450);
      }
    }
  };

  const handleDigitChange = (index, value) => {
    if (errorText) setErrorText('');
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);

    if (digit) {
      triggerHaptic('tap');
      if (index < 3) {
        digitRefs[index + 1]?.current?.focus();
      }
      if (newDigits.every(Boolean)) {
        const fullPin = newDigits.join('');
        setTimeout(() => submitCode(fullPin), 80);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (errorText) setErrorText('');
    if (e.key === 'Backspace') {
      if (!pinDigits[index] && index > 0) {
        e.preventDefault();
        const newDigits = [...pinDigits];
        newDigits[index - 1] = '';
        setPinDigits(newDigits);
        digitRefs[index - 1]?.current?.focus();
      } else if (pinDigits[index]) {
        e.preventDefault();
        const newDigits = [...pinDigits];
        newDigits[index] = '';
        setPinDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      digitRefs[index - 1]?.current?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault();
      digitRefs[index + 1]?.current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    if (errorText) setErrorText('');
    const raw = e.clipboardData?.getData('text') || '';
    const cleaned = raw.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length > 0) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < cleaned.length; i++) {
        newDigits[i] = cleaned[i];
      }
      setPinDigits(newDigits);
      triggerHaptic('tap');

      if (cleaned.length === 4) {
        digitRefs[3]?.current?.focus();
        setTimeout(() => submitCode(cleaned), 80);
      } else {
        digitRefs[Math.min(cleaned.length, 3)]?.current?.focus();
      }
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitCode();
      }}
      onPaste={handlePaste}
      className="flex flex-col gap-4 animate-[fadeIn_0.2s_ease-out]"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            {t('roomCodeLabel')}
          </label>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {t('roomCodeHint')}
          </span>
        </div>

        {/* 4 PIN Input Boxes with Global Form Paste */}
        <div className={`grid grid-cols-4 gap-2.5 transition-transform ${isShaking ? 'animate-shake' : ''}`}>
          {pinDigits.map((digit, index) => (
            <input
              key={index}
              ref={digitRefs[index]}
              type="text"
              aria-label={`Room code digit ${index + 1} of 4`}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-full h-14 text-center font-bold text-2xl rounded-2xl border transition-all duration-150 outline-none select-all tabular-nums touch-manipulation ${
                errorText
                  ? 'border-rose-500/50 bg-rose-500/5 text-rose-500 focus:border-rose-500'
                  : digit
                  ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/10 text-[var(--accent-bg)]'
                  : 'border-[var(--border-main)] bg-[var(--bg-inset)] text-[var(--text-primary)] focus:border-[var(--accent-bg)]'
              }`}
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {errorText && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium animate-scale-up">
          <AlertCircle size={15} className="shrink-0 text-rose-500" />
          <span className="truncate">{errorText}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={pin.length !== 4 || loading}
        loading={loading}
        icon={ArrowRight}
        className="w-full h-12 rounded-2xl font-bold text-base shadow-[0_6px_20px_var(--accent-glow)] mt-1 touch-manipulation"
      >
        {t('joinRoomBtn')}
      </Button>
    </form>
  );
}
