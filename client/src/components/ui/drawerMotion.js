export function shouldDismissDrawer({ distance, velocity, cancelled = false, threshold = 96, velocityThreshold = 0.5 }) {
  return !cancelled && (distance >= threshold || (distance >= 32 && velocity >= velocityThreshold));
}
