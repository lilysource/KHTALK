import { useState } from 'react'
import {
  X, ChevronRight, ChevronLeft, Camera, Gamepad2,
  GraduationCap, BookOpen, Users, Sparkles, Compass
} from 'lucide-react'
import { DISCORD_TEMPLATES, DiscordTemplate } from '../types/community'

interface CreateCommunityModalProps {
  userDisplayName: string
  onClose: () => void
  onCreate: (config: {
    name: string
    iconUrl?: string
    template: DiscordTemplate
    audience: 'friends' | 'club' | 'general'
  }) => void
}

export function CreateCommunityModal({
  userDisplayName,
  onClose,
  onCreate
}: CreateCommunityModalProps) {
  const [step, setStep] = useState<'template' | 'audience' | 'customize'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<DiscordTemplate>(DISCORD_TEMPLATES[0])
  const [audience, setAudience] = useState<'friends' | 'club' | 'general'>('general')
  const [serverName, setServerName] = useState(`${userDisplayName}'s server`)
  const [iconUrl, setIconUrl] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  function handleSelectTemplate(tmpl: DiscordTemplate) {
    setSelectedTemplate(tmpl)
    setStep('audience')
  }

  function handleSelectAudience(aud: 'friends' | 'club' | 'general') {
    setAudience(aud)
    setStep('customize')
  }

  function handleIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPG, or WEBP).')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be smaller than 4 MB.')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      setIconUrl(String(reader.result))
    }
    reader.readAsDataURL(file)
  }

  function handleCreate() {
    const trimmed = serverName.trim()
    if (!trimmed) {
      setError('Please enter a server name.')
      return
    }
    onCreate({
      name: trimmed,
      iconUrl: iconUrl || undefined,
      template: selectedTemplate,
      audience
    })
  }

  function getTemplateIcon(id: string) {
    switch (id) {
      case 'gaming': return <Gamepad2 size={24} className="template-card-icon gaming" />
      case 'school': return <GraduationCap size={24} className="template-card-icon school" />
      case 'study': return <BookOpen size={24} className="template-card-icon study" />
      case 'friends': return <Users size={24} className="template-card-icon friends" />
      case 'creators': return <Sparkles size={24} className="template-card-icon creators" />
      default: return <Compass size={24} className="template-card-icon custom" />
    }
  }

  const serverInitial = serverName.trim().charAt(0).toUpperCase() || 'C'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="discord-modal khtalk-blue-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="discord-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Step Progress Pill */}
        <div className="khtalk-step-badge-bar">
          <span className={`khtalk-step-pill ${step === 'template' ? 'active' : 'done'}`}>
            1. Template
          </span>
          <span className="khtalk-step-divider">›</span>
          <span className={`khtalk-step-pill ${step === 'audience' ? 'active' : step === 'customize' ? 'done' : ''}`}>
            2. Audience
          </span>
          <span className="khtalk-step-divider">›</span>
          <span className={`khtalk-step-pill ${step === 'customize' ? 'active' : ''}`}>
            3. Customize
          </span>
        </div>

        {/* STEP 1: CHOOSE TEMPLATE */}
        {step === 'template' && (
          <div className="discord-step-content">
            <div className="discord-modal-header">
              <h2>Create Your Community</h2>
              <p>Your community is where your team or friends hang out, collaborate, and talk in real-time.</p>
            </div>

            <div className="discord-template-list">
              <button
                type="button"
                className="discord-template-card primary"
                onClick={() => handleSelectTemplate(DISCORD_TEMPLATES[0])}
              >
                <div className="template-icon-wrap">
                  {getTemplateIcon('custom')}
                </div>
                <div className="template-copy">
                  <strong>Create My Own</strong>
                  <span>Start from scratch with standard text and voice channels</span>
                </div>
                <ChevronRight size={18} className="template-arrow" />
              </button>

              <div className="discord-template-divider">
                <span>OR START FROM A TEMPLATE</span>
              </div>

              {DISCORD_TEMPLATES.slice(1).map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  className="discord-template-card"
                  onClick={() => handleSelectTemplate(tmpl)}
                >
                  <div className="template-icon-wrap">
                    {getTemplateIcon(tmpl.id)}
                  </div>
                  <div className="template-copy">
                    <strong>{tmpl.title}</strong>
                    <span>{tmpl.subtitle}</span>
                  </div>
                  <ChevronRight size={18} className="template-arrow" />
                </button>
              ))}
            </div>

            <div className="discord-modal-footer">
              <h3>Have an invite already?</h3>
              <button
                type="button"
                className="discord-join-btn"
                onClick={() => {
                  setServerName('KHTALK Community')
                  setStep('customize')
                }}
              >
                Join via Invite Link
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: AUDIENCE SELECTION */}
        {step === 'audience' && (
          <div className="discord-step-content">
            <div className="discord-modal-header">
              <h2>What is your community for?</h2>
              <p>Help us customize your channels by choosing who will be hanging out in this space.</p>
            </div>

            <div className="discord-audience-list">
              <button
                type="button"
                className="discord-audience-card"
                onClick={() => handleSelectAudience('club')}
              >
                <div className="audience-icon-wrap">
                  <Compass size={22} />
                </div>
                <div className="audience-copy">
                  <strong>For a club or organization</strong>
                  <span>Public rooms, announcement spaces, and community events</span>
                </div>
                <ChevronRight size={18} className="template-arrow" />
              </button>

              <button
                type="button"
                className="discord-audience-card"
                onClick={() => handleSelectAudience('friends')}
              >
                <div className="audience-icon-wrap">
                  <Users size={22} />
                </div>
                <div className="audience-copy">
                  <strong>For me and my friends</strong>
                  <span>Casual group chat, gaming sessions, and daily hangout</span>
                </div>
                <ChevronRight size={18} className="template-arrow" />
              </button>
            </div>

            <p className="discord-audience-hint">
              Not sure yet? You can{' '}
              <button
                type="button"
                className="link-inline"
                onClick={() => handleSelectAudience('general')}
              >
                skip this question
              </button>{' '}
              for now.
            </p>

            <div className="discord-modal-bottom-actions">
              <button
                type="button"
                className="discord-back-btn"
                onClick={() => setStep('template')}
              >
                <ChevronLeft size={16} /> Back
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CUSTOMIZE SERVER NAME AND ICON */}
        {step === 'customize' && (
          <div className="discord-step-content">
            <div className="discord-modal-header">
              <h2>Personalize Your Community</h2>
              <p>Give your new space a recognizable name and icon. You can always change this later.</p>
            </div>

            <div className="discord-avatar-upload-section">
              <label className="discord-avatar-circle" title="Upload Community Icon">
                {iconUrl ? (
                  <img src={iconUrl} alt="Community icon" className="discord-avatar-img" />
                ) : (
                  <div className="discord-avatar-placeholder">
                    <span>{serverInitial}</span>
                  </div>
                )}
                <div className="discord-camera-badge">
                  <Camera size={18} />
                  <span className="upload-badge-text">UPLOAD</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden-file-input"
                  onChange={handleIconUpload}
                />
              </label>
              <small className="discord-avatar-hint">Recommended: 512x512 PNG, JPG, or WEBP</small>
            </div>

            <div className="discord-form-group">
              <label htmlFor="discord-server-name-input">COMMUNITY NAME</label>
              <input
                id="discord-server-name-input"
                autoFocus
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                }}
                maxLength={80}
                placeholder="e.g. Phnom Penh Coders, Game Room"
                className="discord-input"
              />
            </div>

            <p className="discord-terms-notice">
              By creating a community, you agree to KHTALK's{' '}
              <span className="terms-highlight">Community Guidelines</span>.
            </p>

            {error && <div className="discord-modal-error">{error}</div>}

            <div className="discord-modal-bottom-actions spread">
              <button
                type="button"
                className="discord-back-btn"
                onClick={() => setStep('audience')}
              >
                <ChevronLeft size={16} /> Back
              </button>
              <button
                type="button"
                className="discord-create-btn"
                onClick={handleCreate}
                disabled={!serverName.trim()}
              >
                Create Community
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

