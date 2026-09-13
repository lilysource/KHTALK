import { useState, useEffect } from 'react'
import {
  Bell, ChevronDown, ChevronLeft, ChevronRight, Compass,
  Download, FileText, Gift, Hash, Headphones, Menu, Mic,
  MoreHorizontal, Pin, Plus, Search, Send, Settings, Smile,
  Sparkles, Users, Volume2, X, Trash2, LockKeyhole, LogOut, Check
} from 'lucide-react'
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

const initialMessages: Message[] = [
  { id: 1, name: 'Makara', time: 'Today at 8:12 AM', avatar: 'M', color: 'coral', text: 'Hello everyone! 👋\nHow are you today?' },
  { id: 2, name: 'SovanTech', time: 'Today at 8:14 AM', avatar: 'S', color: 'cyan', text: "I'm good bro. Just finished coding my website. 😄\nStill working on the UI." },
  { id: 3, name: 'Nara', time: 'Today at 8:16 AM', avatar: 'N', color: 'cream', text: "Wow! That's awesome. Can you share it later?\nI'm also working on a new project. 😄" },
  { id: 4, name: 'SovanTech', time: 'Today at 8:17 AM', avatar: 'S', color: 'cyan', attachment: 'website-demo.zip' },
  { id: 5, name: 'Makara', time: 'Today at 8:18 AM', avatar: 'M', color: 'coral', text: 'Nice! I’ll check it out. 👍\nBy the way, does anyone play Roblox here?' },
  { id: 6, name: 'Pov', time: 'Today at 8:20 AM', avatar: 'P', color: 'violet', text: "Yeah! I play sometimes. What's your username?" },
  { id: 7, name: 'Makara', time: 'Today at 8:21 AM', avatar: 'M', color: 'coral', text: 'My username is MakaraKH\nAdd me if you want. 🙂' },
  { id: 8, name: 'Pov', time: 'Today at 8:22 AM', avatar: 'P', color: 'violet', text: "Sure! I'll add you later.", reactions: ['👍 1'] }
]

const members = [
  { name: 'Makara', status: 'Online', avatar: 'M', color: 'coral' },
  { name: 'SovanTech', status: 'Playing Visual Studio Code', avatar: 'S', color: 'cyan' },
  { name: 'Nara', status: 'Online', avatar: 'N', color: 'cream' },
  { name: 'Pov', status: 'Playing Roblox', avatar: 'P', color: 'violet' },
  { name: 'Rith', status: 'Online', avatar: 'R', color: 'mint' },
  { name: 'Sokha', status: 'Listening to Spotify', avatar: 'S', color: 'teal' },
  { name: 'Dara', status: 'Online', avatar: 'D', color: 'peach' },
  { name: 'Vanda', status: 'Online', avatar: 'V', color: 'sky' },
  { name: 'Chantrea', status: 'Playing Minecraft', avatar: 'C', color: 'gold' },
  { name: 'Tola', status: 'Online', avatar: 'T', color: 'ice' }
]

function BrandMark({ small = false }: { small?: boolean }) {
  return <div className={`brand-mark ${small ? 'small' : ''}`} aria-label="KHTALK">K</div>
}

