import React, { useState } from 'react';
import { Star, X, CheckCircle2, ThumbsUp } from 'lucide-react';
import Button from './Button';
import { apiUrl } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';
import { invalidateClientVenueInsights } from '../../hooks/useVenueInsights';

export default function ReviewModal({
  isOpen = false,
  onClose,
  onSubmitted,
  pin,
  winnerName,
  optionId,
  participantId,
  deviceId,
}) {
  const { t } = useLanguage();
  const [satisfaction, setSatisfaction] = useState(5);
  const [priceAccuracy, setPriceAccuracy] = useState(4);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const feedbackPayload = {
      participant_id: participantId || 'anon_user',
      device_id: deviceId || undefined,
      option_id: optionId || 'local-option',
      option_name: winnerName || 'Consensus Pick',
      satisfaction_score: Number(satisfaction),
      price_accuracy_score: Number(priceAccuracy),
      comment: comment.trim() || undefined,
    };

    // Try posting to backend
    try {
      const response = await fetch(apiUrl(`/api/v1/rooms/${pin}/feedback`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackPayload),
      });
      if (!response.ok) throw new Error('Feedback was not saved');
    } catch {
      setError('Your review was not saved. Please check your connection and try again.');
      setLoading(false);
      return;
    }

    // Save locally including comment and winner name
    try {
      const stored = JSON.parse(localStorage.getItem('consensus_feedbacks') || '[]');
      stored.unshift({
        ...feedbackPayload,
        winner_name: winnerName,
        comment: comment.trim(),
        pin,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('consensus_feedbacks', JSON.stringify(stored.slice(0, 50)));
    } catch (err) {
      console.warn('[ReviewModal] LocalStorage error:', err);
    }



    invalidateClientVenueInsights(winnerName);
    setLoading(false);
    setSubmitted(true);
    if (onSubmitted) {
      onSubmitted(Number(satisfaction), Number(priceAccuracy), comment.trim());
    }
    setTimeout(() => {
      handleClose();
    }, 1800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Session Feedback"
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 modal-backdrop-ios ${
          isClosing ? 'animate-fade-out' : 'animate-fade-in'
        }`}
      />

      {/* Modal Container */}
      <div
        className={`relative w-full max-w-md glass-surface rounded-2xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.35)] border border-[var(--border-glass)] z-10 select-none ${
          isClosing ? 'animate-scale-down' : 'animate-modal-spring'
        }`}
      >
        
        {/* Header */}
        <div className="grid grid-cols-[40px_1fr_40px] items-center pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div />
          <h3 className="text-base font-semibold text-center text-[var(--text-primary)] tracking-tight">
            {t('sessionFeedback')}
          </h3>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[rgba(16,185,129,0.15)] flex items-center justify-center text-[var(--status-success)]">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-lg font-semibold text-[var(--text-primary)]">{t('thankYou')}</h4>
            <p className="text-sm text-[var(--text-secondary)] max-w-xs">
              {t('feedbackSavedDesc').replace('{name}', winnerName || 'Consensus Option')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                {t('consensusWinner')}
              </p>
              <p className="text-base font-bold text-[var(--text-primary)]">
                {winnerName || 'Group Consensus Option'}
              </p>
            </div>

            {/* Satisfaction Rating */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {t('overallSatisfaction')}
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSatisfaction(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-115 active:scale-95"
                    aria-label={`${star} of 5 stars`}
                  >
                    <Star
                      size={26}
                      className={
                        star <= satisfaction
                          ? 'fill-[var(--status-warning)] text-[var(--status-warning)]'
                          : 'text-[var(--text-tertiary)]'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Price Accuracy Rating */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {t('budgetMatchedQuestion')}
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setPriceAccuracy(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-115 active:scale-95"
                    aria-label={`Price accuracy ${star} of 5`}
                  >
                    <Star
                      size={22}
                      className={
                        star <= priceAccuracy
                          ? 'fill-[var(--status-info)] text-[var(--status-info)]'
                          : 'text-[var(--text-tertiary)]'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Area */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="review-comment" className="text-xs font-medium text-[var(--text-secondary)]">
                {t('notesOrRecommendations')}
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={t('notesPlaceholder')}
                className="w-full text-sm rounded-xl p-3 bg-[var(--bg-inset)] border border-[var(--border-main)] focus:border-[var(--accent-bg)] focus:ring-2 focus:ring-[var(--accent-glow-focus)] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={handleClose}
                className="flex-1"
              >
                {t('skip')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                icon={ThumbsUp}
                className="flex-1"
              >
                {t('submitFeedbackAction')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
