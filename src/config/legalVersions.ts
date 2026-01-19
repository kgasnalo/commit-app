/**
 * Legal Version Configuration
 *
 * Tracks the current version of Terms of Service and Privacy Policy.
 * When terms are updated:
 * 1. Increment CURRENT_LEGAL_VERSION (e.g., "v1" → "v2")
 * 2. Add the new version to LEGAL_VERSION_DATES
 * 3. Update the terms/privacy pages on the web portal
 *
 * Users with a different version in their `legal_consent_version` will be
 * shown the LegalConsentScreen before they can continue using the app.
 */

// Current version that users must agree to
export const CURRENT_LEGAL_VERSION = 'v1';

// Version history with effective dates
export const LEGAL_VERSION_DATES: Record<string, string> = {
  'v1': '2026-01-19',
  // Future versions:
  // 'v2': '2026-06-01',
};

// Check if a user's consent version matches the current required version
export function needsLegalConsent(userConsentVersion: string | null): boolean {
  // Null means never consented (new user or pre-versioning user)
  if (!userConsentVersion) {
    return true;
  }
  // Check if version matches current
  return userConsentVersion !== CURRENT_LEGAL_VERSION;
}
