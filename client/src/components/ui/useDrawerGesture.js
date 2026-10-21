import { useRef, useCallback, useEffect } from 'react';
import { triggerHaptic } from '../../utils/haptics';

/**
 * Pro-grade Apple bottom drawer gesture hook.
 * Provides 1:1 hardware pointer drag-to-dismiss tracking with rubber-band resistance,
 * pointer capture, velocity calculations, and authentic Apple spring snap-back physics.
 *
 * @param {{
 *   onClose: () => void,
 *   threshold?: number,
 *   velocityThreshold?: number,
 *   snapBackBezier?: string,
 *   dismissBezier?: string
 * }} config
 */
export function useDrawerGesture({
  onClose,
  threshold = 80,
  velocityThreshold = 0.35,
  snapBackBezier = 'cubic-bezier(0.175, 0.885, 0.32, 1.1)',
  dismissBezier = 'cubic-bezier(0.32, 0.72, 0, 1)',
}) {
  const panelRef = useRef(null);
  const backdropRef = useRef(null);
  const pointerStartRef = useRef(null);
  const pointerHistoryRef = useRef([]);
  const isDraggingRef = useRef(false);

  const startDrag = useCallback((e, immediate = false) => {
    // Only primary button or touch
    if (e.button && e.button !== 0) return;

    // Never initiate drag from interactive controls
    if (
      e.target.closest(
        'button, input, textarea, select, a, [role="button"], [role="tab"], [role="switch"], [role="slider"]'
      )
    ) {
      return;
    }

    // If within a scrolled container, allow native scrolling unless at the very top
    if (!immediate) {
      const scrollable = e.target.closest('.overflow-y-auto, .overflow-auto');
      if (scrollable && scrollable.scrollTop > 0) {
        return;
      }
    }

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Pointer capture might fail if target cannot capture
    }

    pointerStartRef.current = {
      y: e.clientY,
      x: e.clientX,
      target: e.currentTarget,
      pointerId: e.pointerId,
      time: performance.now(),
    };
    pointerHistoryRef.current = [{ y: e.clientY, time: performance.now() }];
    isDraggingRef.current = immediate;

    if (panelRef.current) {
      panelRef.current.style.transition = 'none';
    }
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!pointerStartRef.current) return;

    const deltaY = e.clientY - pointerStartRef.current.y;
    const deltaX = e.clientX - pointerStartRef.current.x;

    // Latch onto downward drag if not already dragging immediately
    if (!isDraggingRef.current) {
      if (deltaY > 6 && Math.abs(deltaY) > Math.abs(deltaX)) {
        // Double check internal scroll is at top
        const scrollable = e.target.closest?.('.overflow-y-auto, .overflow-auto');
        if (scrollable && scrollable.scrollTop > 0) return;

        isDraggingRef.current = true;
        try {
          panelRef.current?.setPointerCapture?.(e.pointerId);
        } catch {
          // Fallback
        }
        if (panelRef.current) {
          panelRef.current.style.transition = 'none';
        }
      } else {
        return;
      }
    }

    const now = performance.now();
    pointerHistoryRef.current.push({ y: e.clientY, time: now });
    if (pointerHistoryRef.current.length > 5) {
      pointerHistoryRef.current.shift();
    }

    // 1:1 hardware translation downward, rubber band upward
    const effectiveY = deltaY > 0 ? deltaY : deltaY * 0.16;
    if (panelRef.current) {
      panelRef.current.style.transform = `translate3d(0, ${effectiveY}px, 0)`;
    }

    if (backdropRef.current) {
      const panelHeight = panelRef.current?.offsetHeight || 420;
      const progress = Math.max(0, Math.min(1, 1 - effectiveY / (panelHeight * 0.85)));
      backdropRef.current.style.opacity = progress.toFixed(3);
    }
  }, []);

  const handlePointerUp = useCallback(
    (e) => {
      if (!pointerStartRef.current) return;

      if (isDraggingRef.current) {
        try {
          pointerStartRef.current.target?.releasePointerCapture?.(pointerStartRef.current.pointerId);
        } catch {}
        try {
          panelRef.current?.releasePointerCapture?.(pointerStartRef.current.pointerId);
        } catch {}

        const deltaY = e.clientY - pointerStartRef.current.y;
        const history = pointerHistoryRef.current;
        let velocity = 0;
        if (history.length >= 2) {
          const recent = history[history.length - 1];
          const older = history[0];
          const dt = recent.time - older.time;
          if (dt > 0) {
            velocity = (recent.y - older.y) / dt;
          }
        }

        const shouldDismiss = deltaY > threshold || (deltaY > 30 && velocity > velocityThreshold);

        if (shouldDismiss) {
          triggerHaptic('selection');
          if (panelRef.current) {
            panelRef.current.style.transition = `transform 220ms ${dismissBezier}, opacity 200ms ease`;
            panelRef.current.style.transform = 'translate3d(0, 105%, 0)';
            panelRef.current.style.opacity = '0';
          }
          if (backdropRef.current) {
            backdropRef.current.style.transition = 'opacity 200ms ease-out';
            backdropRef.current.style.opacity = '0';
          }
          setTimeout(() => {
            onClose();
          }, 210);
        } else {
          // Apple spring snap back
          if (panelRef.current) {
            panelRef.current.style.transition = `transform 320ms ${snapBackBezier}`;
            panelRef.current.style.transform = 'translate3d(0, 0, 0)';
          }
          if (backdropRef.current) {
            backdropRef.current.style.transition = 'opacity 240ms ease-out';
            backdropRef.current.style.opacity = '1';
          }
        }
      }

      isDraggingRef.current = false;
      pointerStartRef.current = null;
      pointerHistoryRef.current = [];
    },
    [onClose, threshold, velocityThreshold, dismissBezier, snapBackBezier]
  );

  return {
    panelRef,
    backdropRef,
    grabberProps: {
      onPointerDown: (e) => startDrag(e, true),
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      style: { touchAction: 'none' },
    },
    containerProps: {
      onPointerDown: (e) => startDrag(e, false),
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  };
}

export default useDrawerGesture;
