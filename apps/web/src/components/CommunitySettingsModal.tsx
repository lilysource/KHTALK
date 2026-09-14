import { useState } from 'react'
import {
  X, Shield, Users, Hash, Trash2, Plus, Check,
  Camera, Volume2, Search, UserPlus
} from 'lucide-react'
import {
  Community, Role, CommunityMember,
  DISCORD_ROLE_COLORS, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_MOD_PERMISSIONS, DEFAULT_EVERYONE_PERMISSIONS
} from '../types/community'

interface CommunitySettingsModalProps {
  community: Community
  onClose: () => void
  onUpdateCommunity: (updated: Community) => void
  onDeleteCommunity: (communityId: string) => void
}

export function CommunitySettingsModal({
  community,
  onClose,
  onUpdateCommunity,
  onDeleteCommunity
}: CommunitySettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'members' | 'channels' | 'delete'>('roles')
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    community.roles[0]?.id || 'everyone'
  )
  const [roleSubTab, setRoleSubTab] = useState<'display' | 'permissions' | 'members'>('display')

  // Search in members
  const [memberSearch, setMemberSearch] = useState('')
  const [openRolePickerMemberId, setOpenRolePickerMemberId] = useState<string | null>(null)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)

  // Channels state
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text')

  // Overview edits
  const [serverName, setServerName] = useState(community.name)
  const [iconUrl, setIconUrl] = useState(community.iconUrl || '')
  const [backgroundUrl, setBackgroundUrl] = useState(community.backgroundUrl || '')

  // Current selected role
  const selectedRole = community.roles.find((r) => r.id === selectedRoleId) || community.roles[0]

  // Helper to update a role in state
  function updateRole(updatedRole: Role) {
    const updatedRoles = community.roles.map((r) => (r.id === updatedRole.id ? updatedRole : r))
    const updatedCommunity = { ...community, roles: updatedRoles }
    onUpdateCommunity(updatedCommunity)
  }

  // Create a new role
  function handleCreateRole() {
    const newId = `role_${Date.now()}`
    const newRole: Role = {
      id: newId,
      name: 'new role',
      color: '#99aab5',
      hoist: false,
      mentionable: false,
      position: community.roles.length,
      permissions: { ...DEFAULT_MOD_PERMISSIONS }
    }
    const updatedRoles = [...community.roles, newRole]
    const updatedCommunity = { ...community, roles: updatedRoles }
    onUpdateCommunity(updatedCommunity)
    setSelectedRoleId(newId)
    setRoleSubTab('display')
  }

  // Delete a role
  function handleDeleteRole(roleId: string) {
    if (roleId === 'everyone') return
    const updatedRoles = community.roles.filter((r) => r.id !== roleId)
    // Remove role from members
    const updatedMembers = community.members.map((m) => ({
      ...m,
      roleIds: m.roleIds.filter((id) => id !== roleId)
    }))
    const updatedCommunity = { ...community, roles: updatedRoles, members: updatedMembers }
    onUpdateCommunity(updatedCommunity)
    setSelectedRoleId(updatedRoles[0]?.id || 'everyone')
  }

  // Toggle role assignment for a member
  function toggleMemberRole(memberId: string, roleId: string) {
    const updatedMembers = community.members.map((member) => {
      if (member.id !== memberId) return member
      const hasRole = member.roleIds.includes(roleId)
      const newRoleIds = hasRole
        ? member.roleIds.filter((id) => id !== roleId)
        : [...member.roleIds, roleId]
      return { ...member, roleIds: newRoleIds }
    })
    onUpdateCommunity({ ...community, members: updatedMembers })
  }

  // Add channel
  function handleAddChannel() {
    const trimmed = newChannelName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    if (!trimmed) return
    const newChannel = {
      id: `channel_${Date.now()}`,
      name: trimmed,
      type: newChannelType,
      category: newChannelType === 'voice' ? 'VOICE CHANNELS' : 'TEXT CHANNELS'
    }
    const updatedChannels = [...community.channels, newChannel]
    onUpdateCommunity({ ...community, channels: updatedChannels })
    setNewChannelName('')
  }

  // Delete channel
  function handleDeleteChannel(channelId: string) {
    const updatedChannels = community.channels.filter((c) => c.id !== channelId)
    onUpdateCommunity({ ...community, channels: updatedChannels })
  }

  // Handle overview save
  function handleSaveOverview() {
    const trimmed = serverName.trim()
    if (!trimmed) return
    onUpdateCommunity({
      ...community,
      name: trimmed,
      iconUrl: iconUrl || undefined,
      backgroundUrl: backgroundUrl || null
    })
  }

  // Filtered members for search
  const filteredMembers = community.members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.username.toLowerCase().includes(memberSearch.toLowerCase())
  )

  // Members in selected role
  const membersInSelectedRole = community.members.filter((m) =>
    m.roleIds.includes(selectedRole?.id || '')
  )

  // Members not in selected role
  const membersNotInSelectedRole = community.members.filter(
    (m) => !m.roleIds.includes(selectedRole?.id || '')
  )

  return (
    <div className="discord-settings-page khtalk-settings-theme" onClick={() => setOpenRolePickerMemberId(null)}>
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="discord-settings-nav">
        <div className="khtalk-settings-brand">
          <small>COMMUNITY SETTINGS</small>
          <span>{community.name}</span>
        </div>

        <nav className="discord-settings-nav-items">
          <button
            type="button"
            className={`discord-nav-btn ${activeTab === 'overview' ? 'selected' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`discord-nav-btn ${activeTab === 'roles' ? 'selected' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            <Shield size={16} /> Roles & Permissions
          </button>
          <button
            type="button"
            className={`discord-nav-btn ${activeTab === 'members' ? 'selected' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            <Users size={16} /> Members
          </button>
          <button
            type="button"
            className={`discord-nav-btn ${activeTab === 'channels' ? 'selected' : ''}`}
            onClick={() => setActiveTab('channels')}
          >
            <Hash size={16} /> Channels
          </button>

          <div className="discord-nav-divider" />

          <button
            type="button"
            className={`discord-nav-btn danger ${activeTab === 'delete' ? 'selected' : ''}`}
            onClick={() => setActiveTab('delete')}
          >
            <Trash2 size={16} /> Delete Community
          </button>
        </nav>
      </aside>

      {/* RIGHT MAIN CONTENT */}
      <main className="discord-settings-content">
        <header className="discord-settings-topbar">
          <button
            type="button"
            className="khtalk-close-badge"
            onClick={onClose}
            title="Close Settings (ESC)"
            aria-label="Close settings"
          >
            <X size={16} />
            <span>ESC</span>
          </button>
        </header>

        {/* SECTION 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <section className="discord-settings-section">
            <h2>Server Overview</h2>
            <p className="discord-section-desc">
              Manage your server's public identity, icon, and background artwork.
            </p>

            <div className="discord-overview-grid">
              <div className="discord-overview-avatar-col">
                <label className="discord-overview-avatar" title="Upload icon">
                  {iconUrl ? (
                    <img src={iconUrl} alt="Server icon" className="avatar-preview-img" />
                  ) : (
                    <div className="avatar-preview-placeholder">
                      {community.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="discord-camera-overlay">
                    <Camera size={20} />
                    <span>CHANGE ICON</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden-file-input"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        const r = new FileReader()
                        r.onload = () => setIconUrl(String(r.result))
                        r.readAsDataURL(f)
                      }
                    }}
                  />
                </label>
                {iconUrl && (
                  <button
                    type="button"
                    className="discord-link-btn"
                    onClick={() => setIconUrl('')}
                  >
                    Remove Icon
                  </button>
                )}
                <small className="discord-hint">We recommend an image of at least 512x512 for the server.</small>
              </div>

              <div className="discord-overview-fields-col">
                <label className="discord-field-label">
                  SERVER NAME
                  <input
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    className="discord-input"
                    maxLength={80}
                  />
                </label>

                <label className="discord-field-label">
                  BACKGROUND BANNER
                  <input
                    type="text"
                    placeholder="https://example.com/banner.jpg"
                    value={backgroundUrl}
                    onChange={(e) => setBackgroundUrl(e.target.value)}
                    className="discord-input"
                  />
                </label>

                <button
                  type="button"
                  className="discord-primary-action-btn"
                  onClick={handleSaveOverview}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2: ROLES */}
        {activeTab === 'roles' && (
          <section className="discord-settings-section roles-section">
            <div className="discord-roles-layout">
              {/* ROLES LIST SUB-SIDEBAR */}
              <aside className="discord-roles-sidebar">
                <div className="discord-roles-sidebar-header">
                  <span>ROLES — {community.roles.length}</span>
                  <button
                    type="button"
                    className="discord-add-role-btn"
                    onClick={handleCreateRole}
                    title="Create Role"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="discord-roles-list">
                  {community.roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      className={`discord-role-item ${selectedRole?.id === role.id ? 'active' : ''}`}
                      onClick={() => setSelectedRoleId(role.id)}
                    >
                      <span
                        className="discord-role-dot"
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="discord-role-name">{role.name}</span>
                    </button>
                  ))}
                </div>
              </aside>

              {/* ROLE EDITOR */}
              {selectedRole && (
                <div className="discord-role-editor">
                  <header className="discord-role-editor-header">
                    <div className="role-header-title">
                      <h3>Edit Role — <strong>{selectedRole.name}</strong></h3>
                    </div>

                    <div className="discord-subtabs">
                      <button
                        type="button"
                        className={`discord-subtab ${roleSubTab === 'display' ? 'active' : ''}`}
                        onClick={() => setRoleSubTab('display')}
                      >
                        Display
                      </button>
                      <button
                        type="button"
                        className={`discord-subtab ${roleSubTab === 'permissions' ? 'active' : ''}`}
                        onClick={() => setRoleSubTab('permissions')}
                      >
                        Permissions
                      </button>
                      <button
                        type="button"
                        className={`discord-subtab ${roleSubTab === 'members' ? 'active' : ''}`}
                        onClick={() => setRoleSubTab('members')}
                      >
                        Manage Members ({membersInSelectedRole.length})
                      </button>
                    </div>
                  </header>

                  {/* SUBTAB: DISPLAY */}
                  {roleSubTab === 'display' && (
                    <div className="role-tab-pane">
                      <label className="discord-field-label">
                        ROLE NAME
                        <input
                          type="text"
                          value={selectedRole.name}
                          onChange={(e) =>
                            updateRole({ ...selectedRole, name: e.target.value })
                          }
                          disabled={selectedRole.id === 'everyone'}
                          className="discord-input"
                          maxLength={50}
                        />
                      </label>

                      <div className="discord-color-picker-group">
                        <label className="discord-field-label">ROLE COLOR</label>
                        <p className="discord-field-desc">
                          Members use the color of the highest role they have on the roles list.
                        </p>

                        <div className="discord-swatch-grid">
                          {DISCORD_ROLE_COLORS.map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              className={`discord-color-swatch ${selectedRole.color.toLowerCase() === c.hex.toLowerCase() ? 'active' : ''}`}
                              style={{ backgroundColor: c.hex }}
                              onClick={() => updateRole({ ...selectedRole, color: c.hex })}
                              title={c.name}
                            >
                              {selectedRole.color.toLowerCase() === c.hex.toLowerCase() && (
                                <Check size={16} color="#fff" />
                              )}
                            </button>
                          ))}
                        </div>

                        <div className="custom-color-row">
                          <label className="custom-color-box">
                            <input
                              type="color"
                              value={selectedRole.color}
                              onChange={(e) => updateRole({ ...selectedRole, color: e.target.value })}
                            />
                            <span>Custom Color</span>
                          </label>
                          <input
                            type="text"
                            value={selectedRole.color}
                            onChange={(e) => updateRole({ ...selectedRole, color: e.target.value })}
                            className="custom-hex-input"
                            maxLength={7}
                          />
                        </div>
                      </div>

                      <div className="discord-divider" />

                      {/* HOIST TOGGLE */}
                      <div className="discord-toggle-row">
                        <div>
                          <strong>Display role members separately from online members</strong>
                          <span>Shows members under their own role heading in the member list.</span>
                        </div>
                        <button
                          type="button"
                          className={`discord-switch ${selectedRole.hoist ? 'on' : ''}`}
                          onClick={() => updateRole({ ...selectedRole, hoist: !selectedRole.hoist })}
                        >
                          <span className="switch-knob" />
                        </button>
                      </div>

                      <div className="discord-divider" />

                      {/* MENTIONABLE TOGGLE */}
                      <div className="discord-toggle-row">
                        <div>
                          <strong>Allow anyone to @mention this role</strong>
                          <span>Members can tag this role in chat messages.</span>
                        </div>
                        <button
                          type="button"
                          className={`discord-switch ${selectedRole.mentionable ? 'on' : ''}`}
                          onClick={() => updateRole({ ...selectedRole, mentionable: !selectedRole.mentionable })}
                        >
                          <span className="switch-knob" />
                        </button>
                      </div>

                      {/* DELETE ROLE BUTTON */}
                      {selectedRole.id !== 'everyone' && (
                        <div className="delete-role-wrap">
                          <button
                            type="button"
                            className="delete-role-btn"
                            onClick={() => handleDeleteRole(selectedRole.id)}
                          >
                            <Trash2 size={16} /> Delete Role
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBTAB: PERMISSIONS */}
                  {roleSubTab === 'permissions' && (
                    <div className="role-tab-pane permissions-pane">
                      <div className="permission-group">
                        <h4>GENERAL SERVER PERMISSIONS</h4>

                        <PermissionToggle
                          title="Administrator"
                          desc="Members with this permission have every permission and bypass all channel specific permissions. Grant with extreme care!"
                          checked={selectedRole.permissions.administrator}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, administrator: val }
                            })
                          }
                          danger
                        />

                        <PermissionToggle
                          title="Manage Server"
                          desc="Allows members to change this server's name and region."
                          checked={selectedRole.permissions.manageServer}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, manageServer: val }
                            })
                          }
                        />

                        <PermissionToggle
                          title="Manage Roles"
                          desc="Allows members to create new roles and edit or delete roles lower than this one."
                          checked={selectedRole.permissions.manageRoles}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, manageRoles: val }
                            })
                          }
                        />

                        <PermissionToggle
                          title="Manage Channels"
                          desc="Allows members to create, edit, or delete channels."
                          checked={selectedRole.permissions.manageChannels}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, manageChannels: val }
                            })
                          }
                        />

                        <PermissionToggle
                          title="View Audit Log"
                          desc="Allows members to view a record of server changes."
                          checked={selectedRole.permissions.viewAuditLog}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, viewAuditLog: val }
                            })
                          }
                        />
                      </div>

                      <div className="permission-group">
                        <h4>MEMBERSHIP PERMISSIONS</h4>

                        <PermissionToggle
                          title="Create Invite"
                          desc="Allows members to invite new people to this server."
                          checked={selectedRole.permissions.createInvite}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, createInvite: val }
                            })
                          }
                        />

                        <PermissionToggle
                          title="Kick Members"
                          desc="Allows members to remove other members from this server."
                          checked={selectedRole.permissions.kickMembers}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, kickMembers: val }
                            })
                          }
                        />

                        <PermissionToggle
                          title="Ban Members"
                          desc="Allows members to permanently ban other members from this server."
                          checked={selectedRole.permissions.banMembers}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, banMembers: val }
                            })
                          }
                        />
                      </div>

                      <div className="permission-group">
                        <h4>TEXT CHANNEL PERMISSIONS</h4>

                        <PermissionToggle
                          title="Send Messages"
                          desc="Allows members to send messages in text channels."
                          checked={selectedRole.permissions.sendMessages}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, sendMessages: val }
                            })
                          }
                        />

                        <PermissionToggle
                          title="Attach Files"
                          desc="Allows members to upload files and media."
                          checked={selectedRole.permissions.attachFiles}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, attachFiles: val }
                            })
                          }
                        />

                        <PermissionToggle
                          title="Manage Messages"
                          desc="Allows members to delete messages by other members or pin messages."
                          checked={selectedRole.permissions.manageMessages}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, manageMessages: val }
                            })
                          }
                        />

                        <PermissionToggle
                          title="Mention @everyone and All Roles"
                          desc="Allows members to use @everyone and mention roles."
                          checked={selectedRole.permissions.mentionEveryone}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, mentionEveryone: val }
                            })
                          }
                        />
                      </div>

                      <div className="permission-group">
                        <h4>VOICE CHANNEL PERMISSIONS</h4>

                        <PermissionToggle
                          title="Connect"
                          desc="Allows members to join voice channels."
                          checked={selectedRole.permissions.connect}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, connect: val }
                            })
                          }
                        />

                        <PermissionToggle
                          title="Speak"
                          desc="Allows members to talk in voice channels."
                          checked={selectedRole.permissions.speak}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, speak: val }
                            })
                          }
                        />

                        <PermissionToggle
                          title="Mute Members"
                          desc="Allows members to mute other members in voice channels."
                          checked={selectedRole.permissions.muteMembers}
                          onChange={(val) =>
                            updateRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, muteMembers: val }
                            })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* SUBTAB: MANAGE MEMBERS */}
                  {roleSubTab === 'members' && (
                    <div className="role-tab-pane">
                      <div className="role-members-header">
                        <div>
                          <strong>{membersInSelectedRole.length} Member{membersInSelectedRole.length !== 1 ? 's' : ''}</strong>
                          <span>Users with the {selectedRole.name} role.</span>
                        </div>
                        <button
                          type="button"
                          className="discord-add-member-action-btn"
                          onClick={() => setShowAddMemberModal(true)}
                        >
                          <UserPlus size={15} /> Add Members
                        </button>
                      </div>

                      <div className="role-assigned-members-list">
                        {membersInSelectedRole.length === 0 ? (
                          <div className="role-empty-members">
                            <p>No members currently have this role.</p>
                          </div>
                        ) : (
                          membersInSelectedRole.map((member) => (
                            <div key={member.id} className="role-member-row">
                              <div className="member-row-avatar">
                                {member.avatarUrl ? (
                                  <img src={member.avatarUrl} alt="" />
                                ) : (
                                  <div className={`avatar small ${member.color}`}>
                                    {member.avatar}
                                  </div>
                                )}
                              </div>
                              <div className="member-row-info">
                                <strong>{member.name}</strong>
                                <span>@{member.username}</span>
                              </div>
                              <button
                                type="button"
                                className="remove-member-role-btn"
                                onClick={() => toggleMemberRole(member.id, selectedRole.id)}
                                title="Remove member from role"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* MODAL TO ADD MEMBERS TO THIS ROLE */}
                      {showAddMemberModal && (
                        <div className="modal-backdrop sub-modal" onClick={() => setShowAddMemberModal(false)}>
                          <div className="discord-mini-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="mini-modal-header">
                              <h4>Add Members to {selectedRole.name}</h4>
                              <button
                                type="button"
                                className="dialog-close"
                                onClick={() => setShowAddMemberModal(false)}
                              >
                                <X size={16} />
                              </button>
                            </div>

                            <div className="mini-modal-body">
                              {membersNotInSelectedRole.length === 0 ? (
                                <p className="all-members-assigned">All community members already have this role!</p>
                              ) : (
                                membersNotInSelectedRole.map((member) => (
                                  <div key={member.id} className="mini-modal-member-row">
                                    <div className="member-row-avatar">
                                      <div className={`avatar small ${member.color}`}>
                                        {member.avatar}
                                      </div>
                                    </div>
                                    <div className="member-row-info">
                                      <strong>{member.name}</strong>
                                      <span>@{member.username}</span>
                                    </div>
                                    <button
                                      type="button"
                                      className="assign-role-btn"
                                      onClick={() => {
                                        toggleMemberRole(member.id, selectedRole.id)
                                      }}
                                    >
                                      Add
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION 3: MEMBERS */}
        {activeTab === 'members' && (
          <section className="discord-settings-section">
            <div className="discord-members-header-bar">
              <div>
                <h2>Server Members</h2>
                <p className="discord-section-desc">
                  {community.members.length} Member{community.members.length !== 1 ? 's' : ''} in this server
                </p>
              </div>

              <div className="discord-member-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search members"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="discord-members-table">
              {filteredMembers.map((member) => {
                const assignedRoles = community.roles.filter((r) =>
                  member.roleIds.includes(r.id)
                )

                return (
                  <div key={member.id} className="discord-member-table-row">
                    <div className="member-profile-cell">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="member-avatar-img" />
                      ) : (
                        <div className={`avatar regular ${member.color}`}>
                          {member.avatar}
                        </div>
                      )}
                      <div>
                        <strong>{member.name}</strong>
                        <span>@{member.username}</span>
                      </div>
                    </div>

                    <div className="member-roles-cell">
                      {assignedRoles.map((role) => (
                        <span
                          key={role.id}
                          className="discord-role-pill"
                          style={{ borderColor: role.color }}
                        >
                          <span
                            className="role-pill-dot"
                            style={{ backgroundColor: role.color }}
                          />
                          <span className="role-pill-name">{role.name}</span>
                          <button
                            type="button"
                            className="role-pill-remove"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleMemberRole(member.id, role.id)
                            }}
                            title="Remove role"
                          >
                            ×
                          </button>
                        </span>
                      ))}

                      {/* ADD ROLE DROPDOWN */}
                      <div className="role-add-dropdown-anchor">
                        <button
                          type="button"
                          className="role-add-pill-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenRolePickerMemberId(
                              openRolePickerMemberId === member.id ? null : member.id
                            )
                          }}
                          title="Assign roles"
                        >
                          <Plus size={14} />
                        </button>

                        {openRolePickerMemberId === member.id && (
                          <div
                            className="discord-role-picker-popover"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="popover-title">ROLES</div>
                            {community.roles.map((role) => {
                              const isChecked = member.roleIds.includes(role.id)
                              return (
                                <button
                                  key={role.id}
                                  type="button"
                                  className="role-picker-option"
                                  onClick={() => toggleMemberRole(member.id, role.id)}
                                >
                                  <span
                                    className="role-pill-dot"
                                    style={{ backgroundColor: role.color }}
                                  />
                                  <span>{role.name}</span>
                                  {isChecked && <Check size={14} className="picker-check" />}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* SECTION 4: CHANNELS */}
        {activeTab === 'channels' && (
          <section className="discord-settings-section">
            <h2>Manage Channels</h2>
            <p className="discord-section-desc">Create, reorder, or remove channels for your server.</p>

            <div className="discord-create-channel-bar">
              <input
                type="text"
                placeholder="new-channel-name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
                className="discord-input"
              />
              <div className="channel-type-toggle">
                <button
                  type="button"
                  className={newChannelType === 'text' ? 'active' : ''}
                  onClick={() => setNewChannelType('text')}
                >
                  <Hash size={15} /> Text
                </button>
                <button
                  type="button"
                  className={newChannelType === 'voice' ? 'active' : ''}
                  onClick={() => setNewChannelType('voice')}
                >
                  <Volume2 size={15} /> Voice
                </button>
              </div>
              <button
                type="button"
                className="discord-primary-action-btn"
                disabled={!newChannelName.trim()}
                onClick={handleAddChannel}
              >
                <Plus size={16} /> Create
              </button>
            </div>

            <div className="discord-channel-management-list">
              {community.channels.map((channel) => (
                <div key={channel.id} className="discord-channel-manage-row">
                  <div className="channel-manage-title">
                    {channel.type === 'voice' ? <Volume2 size={18} /> : <Hash size={18} />}
                    <span>{channel.name}</span>
                    <small className="channel-type-badge">{channel.type}</small>
                  </div>
                  <button
                    type="button"
                    className="delete-channel-row-btn"
                    onClick={() => handleDeleteChannel(channel.id)}
                    title="Delete channel"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 5: DELETE SERVER */}
        {activeTab === 'delete' && (
          <section className="discord-settings-section danger-section">
            <h2>Delete '{community.name}'</h2>
            <p className="discord-section-desc">
              Are you sure you want to delete <strong>{community.name}</strong>? This action cannot be undone. All messages, channels, and roles will be permanently deleted.
            </p>

            <div className="discord-delete-card">
              <button
                type="button"
                className="discord-danger-delete-btn"
                onClick={() => {
                  onDeleteCommunity(community.id)
                  onClose()
                }}
              >
                <Trash2 size={16} /> Delete Community
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function PermissionToggle({
  title,
  desc,
  checked,
  onChange,
  danger = false
}: {
  title: string
  desc: string
  checked: boolean
  onChange: (val: boolean) => void
  danger?: boolean
}) {
  return (
    <div className={`discord-permission-row ${danger ? 'danger-perm' : ''}`}>
      <div className="perm-info">
        <strong>{title}</strong>
        <span>{desc}</span>
      </div>
      <button
        type="button"
        className={`discord-switch ${checked ? (danger ? 'on danger' : 'on') : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  )
}

