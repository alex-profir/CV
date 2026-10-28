// Batches pointer moves to one dispatch per animation frame (005 research
// R8): the latest move of a frame wins.
import { useEffect, useRef } from 'react';

export function useFrameBatch(): (run: () => void) => void {
  const pending = useRef<(() => void) | null>(null);
  const frame = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return (run) => {
    pending.current = run;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const next = pending.current;
      pending.current = null;
      next?.();
    });
  };
}
