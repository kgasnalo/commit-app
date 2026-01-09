/**
 * useMonkModeTimer Hook
 * Phase 4.3 - Monk Mode Timer Logic
 *
 * Manages timer state, pause/resume, and background handling.
 * Uses timestamp-based calculation for accuracy.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { NotificationService } from '../lib/NotificationService';
import { MonkModeService, PersistedTimerState } from '../lib/MonkModeService';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

interface UseMonkModeTimerOptions {
  durationMinutes: number;
  bookId?: string;
  bookTitle?: string;
  onComplete: () => void;
  onTick?: (remainingSeconds: number) => void;
}

interface UseMonkModeTimerReturn {
  remainingSeconds: number;
  status: TimerStatus;
  progress: ReturnType<typeof useSharedValue<number>>; // Shared value for animations
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}

export function useMonkModeTimer({
  durationMinutes,
  bookId,
  bookTitle,
  onComplete,
  onTick,
}: UseMonkModeTimerOptions): UseMonkModeTimerReturn {
  const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes * 60);
  const [status, setStatusState] = useState<TimerStatus>('idle');
  const statusRef = useRef<TimerStatus>('idle');

  // Helper to update both state and ref
  const setStatus = useCallback((newStatus: TimerStatus) => {
    setStatusState(newStatus);
    statusRef.current = newStatus;
  }, []);

  // Shared value for smooth animation progress (0-1)
  const progress = useSharedValue(0);

  // Refs for tracking time accurately
  const startTimeRef = useRef<Date | null>(null);
  const pausedAtRef = useRef<Date | null>(null);
  const totalPausedMsRef = useRef(0);
  const notificationIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalDurationSecondsRef = useRef(durationMinutes * 60);

  // Calculate remaining time based on timestamps (more accurate than interval counting)
  const calculateRemainingTime = useCallback((): number => {
    if (!startTimeRef.current) return totalDurationSecondsRef.current;

    const now = new Date();
    // If paused, use pausedAt time to calculate elapsed, otherwise use now
    const endTime = statusRef.current === 'paused' && pausedAtRef.current 
      ? pausedAtRef.current 
      : now;

    const elapsedMs =
      endTime.getTime() - startTimeRef.current.getTime() - totalPausedMsRef.current;
    const remainingMs = totalDurationSecondsRef.current * 1000 - elapsedMs;

    return Math.max(0, Math.ceil(remainingMs / 1000));
  }, []);

  // Update timer state
  const updateTimer = useCallback(() => {
    if (statusRef.current !== 'running') return;

    const remaining = calculateRemainingTime();
    setRemainingSeconds(remaining);

    // Update progress for animation (0 = start, 1 = complete)
    const elapsed = totalDurationSecondsRef.current - remaining;
    progress.value = elapsed / totalDurationSecondsRef.current;

    onTick?.(remaining);

    if (remaining <= 0) {
      handleTimerComplete();
    }
  }, [calculateRemainingTime, onTick]); // Removed status dependency

  // Handle timer completion
  const handleTimerComplete = useCallback(async () => {
    setStatus('completed');
    progress.value = 1;

    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Clear persisted state
    await MonkModeService.clearTimerState();

    // Call onComplete callback
    onComplete();
  }, [onComplete]);

  // Start timer
  const start = useCallback(async () => {
    const totalSeconds = durationMinutes * 60;
    totalDurationSecondsRef.current = totalSeconds;
    startTimeRef.current = new Date();
    pausedAtRef.current = null;
    totalPausedMsRef.current = 0;

    setRemainingSeconds(totalSeconds);
    setStatus('running');
    progress.value = 0;

    // Schedule completion notification
    const notificationId = await NotificationService.scheduleTimerCompletion(
      totalSeconds,
      bookTitle
    );
    notificationIdRef.current = notificationId;

    // Persist timer state for background/crash recovery
    await MonkModeService.persistTimerState({
      durationMinutes,
      startedAt: startTimeRef.current.toISOString(),
      pausedAt: null,
      totalPausedMs: 0,
      bookId,
      bookTitle,
      notificationId: notificationId || undefined,
    });

    // Save last duration for convenience
    await MonkModeService.saveLastDuration(durationMinutes);

    // Start interval for UI updates
    intervalRef.current = setInterval(updateTimer, 1000);
  }, [durationMinutes, bookId, bookTitle, updateTimer]);

  // Pause timer
  const pause = useCallback(() => {
    if (status !== 'running') return;

    pausedAtRef.current = new Date();
    setStatus('paused');

    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cancel scheduled notification
    if (notificationIdRef.current) {
      NotificationService.cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }

    // Update persisted state
    MonkModeService.persistTimerState({
      durationMinutes,
      startedAt: startTimeRef.current?.toISOString() || new Date().toISOString(),
      pausedAt: pausedAtRef.current.toISOString(),
      totalPausedMs: totalPausedMsRef.current,
      bookId,
      bookTitle,
    });
  }, [status, durationMinutes, bookId, bookTitle]);

  // Resume timer
  const resume = useCallback(async () => {
    if (status !== 'paused' || !pausedAtRef.current) return;

    // Calculate pause duration and add to total
    const pauseDurationMs = new Date().getTime() - pausedAtRef.current.getTime();
    totalPausedMsRef.current += pauseDurationMs;
    pausedAtRef.current = null;

    setStatus('running');

    // Reschedule notification with remaining time
    const remaining = calculateRemainingTime();
    if (remaining > 0) {
      const notificationId = await NotificationService.scheduleTimerCompletion(
        remaining,
        bookTitle
      );
      notificationIdRef.current = notificationId;
    }

    // Update persisted state
    await MonkModeService.persistTimerState({
      durationMinutes,
      startedAt: startTimeRef.current?.toISOString() || new Date().toISOString(),
      pausedAt: null,
      totalPausedMs: totalPausedMsRef.current,
      bookId,
      bookTitle,
      notificationId: notificationIdRef.current || undefined,
    });

    // Restart interval
    intervalRef.current = setInterval(updateTimer, 1000);
  }, [status, calculateRemainingTime, durationMinutes, bookId, bookTitle, updateTimer]);

  // Cancel timer
  const cancel = useCallback(async () => {
    setStatus('idle');
    setRemainingSeconds(durationMinutes * 60);
    progress.value = 0;

    // Clear refs
    startTimeRef.current = null;
    pausedAtRef.current = null;
    totalPausedMsRef.current = 0;

    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cancel notification
    if (notificationIdRef.current) {
      await NotificationService.cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }

    // Clear persisted state
    await MonkModeService.clearTimerState();
  }, [durationMinutes]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active' && status === 'running') {
        // App came to foreground - recalculate remaining time
        const remaining = calculateRemainingTime();
        setRemainingSeconds(remaining);

        const elapsed = totalDurationSecondsRef.current - remaining;
        progress.value = elapsed / totalDurationSecondsRef.current;

        if (remaining <= 0) {
          handleTimerComplete();
        }
      } else if (nextState === 'background' && status === 'running') {
        // App going to background - state is already persisted
        // Notification will fire even in background
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [status, calculateRemainingTime, handleTimerComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Initial timer display update when status is running
  useEffect(() => {
    if (status === 'running' && !intervalRef.current) {
      intervalRef.current = setInterval(updateTimer, 1000);
    }
  }, [status, updateTimer]);

  return {
    remainingSeconds,
    status,
    progress,
    start,
    pause,
    resume,
    cancel,
  };
}
