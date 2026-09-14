export interface RolePermissions {
  administrator: boolean
  viewAuditLog: boolean
  manageServer: boolean
  manageRoles: boolean
  manageChannels: boolean
  kickMembers: boolean
  banMembers: boolean
  createInvite: boolean
  changeNickname: boolean
  manageNicknames: boolean
  sendMessages: boolean
  attachFiles: boolean
  addReactions: boolean
  mentionEveryone: boolean
  manageMessages: boolean
  readMessageHistory: boolean
  connect: boolean
  speak: boolean
  muteMembers: boolean
  deafenMembers: boolean
  moveMembers: boolean
}

export interface Role {
  id: string
  name: string
  color: string
  hoist: boolean // Display role members separately from online members
  mentionable: boolean
  position: number
  permissions: RolePermissions
}

export interface CommunityMember {
  id: string
  name: string
  username: string
  avatar: string
  color: string
  avatarUrl?: string
  status: 'Online' | 'Idle' | 'Do Not Disturb' | 'Offline'
  roleIds: string[]
}

export interface CommunityChannel {
  id: string
  name: string
  type: 'text' | 'voice'
  category?: string
  topic?: string
}

export interface Community {
  id: string
  name: string
  slug: string
  iconUrl?: string
  backgroundUrl?: string | null
  ownerId: string
  channels: CommunityChannel[]
  roles: Role[]
  members: CommunityMember[]
}

export const DISCORD_ROLE_COLORS = [
  { name: 'Default', hex: '#99aab5' },
  { name: 'Teal', hex: '#1abc9c' },
  { name: 'Emerald', hex: '#2ecc71' },
  { name: 'Sky Blue', hex: '#3498db' },
  { name: 'Purple', hex: '#9b59b6' },
  { name: 'Fuchsia', hex: '#e91e63' },
  { name: 'Gold', hex: '#f1c40f' },
  { name: 'Orange', hex: '#e67e22' },
  { name: 'Ruby Red', hex: '#e74c3c' },
  { name: 'Navy Blue', hex: '#206694' },
  { name: 'Dark Green', hex: '#1f8b4c' },
  { name: 'Dark Blue', hex: '#11806a' },
  { name: 'Dark Purple', hex: '#71368a' },
  { name: 'Dark Coral', hex: '#ad1457' },
  { name: 'Dark Gold', hex: '#c27c0e' }
]

export const DEFAULT_EVERYONE_PERMISSIONS: RolePermissions = {
  administrator: false,
  viewAuditLog: false,
  manageServer: false,
  manageRoles: false,
  manageChannels: false,
  kickMembers: false,
  banMembers: false,
  createInvite: true,
  changeNickname: true,
  manageNicknames: false,
  sendMessages: true,
  attachFiles: true,
  addReactions: true,
  mentionEveryone: false,
  manageMessages: false,
  readMessageHistory: true,
  connect: true,
  speak: true,
  muteMembers: false,
  deafenMembers: false,
  moveMembers: false
}

export const DEFAULT_ADMIN_PERMISSIONS: RolePermissions = {
  administrator: true,
  viewAuditLog: true,
  manageServer: true,
  manageRoles: true,
  manageChannels: true,
  kickMembers: true,
  banMembers: true,
  createInvite: true,
  changeNickname: true,
  manageNicknames: true,
  sendMessages: true,
  attachFiles: true,
  addReactions: true,
  mentionEveryone: true,
  manageMessages: true,
  readMessageHistory: true,
  connect: true,
  speak: true,
  muteMembers: true,
  deafenMembers: true,
  moveMembers: true
}

export const DEFAULT_MOD_PERMISSIONS: RolePermissions = {
  administrator: false,
  viewAuditLog: true,
  manageServer: false,
  manageRoles: false,
  manageChannels: true,
  kickMembers: true,
  banMembers: true,
  createInvite: true,
  changeNickname: true,
  manageNicknames: true,
  sendMessages: true,
  attachFiles: true,
  addReactions: true,
  mentionEveryone: true,
  manageMessages: true,
  readMessageHistory: true,
  connect: true,
  speak: true,
  muteMembers: true,
  deafenMembers: true,
  moveMembers: true
}

export interface DiscordTemplate {
  id: string
  title: string
  subtitle: string
  icon: string
  channels: { name: string; type: 'text' | 'voice'; category?: string }[]
  roles: { name: string; color: string; hoist: boolean }[]
}