function Avatar({ member, size = 'regular' }: { member: { avatar: string; color: string }; size?: string }) {
  return <div className={`avatar ${member.color} ${size}`}>{member.avatar}</div>
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
  const [privateChannels, setPrivateChannels] = useState<string[]>([])
  const [privateVoiceChannels, setPrivateVoiceChannels] = useState<string[]>([])
  const [channelName, setChannelName] = useState('')
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text')
  const [serverVisible, setServerVisible] = useState(true)
  const [removedChannels, setRemovedChannels] = useState<string[]>([])

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

  const allMessages = [...initialMessages, ...sentMessages]

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

  return (
    <div
      className="app-shell"
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
        {serverVisible && (
          <button
            className="server-icon active"
            aria-label="KHTALK Community"
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setCustomMenu({ x: event.clientX, y: event.clientY })
            }}
          >
            <BrandMark small />
          </button>
        )}
        <button className="server-icon" aria-label="Design club"><Sparkles size={20} /></button>
        <button className="server-icon" aria-label="Study circle"><span className="server-letter">S</span></button>
        <button className="server-icon add" aria-label="Create server" onClick={() => requestPrivateChannel('text')}>
          <Plus size={20} />
        </button>
        <div className="rail-spacer" />
        <button className="server-icon" aria-label="Discover"><Compass size={20} /></button>
      </aside>

      <aside className={`channel-sidebar ${mobilePanel === 'channels' ? 'mobile-open' : ''}`}>
        <div className="server-heading">
          <span>KHTALK Community</span>
          <ChevronDown size={16} />
        </div>
        <div className="channel-scroll">
          <div className="channel-category">
            <span>TEXT CHANNELS</span>
            <button aria-label="Create private channel" onClick={() => requestPrivateChannel('text')}>
              <Plus size={14} />
            </button>
          </div>
          {['general', 'announcements', 'rules', 'bot-commands']
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
          <div className="channel-category space-top">
            <span>COMMUNITY</span>
            <button aria-label="Create channel" onClick={() => requestPrivateChannel('text')}>
              <Plus size={14} />
            </button>
          </div>
          {['gaming', 'technology', 'school', 'off-topic', ...privateChannels]
            .filter((channel) => !removedChannels.includes(channel))
            .map((channel) => (
              <ChannelRow
                key={channel}
                name={channel}
                privateChannel={privateChannels.includes(channel)}
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
          <div className="channel-category space-top">
            <span>VOICE CHANNELS</span>
            <button aria-label="Create private voice channel" onClick={() => requestPrivateChannel('voice')}>
              <Plus size={14} />
            </button>
          </div>
          {['General', 'Gaming', 'Music', ...privateVoiceChannels].map((channel) => (
            <div className="voice-row" key={channel}>
              <Volume2 size={15} />
              <span>{channel}</span>
              {privateVoiceChannels.includes(channel) && <LockKeyhole size={12} className="private-icon" />}
              <small>00</small>
            </div>
          ))}
        </div>

        {/* Real Logged-in User Panel & Popover */}
        <div style={{ position: 'relative' }}>
          {showUserMenu && (
            <div className="user-profile-popover" onClick={(e) => e.stopPropagation()}>
              <div className="popover-header">
                <Avatar member={{ avatar: currentUser.avatar, color: currentUser.color }} size="small" />
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
              <Avatar member={{ avatar: currentUser.avatar, color: currentUser.color }} size="small" />
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
            <Settings size={17} />
          </div>
        </div>
      </aside>

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
          {allMessages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
          <div className="typing">
            <span className="typing-dots"><i /><i /><i /></span>
            <strong>SovanTech</strong> is typing...
          </div>
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

      <aside className={`members-panel ${mobilePanel === 'members' ? 'mobile-open' : ''}`}>
        <div className="mobile-panel-header">
          <strong>Members</strong>
          <button className="icon-button" onClick={() => setMobilePanel(null)} aria-label="Close members"><X size={18} /></button>
        </div>
        <MemberGroup title="ONLINE — 24" members={members} />
        <MemberGroup
          title="OFFLINE — 54"
          members={[{ name: 'Kim', status: 'Last seen 2 hours ago', avatar: 'K', color: 'slate' }]}
          offline
        />
      </aside>

      {mobilePanel && <button className="mobile-backdrop" onClick={() => setMobilePanel(null)} aria-label="Close menu" />}
      {customMenu && (
        <div className="server-context-menu" style={{ left: customMenu.x, top: customMenu.y }} onClick={(event) => event.stopPropagation()}>
          <strong>KHTALK Community</strong>
          <button onClick={() => { setServerVisible(false); setCustomMenu(null) }}>
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
