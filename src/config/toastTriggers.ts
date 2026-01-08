/**
 * Toast Trigger Configurations
 * Phase 2.0.2 - The Reactive Toast System
 *
 * Define conditions and messages for reactive toasts on each onboarding screen.
 */

import type { ToastTrigger } from '../types/atmosphere.types';

/**
 * Screen 1: Tsundoku Count (How many unread books do you have?)
 */
export const TSUNDOKU_TOASTS: ToastTrigger[] = [
  {
    condition: (v) => typeof v === 'number' && v >= 3 && v < 10,
    message: 'A solid foundation!',
    type: 'encouragement',
  },
  {
    condition: (v) => typeof v === 'number' && v >= 10 && v < 20,
    message: "That's a lot of knowledge waiting.",
    type: 'encouragement',
  },
  {
    condition: (v) => typeof v === 'number' && v >= 20 && v < 50,
    message: 'Wow, ambitious!',
    type: 'celebration',
  },
  {
    condition: (v) => typeof v === 'number' && v >= 50,
    message: "It's time to unlock this potential.",
    type: 'warning',
  },
];

/**
 * Screen 2: Last Read (When did you last finish a book?)
 */
export const LAST_READ_TOASTS: ToastTrigger[] = [
  {
    condition: (v) => v === 'this_week',
    message: "You're on a roll!",
    type: 'celebration',
  },
  {
    condition: (v) => v === 'this_month',
    message: 'Good momentum. Keep it going!',
    type: 'encouragement',
  },
  {
    condition: (v) => v === 'few_months',
    message: "Let's reignite that reading habit.",
    type: 'encouragement',
  },
  {
    condition: (v) => v === 'over_year' || v === 'cant_remember',
    message: 'Today is the perfect day to start fresh.',
    type: 'warning',
  },
];

/**
 * Screen 4: Deadline Selection
 */
export const DEADLINE_TOASTS: ToastTrigger[] = [
  {
    condition: (v) => v === '1_week',
    message: 'Ambitious! You got this.',
    type: 'celebration',
  },
  {
    condition: (v) => v === '2_weeks',
    message: 'A balanced timeline.',
    type: 'encouragement',
  },
  {
    condition: (v) => v === '3_weeks',
    message: 'Steady pace wins the race.',
    type: 'encouragement',
  },
  {
    condition: (v) => v === '4_weeks',
    message: 'Taking it slow and steady.',
    type: 'encouragement',
  },
];

/**
 * Screen 5: Penalty Amount
 */
export const PENALTY_TOASTS: ToastTrigger[] = [
  {
    condition: (v) => typeof v === 'number' && v >= 100 && v < 500,
    message: 'Starting light. Smart choice.',
    type: 'encouragement',
  },
  {
    condition: (v) => typeof v === 'number' && v >= 500 && v < 1000,
    message: 'Now we are talking!',
    type: 'encouragement',
  },
  {
    condition: (v) => typeof v === 'number' && v >= 1000 && v < 3000,
    message: 'Serious commitment. Respect.',
    type: 'celebration',
  },
  {
    condition: (v) => typeof v === 'number' && v >= 3000,
    message: 'High stakes. High rewards.',
    type: 'warning',
  },
];

/**
 * Screen 12: Custom Plan (Page Goal)
 */
export const PAGE_GOAL_TOASTS: ToastTrigger[] = [
  {
    condition: (v) => typeof v === 'number' && v >= 50 && v < 100,
    message: 'A perfect starting goal!',
    type: 'encouragement',
  },
  {
    condition: (v) => typeof v === 'number' && v >= 100 && v < 200,
    message: 'Solid commitment!',
    type: 'encouragement',
  },
  {
    condition: (v) => typeof v === 'number' && v >= 200 && v < 400,
    message: 'You mean business!',
    type: 'celebration',
  },
  {
    condition: (v) => typeof v === 'number' && v >= 400,
    message: 'A true reader!',
    type: 'celebration',
  },
];

/**
 * Get toast triggers for a specific screen
 */
export function getToastTriggersForScreen(screenIndex: number): ToastTrigger[] {
  switch (screenIndex) {
    case 1:
      return TSUNDOKU_TOASTS;
    case 2:
      return LAST_READ_TOASTS;
    case 4:
      return DEADLINE_TOASTS;
    case 5:
      return PENALTY_TOASTS;
    case 12:
      return PAGE_GOAL_TOASTS;
    default:
      return [];
  }
}
