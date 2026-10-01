import React, { useState } from 'react';
import { Star, X, CheckCircle2, MessageSquare, ThumbsUp } from 'lucide-react';
import Button from './Button';

export default function ReviewModal({
  isOpen = false,
  onClose,
  pin,
  winnerName,
  optionId,
  participantId,
}) {
  const [satisfaction, setSatisfaction] = useState(5);
  const [priceAccuracy, setPriceAccuracy] = useState(4);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const feedbackPayload = {
      participant_id: participantId,
      option_id: optionId || 'local-option',
      satisfaction_score: Number(satisfaction),
      price_accuracy_score: Number(priceAccuracy),
    };

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

    // Try posting to backend
    try {
      await fetch(`/api/v1/rooms/${pin}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackPayload),
      });
    } catch (err) {
      console.info('[ReviewModal] Backend feedback endpoint offline, saved locally');
    }

    setLoading(false);
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/45 dark:bg-black/70 backdrop-blur-md animate-[fadeBackdrop_0.25s_ease-out]"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md liquid-glass rounded-3xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.35)] border border-[var(--border-glass)] animate-[modalSpring_0.35s_var(--spring-smooth)] z-10 select-none">
        
        {/* Apple HIG 3-Column Modal Header */}
        <div className="grid grid-cols-[60px_1fr_60px] items-center pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div />
          <h3 className="text-base font-semibold text-center text-[var(--ios-label)] tracking-tight">
            Session Feedback
          </h3>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[rgba(52,199,89,0.15)] flex items-center justify-center text-[var(--semantic-success)]">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-lg font-semibold text-[var(--ios-label)]">Thank You!</h4>
            <p className="text-sm text-[var(--ios-secondary-label)] max-w-xs">
              Your feedback on <strong className="text-[var(--ios-label)]">{winnerName}</strong> has been recorded to calibrate future recommendations.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ios-secondary-label)] mb-1">
                Consensus Winner
              </p>
              <p className="text-base font-bold text-[var(--ios-label)]">
                {winnerName || 'Group Consensus Option'}
              </p>
            </div>

            {/* Satisfaction Rating */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-[var(--ios-secondary-label)]">
                Overall Satisfaction
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
                          ? 'fill-[var(--semantic-warning)] text-[var(--semantic-warning)]'
                          : 'text-[var(--ios-tertiary-label)]'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Price Accuracy Rating */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-[var(--ios-secondary-label)]">
                Did the budget match your expectation?
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
                          ? 'fill-[var(--semantic-info)] text-[var(--semantic-info)]'
                          : 'text-[var(--ios-tertiary-label)]'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Area */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="review-comment" className="text-xs font-medium text-[var(--ios-secondary-label)]">
                Notes or Recommendations (Optional)
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Atmosphere, food quality, or venue notes..."
                className="w-full text-sm rounded-xl p-3 bg-black/[0.03] dark:bg-white/[0.05] border border-[var(--border-main)] focus:border-[var(--accent-bg)] focus:ring-2 focus:ring-[var(--accent-glow-focus)] outline-none text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
                className="flex-1"
              >
                Skip
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                icon={ThumbsUp}
                className="flex-1"
              >
                Submit Feedback
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
