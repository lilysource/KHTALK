export type UserStatus = 'Online' | 'Idle' | 'Do Not Disturb' | 'Offline'

export interface UserProfile {
  id: string
  email: string
  displayName: string
  username: string
  avatar: string
  color: string
  status: UserStatus
}

export interface AuthErrorResponse {
  message: string
}

