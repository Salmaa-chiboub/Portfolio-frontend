import { useRef, useCallback } from "react";

export default function useLongPress(onLongPress: (e?: any) => void, ms = 500) {
  const timer = useRef<number | null>(null);

  const start = useCallback((e?: any) => {
    // prevent default to avoid text selection on long-press
    if (e && e.preventDefault) {
      try { e.preventDefault(); } catch {}
    }
    if (timer.current) return;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      onLongPress(e);
    }, ms) as unknown as number;
  }, [onLongPress, ms]);

  const stop = useCallback((e?: any) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}
