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

