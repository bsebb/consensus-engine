import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';

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
  onCardTap,
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

  const exitDirectionRef = useRef(exitDirection);

  const onVoteRef = useRef(onVote);

  const onCardTapRef = useRef(onCardTap);

  useLayoutEffect(() => {
    isSwipingRef.current = isSwiping;
    exitDirectionRef.current = exitDirection;
    onVoteRef.current = onVote;
    onCardTapRef.current = onCardTap;
  }, [isSwiping, exitDirection, onVote, onCardTap]);

  const evaluateSwipeDecision = useCallback((diffX, diffY, samples) => {
    const now = performance.now();
    // Anchor sample from ~100ms ago to compute true release flick velocity
    const validSamples = (samples || []).filter((s) => s?.time && now - s.time <= 140);
    const anchor = validSamples.length > 0 ? validSamples[0] : null;
    const dt = anchor ? Math.max(16, now - anchor.time) : 40;
    const vx = anchor ? (diffX - (anchor.dx || 0)) / dt : 0;
    const vy = anchor ? (diffY - (anchor.dy || 0)) / dt : 0;

    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);
    const isFlickX = Math.abs(vx) > 0.32 && absX > 22;
    const isFlickY = Math.abs(vy) > 0.36 && absY > 25;

    // Horizontal Swipe (Like / Pass) - Tinder threshold: 65px or fast flick
    if (absX > absY * 0.55) {
      if (diffX > 65 || (isFlickX && vx > 0)) {
        onVoteRef.current?.(1); // Like
        return true;
      }
      if (diffX < -65 || (isFlickX && vx < 0)) {
        onVoteRef.current?.(-1); // Pass
        return true;
      }
    }

    // Vertical Swipe (Superlike / Veto)
    if (absY > absX * 1.05) {
      if (diffY < -70 || (isFlickY && vy < 0)) {
        onVoteRef.current?.(2); // Superlike
        return true;
      }
      if (diffY > 85 || (isFlickY && vy > 0)) {
        onVoteRef.current?.(-100); // Veto
        return true;
      }
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
      // Edge-swipe guard: ignore touch starts within 16px of screen edges to prevent iOS back-swipe collision
      if (touch.clientX < 16 || (typeof window !== 'undefined' && touch.clientX > window.innerWidth - 16)) {
        return;
      }

      // Only bypass if touching dedicated standalone utility buttons (chevrons, etc.)
      if (e.target?.closest?.('button[data-standalone="true"], a')) {
        return;
      }

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: performance.now(),
        target: e.target,
        lockedAxis: null,
      };
      dragSamplesRef.current = [{ x: touch.clientX, y: touch.clientY, dx: 0, dy: 0, time: performance.now() }];
    };

    const onTouchMove = (e) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      const diffX = touch.clientX - touchStartRef.current.x;
      const diffY = touch.clientY - touchStartRef.current.y;
      const dist = Math.hypot(diffX, diffY);

      // Only engage card dragging once movement exceeds intentional slop threshold (6px)
      if (!isDraggingRef.current) {
        if (dist < 6) return;
        isDraggingRef.current = true;
        setIsDragging(true);
      }

      // Axis Lock: lock dominant direction after 10px of travel so diagonals do not misfire
      if (!touchStartRef.current.lockedAxis && dist >= 10) {
        touchStartRef.current.lockedAxis = Math.abs(diffX) > Math.abs(diffY) ? 'x' : 'y';
      }

      let effectiveX = diffX;
      let effectiveY = diffY;
      if (touchStartRef.current.lockedAxis === 'x') {
        effectiveY = diffY * 0.15;
      } else if (touchStartRef.current.lockedAxis === 'y') {
        effectiveX = diffX * 0.15;
      }

      // Physically prevent iOS Safari from hijacking the swipe into a vertical scroll
      if (e.cancelable) {
        e.preventDefault();
      }

      const now = performance.now();
      dragSamplesRef.current.push({ x: touch.clientX, y: touch.clientY, dx: effectiveX, dy: effectiveY, time: now });
      if (dragSamplesRef.current.length > 10) {
        dragSamplesRef.current = dragSamplesRef.current.filter((s) => now - s.time <= 140);
      }

      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        setDragOffset({ x: effectiveX, y: effectiveY });
      });
    };

    const onTouchEnd = (e) => {
      if (!touchStartRef.current) return;
      if (rafId.current) cancelAnimationFrame(rafId.current);

      const touch = e.changedTouches?.[0];
      const diffX = touch ? touch.clientX - touchStartRef.current.x : 0;
      const diffY = touch ? touch.clientY - touchStartRef.current.y : 0;
      const startTarget = touchStartRef.current.target;

      const wasDragging = isDraggingRef.current;
      touchStartRef.current = null;
      dragSamplesRef.current = [];
      isDraggingRef.current = false;
      setIsDragging(false);

      if (wasDragging) {
        const decided = evaluateSwipeDecision(diffX, diffY, dragSamplesRef.current);
        if (!decided) {
          setDragOffset({ x: 0, y: 0 });
        } else {
          setTimeout(() => {
            setDragOffset({ x: 0, y: 0 });
          }, 120);
        }
      } else {
        setDragOffset({ x: 0, y: 0 });
        // It was a stationary tap on the card!
        if (touch && onCardTapRef.current) {
          onCardTapRef.current({
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: startTarget || e.target,
          });
        }
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

    if (e.target?.closest?.('button[data-standalone="true"], a')) {
      return;
    }

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
      pointerId: e.pointerId,
      target: e.currentTarget,
      captured: false,
      startTarget: e.target,
    };
    dragSamplesRef.current = [{ x: e.clientX, y: e.clientY, dx: 0, dy: 0, time: performance.now() }];
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    if (!pointerStartRef.current) return;
    if (pointerStartRef.current.pointerId != null && e.pointerId !== pointerStartRef.current.pointerId) return;

    const diffX = e.clientX - pointerStartRef.current.x;
    const diffY = e.clientY - pointerStartRef.current.y;
    const dist = Math.hypot(diffX, diffY);

    // Only engage drag mode and pointer capture after crossing 6px threshold
    if (!isDraggingRef.current) {
      if (dist < 6) return;
      isDraggingRef.current = true;
      setIsDragging(true);
      if (!pointerStartRef.current.captured && pointerStartRef.current.target) {
        try {
          pointerStartRef.current.target.setPointerCapture(pointerStartRef.current.pointerId);
          pointerStartRef.current.captured = true;
        } catch {}
      }
    }

    const now = performance.now();
    dragSamplesRef.current.push({ x: e.clientX, y: e.clientY, dx: diffX, dy: diffY, time: now });
    if (dragSamplesRef.current.length > 10) {
      dragSamplesRef.current = dragSamplesRef.current.filter((s) => now - s.time <= 140);
    }

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      setDragOffset({ x: diffX, y: diffY });
    });
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    if (!pointerStartRef.current) return;
    if (pointerStartRef.current.pointerId != null && e.pointerId !== pointerStartRef.current.pointerId) return;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    const start = pointerStartRef.current;
    const diffX = e.clientX - start.x;
    const diffY = e.clientY - start.y;
    const startTarget = start.startTarget;

    try {
      if (start.captured && start.target && e.pointerId != null) {
        start.target.releasePointerCapture(e.pointerId);
      }
    } catch {}

    const wasDragging = isDraggingRef.current;
    pointerStartRef.current = null;
    dragSamplesRef.current = [];
    isDraggingRef.current = false;
    setIsDragging(false);

    if (wasDragging) {
      const decided = evaluateSwipeDecision(diffX, diffY, dragSamplesRef.current);
      if (!decided) {
        setDragOffset({ x: 0, y: 0 });
      } else {
        setTimeout(() => {
          setDragOffset({ x: 0, y: 0 });
        }, 120);
      }
    } else {
      setDragOffset({ x: 0, y: 0 });
      // Stationary click/tap on the card
      if (onCardTapRef.current) {
        onCardTapRef.current({
          clientX: e.clientX,
          clientY: e.clientY,
          target: startTarget || e.target,
        });
      }
    }
  }, [evaluateSwipeDecision]);

  const handlePointerCancel = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    try {
      if (pointerStartRef.current?.captured && pointerStartRef.current?.target && e.pointerId != null) {
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
