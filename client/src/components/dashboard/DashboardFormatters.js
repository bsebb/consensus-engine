import {
  ThumbsUp,
  Star,
  X,
  Ban,
  Minus,
} from 'lucide-react';

export const number = (n) => new Intl.NumberFormat('en').format(n || 0);

export const percent = (n, d) => (d ? Math.round((n / d) * 100) : 0);

export const duration = (minutes) =>
  minutes == null
    ? '-'
    : minutes >= 1440
      ? `${Math.round(minutes / 144) / 10}d`
      : minutes >= 60
        ? `${Math.round(minutes / 6) / 10}h`
        : `${minutes}m`;

export const date = (value) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const phaseNames = {
  setup: 'In the lobby',
  voting: 'Voting',
  completed: 'Completed',
  inactive: 'Inactive',
  legacy: 'Older room',
};

export const actions = [
  { key: 'likes', label: 'Likes', Icon: ThumbsUp, color: 'var(--c-like)' },
  { key: 'supers', label: 'Super likes', Icon: Star, color: 'var(--c-super)' },
  { key: 'passes', label: 'Passes', Icon: X, color: 'var(--c-pass)' },
  { key: 'vetoes', label: 'Vetoes', Icon: Ban, color: 'var(--c-veto)' },
  {
    key: 'unseen',
    label: 'Unrated',
    Icon: Minus,
    color: 'var(--text-tertiary)',
  },
];
