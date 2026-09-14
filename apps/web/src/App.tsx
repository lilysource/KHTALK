import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Bell, ChevronDown, ChevronLeft, ChevronRight, Compass,
  Download, FileText, Gift, Hash, Headphones, Menu, Mic,
  MoreHorizontal, Pin, Plus, Search, Send, Settings, Smile,
  Users, Volume2, X, Trash2, LockKeyhole, LogOut, Check, Pencil,
  ShieldCheck, Mail, KeyRound, HelpCircle, UserRound, BellRing, Palette, Eye
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useChatStore } from './stores/useChatStore'
import { AuthPage } from './components/AuthPage'
import { approveQrSession, clearApiSession, getQrTokenFromLocation, getSupabaseClient, mapSupabaseUserToProfile, syncApiSession } from './lib/supabase'
import { UserStatus } from './types/auth'
import {
  Community, Role, DiscordTemplate,
  DEFAULT_EVERYONE_PERMISSIONS, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_MOD_PERMISSIONS
} from './types/community'
import { CreateCommunityModal } from './components/CreateCommunityModal'
import { CommunitySettingsModal } from './components/CommunitySettingsModal'

type Message = {
  id: number
  name: string
  time: string
  avatar: string
  color: string
  avatarUrl?: string
  text?: string
  attachment?: string
  reactions?: string[]
}



function BrandMark({ small = false }: { small?: boolean }) {
  return <div className={`brand-mark ${small ? 'small' : ''}`} aria-label="KHTALK">K</div>
}

function Avatar({ member, size = 'regular' }: { member: { avatar: string; color: string; avatarUrl?: string }; size?: string }) {
  return <div className={`avatar ${member.color} ${size}`}>{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : member.avatar}</div>
}

