import { useState, useEffect } from 'react'
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
import { getSupabaseClient, mapSupabaseUserToProfile } from './lib/supabase'
import { UserStatus } from './types/auth'

type Message = {
  id: number
  name: string
  time: string
  avatar: string
  color: string
  text?: string
  attachment?: string
  reactions?: string[]
}

type Community = {
  id: string
  name: string
  slug: string
  iconUrl: string
  backgroundUrl?: string | null
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
  const [sentMessages, setSentMessages] = useState<Message[]>([])
  const [customMenu, setCustomMenu] = useState<{ x: number; y: number } | null>(null)
  const [channelMenu, setChannelMenu] = useState<{ name: string; x: number; y: number } | null>(null)
  const [channelToDelete, setChannelToDelete] = useState<string | null>(null)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [privateChannels, setPrivateChannels] = useState<string[]>([])
  const [privateVoiceChannels, setPrivateVoiceChannels] = useState<string[]>([])
  const [channelName, setChannelName] = useState('')
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text')
  const [removedChannels, setRemovedChannels] = useState<string[]>([])
  const [community, setCommunity] = useState<Community | null>(null)
  const [showCommunityModal, setShowCommunityModal] = useState(false)
  const [communityName, setCommunityName] = useState('')
  const [communityError, setCommunityError] = useState<string | null>(null)
  const [communityLoading, setCommunityLoading] = useState(false)
  const [showCommunitySettings, setShowCommunitySettings] = useState(false)
  const [communityIconUrl, setCommunityIconUrl] = useState('')
  const [communityBackgroundUrl, setCommunityBackgroundUrl] = useState('')
  const [communitySettingsError, setCommunitySettingsError] = useState<string | null>(null)
  const [communitySettingsSaving, setCommunitySettingsSaving] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) return

    // Verify existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session?.user) {
        setCurrentUser(mapSupabaseUserToProfile(session.user))
      }
    })

    // Listen for auth events (sign in, sign out, user updated)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(mapSupabaseUserToProfile(session.user))
      } else {
        setCurrentUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setCurrentUser])

  async function handleSignOut() {
    const supabase = getSupabaseClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    setCurrentUser(null)
    setShowUserMenu(false)
  }


  const allMessages = sentMessages
  function sendMessage() {
    const text = draft.trim()
    if (!text) return
    if (!currentUser) return

    setSentMessages((current) => [
      ...current,
      {
        id: Date.now(),
        name: currentUser.displayName,
        time: 'Just now',
        avatar: currentUser.avatar,
        color: currentUser.color,
        text
      }
    ])
    setDraft('')
  }

  function requestPrivateChannel(type: 'text' | 'voice' = 'text') {
    if (!currentUser) return
    setChannelType(type)
    setShowChannelModal(true)
  }

  function communityIcon(name: string) {
    const initial = name.trim().charAt(0).toUpperCase() || 'K'
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="32" fill="#1b8bff"/><path d="M38 31h17v27l25-27h22L75 63l28 34H81L55 69v28H38z" fill="#fff"/><circle cx="99" cy="29" r="15" fill="#ff7f6e"/><text x="99" y="35" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#10213d">${initial}</text></svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  }

  function chooseCommunityImage(event: React.ChangeEvent<HTMLInputElement>, target: 'icon' | 'background') {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setCommunitySettingsError('Choose an image file.')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setCommunitySettingsError('Community images must be smaller than 3 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => target === 'icon' ? setCommunityIconUrl(String(reader.result)) : setCommunityBackgroundUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  function openCommunitySettings() {
    if (!community) return
    setCommunityIconUrl(community.iconUrl)
    setCommunityBackgroundUrl(community.backgroundUrl || '')
    setCommunitySettingsError(null)
    setCustomMenu(null)
    setShowCommunitySettings(true)
  }

  async function saveCommunitySettings(name: string) {
    if (!community || !currentUser) return
    setCommunitySettingsSaving(true)
    setCommunitySettingsError(null)
    const supabase = getSupabaseClient()
    const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
    const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:4000'
    try {
      const response = await fetch(`${apiUrl}/api/servers/${community.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-subject': session?.user.id || currentUser.id,
          'x-auth-email': currentUser.email,
          'x-auth-display-name': currentUser.displayName,
          'x-auth-username': currentUser.username
        },
        body: JSON.stringify({ name, iconUrl: communityIconUrl, backgroundUrl: communityBackgroundUrl || undefined })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update community.')
      setCommunity(result)
      setShowCommunitySettings(false)
    } catch (error) {
      setCommunitySettingsError(error instanceof Error ? error.message : 'Could not update community.')
    } finally {
      setCommunitySettingsSaving(false)
    }
  }

  async function createCommunity() {
    const name = communityName.trim()
    if (!name || !currentUser) return
    setCommunityLoading(true)
    setCommunityError(null)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const supabase = getSupabaseClient()
    const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
    const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:4000'

    try {
      const response = await fetch(`${apiUrl}/api/servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-subject': session?.user.id || currentUser.id,
          'x-auth-email': currentUser.email,
          'x-auth-display-name': currentUser.displayName,
          'x-auth-username': currentUser.username
        },
        body: JSON.stringify({ name, slug, iconUrl: communityIcon(name) })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not create community.')
      setCommunity(result)
      setCommunityName('')
      setShowCommunityModal(false)
    } catch (error) {
      setCommunityError(error instanceof Error ? error.message : 'Could not connect to the community API.')
    } finally {
      setCommunityLoading(false)
    }
  }

  function createPrivateChannel() {
    const name = channelName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    if (!name) return
    if (channelType === 'voice') setPrivateVoiceChannels((current) => [...current, name])
    else setPrivateChannels((current) => [...current, name])
    setActiveChannel(name)
    setChannelName('')
    setShowChannelModal(false)
  }

  function requestDeleteChannel(name: string) {
    setChannelMenu(null)
    setChannelToDelete(name)
  }

  function deleteChannel() {
    if (!channelToDelete) return
    setRemovedChannels((current) => [...current, channelToDelete])
    if (activeChannel === channelToDelete) setActiveChannel('general')
    setChannelToDelete(null)
  }

  // If not logged in, render the real Supabase Auth page
  if (!currentUser) {
    return <AuthPage />
  }

  const memberList = [{
    name: currentUser.displayName,
    status: currentUser.status,
    avatar: currentUser.avatar,
    color: currentUser.color
  }]

  return (
    <div
      className="app-shell"
      style={community?.backgroundUrl ? { backgroundImage: `linear-gradient(rgba(6, 19, 38, .78), rgba(6, 19, 38, .9)), url(${community.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      onContextMenu={(event) => event.preventDefault()}
      onClick={() => {
        setCustomMenu(null)
        setChannelMenu(null)
        setShowUserMenu(false)
      }}
    >
      <header className="mobile-topbar">
        <button className="icon-button" onClick={() => setMobilePanel('channels')} aria-label="Open channels">
          <Menu size={19} />
        </button>
        <BrandMark small />
        <strong>KHTALK</strong>
        <button className="icon-button" onClick={() => setMobilePanel('members')} aria-label="Open members">
          <Users size={19} />
        </button>
      </header>

      <aside className="server-rail">
        <BrandMark />
        <div className="rail-divider" />
        {community && (
          <button
            className="server-icon active"
            aria-label={community.name}
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setCustomMenu({ x: event.clientX, y: event.clientY })
            }}
          >
            <img src={community.iconUrl} alt="" />
          </button>
        )}
        <button className="server-icon add" aria-label="Create community" onClick={() => { setCommunityError(null); setShowCommunityModal(true) }}>
          <Plus size={20} />
        </button>
        <div className="rail-spacer" />
        <button className="server-icon" aria-label="Discover"><Compass size={20} /></button>
      </aside>

      <aside className={`channel-sidebar ${mobilePanel === 'channels' ? 'mobile-open' : ''}`}>
        <div className="server-heading">
          {community && <><span>{community.name}</span><ChevronDown size={16} /></>}
        </div>
        <div className="channel-scroll">
          {community && <div className="channel-category">
            <span>TEXT CHANNELS</span>
            <button aria-label="Create private channel" onClick={() => requestPrivateChannel('text')}>
              <Plus size={14} />
            </button>
          </div>}
          {community && ['general', ...privateChannels]
            .filter((channel) => !removedChannels.includes(channel))
            .map((channel) => (
              <ChannelRow
                key={channel}
                name={channel}
                active={activeChannel === channel}
                onContextMenu={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setChannelMenu({ name: channel, x: event.clientX, y: event.clientY })
                }}
                onClick={() => {
                  setActiveChannel(channel)
                  setMobilePanel(null)
                }}
              />
            ))}
          {community && <div className="channel-category space-top">
            <span>VOICE CHANNELS</span>
            <button aria-label="Create private voice channel" onClick={() => requestPrivateChannel('voice')}>
              <Plus size={14} />
            </button>
          </div>}
          {community && ['General', ...privateVoiceChannels].map((channel) => (
            <div className="voice-row" key={channel}>
              <Volume2 size={15} />
              <span>{channel}</span>
              {privateVoiceChannels.includes(channel) && <LockKeyhole size={12} className="private-icon" />}
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

      <main className="chat-panel">
        <div className="chat-header">
          <div className="channel-title">
            {community && <Hash size={21} />}
            <div>
              {community && <><h1>{activeChannel}</h1><span>Share ideas, updates, and good energy.</span></>}
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

        <div className={`message-area ${!community ? 'empty-community-main' : ''}`}>
          {community ? (
            <>
          <div className="welcome-block">
            <div className="welcome-icon"><Hash size={26} /></div>
            <h2>Welcome to #{activeChannel}</h2>
            <p>This is the beginning of the #{activeChannel} channel.</p>
          </div>
          {allMessages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
            </>
          ) : null}
        </div>

        {community && <div className="composer-wrap">
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
        </div>}
      </main>

      <aside className={`members-panel ${mobilePanel === 'members' ? 'mobile-open' : ''}`}>
        <div className="mobile-panel-header">
          <strong>Members</strong>
          <button className="icon-button" onClick={() => setMobilePanel(null)} aria-label="Close members"><X size={18} /></button>
        </div>
          {community && <MemberGroup title="ONLINE" members={memberList} />}
      </aside>

      {mobilePanel && <button className="mobile-backdrop" onClick={() => setMobilePanel(null)} aria-label="Close menu" />}
      {customMenu && (
        <div className="server-context-menu" style={{ left: customMenu.x, top: customMenu.y }} onClick={(event) => event.stopPropagation()}>
          <strong>{community?.name || 'Community'}</strong>
          <button onClick={openCommunitySettings}>
            <Pencil size={15} /> Edit community
          </button>
            <button onClick={() => { setCommunity(null); setCustomMenu(null) }}>
            <Trash2 size={15} /> Delete server
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
      {showCommunityModal && (
        <CreateCommunityModal
          name={communityName}
          error={communityError}
          loading={communityLoading}
          setName={setCommunityName}
          onClose={() => setShowCommunityModal(false)}
          onCreate={createCommunity}
        />
      )}
      {showCommunitySettings && community && (
        <CommunitySettingsModal
          name={community.name}
          iconUrl={communityIconUrl}
          backgroundUrl={communityBackgroundUrl}
          error={communitySettingsError}
          saving={communitySettingsSaving}
          onIconChange={(event) => chooseCommunityImage(event, 'icon')}
          onBackgroundChange={(event) => chooseCommunityImage(event, 'background')}
          onClose={() => setShowCommunitySettings(false)}
          onSave={saveCommunitySettings}
        />
      )}
      {showSettings && (
        <SettingsPage user={currentUser} onClose={() => setShowSettings(false)} onUserUpdated={(user) => setCurrentUser(mapSupabaseUserToProfile(user))} />
      )}
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

function MessageRow({ message }: { message: Message }) {
  return (
    <article className="message-row">
      <Avatar member={message} />
      <div className="message-content">
        <div className="message-meta">
          <strong>{message.name}</strong>
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

function MemberGroup({
  title,
  members,
  offline = false
}: {
  title: string
  members: { name: string; status: string; avatar: string; color: string }[]
  offline?: boolean
}) {
  return (
    <section className={`member-group ${offline ? 'offline' : ''}`}>
      <h3>{title}</h3>
      {members.map((member) => (
        <div className="member-row" key={member.name}>
          <div className="presence-wrap">
            <Avatar member={member} size="small" />
            {!offline && <span className="presence-dot" />}
          </div>
          <div>
            <strong>{member.name}</strong>
            <span>{member.status}</span>
          </div>
        </div>
      ))}
    </section>
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
        <h2 id="channel-title">Create a private channel</h2>
        <p>Only members you invite will be able to see and use this channel.</p>
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
            placeholder={type === 'text' ? 'project-room' : 'team lounge'}
          />
        </label>
        <div className="privacy-note">
          <LockKeyhole size={15} />
          <span>Private by default · Owner permissions enabled</span>
        </div>
        <button className="primary-button" disabled={!name.trim()} onClick={onCreate}>
          Create {type} channel <ChevronRight size={16} />
        </button>
      </section>
    </div>
  )
}

function CommunitySettingsModal({
  name,
  iconUrl,
  backgroundUrl,
  error,
  saving,
  onIconChange,
  onBackgroundChange,
  onClose,
  onSave
}: {
  name: string
  iconUrl: string
  backgroundUrl: string
  error: string | null
  saving: boolean
  onIconChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onBackgroundChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onClose: () => void
  onSave: (name: string) => void
}) {
  const [communityName, setCommunityName] = useState(name)
  return (
    <div className="modal-backdrop">
      <section className="dialog community-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="community-settings-title">
        <button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="community-art community-art-preview" style={{ backgroundImage: `url(${iconUrl})` }} aria-hidden="true" />
        <h2 id="community-settings-title">Customize community</h2>
        <p>Choose the identity and background for this community.</p>
        <label>Community name<input value={communityName} onChange={(event) => setCommunityName(event.target.value)} maxLength={80} /></label>
        <label className="community-image-picker">Community icon<input type="file" accept="image/*" onChange={onIconChange} /><small>PNG, JPG, or WEBP up to 3 MB</small></label>
        <label className="community-image-picker">Community background<input type="file" accept="image/*" onChange={onBackgroundChange} /><small>Used behind your channels and chat</small></label>
        {backgroundUrl && <div className="community-background-preview" style={{ backgroundImage: `url(${backgroundUrl})` }} />}
        {error && <div className="modal-error" role="alert">{error}</div>}
        <div className="dialog-actions">
          <button className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary-button profile-save-button" disabled={saving || !communityName.trim()} onClick={() => onSave(communityName.trim())}>{saving ? 'Saving...' : 'Save community'}</button>
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
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
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
            <label className="settings-avatar-upload"><span>Profile image</span><input type="file" accept="image/*" onChange={chooseAvatar} /><small>Choose an image up to 2 MB</small></label>
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

function CreateCommunityModal({
  name,
  error,
  loading,
  setName,
  onClose,
  onCreate
}: {
  name: string
  error: string | null
  loading: boolean
  setName: (name: string) => void
  onClose: () => void
  onCreate: () => void
}) {
  return (
    <div className="modal-backdrop">
      <section className="dialog community-dialog" role="dialog" aria-modal="true" aria-labelledby="community-title">
        <button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="community-art" aria-hidden="true"><BrandMark small /></div>
        <h2 id="community-title">Create a community</h2>
        <p>Build a place for your friends, team, or interest group.</p>
        <label>
          Community name
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onCreate()}
            placeholder="My awesome community"
            maxLength={80}
          />
        </label>
        {error && <div className="modal-error" role="alert">{error}</div>}
        <button className="primary-button" disabled={loading || !name.trim()} onClick={onCreate}>
          {loading ? 'Creating...' : 'Create community'} <ChevronRight size={16} />
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

export default App
