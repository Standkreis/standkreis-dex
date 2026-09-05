'use client'

import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'

// A short device label for the passkey row ("Gerät entfernen" has to name something). Best effort, never sent anywhere else.
export function guessDeviceName(): string | undefined {
  if (typeof navigator === 'undefined') return undefined
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return undefined
}

export const register = (optionsJSON: PublicKeyCredentialCreationOptionsJSON) => startRegistration({ optionsJSON })
export const authenticate = (optionsJSON: PublicKeyCredentialRequestOptionsJSON) => startAuthentication({ optionsJSON })
