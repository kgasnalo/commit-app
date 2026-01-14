/**
 * AnalyticsService - Centralized PostHog analytics for tracking critical user actions.
 * Replaces MetricsService (Sentry breadcrumbs).
 *
 * This service uses a singleton pattern with a PostHog instance reference.
 * The instance is set by AnalyticsContext on initialization.
 *
 * For feature flags and session-dependent operations, use useAnalytics() hook instead.
 */

import type PostHog from 'posthog-react-native';

// ============================================
// Types
// ============================================

type JsonType = string | number | boolean | null | { [key: string]: JsonType } | JsonType[];
type AnalyticsProperties = Record<string, JsonType>;

// ============================================
// Singleton Instance
// ============================================

let posthogInstance: PostHog | null = null;

/**
 * Set the PostHog instance. Called by AnalyticsContext.
 * @internal
 */
export function setAnalyticsInstance(instance: PostHog | null): void {
  posthogInstance = instance;
}

/**
 * Internal capture function with dev logging.
 */
function capture(event: string, properties?: AnalyticsProperties): void {
  if (__DEV__) {
    console.log(`[AnalyticsService] ${event}`, properties);
  }
  posthogInstance?.capture(event, properties);
}

// ============================================
// Commitment Events
// ============================================

/**
 * Track when a user creates a new commitment.
 */
export function commitmentCreated(data: {
  currency: string;
  amount: number;
  deadline_days: number;
  target_pages?: number;
  is_continue_flow: boolean;
}): void {
  capture('commitment_created', data);
}

/**
 * Track when a user successfully completes a commitment.
 */
export function commitmentCompleted(data: {
  currency: string;
  amount_saved: number;
  days_to_complete: number;
  days_early?: number;
}): void {
  capture('commitment_completed', data);
}

/**
 * Track when a commitment defaults (penalty charged).
 */
export function commitmentDefaulted(data: {
  currency: string;
  amount_charged: number;
}): void {
  capture('commitment_defaulted', data);
}

/**
 * Track when a user uses their lifeline (freeze).
 */
export function lifelineUsed(data: {
  days_extended: number;
}): void {
  capture('lifeline_used', data);
}

// ============================================
// Onboarding Events
// ============================================

/**
 * Track when a user views an onboarding screen.
 */
export function onboardingScreenViewed(screenNumber: number): void {
  capture('onboarding_screen_viewed', { screen_number: screenNumber });
}

/**
 * Track when a user completes onboarding and subscribes.
 */
export function onboardingCompleted(data: {
  plan_type: 'yearly' | 'monthly';
}): void {
  capture('onboarding_completed', data);
}

// ============================================
// User Events
// ============================================

/**
 * Track when a user logs out.
 */
export function userLoggedOut(): void {
  capture('user_logged_out');
}

/**
 * Track when a user deletes their account.
 */
export function accountDeleted(): void {
  capture('account_deleted');
}

// ============================================
// Book & Library Events
// ============================================

/**
 * Track when a user scans a book barcode.
 */
export function bookScanned(data: {
  isbn?: string;
  found: boolean;
}): void {
  capture('book_scanned', data);
}

/**
 * Track when a user adds a book to their library.
 */
export function bookAddedToLibrary(data: {
  source: 'scan' | 'search' | 'onboarding';
}): void {
  capture('book_added_to_library', data);
}

// ============================================
// Monk Mode Events
// ============================================

/**
 * Track when a user starts a Monk Mode session.
 */
export function monkModeSessionStarted(data: {
  duration_minutes: number;
  has_book_selected: boolean;
}): void {
  capture('monk_mode_session_started', data);
}

/**
 * Track when a user completes a Monk Mode session.
 */
export function monkModeSessionCompleted(data: {
  duration_minutes: number;
  actual_duration_seconds: number;
  book_id?: string;
}): void {
  capture('monk_mode_session_completed', data);
}

/**
 * Track when a user cancels a Monk Mode session.
 */
export function monkModeSessionCancelled(data: {
  duration_minutes: number;
  seconds_elapsed: number;
}): void {
  capture('monk_mode_session_cancelled', data);
}

// ============================================
// Verification Events
// ============================================

/**
 * Track when a user submits verification.
 */
export function verificationSubmitted(data: {
  memo_length: number;
}): void {
  capture('verification_submitted', data);
}

// ============================================
// Receipt Events
// ============================================

/**
 * Track when a user shares a receipt.
 */
export function receiptShared(): void {
  capture('receipt_shared');
}

/**
 * Track when a user opens receipt preview.
 */
export function receiptPreviewOpened(): void {
  capture('receipt_preview_opened');
}

// ============================================
// Default Export (for convenience)
// ============================================

export const AnalyticsService = {
  setInstance: setAnalyticsInstance,
  commitmentCreated,
  commitmentCompleted,
  commitmentDefaulted,
  lifelineUsed,
  onboardingScreenViewed,
  onboardingCompleted,
  userLoggedOut,
  accountDeleted,
  bookScanned,
  bookAddedToLibrary,
  monkModeSessionStarted,
  monkModeSessionCompleted,
  monkModeSessionCancelled,
  verificationSubmitted,
  receiptShared,
  receiptPreviewOpened,
};

export default AnalyticsService;
