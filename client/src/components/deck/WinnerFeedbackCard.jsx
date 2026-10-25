import React from 'react';
import { Database, CheckCircle2, Star, Send, MessageSquarePlus, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatRegionalPricePill } from '../../utils/regionFormat';
import { triggerHaptic } from '../../utils/haptics';
import { useVenueInsights } from '../../hooks/useVenueInsights';

export default function WinnerFeedbackCard({
  isCustomWinner = false,
  winner,
  satisfactionScore = 0,
  priceAccuracyScore = 0,
  telemetrySubmitted = false,
  isSubmittingTelemetry = false,
  handleSelectSatisfaction,
  setPriceAccuracyScore,
  handleSubmitTelemetry,
  setIsReviewOpen,
  insightsRefreshKey = 0,
}) {
  const { t } = useLanguage();
  const { insights } = useVenueInsights(winner?.name, insightsRefreshKey);

  return (
    <details open className="group w-full shrink-0 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] shadow-sm p-4 flex flex-col gap-3.5 text-left relative overflow-hidden">
      <summary className="flex items-start justify-between gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[var(--accent-bg)] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Database size={17} />
          </div>
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-[var(--accent-bg)]">
                {t('communityDataTitle')}
              </span>
              {insights?.found && insights.totalReviews > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tabular-nums">
                  ★ {insights.satisfactionAvg}/5 ({insights.totalReviews})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                  {t('quickRating')}
                </span>
              )}
            </div>
            <h3 className="text-sm font-black text-[var(--text-primary)] mt-0.5">
              {isCustomWinner
                ? `${t('rateSpotTitle').split('&')[0].trim().replace('{name}', `"${winner?.name || ''}"`)}`
                : t('rateSpotTitle').replace('{name}', winner?.name || '')}
            </h3>
          </div>
        </div>
        <ChevronDown size={18} className="shrink-0 mt-2 text-[var(--text-tertiary)] transition-transform group-open:rotate-180" />
      </summary>

      <div className="flex flex-col gap-3.5 pt-3.5">
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        {isCustomWinner ? t('customFeedbackDesc') : t('rateSpotDesc')}
      </p>

      {telemetrySubmitted ? (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {isCustomWinner
                  ? `${t('feedbackSaved')} (${satisfactionScore || 5}/5)`
                  : `${t('feedbackSaved')} (${satisfactionScore || 5}/5 • ${priceAccuracyScore || 5}/5)`}
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                {t('thanksFeedback')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)] cursor-pointer"
          >
            {t('fullForm')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* Metric 1: Group Decision Satisfaction */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {isCustomWinner ? t('groupPickSatisfaction') : `1. ${t('groupPickSatisfaction')}`}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                {isCustomWinner ? t('customFeedbackDesc') : t('fitsGroupQuestion')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleSelectSatisfaction(star)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  aria-label={`Rate satisfaction ${star} stars`}
                >
                  <Star
                    size={19}
                    className={star <= satisfactionScore ? 'fill-amber-400 text-amber-400' : 'text-[var(--text-tertiary)]'}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Metric 2: Price Tier Accuracy (Discovery Places Only) */}
          {!isCustomWinner && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  2. {t('priceAccuracy')} ({formatRegionalPricePill(winner?.price_level || 2, winner)})
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {t('spendAccurateQuestion')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setPriceAccuracyScore(star);
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    aria-label={`Rate price accuracy ${star} stars`}
                  >
                    <Star
                      size={19}
                      className={star <= priceAccuracyScore ? 'fill-emerald-400 text-emerald-400' : 'text-[var(--text-tertiary)]'}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isSubmittingTelemetry}
              onClick={handleSubmitTelemetry}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-hover)] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_6px_20px_var(--accent-glow)] transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60"
            >
              <Send size={14} />
              <span>
                {isSubmittingTelemetry
                  ? t('savingFeedback')
                  : satisfactionScore > 0
                  ? t('submitFeedback')
                  : t('quickSubmit5')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsReviewOpen(true)}
              className="py-3.5 px-3.5 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-main)] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]"
              title="Open Detailed Feedback Form"
            >
              <MessageSquarePlus size={15} />
              <span>{t('fullForm')}</span>
            </button>
          </div>
        </div>
      )}

      {insights?.found && insights.recentReviews?.some((r) => r.comment) && (
        <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Recent Voter Notes
          </span>
          {insights.recentReviews
            .filter((r) => r.comment)
            .slice(0, 3)
            .map((rev) => (
              <div
                key={rev.id}
                className="p-2.5 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex items-start justify-between gap-2 text-xs"
              >
                <p className="text-xs text-[var(--text-primary)] font-medium leading-snug">
                  "{rev.comment}"
                </p>
                <span className="text-[11px] font-bold text-amber-500 shrink-0 tabular-nums">
                  ★ {rev.satisfactionScore}/5
                </span>
              </div>
            ))}
        </div>
      )}
      </div>
    </details>
  );
}
