import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../utils/api';

const insightsMemoryCache = new Map();

export function invalidateClientVenueInsights(venueName) {
  if (venueName) {
    insightsMemoryCache.delete(String(venueName).toLowerCase().trim());
  } else {
    insightsMemoryCache.clear();
  }
}

function getLocalReviewsForVenue(venueName) {
  if (!venueName || typeof localStorage === 'undefined') return [];
  try {
    const clean = String(venueName).toLowerCase().trim();
    const stored = JSON.parse(localStorage.getItem('consensus_feedbacks') || '[]');
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((r) => {
        const target = String(r.winner_name || r.option_name || '').toLowerCase().trim();
        return target === clean;
      })
      .map((r, i) => ({
        id: `local_${i}_${r.created_at || ''}`,
        satisfactionScore: Number(r.satisfaction_score) || 5,
        priceAccuracyScore: Number(r.price_accuracy_score) || 5,
        comment: r.comment || null,
        createdAt: r.created_at || new Date().toISOString(),
        isLocal: true,
      }));
  } catch {
    return [];
  }
}

export function useVenueInsights(venueName, refreshKey = 0) {
  const [insights, setInsights] = useState(() => {
    if (!venueName) return null;
    const key = String(venueName).toLowerCase().trim();
    return insightsMemoryCache.get(key) || null;
  });

  const fetchInsights = useCallback(async (force = false) => {
    const clean = String(venueName || '').trim();
    if (!clean) {
      setInsights(null);
      return;
    }
    const key = clean.toLowerCase();
    if (!force && insightsMemoryCache.has(key)) {
      setInsights(insightsMemoryCache.get(key));
    }

    const localReviews = getLocalReviewsForVenue(clean);

    try {
      const res = await fetch(apiUrl(`/api/v1/venues/insights?name=${encodeURIComponent(clean)}`));
      const data = res.ok ? await res.json() : null;
      if (data && data.found) {
        const remoteReviews = Array.isArray(data.recentReviews) ? data.recentReviews : [];
        const mergedComments = [...remoteReviews];
        for (const lr of localReviews) {
          const alreadyPresent = mergedComments.some(
            (rr) =>
              (lr.comment && rr.comment && lr.comment.trim() === rr.comment.trim()) ||
              (!lr.comment && !rr.comment && Number(rr.satisfactionScore) === Number(lr.satisfactionScore))
          );
          if (!alreadyPresent) {
            mergedComments.unshift(lr);
          }
        }
        const resolved = {
          found: true,
          totalReviews: Math.max(data.totalReviews || 0, mergedComments.length),
          satisfactionAvg: data.satisfactionAvg || 5,
          priceAccuracyAvg: data.priceAccuracyAvg || 5,
          recentReviews: mergedComments.slice(0, 5),
        };
        insightsMemoryCache.set(key, resolved);
        setInsights(resolved);
        return;
      }
    } catch {
      // Fallback to local reviews if offline
    }

    if (localReviews.length > 0) {
      const satAvg = Number(
        (localReviews.reduce((acc, r) => acc + r.satisfactionScore, 0) / localReviews.length).toFixed(1)
      );
      const priceAvg = Number(
        (localReviews.reduce((acc, r) => acc + r.priceAccuracyScore, 0) / localReviews.length).toFixed(1)
      );
      const fallback = {
        found: true,
        totalReviews: localReviews.length,
        satisfactionAvg: satAvg,
        priceAccuracyAvg: priceAvg,
        recentReviews: localReviews.slice(0, 5),
      };
      insightsMemoryCache.set(key, fallback);
      setInsights(fallback);
    } else {
      setInsights({ found: false, totalReviews: 0, recentReviews: [] });
    }
  }, [venueName]);

  useEffect(() => {
    fetchInsights(refreshKey > 0);
  }, [fetchInsights, refreshKey]);

  return { insights, refreshInsights: () => fetchInsights(true) };
}
