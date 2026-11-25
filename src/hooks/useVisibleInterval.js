import { useEffect, useRef } from 'react';

/**
 * setInterval that only runs while the browser tab is visible.
 *
 * Background tabs used to keep re-fetching full datasets (employees, attendance, leaves…)
 * every few seconds, burning API capacity and client CPU for nobody. While the tab is
 * hidden the timer is paused; when it becomes visible again the callback runs right away
 * (so data is fresh immediately) and the normal interval resumes.
 *
 * @param {Function} callback  - called on every tick (always the latest version)
 * @param {number|null} delay  - interval in ms; null disables the timer
 */
export function useVisibleInterval(callback, delay) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay == null || typeof document === 'undefined') return undefined;

    let intervalId = null;
    const tick = () => savedCallback.current();
    const start = () => {
      if (intervalId === null) intervalId = setInterval(tick, delay);
    };
    const stop = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [delay]);
}

export default useVisibleInterval;