function App() {
  const {
    currentUser,
    setCurrentUser,
    setUserStatus,
    activeChannel,
    mobilePanel,
    setActiveChannel,
    setMobilePanel
  } = useChatStore()

  const [draft, setDraft] = useState('')
  const [customMenu, setCustomMenu] = useState<{ x: number; y: number } | null>(null)
  const [channelMenu, setChannelMenu] = useState<{ name: string; x: number; y: number } | null>(null)
  const [channelToDelete, setChannelToDelete] = useState<string | null>(null)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showServerDropdown, setShowServerDropdown] = useState(false)
  const [channelName, setChannelName] = useState('')
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text')

  // Communities State & Persistence (Clean Real Data only, no fake mock users/communities)
  const [communities, setCommunities] = useState<Community[]>(() => {
    localStorage.removeItem('khtalk_discord_communities_v2')
    const saved = localStorage.getItem('khtalk_communities_real_v3')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed.filter((c) => c.id !== 'khtalk_community_default')
        }
      } catch {}
    }
    return []
  })

  const [activeCommunityId, setActiveCommunityId] = useState<string>(() => {
    const saved = localStorage.getItem('khtalk_active_community_id_v3')
    return saved && saved !== 'khtalk_community_default' ? saved : ''
  })

  // Messages per Community & Channel (Zero fake messages)
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem('khtalk_channel_messages_real_v3')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [showCommunityModal, setShowCommunityModal] = useState(false)
  const [showCommunitySettings, setShowCommunitySettings] = useState(false)

  // Save communities to localStorage
  useEffect(() => {
    localStorage.setItem('khtalk_communities_real_v3', JSON.stringify(communities))
  }, [communities])

  // Save active community ID
  useEffect(() => {
    localStorage.setItem('khtalk_active_community_id_v3', activeCommunityId)
  }, [activeCommunityId])

  // Save channel messages to localStorage
  useEffect(() => {
    localStorage.setItem('khtalk_channel_messages_real_v3', JSON.stringify(messagesByChannel))
  }, [messagesByChannel])

  // Supabase Auth listener
  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) return
    const scannedQrToken = getQrTokenFromLocation()

    async function approveQrForSession(session: { access_token: string; refresh_token: string }) {
      if (!scannedQrToken) return
      const approved = await approveQrSession(scannedQrToken, session.access_token, session.refresh_token)
      if (approved) window.history.replaceState({}, '', window.location.pathname)
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session?.user) {
        void syncApiSession(session.access_token)
        void approveQrForSession(session)
        setCurrentUser(mapSupabaseUserToProfile(session.user))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void syncApiSession(session.access_token)
        void approveQrForSession(session)
        setCurrentUser(mapSupabaseUserToProfile(session.user))
      } else {
        setCurrentUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setCurrentUser])

  // Current active community
  const community = communities.find((c) => c.id === activeCommunityId) || communities[0] || null

  // Ensure active community ID is valid
  useEffect(() => {
    if (communities.length > 0 && (!activeCommunityId || !communities.some((c) => c.id === activeCommunityId))) {
      setActiveCommunityId(communities[0].id)
      const firstText = communities[0].channels.find((ch) => ch.type === 'text')
      if (firstText) setActiveChannel(firstText.name)
    }
  }, [communities, activeCommunityId, setActiveChannel])

  // Ensure current real user is in active community members list
  useEffect(() => {
    if (!currentUser || !community) return
    const isMember = community.members.some((m) => m.id === currentUser.id || m.username === currentUser.username)
    if (!isMember) {
      const userMember = {
        id: currentUser.id,
        name: currentUser.displayName,
        username: currentUser.username,
        avatar: currentUser.avatar,
        color: currentUser.color,
        avatarUrl: currentUser.avatarUrl,
        status: currentUser.status,
        roleIds: ['role_admin', 'everyone']
      }
      setCommunities((prev) =>
        prev.map((c) =>
          c.id === community.id
            ? { ...c, members: [userMember, ...c.members.filter((m) => m.id !== currentUser.id && m.username !== currentUser.username)] }
            : c
        )
      )
    }
  }, [currentUser, community])

  async function handleSignOut() {
    const supabase = getSupabaseClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    await clearApiSession()
    setCurrentUser(null)
    setShowUserMenu(false)
  }

  // Active channel messages
  const currentChannelKey = community ? `${community.id}_${activeChannel}` : activeChannel
  const currentMessages = messagesByChannel[currentChannelKey] || []

  function sendMessage() {
    const text = draft.trim()
    if (!text) return
    if (!currentUser) return
    if (!community) return

    const newMsg: Message = {
      id: Date.now(),
      name: currentUser.displayName,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: currentUser.avatar,
      color: currentUser.color,
      avatarUrl: currentUser.avatarUrl,
      text
    }

    setMessagesByChannel((prev) => ({
      ...prev,
      [currentChannelKey]: [...(prev[currentChannelKey] || []), newMsg]
    }))
    setDraft('')
  }

  function requestPrivateChannel(type: 'text' | 'voice' = 'text') {
    if (!currentUser) return
    setChannelType(type)
    setShowChannelModal(true)
  }

  // Create a new Community from Discord Template
  function handleCreateCommunity({
    name,
    iconUrl,
    template,
    audience
  }: {
    name: string
    iconUrl?: string
    template: DiscordTemplate
    audience: 'friends' | 'club' | 'general'
  }) {
    if (!currentUser) return
    const newId = `server_${Date.now()}`
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Create roles from template
    const templateRoles: Role[] = [
      {
        id: 'everyone',
        name: '@everyone',
        color: '#99aab5',
        hoist: false,
        mentionable: false,
        position: 0,
        permissions: DEFAULT_EVERYONE_PERMISSIONS
      },
      ...template.roles.map((r, index) => ({
        id: `role_${index}_${Date.now()}`,
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        mentionable: true,
        position: index + 1,
        permissions: index === 0 ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_MOD_PERMISSIONS
      }))
    ]

    // Create channels from template
    const templateChannels = template.channels.map((c, index) => ({
      id: `ch_${index}_${Date.now()}`,
      name: c.name,
      type: c.type,
      category: c.category || (c.type === 'voice' ? 'VOICE CHANNELS' : 'TEXT CHANNELS')
    }))

    // Add currentUser as Admin/Owner member — no fake/seeded users
    const newMembers = [
      {
        id: currentUser.id,
        name: currentUser.displayName,
        username: currentUser.username,
        avatar: currentUser.avatar,
        color: currentUser.color,
        avatarUrl: currentUser.avatarUrl,
        status: currentUser.status,
        roleIds: [templateRoles[1]?.id || 'role_admin', 'everyone']
      }
    ]

    const newCommunity: Community = {
      id: newId,
      name,
      slug,
      iconUrl,
      backgroundUrl: null,
      ownerId: currentUser.id,
      roles: templateRoles,
      channels: templateChannels,
      members: newMembers
    }

    setCommunities((prev) => [...prev, newCommunity])
    setActiveCommunityId(newId)
    setActiveChannel(templateChannels[0]?.name || 'general')
    setShowCommunityModal(false)
  }

  // Update community (from Settings)
  function handleUpdateCommunity(updated: Community) {
    setCommunities((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    )
  }

  // Delete community
  function handleDeleteCommunity(communityId: string) {
    const remaining = communities.filter((c) => c.id !== communityId)
    setCommunities(remaining)
    if (remaining.length === 0) {
      setActiveCommunityId('')
    } else {
      setActiveCommunityId(remaining[0].id)
    }
  }

  function createPrivateChannel() {
    const name = channelName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    if (!name || !community) return
    const newChan = {
      id: `chan_${Date.now()}`,
      name,
      type: channelType,
      category: channelType === 'voice' ? 'VOICE CHANNELS' : 'TEXT CHANNELS'
    }
    handleUpdateCommunity({
      ...community,
      channels: [...community.channels, newChan]
    })
    setActiveChannel(name)
    setChannelName('')
    setShowChannelModal(false)
  }

  function requestDeleteChannel(name: string) {
    setChannelMenu(null)
    setChannelToDelete(name)
  }

  function deleteChannel() {
    if (!channelToDelete || !community) return
    const updatedChannels = community.channels.filter((c) => c.name !== channelToDelete)
    handleUpdateCommunity({ ...community, channels: updatedChannels })
    if (activeChannel === channelToDelete) {
      const remainingText = updatedChannels.find((c) => c.type === 'text')
      setActiveChannel(remainingText?.name || 'general')
    }
    setChannelToDelete(null)
  }

  // If not logged in, render the real Supabase Auth page
  if (!currentUser) {
    return <AuthPage />
  }

  // If user has no communities yet, show empty state
  if (communities.length === 0) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px' }}>
        <div className="brand-mark" style={{ width: 72, height: 72, fontSize: 36 }} aria-label="KHTALK">K</div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#edf5ff', fontSize: 28, margin: '0 0 8px' }}>Welcome to KHTALK</h1>
          <p style={{ color: '#8ba4c0', margin: '0 0 32px', maxWidth: 380 }}>
            You haven't joined any communities yet. Create one to get started!
          </p>
          <button
            className="khtalk-btn-primary"
            style={{ padding: '12px 28px', fontSize: 16, borderRadius: 10 }}
            onClick={() => setShowCommunityModal(true)}
          >
            + Create a Community
          </button>
        </div>

        {showCommunityModal && (
          <CreateCommunityModal
            userDisplayName={currentUser.displayName}
            onClose={() => setShowCommunityModal(false)}
            onCreate={handleCreateCommunity}
          />
        )}
      </div>
    )
  }

  // Get color for message author
  function getAuthorColor(authorName: string): string {
    if (!community) return '#edf5ff'
    const member = community.members.find(
      (m) => m.name.toLowerCase() === authorName.toLowerCase()
    )
    if (member) {
      const memberRoles = community.roles.filter((r) => member.roleIds.includes(r.id))
      const coloredRole = memberRoles.find((r) => r.color && r.id !== 'everyone')
      if (coloredRole) return coloredRole.color
    }
    return '#edf5ff'
  }

  const textChannels = community ? community.channels.filter((c) => c.type === 'text') : []
  const voiceChannels = community ? community.channels.filter((c) => c.type === 'voice') : []

  return (
    <div
      className="app-shell"
      style={community?.backgroundUrl ? { backgroundImage: `linear-gradient(rgba(6, 19, 38, .78), rgba(6, 19, 38, .9)), url(${community.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      onContextMenu={(event) => event.preventDefault()}
      onClick={() => {
        setCustomMenu(null)
        setChannelMenu(null)
        setShowUserMenu(false)
        setShowServerDropdown(false)
      }}
    >
      <header className="mobile-topbar">
        <button className="icon-button" onClick={() => setMobilePanel('channels')} aria-label="Open channels">
          <Menu size={19} />
        </button>
        <BrandMark small />
        <strong>KHTALK</strong>
        <button className="icon-button mobile-create-community" onClick={() => setShowCommunityModal(true)} aria-label="Create server">
          <Plus size={19} />
        </button>
        <button className="icon-button" onClick={() => setMobilePanel('members')} aria-label="Open members">
          <Users size={19} />
        </button>
      </header>

      {/* DISCORD SERVER RAIL */}
      <aside className="server-rail">
        <BrandMark />
        <div className="rail-divider" />

        {communities.map((c) => {
          const isActive = c.id === community.id
          return (
            <div key={c.id} className="server-rail-item">
              <span className={`server-rail-pill ${isActive ? 'active' : ''}`} />
              <button
                className={`server-icon ${isActive ? 'active' : ''}`}
                aria-label={c.name}
                onClick={() => {
                  setActiveCommunityId(c.id)
                  const firstText = c.channels.find((ch) => ch.type === 'text')
                  if (firstText) setActiveChannel(firstText.name)
                }}
                onContextMenu={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setActiveCommunityId(c.id)
                  setCustomMenu({ x: event.clientX, y: event.clientY })
                }}
              >
                {c.iconUrl ? (
                  <img src={c.iconUrl} alt={c.name} className="server-rail-img" />
                ) : (
                  <span className="server-letter">{c.name.charAt(0).toUpperCase()}</span>
                )}
              </button>
            </div>
          )
        })}

        <button
          className="server-icon add"
          aria-label="Add a Community"
          title="Add a Community"
          onClick={() => setShowCommunityModal(true)}
        >
          <Plus size={20} />
        </button>
        <div className="rail-spacer" />
        <button className="server-icon" aria-label="Discover"><Compass size={20} /></button>
      </aside>

      {/* CHANNEL SIDEBAR */}
      <aside className={`channel-sidebar ${mobilePanel === 'channels' ? 'mobile-open' : ''}`}>
        {/* DISCORD SERVER HEADING & DROPDOWN */}
        <div style={{ position: 'relative' }}>
          <div
            className="server-heading clickable"
            onClick={(e) => {
              e.stopPropagation()
              setShowServerDropdown(!showServerDropdown)
            }}
          >
            <div className="server-heading-content">
              {community?.iconUrl && (
                <img src={community.iconUrl} alt="" className="server-mini-icon" />
              )}
              <span>{community ? community.name : 'Select a Community'}</span>
            </div>
            <ChevronDown size={16} className={`dropdown-chevron ${showServerDropdown ? 'open' : ''}`} />
          </div>

          {showServerDropdown && community && (
            <div className="discord-server-dropdown" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="discord-dropdown-item primary"
                onClick={() => {
                  setShowServerDropdown(false)
                  setShowCommunitySettings(true)
                }}
              >
                <span>Community Settings</span>
                <Settings size={15} />
              </button>

              <button
                type="button"
                className="discord-dropdown-item"
                onClick={() => {
                  setShowServerDropdown(false)
                  requestPrivateChannel('text')
                }}
              >
                <span>Create Channel</span>
                <Plus size={16} />
              </button>

              <button
                type="button"
                className="discord-dropdown-item"
                onClick={() => {
                  setShowServerDropdown(false)
                  requestPrivateChannel('voice')
                }}
              >
                <span>Create Voice Channel</span>
                <Volume2 size={16} />
              </button>

              <div className="discord-dropdown-divider" />

              <button
                type="button"
                className="discord-dropdown-item danger"
                onClick={() => {
                  setShowServerDropdown(false)
                  handleDeleteCommunity(community.id)
                }}
              >
                <span>Delete Community</span>
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>

        <div className="channel-scroll">
          {/* TEXT CHANNELS */}
          <div className="channel-category">
            <span>TEXT CHANNELS</span>
            <button aria-label="Create text channel" onClick={() => requestPrivateChannel('text')}>
              <Plus size={14} />
            </button>
          </div>
          {textChannels.map((channel) => (
            <ChannelRow
              key={channel.id}
              name={channel.name}
              active={activeChannel === channel.name}
              onContextMenu={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setChannelMenu({ name: channel.name, x: event.clientX, y: event.clientY })
              }}
              onClick={() => {
                setActiveChannel(channel.name)
                setMobilePanel(null)
              }}
            />
          ))}

          {/* VOICE CHANNELS */}
          <div className="channel-category space-top">
            <span>VOICE CHANNELS</span>
            <button aria-label="Create voice channel" onClick={() => requestPrivateChannel('voice')}>
              <Plus size={14} />
            </button>
          </div>
          {voiceChannels.map((channel) => (
            <div className="voice-row" key={channel.id}>
              <Volume2 size={15} />
              <span>{channel.name}</span>
              <small>00</small>
            </div>
          ))}
        </div>

        {/* Real Logged-in User Panel & Popover */}
        <div className="user-panel-wrap">
          {showUserMenu && (
            <div className="user-profile-popover" onClick={(e) => e.stopPropagation()}>
              <div className="popover-header">
                <Avatar member={{ avatar: currentUser.avatar, color: currentUser.color, avatarUrl: currentUser.avatarUrl }} size="small" />
                <div className="popover-info">
                  <strong>{currentUser.displayName}</strong>
                  <span>@{currentUser.username}</span>
                  <small title={currentUser.email}>{currentUser.email}</small>
                </div>
              </div>

              <div className="popover-section-label">SET STATUS</div>
              {(['Online', 'Idle', 'Do Not Disturb'] as UserStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`status-option-btn ${currentUser.status === st ? 'active' : ''}`}
                  onClick={() => setUserStatus(st)}
                >
                  <span
                    className={`status-indicator ${
                      st === 'Online' ? 'online' : st === 'Idle' ? 'idle' : 'dnd'
                    }`}
                  />
                  <span>{st}</span>
                  {currentUser.status === st && <Check size={14} className="check-icon" />}
                </button>
              ))}

              <div className="popover-divider" />
              <button type="button" className="logout-btn" onClick={handleSignOut}>
                <LogOut size={15} />
                <span>Log Out</span>
              </button>
            </div>
          )}

          <div
            className="user-panel"
            onClick={(e) => {
              e.stopPropagation()
              setShowUserMenu(!showUserMenu)
            }}
            title="User Profile & Settings"
          >
            <div className="presence-wrap">
              <Avatar member={{ avatar: currentUser.avatar, color: currentUser.color, avatarUrl: currentUser.avatarUrl }} size="small" />
              <span
                className={`presence-dot ${
                  currentUser.status === 'Online'
                    ? 'online'
                    : currentUser.status === 'Idle'
                    ? 'idle'
                    : 'do-not-disturb'
                }`}
              />
            </div>
            <div className="user-copy">
              <strong>{currentUser.displayName}</strong>
              <span>@{currentUser.username}</span>
            </div>
            <Mic size={16} />
            <Headphones size={16} />
            <button className="settings-trigger" aria-label="Open settings" onClick={(event) => { event.stopPropagation(); setShowSettings(true); setShowUserMenu(false) }}>
              <Settings size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* CHAT PANEL */}
      <main className="chat-panel">
        <div className="chat-header">
          <div className="channel-title">
            <Hash size={21} />
            <div>
              <h1>{activeChannel}</h1>
              <span>Share ideas, updates, and good energy.</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
            <button className="icon-button" aria-label="Pinned messages"><Pin size={18} /></button>
            <button className="icon-button member-toggle" onClick={() => setMobilePanel('members')} aria-label="Member list">
              <Users size={19} />
            </button>
            <label className="search-box">
              <Search size={15} />
              <input placeholder="Search" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button" aria-label="More options"><MoreHorizontal size={19} /></button>
          </div>
        </div>

        <div className="message-area">
          <div className="welcome-block">
            <div className="welcome-icon"><Hash size={26} /></div>
            <h2>Welcome to #{activeChannel}</h2>
            <p>This is the beginning of the #{activeChannel} channel.</p>
          </div>
          {currentMessages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              authorColor={getAuthorColor(message.name)}
            />
          ))}
        </div>

        <div className="composer-wrap">
          <div className="composer">
            <button className="composer-action" aria-label="Add attachment"><Plus size={20} /></button>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') sendMessage() }}
              placeholder={`Message #${activeChannel}`}
            />
            <button className="composer-action" aria-label="Gift"><Gift size={18} /></button>
            <button className="composer-action" aria-label="GIF picker"><span className="gif-label">GIF</span></button>
            <button className="composer-action" aria-label="Emoji"><Smile size={19} /></button>
            <button className="send-button" onClick={sendMessage} aria-label="Send message"><Send size={17} /></button>
          </div>
          <div className="composer-hint">Press <kbd>Enter</kbd> to send <span>•</span> <kbd>Shift + Enter</kbd> for a new line</div>
        </div>
      </main>

      {/* DISCORD HOISTED MEMBERS SIDEBAR */}
      <CommunityMembersSidebar
        community={community}
        mobilePanel={mobilePanel}
        setMobilePanel={setMobilePanel}
      />

      {mobilePanel && <button className="mobile-backdrop" onClick={() => setMobilePanel(null)} aria-label="Close menu" />}

      {/* Context Menus */}
      {customMenu && community && (
        <div className="server-context-menu" style={{ left: customMenu.x, top: customMenu.y }} onClick={(event) => event.stopPropagation()}>
          <strong>{community.name}</strong>
          <button onClick={() => { setCustomMenu(null); setShowCommunitySettings(true) }}>
            <Settings size={15} /> Server Settings
          </button>
          <button onClick={() => { setCustomMenu(null); handleDeleteCommunity(community.id) }}>
            <Trash2 size={15} /> Delete Server
          </button>
        </div>
      )}

      {channelMenu && (
        <div className="server-context-menu" style={{ left: channelMenu.x, top: channelMenu.y }} onClick={(event) => event.stopPropagation()}>
          <strong>#{channelMenu.name}</strong>
          <button onClick={() => requestDeleteChannel(channelMenu.name)}>
            <Trash2 size={15} /> Delete channel
          </button>
        </div>
      )}

      {/* Private Channel Modal */}
      {showChannelModal && (
        <PrivateChannelModal
          type={channelType}
          setType={setChannelType}
          name={channelName}
          setName={setChannelName}
          onClose={() => setShowChannelModal(false)}
          onCreate={createPrivateChannel}
        />
      )}

      {/* 100% Discord Create Community Modal */}
      {showCommunityModal && (
        <CreateCommunityModal
          userDisplayName={currentUser.displayName}
          onClose={() => setShowCommunityModal(false)}
          onCreate={handleCreateCommunity}
        />
      )}

      {/* Full Discord Server Settings Modal with System Roles */}
      {showCommunitySettings && community && (
        <CommunitySettingsModal
          community={community}
          onClose={() => setShowCommunitySettings(false)}
          onUpdateCommunity={handleUpdateCommunity}
          onDeleteCommunity={handleDeleteCommunity}
        />
      )}

      {/* User Settings Page */}
      {showSettings && (
        <SettingsPage
          user={currentUser}
          onClose={() => setShowSettings(false)}
          onUserUpdated={(user) => setCurrentUser(mapSupabaseUserToProfile(user))}
        />
      )}

      {/* Delete Channel Modal */}
      {channelToDelete && (
        <DeleteChannelModal
          name={channelToDelete}
          onClose={() => setChannelToDelete(null)}
          onDelete={deleteChannel}
        />
      )}
    </div>
  )
}

function ChannelRow({
  name,
  active,
  privateChannel = false,
  onClick,
  onContextMenu
}: {
  name: string
  active: boolean
  privateChannel?: boolean
  onClick: () => void
  onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button className={`channel-row ${active ? 'active' : ''}`} onClick={onClick} onContextMenu={onContextMenu}>
      <Hash size={17} />
      <span>{name}</span>
      {privateChannel && <LockKeyhole size={12} className="private-icon" />}
      {name === 'announcements' && <b>3</b>}
    </button>
  )
}

function MessageRow({
  message,
  authorColor
}: {
  message: Message
  authorColor: string
}) {
  return (
    <article className="message-row">
      <Avatar member={message} />
      <div className="message-content">
        <div className="message-meta">
          <strong style={{ color: authorColor }}>{message.name}</strong>
          <time>{message.time}</time>
        </div>
        {message.text && (
          <p>
            {message.text.split('\n').map((line, index) => (
              <span key={line}>{index > 0 && <br />}{line}</span>
            ))}
          </p>
        )}
        {message.attachment && (
          <div className="attachment">
            <div className="attachment-icon"><FileText size={21} /></div>
            <div>
              <strong>{message.attachment}</strong>
              <span>2.4 MB • ZIP archive</span>
            </div>
            <button aria-label="Download attachment"><Download size={19} /></button>
          </div>
        )}
        {message.reactions && (
          <div className="reactions">
            {message.reactions.map((reaction) => (
              <button key={reaction}>{reaction}</button>
            ))}
          </div>
        )}
        <div className="message-tools">
          <button aria-label="Reply"><ChevronLeft size={14} /> Reply</button>
          <button aria-label="More message actions"><MoreHorizontal size={15} /></button>
        </div>
      </div>
    </article>
  )
}

// Authentic Discord Hoisted Member List
function CommunityMembersSidebar({
  community,
  mobilePanel,
  setMobilePanel
}: {
  community: Community | null
  mobilePanel: string | null
  setMobilePanel: (panel: any) => void
}) {
  if (!community) return null

  // Hoisted roles sorted by position
  const hoistedRoles = community.roles
    .filter((r) => r.hoist && r.id !== 'everyone')
    .sort((a, b) => a.position - b.position)

  const assignedMemberIds = new Set<string>()

  const roleGroups = hoistedRoles
    .map((role) => {
      const membersInRole = community.members.filter((m) => {
        if (assignedMemberIds.has(m.id)) return false
        if (m.status !== 'Offline' && m.roleIds.includes(role.id)) {
          assignedMemberIds.add(m.id)
          return true
        }
        return false
      })
      return {
        role,
        title: `${role.name.toUpperCase()} — ${membersInRole.length}`,
        members: membersInRole
      }
    })
    .filter((g) => g.members.length > 0)

  // Remaining online members
  const remainingOnline = community.members.filter(
    (m) => !assignedMemberIds.has(m.id) && m.status !== 'Offline'
  )

  // Offline members
  const offlineMembers = community.members.filter((m) => m.status === 'Offline')

  return (
    <aside className={`members-panel ${mobilePanel === 'members' ? 'mobile-open' : ''}`}>
      <div className="mobile-panel-header">
        <strong>Members</strong>
        <button className="icon-button" onClick={() => setMobilePanel(null)} aria-label="Close members">
          <X size={18} />
        </button>
      </div>

      {/* Hoisted Role Groups */}
      {roleGroups.map((group) => (
        <section className="member-group" key={group.role.id}>
          <h3 style={{ color: group.role.color }}>{group.title}</h3>
          {group.members.map((member) => (
            <div className="member-row" key={member.id}>
              <div className="presence-wrap">
                <Avatar member={member} size="small" />
                <span className={`presence-dot ${member.status.toLowerCase().replace(/\s+/g, '-')}`} />
              </div>
              <div>
                <strong style={{ color: group.role.color }}>{member.name}</strong>
                <span>@{member.username}</span>
              </div>
            </div>
          ))}
        </section>
      ))}

      {/* Online (Unhoisted) Group */}
      {remainingOnline.length > 0 && (
        <section className="member-group">
          <h3>ONLINE — {remainingOnline.length}</h3>
          {remainingOnline.map((member) => {
            const memberRole = community.roles.find(
              (r) => member.roleIds.includes(r.id) && r.id !== 'everyone'
            )
            return (
              <div className="member-row" key={member.id}>
                <div className="presence-wrap">
                  <Avatar member={member} size="small" />
                  <span className={`presence-dot ${member.status.toLowerCase().replace(/\s+/g, '-')}`} />
                </div>
                <div>
                  <strong style={{ color: memberRole?.color || '#edf5ff' }}>{member.name}</strong>
                  <span>@{member.username}</span>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* Offline Group */}
      {offlineMembers.length > 0 && (
        <section className="member-group offline">
          <h3>OFFLINE — {offlineMembers.length}</h3>
          {offlineMembers.map((member) => (
            <div className="member-row" key={member.id}>
              <div className="presence-wrap">
                <Avatar member={member} size="small" />
              </div>
              <div>
                <strong>{member.name}</strong>
                <span>Offline</span>
              </div>
            </div>
          ))}
        </section>
      )}
    </aside>
  )
}

function PrivateChannelModal({
  type,
  setType,
  name,
  setName,
  onClose,
  onCreate
}: {
  type: 'text' | 'voice'
  setType: (type: 'text' | 'voice') => void
  name: string
  setName: (name: string) => void
  onClose: () => void
  onCreate: () => void
}) {
  return (
    <div className="modal-backdrop">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="channel-title">
        <button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="dialog-icon"><LockKeyhole size={21} /></div>
        <h2 id="channel-title">Create a channel</h2>
        <p>Create a place for your community to collaborate.</p>
        <div className="channel-type-tabs">
          <button className={type === 'text' ? 'selected' : ''} onClick={() => setType('text')}>
            <Hash size={15} /> Text
          </button>
          <button className={type === 'voice' ? 'selected' : ''} onClick={() => setType('voice')}>
            <Volume2 size={15} /> Voice
          </button>
        </div>
        <label>
          Channel name
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onCreate()}
            placeholder={type === 'text' ? 'new-channel' : 'Voice Lounge'}
          />
        </label>
        <button className="primary-button" disabled={!name.trim()} onClick={onCreate}>
          Create channel <ChevronRight size={16} />
        </button>
      </section>
    </div>
  )
}

function DeleteChannelModal({
  name,
  onClose,
  onDelete
}: {
  name: string
  onClose: () => void
  onDelete: () => void
}) {
  return (
    <div className="modal-backdrop">
      <section className="dialog danger-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-channel-title">
        <button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="dialog-icon danger-icon"><Trash2 size={21} /></div>
        <h2 id="delete-channel-title">Delete #{name}?</h2>
        <p>This channel and its messages will be removed for everyone. This action cannot be undone.</p>
        <div className="dialog-actions">
          <button className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="danger-button" onClick={onDelete}>Delete channel</button>
        </div>
      </section>
    </div>
  )
}

function SettingsPage({
  user,
  onClose,
  onUserUpdated
}: {
  user: { displayName: string; username: string; email: string; bio?: string; avatarUrl?: string }
  onClose: () => void
  onUserUpdated: (user: User) => void
}) {
  const [section, setSection] = useState('account')
  const [email, setEmail] = useState(user.email)
  const [displayName, setDisplayName] = useState(user.displayName)
  const [username, setUsername] = useState(user.username)
  const [bio, setBio] = useState(user.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [totpUri, setTotpUri] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [twoStepEnabled, setTwoStepEnabled] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  const supabase = getSupabaseClient()

  useEffect(() => {
    supabase?.auth.mfa.listFactors().then(({ data }) => {
      setTwoStepEnabled(Boolean(data?.totp?.some((factor) => factor.status === 'verified')))
    })
  }, [supabase])

  function clearFeedback() {
    setMessage(null)
    setError(null)
  }

  async function updateEmail() {
    if (!supabase || !email.trim()) return
    setSaving(true)
    clearFeedback()
    const { data, error: updateError } = await supabase.auth.updateUser({ email: email.trim() })
    if (updateError) setError(updateError.message)
    else if (data.user) {
      onUserUpdated(data.user)
      setMessage('A confirmation link was sent to your new email address.')
    }
    setSaving(false)
  }

  function chooseAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile images must be smaller than 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setAvatarUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  async function updateProfile() {
    if (!supabase || !displayName.trim() || !username.trim()) {
      setError('Display name and username are required.')
      return
    }
    setSaving(true)
    clearFeedback()
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    const { data, error: updateError } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim(), username: cleanUsername, bio: bio.trim(), avatar_url: avatarUrl }
    })
    if (updateError) setError(updateError.message)
    else if (data.user) {
      onUserUpdated(data.user)
      setUsername(cleanUsername)
      setMessage('Profile updated successfully.')
    }
    setSaving(false)
  }

  async function updatePassword() {
    if (!supabase || password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    setSaving(true)
    clearFeedback()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) setError(updateError.message)
    else {
      setPassword('')
      setMessage('Your password was changed successfully.')
    }
    setSaving(false)
  }

  async function startTwoStep() {
    if (!supabase) return
    setSaving(true)
    clearFeedback()
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'KHTALK Authenticator' })
    if (enrollError) setError(enrollError.message)
    else if (data) {
      setFactorId(data.id)
      setTotpUri(data.totp.uri)
      setMessage('Scan the authenticator code, then enter the six-digit code to finish setup.')
    }
    setSaving(false)
  }

  async function verifyTwoStep() {
    if (!supabase || !factorId || verificationCode.length !== 6) return
    setSaving(true)
    clearFeedback()
    const { data, challenge, error: challengeError } = (await supabase.auth.mfa.challenge({ factorId })) as any
    if (challengeError) setError(challengeError.message)
    else {
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: verificationCode })
      if (verifyError) setError(verifyError.message)
      else {
        setTwoStepEnabled(true)
        setTotpUri(null)
        setFactorId(null)
        setVerificationCode('')
        setMessage('Two-step verification is enabled.')
      }
    }
    setSaving(false)
  }

  function generateBackupCodes() {
    const codes = Array.from({ length: 8 }, () => `${crypto.randomUUID().slice(0, 4)}-${crypto.randomUUID().slice(0, 4)}`.toUpperCase())
    setBackupCodes(codes)
    setMessage('Save these codes somewhere secure. They will not be shown again after leaving this page.')
  }

  const sections = [
    { id: 'account', label: 'My account', icon: UserRound },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'privacy', label: 'Privacy & safety', icon: Eye },
    { id: 'notifications', label: 'Notifications', icon: BellRing },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'help', label: 'Help & support', icon: HelpCircle }
  ]

  return (
    <div className="settings-page">
      <aside className="settings-nav">
        <button className="settings-back" onClick={onClose}><ChevronLeft size={18} /> Back</button>
        <h2>Settings</h2>
        {sections.map(({ id, label, icon: Icon }) => (
          <button key={id} className={section === id ? 'selected' : ''} onClick={() => { setSection(id); clearFeedback() }}>
            <Icon size={16} /> {label}
          </button>
        ))}
        <div className="settings-nav-footer">KHTALK<br /><span>Developed by Chiro</span></div>
      </aside>
      <main className="settings-content">
        <header className="settings-titlebar">
          <div><p>SETTINGS</p><h1>{sections.find((item) => item.id === section)?.label}</h1></div>
          <button className="settings-close" onClick={onClose} aria-label="Close settings"><X size={20} /></button>
        </header>
        {message && <div className="settings-message">{message}</div>}
        {error && <div className="settings-error">{error}</div>}

        {section === 'account' && <>
          <SettingsCard icon={<UserRound size={18} />} title="Profile" description="Customize your name, profile image, and bio.">
            <div className="settings-user-summary"><Avatar member={{ avatar: displayName.charAt(0).toUpperCase(), color: 'blue', avatarUrl }} /><div><strong>{displayName}</strong><span>@{username}</span></div></div>
            <div className="settings-avatar-upload"><span>Profile image</span><label className="upload-button"><Pencil size={14} /> Choose image<input type="file" accept="image/*" onChange={chooseAvatar} /></label><small>JPG, PNG, or WEBP up to 2 MB</small></div>
            <label className="settings-field">Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={50} /></label>
            <label className="settings-field">Username<input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={30} /></label>
            <label className="settings-field">Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} placeholder="Tell people a little about yourself" /></label>
            <button className="settings-action" disabled={saving} onClick={updateProfile}><Pencil size={15} /> Save profile</button>
          </SettingsCard>
          <SettingsCard icon={<Mail size={18} />} title="Account information" description="Manage the details connected to your KHTALK account.">
            <label className="settings-field">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <button className="settings-action" disabled={saving || email === user.email} onClick={updateEmail}><Mail size={15} /> Change email</button>
          </SettingsCard>
          <SettingsCard icon={<KeyRound size={18} />} title="Password" description="Use a strong password that you do not reuse elsewhere.">
            <label className="settings-field">New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>
            <button className="settings-action" disabled={saving || !password} onClick={updatePassword}><KeyRound size={15} /> Change password</button>
          </SettingsCard>
        </>}

        {section === 'security' && <>
          <SettingsCard icon={<ShieldCheck size={18} />} title="Two-step verification" description="Protect your account with an authenticator app.">
            <div className="settings-row"><div><strong>{twoStepEnabled ? 'Two-step verification is on' : 'Two-step verification is off'}</strong><span>{twoStepEnabled ? 'Your account requires an authenticator code.' : 'Add another layer of protection.'}</span></div><span className={`settings-badge ${twoStepEnabled ? 'on' : ''}`}>{twoStepEnabled ? 'ON' : 'OFF'}</span></div>
            {!twoStepEnabled && !factorId && <button className="settings-action" disabled={saving} onClick={startTwoStep}><ShieldCheck size={15} /> Set up two-step verification</button>}
            {totpUri && <div className="totp-setup"><small>Authenticator setup key</small><code>{totpUri}</code><input inputMode="numeric" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))} placeholder="6-digit code" /><button className="settings-action" disabled={saving || verificationCode.length !== 6} onClick={verifyTwoStep}>Verify and enable</button></div>}
          </SettingsCard>
          <SettingsCard icon={<KeyRound size={18} />} title="Backup codes" description="Use a backup code if you lose access to your authenticator.">
            <button className="settings-action" onClick={generateBackupCodes}><KeyRound size={15} /> Generate backup codes</button>
            {backupCodes.length > 0 && <div className="backup-code-grid">{backupCodes.map((code) => <code key={code}>{code}</code>)}</div>}
          </SettingsCard>
        </>}

        {section === 'privacy' && <SettingsCard icon={<Eye size={18} />} title="Privacy & safety" description="Control how your account is discovered and contacted."><SettingsToggle title="Allow direct messages" description="Let community members message you." /><SettingsToggle title="Show online status" description="Let others see when you are online." /><SettingsToggle title="Filter sensitive content" description="Hide potentially unsafe messages." /></SettingsCard>}
        {section === 'notifications' && <SettingsCard icon={<BellRing size={18} />} title="Notifications" description="Choose which activity should get your attention."><SettingsToggle title="Message notifications" description="Notify me about new messages." /><SettingsToggle title="Community announcements" description="Notify me about important updates." /></SettingsCard>}
        {section === 'appearance' && <SettingsCard icon={<Palette size={18} />} title="Appearance" description="Personalize the KHTALK interface."><SettingsToggle title="Compact message layout" description="Use less space between messages." /><SettingsToggle title="Use animations" description="Keep interface transitions enabled." /></SettingsCard>}
        {section === 'help' && <SettingsCard icon={<HelpCircle size={18} />} title="Help & support" description="Find answers and contact the KHTALK team."><div className="help-row"><strong>Need help?</strong><span>Check the project documentation or contact support.</span></div><div className="help-row"><strong>About KHTALK</strong><span>Built with care by Chiro.</span></div></SettingsCard>}
      </main>
    </div>
  )
}

function SettingsCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <section className="settings-card"><div className="settings-card-heading"><div className="settings-card-icon">{icon}</div><div><h2>{title}</h2><p>{description}</p></div></div><div className="settings-card-body">{children}</div></section>
}

function SettingsToggle({ title, description }: { title: string; description: string }) {
  const [enabled, setEnabled] = useState(true)
  return <button className="settings-toggle" onClick={() => setEnabled(!enabled)}><span><strong>{title}</strong><small>{description}</small></span><span className={`toggle-track ${enabled ? 'enabled' : ''}`}><span /></span></button>
}

export default App
