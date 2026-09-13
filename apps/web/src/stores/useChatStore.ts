import { create } from 'zustand'
import { UserProfile, UserStatus } from '../types/auth'

type MobilePanel = 'channels' | 'members' | null

type ChatState = {
  currentUser: UserProfile | null
  isLoadingAuth: boolean
  activeChannel: string
  mobilePanel: MobilePanel
  setCurrentUser: (user: UserProfile | null) => void
  setIsLoadingAuth: (loading: boolean) => void
  setUserStatus: (status: UserStatus) => void
  setActiveChannel: (channel: string) => void
  setMobilePanel: (panel: MobilePanel) => void
}

export const useChatStore = create<ChatState>((set) => ({
  currentUser: null,
  isLoadingAuth: true,
  activeChannel: 'general',
  mobilePanel: null,
  setCurrentUser: (currentUser) => set({ currentUser, isLoadingAuth: false }),
  setIsLoadingAuth: (isLoadingAuth) => set({ isLoadingAuth }),
  setUserStatus: (status) =>
    set((state) =>
      state.currentUser
        ? { currentUser: { ...state.currentUser, status } }
        : state
    ),
  setActiveChannel: (activeChannel) => set({ activeChannel, mobilePanel: null }),
  setMobilePanel: (mobilePanel) => set({ mobilePanel })
}))
