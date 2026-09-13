import { useState, useEffect } from 'react'
import {
  Lock, Mail, User, Eye, EyeOff, AlertCircle, CheckCircle2,
  Loader2, ChevronRight, KeyRound, ArrowLeft
} from 'lucide-react'
import {
  getSupabaseClient,
  mapSupabaseUserToProfile
} from '../lib/supabase'
import { useChatStore } from '../stores/useChatStore'

function BrandMark() {
  return <div className="brand-mark" aria-label="KHTALK">K</div>
}

export function AuthPage() {
  const { setCurrentUser } = useChatStore()

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [canResendEmail, setCanResendEmail] = useState(false)

  useEffect(() => {
    // Check if a session already exists
    const supabase = getSupabaseClient()
    if (!supabase) return

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session?.user) {
        setCurrentUser(mapSupabaseUserToProfile(session.user))
      }
    })
  }, [setCurrentUser])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.')
      return
    }
    if (!password) {
      setErrorMessage('Please enter your password.')
      return
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      setErrorMessage('Supabase is not configured for this build.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password
      })

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setErrorMessage(
            'Email not confirmed yet! Please check your inbox for the Supabase verification link, or disable "Confirm email" in your Supabase dashboard settings.'
          )
          setCanResendEmail(true)
        } else {
          setErrorMessage(error.message)
        }
        return
      }

      if (data.user) {
        setCurrentUser(mapSupabaseUserToProfile(data.user))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during sign in.'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleResendConfirmation() {
    const supabase = getSupabaseClient()
    const trimmedEmail = email.trim()
    if (!supabase || !trimmedEmail) return

    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail
      })
      if (error) {
        setErrorMessage(error.message)
      } else {
        setSuccessMessage('Confirmation email resent! Please check your inbox.')
      }
    } catch {
      setErrorMessage('Failed to resend confirmation email.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const trimmedEmail = email.trim()
    const trimmedDisplayName = displayName.trim()
    const trimmedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')

    if (!trimmedDisplayName) {
      setErrorMessage('Please enter a display name.')
      return
    }
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.')
      return
    }
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.')
      return
    }
    if (!password) {
      setErrorMessage('Please enter a password.')
      return
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      return
    }
    if (!confirmPassword) {
      setErrorMessage('Please re-type your password to confirm it.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both passwords match.')
      return
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      setErrorMessage('Supabase is not configured for this build.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            display_name: trimmedDisplayName,
            username: trimmedUsername || trimmedDisplayName.toLowerCase().replace(/\s+/g, '')
          }
        }
      })

      if (error) {
        setErrorMessage(error.message)
        return
      }

      if (data.session && data.user) {
        // Email auto-confirmed / no email confirmation required
        setCurrentUser(mapSupabaseUserToProfile(data.user))
      } else {
        // Confirmation email required by Supabase project settings
        setSuccessMessage(
          'Account created successfully! Please check your email inbox to confirm your email before signing in.'
        )
        setMode('signin')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during sign up.'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address to receive password reset instructions.')
      return
    }

    const supabase = getSupabaseClient()
    if (!supabase) return

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: window.location.origin
      })

      if (error) {
        setErrorMessage(error.message)
      } else {
        setSuccessMessage('Password reset link sent! Check your inbox for further instructions.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send password reset email.'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="account-page-centered">
      <div className="account-container">
        {/* Centered Website Logo */}
        <div className="account-brand-center">
          <BrandMark />
          <div className="brand-copy">
            <strong>KHTALK</strong>
            <span>Talk · Share · Connect</span>
          </div>
        </div>

        <section className="account-card">
        <div className="account-card-header">
          <div className="dialog-icon">
            <Lock size={20} />
          </div>
        </div>

        {/* Auth Mode Switcher */}
        {mode !== 'forgot' && (
          <div className="auth-tab-switch" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setMode('signin')
                setErrorMessage(null)
                setSuccessMessage(null)
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setMode('signup')
                setErrorMessage(null)
                setSuccessMessage(null)
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Headings */}
        {mode === 'signin' && (
          <>
            <p className="account-eyebrow">WELCOME BACK</p>
            <h1>Log In to KHTALK</h1>
            <p className="account-intro">
              Enter your account credentials to access your channels and conversations.
            </p>
          </>
        )}

        {mode === 'signup' && (
          <>
            <p className="account-eyebrow">JOIN THE COMMUNITY</p>
            <h1>Create your KHTALK account</h1>
            <p className="account-intro">
              Register with real credentials to chat, create custom servers, and collaborate.
            </p>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <button
              type="button"
              className="back-to-login"
              onClick={() => {
                setMode('signin')
                setErrorMessage(null)
                setSuccessMessage(null)
              }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
            <p className="account-eyebrow">ACCOUNT RECOVERY</p>
            <h1>Reset your password</h1>
            <p className="account-intro">
              Enter the email address associated with your account, and we will send you a reset link.
            </p>
          </>
        )}


        {/* Error Alert */}
        {errorMessage && (
          <div className="auth-alert error" role="alert">
            <AlertCircle size={16} />
            <div className="alert-content-wrap">
              <span>{errorMessage}</span>
              {canResendEmail && (
                <button
                  type="button"
                  className="resend-email-btn"
                  onClick={handleResendConfirmation}
                  disabled={loading}
                >
                  {loading ? 'Resending...' : 'Resend Confirmation Email'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="auth-alert success" role="status">
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Sign In Form */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="auth-form" noValidate>
            <label>
              Email address
              <div className="input-field-wrap">
                <Mail size={16} className="field-icon" />
                <input
                  type="email"
                  autoFocus
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </label>

            <label>
              <div className="label-with-action">
                <span>Password</span>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setMode('forgot')
                    setErrorMessage(null)
                    setSuccessMessage(null)
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-field-wrap">
                <Lock size={16} className="field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div className="auth-options-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" /> Signing in...
                </>
              ) : (
                <>
                  Sign In <ChevronRight size={16} />
                </>
              )}
            </button>

            <p className="auth-footer-prompt">
              Don't have an account yet?{' '}
              <button
                type="button"
                className="link-accent"
                onClick={() => {
                  setMode('signup')
                  setErrorMessage(null)
                  setSuccessMessage(null)
                }}
              >
                Create an account
              </button>
            </p>
          </form>
        )}

        {/* Sign Up Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="auth-form" noValidate>
            <label>
              Display name
              <div className="input-field-wrap">
                <User size={16} className="field-icon" />
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Your nickname (e.g. Makara)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </label>

            <label>
              Username / Tag
              <div className="input-field-wrap">
                <span className="field-prefix">@</span>
                <input
                  type="text"
                  placeholder="username (lowercase, no spaces)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </label>

            <label>
              Email address
              <div className="input-field-wrap">
                <Mail size={16} className="field-icon" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </label>

            <label>
              Password
              <div className="input-field-wrap">
                <Lock size={16} className="field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && password.length < 6 && (
                <span className="field-hint error">Must be at least 6 characters ({password.length}/6)</span>
              )}
            </label>

            <label>
              Confirm password
              <div className="input-field-wrap">
                <KeyRound size={16} className="field-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Re-type your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                password === confirmPassword ? (
                  <span className="field-hint success">✓ Passwords match</span>
                ) : (
                  <span className="field-hint error">✗ Passwords do not match</span>
                )
              )}
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" /> Creating account...
                </>
              ) : (
                <>
                  Create Account <ChevronRight size={16} />
                </>
              )}
            </button>

            <p className="auth-footer-prompt">
              Already registered?{' '}
              <button
                type="button"
                className="link-accent"
                onClick={() => {
                  setMode('signin')
                  setErrorMessage(null)
                  setSuccessMessage(null)
                }}
              >
                Sign In
              </button>
            </p>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="auth-form" noValidate>
            <label>
              Your registered email address
              <div className="input-field-wrap">
                <Mail size={16} className="field-icon" />
                <input
                  type="email"
                  autoFocus
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" /> Sending reset link...
                </>
              ) : (
                <>
                  Send Reset Link <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        <small className="auth-security-notice">
          Authentication is verified securely via Supabase Auth. Passwords are never stored in plaintext.
        </small>
      </section>

      {/* Footer Feature Text */}
      <footer className="account-page-footer">
        <div className="footer-feature-grid">
          <div className="footer-feature-item">
            <span className="feature-dot" />
            <div>
              <strong>Secure Supabase Auth</strong>
              <span>Real email & password authentication with encrypted sessions.</span>
            </div>
          </div>
          <div className="footer-feature-item">
            <span className="feature-dot" />
            <div>
              <strong>Community Channels</strong>
              <span>Persistent messaging, member status, and private text/voice rooms. Experience real-time voice and text channels designed for seamless collaboration.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </main>
)
}

