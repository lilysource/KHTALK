import { createClient, SupabaseClient, User } from '@supabase/supabase-js'
import { UserProfile } from '../types/auth'

const COLOR_PALETTE = ['cyan', 'coral', 'mint', 'violet', 'gold', 'sky', 'peach', 'blue']

export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

  const localUrl = localStorage.getItem('khtalk_supabase_url')?.trim()
  const localKey = localStorage.getItem('khtalk_supabase_anon_key')?.trim()

  const url = envUrl || localUrl || ''
  const anonKey = envKey || localKey || ''

  const isConfigured = Boolean(
    url &&
    anonKey &&
    !url.includes('your-project-ref') &&
    !url.includes('example.com') &&
    url.startsWith('https://')
  )

  return { url, anonKey, isConfigured }
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  localStorage.setItem('khtalk_supabase_url', url.trim())
  localStorage.setItem('khtalk_supabase_anon_key', anonKey.trim())
}

export function clearCustomSupabaseCredentials() {
  localStorage.removeItem('khtalk_supabase_url')
  localStorage.removeItem('khtalk_supabase_anon_key')
}

let clientInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials()
  if (!isConfigured) return null

  if (!clientInstance) {
    clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  }
  return clientInstance
}

export function resetSupabaseClient() {
  clientInstance = null
}

function getApiUrl() {
  return (import.meta.env.VITE_API_URL?.trim() || 'https://khtalk.onrender.com').replace(/\/+$/, '')
}

export async function createQrSession(): Promise<{ token: string; expiresIn: number } | null> {
  try {
    const response = await fetch(`${getApiUrl()}/api/auth/qr/create`, { method: 'POST' })
    if (!response.ok) return null
    return response.json() as Promise<{ token: string; expiresIn: number }>
  } catch {
    return null
  }
}

export async function approveQrSession(token: string, accessToken: string, refreshToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${getApiUrl()}/api/auth/qr/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, accessToken, refreshToken })
    })
    return response.ok
  } catch {
    return false
  }
}

export async function pollQrSession(token: string): Promise<
  { status: 'pending' | 'expired' | 'unavailable' } | { status: 'approved'; accessToken: string; refreshToken: string }
> {
  try {
    const response = await fetch(`${getApiUrl()}/api/auth/qr/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    if (!response.ok) return { status: 'unavailable' }
    return response.json()
  } catch {
    return { status: 'unavailable' }
  }
}

export async function syncApiSession(accessToken: string): Promise<boolean> {
  const apiUrl = getApiUrl()
  try {
    const response = await fetch(`${apiUrl}/api/auth/session`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken })
    })
    return response.ok
  } catch {
    return false
  }
}

export async function clearApiSession() {
  const apiUrl = getApiUrl()
  try {
    await fetch(`${apiUrl}/api/auth/signout`, { method: 'POST', credentials: 'include' })
  } catch {
    // Supabase sign-out still clears the browser session if the API is offline.
  }
}

export function getQrTokenFromLocation() {
  return new URLSearchParams(window.location.search).get('qr')
}

export function mapSupabaseUserToProfile(user: User): UserProfile {
  const meta = user.user_metadata || {}
  const displayName = meta.display_name || meta.name || user.email?.split('@')[0] || 'Member'
  const username = meta.username || user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'member'

  // Deterministic color from user id
  let hash = 0
  for (let i = 0; i < user.id.length; i++) {
    hash = (hash << 5) - hash + user.id.charCodeAt(i)
    hash |= 0
  }
  const colorIndex = Math.abs(hash) % COLOR_PALETTE.length
  const color = COLOR_PALETTE[colorIndex]

  return {
    id: user.id,
    email: user.email || '',
    displayName,
    username,
    bio: meta.bio || '',
    avatarUrl: meta.avatar_url || '',
    avatar: displayName.charAt(0).toUpperCase() || 'U',
    color,
    status: 'Online'
  }
}