export const DISCORD_TEMPLATES: DiscordTemplate[] = [
  {
    id: 'custom',
    title: 'Create My Own',
    subtitle: 'Build your community from scratch with standard channels.',
    icon: 'palette',
    channels: [
      { name: 'general', type: 'text', category: 'TEXT CHANNELS' },
      { name: 'announcements', type: 'text', category: 'TEXT CHANNELS' },
      { name: 'General', type: 'voice', category: 'VOICE CHANNELS' }
    ],
    roles: [
      { name: 'Admin', color: '#e74c3c', hoist: true },
      { name: 'Moderator', color: '#2ecc71', hoist: true },
      { name: 'Member', color: '#3498db', hoist: false }
    ]
  },
  {
    id: 'gaming',
    title: 'Gaming',
    subtitle: 'Hang out with friends and game together.',
    icon: 'gamepad',
    channels: [
      { name: 'general', type: 'text', category: 'TEXT CHANNELS' },
      { name: 'clips-and-highlights', type: 'text', category: 'TEXT CHANNELS' },
      { name: 'looking-for-group', type: 'text', category: 'TEXT CHANNELS' },
      { name: 'Lobby', type: 'voice', category: 'VOICE CHANNELS' },
      { name: 'Squad 1', type: 'voice', category: 'VOICE CHANNELS' },
      { name: 'Squad 2', type: 'voice', category: 'VOICE CHANNELS' }
    ],
    roles: [
      { name: 'Server Owner', color: '#e74c3c', hoist: true },
      { name: 'Pro Gamer', color: '#f1c40f', hoist: true },
      { name: 'Squad Leader', color: '#9b59b6', hoist: true },
      { name: 'Player', color: '#1abc9c', hoist: false }
    ]
  },
  {
    id: 'school',
    title: 'School Club',
    subtitle: 'A place for campus club members, meetings, and updates.',
    icon: 'school',
    channels: [
      { name: 'welcome-and-rules', type: 'text', category: 'INFORMATION' },
      { name: 'announcements', type: 'text', category: 'INFORMATION' },
      { name: 'general', type: 'text', category: 'TEXT CHANNELS' },
      { name: 'meeting-notes', type: 'text', category: 'TEXT CHANNELS' },
      { name: 'Club Lounge', type: 'voice', category: 'VOICE CHANNELS' },
      { name: 'Meeting Room', type: 'voice', category: 'VOICE CHANNELS' }
    ],
    roles: [
      { name: 'Club President', color: '#e74c3c', hoist: true },
      { name: 'Officer', color: '#e67e22', hoist: true },
      { name: 'Club Member', color: '#3498db', hoist: false }
    ]
  },
  {
    id: 'study',
    title: 'Study Group',
    subtitle: 'Collaborate on homework, share resources, and study.',
    icon: 'book',
    channels: [
      { name: 'general', type: 'text', category: 'TEXT CHANNELS' },
      { name: 'homework-help', type: 'text', category: 'TEXT CHANNELS' },
      { name: 'resources', type: 'text', category: 'TEXT CHANNELS' },
      { name: 'Quiet Study', type: 'voice', category: 'VOICE CHANNELS' },
      { name: 'Group Discussion', type: 'voice', category: 'VOICE CHANNELS' }
    ],
    roles: [
      { name: 'Tutor / Lead', color: '#9b59b6', hoist: true },
      { name: 'Study Buddy', color: '#2ecc71', hoist: false }
    ]
  },
  {
    id: 'friends',
    title: 'Friends',
    subtitle: 'For you and your friend group to stay connected.',
    icon: 'users',
    channels: [
      { name: 'general', type: 'text', category: 'TEXT CHANNELS' },
      { name: 'memes', type: 'text', category: 'TEXT CHANNELS' },
      { name: 'music-share', type: 'text', category: 'TEXT CHANNELS' },
      { name: 'Hangout', type: 'voice', category: 'VOICE CHANNELS' },
      { name: 'Late Night', type: 'voice', category: 'VOICE CHANNELS' }
    ],
    roles: [
      { name: 'VIP', color: '#f1c40f', hoist: true },
      { name: 'Homie', color: '#3498db', hoist: false }
    ]
  },
  {
    id: 'creators',
    title: 'Artists & Creators',
    subtitle: 'Showcase work, get feedback, and build a following.',
    icon: 'sparkles',
    channels: [
      { name: 'announcements', type: 'text', category: 'INFORMATION' },
      { name: 'general', type: 'text', category: 'COMMUNITY' },
      { name: 'art-showcase', type: 'text', category: 'COMMUNITY' },
      { name: 'feedback-and-critique', type: 'text', category: 'COMMUNITY' },
      { name: 'Creative Session', type: 'voice', category: 'VOICE CHANNELS' }
    ],
    roles: [
      { name: 'Creator', color: '#e91e63', hoist: true },
      { name: 'Featured Artist', color: '#f1c40f', hoist: true },
      { name: 'Fan / Supporter', color: '#1abc9c', hoist: false }
    ]
  }
]

