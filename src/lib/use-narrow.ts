'use client';

import { useEffect, useState } from 'react';

/** Below this width the week grid switches to a single day. */
export const NARROW_BREAKPOINT = 720;

/**
 * Tracks whether the viewport is narrow.
 * Starts as false so the server render and the first client render agree,
 * then corrects itself after mount.
 */
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT}px)`);
    setNarrow(query.matches);

    const onChange = (event: MediaQueryListEvent) => setNarrow(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return narrow;
}
