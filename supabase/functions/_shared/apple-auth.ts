/**
 * Apple Auth Utilities for Edge Functions
 * - Generate Apple client_secret JWT (ES256)
 * - Revoke Apple tokens via /auth/revoke endpoint
 */
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts'

const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token'
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke'

/**
 * Generate Apple client_secret JWT for server-to-server communication.
 * Required for token exchange and revocation.
 *
 * JWT spec:
 * - alg: ES256, kid: APPLE_KEY_ID
 * - iss: APPLE_TEAM_ID, sub: APPLE_SERVICE_ID
 * - aud: https://appleid.apple.com, exp: now + 6 months
 */
export async function generateAppleClientSecret(): Promise<string> {
  const teamId = Deno.env.get('APPLE_TEAM_ID')
  const serviceId = Deno.env.get('APPLE_SERVICE_ID')
  const keyId = Deno.env.get('APPLE_KEY_ID')
  const privateKeyPem = Deno.env.get('APPLE_PRIVATE_KEY')

  if (!teamId || !serviceId || !keyId || !privateKeyPem) {
    throw new Error('Missing Apple auth environment variables (APPLE_TEAM_ID, APPLE_SERVICE_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY)')
  }

  // Import the .p8 private key (PKCS#8 PEM format)
  const privateKey = await jose.importPKCS8(privateKeyPem, 'ES256')

  const now = Math.floor(Date.now() / 1000)
  const sixMonths = 15777000 // ~6 months in seconds

  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setSubject(serviceId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(now)
    .setExpirationTime(now + sixMonths)
    .sign(privateKey)

  return jwt
}

/**
 * Exchange an authorization_code for Apple tokens (refresh_token).
 * The authorization_code is obtained from a fresh Apple Sign-In on the client.
 *
 * Returns the refresh_token which can then be used for revocation.
 */
export async function exchangeAppleCodeForTokens(
  authorizationCode: string,
  clientSecret: string
): Promise<{ refresh_token: string }> {
  const serviceId = Deno.env.get('APPLE_SERVICE_ID')
  if (!serviceId) {
    throw new Error('Missing APPLE_SERVICE_ID environment variable')
  }

  const params = new URLSearchParams({
    client_id: serviceId,
    client_secret: clientSecret,
    code: authorizationCode,
    grant_type: 'authorization_code',
  })

  const response = await fetch(APPLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Apple token exchange failed (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  if (!data.refresh_token) {
    throw new Error('Apple token exchange response missing refresh_token')
  }

  return { refresh_token: data.refresh_token }
}

/**
 * Revoke an Apple refresh_token.
 * This invalidates the user's Apple credentials for this app,
 * as required by App Store Guideline 5.1.1 for account deletion.
 */
export async function revokeAppleToken(
  refreshToken: string,
  clientSecret: string
): Promise<void> {
  const serviceId = Deno.env.get('APPLE_SERVICE_ID')
  if (!serviceId) {
    throw new Error('Missing APPLE_SERVICE_ID environment variable')
  }

  const params = new URLSearchParams({
    client_id: serviceId,
    client_secret: clientSecret,
    token: refreshToken,
    token_type_hint: 'refresh_token',
  })

  const response = await fetch(APPLE_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Apple token revocation failed (${response.status}): ${errorBody}`)
  }

  // Apple returns 200 with empty body on success
}
