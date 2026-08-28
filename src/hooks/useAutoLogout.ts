import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseAutoLogoutOptions {
  /** Inactivity timeout in milliseconds (default: 15 minutes = 900,000 ms) */
  timeoutMs?: number;
  /** Warning duration before timeout in milliseconds (default: 60 seconds = 60,000 ms) */
  warningMs?: number;
  /** Whether the idle timer is actively monitoring (e.g. true only when a station is active) */
  enabled?: boolean;
  /** Callback triggered when inactivity timeout elapses */
  onLogout: () => void;
  /** Callback triggered when warning period starts */
  onWarning?: () => void;
}

export interface UseAutoLogoutReturn {
  isWarning: boolean;
  remainingSeconds: number;
  resetTimer: () => void;
  extendSession: () => void;
}

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_WARNING_MS = 60 * 1000;      // 60 seconds warning before auto-lock

export function useAutoLogout({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  warningMs = DEFAULT_WARNING_MS,
  enabled = true,
  onLogout,
  onWarning
}: UseAutoLogoutOptions): UseAutoLogoutReturn {
  const [isWarning, setIsWarning] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(Math.floor(timeoutMs / 1000));

  const lastActivityRef = useRef<number>(Date.now());
  const logoutCallbackRef = useRef(onLogout);
  const warningCallbackRef = useRef(onWarning);

  // Keep callback refs updated to prevent stale closures
  useEffect(() => {
    logoutCallbackRef.current = onLogout;
  }, [onLogout]);

  useEffect(() => {
    warningCallbackRef.current = onWarning;
  }, [onWarning]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsWarning(false);
    setRemainingSeconds(Math.floor(timeoutMs / 1000));
  }, [timeoutMs]);

  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) {
      setIsWarning(false);
      return;
    }

    lastActivityRef.current = Date.now();
    setIsWarning(false);
    setRemainingSeconds(Math.floor(timeoutMs / 1000));

    // Throttled event handler for user interactions
    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleUserActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
        }, 1000); // Throttle activity updates to at most once per second

        // Only auto-reset if not currently in modal warning state (user can explicitly click extend in warning state)
        lastActivityRef.current = Date.now();
      }
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'click',
      'keydown',
      'touchstart',
      'scroll',
      'wheel'
    ];

    events.forEach(eventName => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    // Check interval every 1 second
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const timeLeft = Math.max(0, timeoutMs - elapsed);
      const secondsLeft = Math.ceil(timeLeft / 1000);

      setRemainingSeconds(secondsLeft);

      // Trigger warning state when entering the final warning window
      if (timeLeft <= warningMs && timeLeft > 0) {
        setIsWarning(prev => {
          if (!prev && warningCallbackRef.current) {
            warningCallbackRef.current();
          }
          return true;
        });
      } else if (timeLeft > warningMs) {
        setIsWarning(false);
      }

      // Trigger logout if timeout has passed
      if (timeLeft <= 0) {
        clearInterval(interval);
        setIsWarning(false);
        logoutCallbackRef.current();
      }
    }, 1000);

    // Handle tab visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= timeoutMs) {
          logoutCallbackRef.current();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (throttleTimeout) clearTimeout(throttleTimeout);
      clearInterval(interval);
      events.forEach(eventName => {
        window.removeEventListener(eventName, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, timeoutMs, warningMs]);

  return {
    isWarning,
    remainingSeconds,
    resetTimer,
    extendSession
  };
}
