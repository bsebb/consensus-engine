import { useRef, useEffect } from 'react';
import { triggerHaptic } from '../../utils/haptics';
import { shouldDismissDrawer } from './drawerMotion';

const INTERACTIVE = 'button, input, textarea, select, a, [role="button"], [role="tab"], [role="switch"], [role="slider"]';

/** Native touch handling lets a downward pull take over only at the scroll boundary.
 * Horizontal photo swipes, form controls and ordinary content scrolling stay native.
 */
export function useDrawerGesture({ onClose, isOpen = true, isClosing = false, threshold = 96, velocityThreshold = 0.5 }) {
  const panelRef = useRef(null);
  const backdropRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // A button/Escape close after a cancelled pull still uses the original exit animation.
  useEffect(() => {
    if (!isClosing) return;
    if (panelRef.current) {
      for (const key of ['animation', 'transition', 'transform', 'willChange']) panelRef.current.style[key] = '';
    }
    if (backdropRef.current) {
      for (const key of ['backgroundColor', 'backdropFilter', 'webkitBackdropFilter', 'transition']) backdropRef.current.style[key] = '';
    }
  }, [isClosing]);

  useEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!isOpen || !panel) return;
    let gesture = null;
    let closing = false;
    let suppressClick = false;
    let timer;
    let clickTimer;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resetStyles = () => {
      for (const key of ['animation', 'transition', 'transform', 'willChange']) panel.style[key] = '';
      if (backdrop) {
        for (const key of ['backgroundColor', 'backdropFilter', 'webkitBackdropFilter', 'transition']) backdrop.style[key] = '';
      }
    };
    resetStyles();

    const scrollParent = (target) => {
      for (let el = target; el && el !== panel; el = el.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight) return el;
      }
      return null;
    };
    const begin = (point, target, pointerId = null) => {
      if (closing || target.closest(INTERACTIVE)) return;
      const scroller = scrollParent(target);
      if (scroller?.scrollTop > 0) return;
      gesture = {
        x: point.clientX, y: point.clientY, dy: 0, scroller, pointerId,
        active: false, samples: [{ y: point.clientY, time: performance.now() }],
      };
    };
    const move = (point, event) => {
      if (!gesture) return;
      const dx = point.clientX - gesture.x;
      const dy = point.clientY - gesture.y;
      if (!gesture.active) {
        if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
        // Lock the direction once. Scrolling up or browsing photos never dismisses.
        if (dy <= 0 || Math.abs(dx) >= dy || gesture.scroller?.scrollTop > 0) {
          gesture = null;
          return;
        }
        if (!event.cancelable) { gesture = null; return; }
        gesture.active = true;
        panel.style.animation = 'none'; // Entry keyframes must not override finger tracking.
        panel.style.transition = 'none';
        panel.style.willChange = 'transform';
        if (gesture.pointerId != null) panel.setPointerCapture?.(gesture.pointerId);
      }
      if (event.cancelable) event.preventDefault();
      gesture.dy = Math.max(0, dy);
      const now = performance.now();
      gesture.samples.push({ y: point.clientY, time: now });
      gesture.samples = gesture.samples.filter(sample => now - sample.time <= 100);
      panel.style.transform = `translate3d(0, ${gesture.dy}px, 0)`;
      if (backdrop) {
        const progress = Math.min(1, gesture.dy / panel.offsetHeight);
        backdrop.style.transition = 'none';
        backdrop.style.backgroundColor = `rgba(0, 0, 0, ${0.6 * (1 - progress)})`;
        backdrop.style.backdropFilter = `blur(${24 * (1 - progress)}px)`;
        backdrop.style.webkitBackdropFilter = backdrop.style.backdropFilter;
      }
    };
    const finish = (point, cancelled = false) => {
      if (!gesture) return;
      const current = gesture;
      gesture = null;
      if (current.pointerId != null && panel.hasPointerCapture?.(current.pointerId)) panel.releasePointerCapture(current.pointerId);
      if (!current.active) return;
      suppressClick = true;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { suppressClick = false; }, 400);
      const now = performance.now();
      const sample = current.samples.find(item => now - item.time <= 100);
      const velocity = sample && now > sample.time ? (point.clientY - sample.y) / (now - sample.time) : 0;
      const dismiss = shouldDismissDrawer({ distance: current.dy, velocity, cancelled, threshold, velocityThreshold });
      panel.style.transition = reduced ? 'none' : `transform ${dismiss ? 220 : 320}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      panel.style.transform = dismiss ? 'translate3d(0, 110%, 0)' : 'translate3d(0, 0, 0)';
      if (backdrop) {
        backdrop.style.transition = reduced ? 'none' : 'background-color 220ms ease, backdrop-filter 220ms ease';
        backdrop.style.backgroundColor = dismiss ? 'rgba(0,0,0,0)' : '';
        backdrop.style.backdropFilter = dismiss ? 'blur(0px)' : '';
        backdrop.style.webkitBackdropFilter = backdrop.style.backdropFilter;
      }
      if (dismiss) {
        closing = true;
        triggerHaptic('selection');
        timer = setTimeout(() => onCloseRef.current?.(), reduced ? 0 : 220);
      }
    };
    const touchStart = event => {
      if (event.touches.length !== 1) {
        if (gesture) finish({ clientY: gesture.y + gesture.dy }, true);
        return;
      }
      begin(event.touches[0], event.target);
    };
    const touchMove = event => { if (event.touches.length === 1) move(event.touches[0], event); };
    const touchEnd = event => { if (event.changedTouches[0]) finish(event.changedTouches[0], event.type === 'touchcancel'); };
    const pointerDown = event => {
      if (event.pointerType !== 'touch' && event.button === 0) begin(event, event.target, event.pointerId);
    };
    const pointerMove = event => { if (event.pointerType !== 'touch') move(event, event); };
    const pointerEnd = event => { if (event.pointerType !== 'touch') finish(event, event.type === 'pointercancel'); };
    const click = event => {
      if (suppressClick || closing) { event.preventDefault(); event.stopPropagation(); }
    };
    const listeners = [
      ['touchstart', touchStart, { passive: true }],
      ['touchmove', touchMove, { passive: false }],
      ['touchend', touchEnd], ['touchcancel', touchEnd],
      ['pointerdown', pointerDown], ['pointermove', pointerMove],
      ['pointerup', pointerEnd], ['pointercancel', pointerEnd], ['click', click, true],
    ];
    listeners.forEach(([name, handler, options]) => panel.addEventListener(name, handler, options));
    return () => {
      clearTimeout(timer);
      clearTimeout(clickTimer);
      listeners.forEach(([name, handler, options]) => panel.removeEventListener(name, handler, options));
      resetStyles();
    };
  }, [isOpen, threshold, velocityThreshold]);

  return {
    panelRef,
    backdropRef,
    grabberProps: { 'data-drawer-handle': true, style: { touchAction: 'none' } },
    containerProps: { 'data-drawer-panel': true },
  };
}

export default useDrawerGesture;
