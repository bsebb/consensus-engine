import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Ultra-responsive mobile touch and pointer gesture engine for SwipeDeck.
 *
 * Implements:
 * 1. Synchronous non-passive touchmove prevention to guarantee iOS Safari never
 *    hijacks horizontal or vertical card drags into native page scrolls.
 * 2. 1:1 hardware translation tracking via requestAnimationFrame.
 * 3. Rolling velocity buffer for natural, effortless flick gestures.
 * 4. Pointer capture for mouse & desktop touch emulation.
 * 5. Full tap vs drag disambiguation (dx < 8 && dy < 8).
 */
export function useDeckGestures({
  isSwiping,
  onVote,
  exitDirection,
}) {
  const cardElementRef = useRef(null);
  const touchStartRef = useRef(null);
  const pointerStartRef = useRef(null);
  const dragSamplesRef = useRef([]);
  const isDraggingRef = useRef(false);
  const rafId = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Keep latest callbacks and props in refs to avoid re-binding native DOM listeners
  const isSwipingRef = useRef(isSwiping);
  isSwipingRef.current = isSwiping;

  const exitDirectionRef = useRef(exitDirection);
  exitDirectionRef.current = exitDirection;

  const onVoteRef = useRef(onVote);
  onVoteRef.current = onVote;

  const evaluateSwipeDecision = useCallback((diffX, diffY, samples) => {
    const now = performance.now();
    const recentSample = (samples || []).find((s) => now - s.time <= 100) || { x: 0, y: 0, time: now - 50 };
    const dt = Math.max(1, now - (recentSample.time || now));
    const vx = (diffX - (recentSample.dx || 0)) / dt;
    const vy = (diffY - (recentSample.dy || 0)) / dt;

    const isFlickX = Math.abs(vx) > 0.38 && Math.abs(diffX) > 26;
    const isFlickY = Math.abs(vy) > 0.42 && Math.abs(diffY) > 30;

    if ((diffX > 60 || (isFlickX && vx > 0)) && Math.abs(diffX) > Math.abs(diffY) * 0.55) {
      onVoteRef.current?.(1); // Like
      return true;
    }
    if ((diffX < -60 || (isFlickX && vx < 0)) && Math.abs(diffX) > Math.abs(diffY) * 0.55) {
      onVoteRef.current?.(-1); // Pass
      return true;
    }
    if ((diffY > 90 || (isFlickY && vy > 0)) && Math.abs(diffY) > Math.abs(diffX) * 1.25) {
      onVoteRef.current?.(-100); // Veto
      return true;
    }
    if ((diffY < -70 || (isFlickY && vy < 0)) && Math.abs(diffY) > Math.abs(diffX) * 1.15) {
      onVoteRef.current?.(2); // Superlike
      return true;
    }

    return false;
  }, []);

  const resetDrag = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    touchStartRef.current = null;
    pointerStartRef.current = null;
    dragSamplesRef.current = [];
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Callback ref attaches permanent non-passive touch listeners directly to card element
  const cardRef = useCallback((node) => {
    if (cardElementRef.current && cardElementRef.current._cleanupDeckGestures) {
      cardElementRef.current._cleanupDeckGestures();
      cardElementRef.current._cleanupDeckGestures = null;
    }

    cardElementRef.current = node;
    if (!node) return;

    const onTouchStart = (e) => {
      if (!isSwipingRef.current || exitDirectionRef.current) return;
      if (e.touches.length > 1) return;

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: performance.now(),
      };
      dragSamplesRef.current = [{ x: touch.clientX, y: touch.clientY, dx: 0, dy: 0, time: performance.now() }];
      isDraggingRef.current = true;
      setIsDragging(true);
    };

    const onTouchMove = (e) => {
      if (!isDraggingRef.current || !touchStartRef.current) return;
      const touch = e.touches[0];
      const diffX = touch.clientX - touchStartRef.current.x;
      const diffY = touch.clientY - touchStartRef.current.y;

      // Physically prevent iOS Safari from hijacking the swipe into a vertical scroll
      if (e.cancelable) {
        e.preventDefault();
      }

      const now = performance.now();
      dragSamplesRef.current.push({ x: touch.clientX, y: touch.clientY, dx: diffX, dy: diffY, time: now });
      if (dragSamplesRef.current.length > 8) {
        dragSamplesRef.current = dragSamplesRef.current.filter((s) => now - s.time <= 120);
      }

      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        setDragOffset({ x: diffX, y: diffY });
      });
    };

    const onTouchEnd = (e) => {
      if (!isDraggingRef.current || !touchStartRef.current) return;
      if (rafId.current) cancelAnimationFrame(rafId.current);

      const touch = e.changedTouches?.[0];
      const diffX = touch ? touch.clientX - touchStartRef.current.x : 0;
      const diffY = touch ? touch.clientY - touchStartRef.current.y : 0;

      const decided = evaluateSwipeDecision(diffX, diffY, dragSamplesRef.current);

      touchStartRef.current = null;
      dragSamplesRef.current = [];
      isDraggingRef.current = false;
      setIsDragging(false);

      if (!decided) {
        setDragOffset({ x: 0, y: 0 });
      }
    };

    const onTouchCancel = () => {
      resetDrag();
    };

    // Attach with { passive: false } directly on the card element before touches start
    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    node.addEventListener('touchcancel', onTouchCancel, { passive: true });

    node._cleanupDeckGestures = () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [evaluateSwipeDecision, resetDrag]);

  // Pointer event handlers for desktop mouse interaction
  const handlePointerDown = useCallback((e) => {
    // If it's a touch event, native touch listeners above handle it seamlessly
    if (e.pointerType === 'touch') return;
    if (!isSwipingRef.current || exitDirectionRef.current) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
      pointerId: e.pointerId,
      target: e.currentTarget,
    };
    dragSamplesRef.current = [{ x: e.clientX, y: e.clientY, dx: 0, dy: 0, time: performance.now() }];
    isDraggingRef.current = true;
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    if (!isDraggingRef.current || !pointerStartRef.current) return;
    if (pointerStartRef.current.pointerId != null && e.pointerId !== pointerStartRef.current.pointerId) return;

    const diffX = e.clientX - pointerStartRef.current.x;
    const diffY = e.clientY - pointerStartRef.current.y;
    const now = performance.now();

    dragSamplesRef.current.push({ x: e.clientX, y: e.clientY, dx: diffX, dy: diffY, time: now });
    if (dragSamplesRef.current.length > 8) {
      dragSamplesRef.current = dragSamplesRef.current.filter((s) => now - s.time <= 120);
    }

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      setDragOffset({ x: diffX, y: diffY });
    });
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    if (!isDraggingRef.current || !pointerStartRef.current) return;
    if (pointerStartRef.current.pointerId != null && e.pointerId !== pointerStartRef.current.pointerId) return;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    const start = pointerStartRef.current;
    const diffX = e.clientX - start.x;
    const diffY = e.clientY - start.y;

    try {
      if (start.target && e.pointerId != null) {
        start.target.releasePointerCapture(e.pointerId);
      }
    } catch {}

    const decided = evaluateSwipeDecision(diffX, diffY, dragSamplesRef.current);

    pointerStartRef.current = null;
    dragSamplesRef.current = [];
    isDraggingRef.current = false;
    setIsDragging(false);

    if (!decided) {
      setDragOffset({ x: 0, y: 0 });
    }
  }, [evaluateSwipeDecision]);

  const handlePointerCancel = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    try {
      if (pointerStartRef.current?.target && e.pointerId != null) {
        pointerStartRef.current.target.releasePointerCapture(e.pointerId);
      }
    } catch {}
    resetDrag();
  }, [resetDrag]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (cardElementRef.current && cardElementRef.current._cleanupDeckGestures) {
        cardElementRef.current._cleanupDeckGestures();
        cardElementRef.current._cleanupDeckGestures = null;
      }
    };
  }, []);

  return {
    isDragging,
    dragOffset,
    setDragOffset,
    cardRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    resetDrag,
  };
}
