import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'

const styleTag = document.createElement('style')
styleTag.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Inter:wght@400;500;600&display=swap');

  @keyframes dbd-fade-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .dbd-card-login { animation: dbd-fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .dbd-field-l { position: relative; margin-bottom: 14px; }
  .dbd-input-l {
    width: 100%; padding: 22px 16px 8px;
    border: 1.5px solid #E0E5E0; border-radius: 14px;
    background: #fff; font-size: 15px;
    font-family: 'Inter', sans-serif; color: #111;
    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .dbd-input-l:focus { border-color: #4B3FD8; box-shadow: 0 0 0 3px rgba(75,63,216,0.12); }
  .dbd-label-l {
    position: absolute; left: 16px;
    font-size: 15px;
    color: #8AAA95; font-family: 'Inter', sans-serif;
    pointer-events: none; transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
  }
  .dbd-google-btn-l {
    width: 100%; display: flex; align-items: center; justify-content: center;
    gap: 12px; padding: 14px 20px; border-radius: 100px;
    border: 1.5px solid #2A2A2A; background: #fff;
    cursor: pointer; margin-bottom: 22px;
    font-family: 'Inter', sans-serif; font-size: 14.5px;
    font-weight: 600; color: #111;
    transition: background 0.18s, box-shadow 0.18s, transform 0.12s;
  }
  .dbd-google-btn-l:hover { background: #F3F4F6; box-shadow: 0 2px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }
  .dbd-continue-btn-l {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg, #5B50E8 0%, #4B3FD8 100%);
    border: none; border-radius: 100px; color: #fff;
    font-size: 15px; font-weight: 700;
    font-family: 'Bricolage Grotesque', sans-serif;
    cursor: pointer; margin-top: 6px;
    box-shadow: 0 4px 20px rgba(75,63,216,0.35);
    transition: box-shadow 0.2s, transform 0.12s;
  }
  .dbd-continue-btn-l:hover:not(:disabled) { box-shadow: 0 6px 28px rgba(75,63,216,0.45); transform: translateY(-1px); }
  .dbd-continue-btn-l:disabled { opacity: 0.72; cursor: not-allowed; }
`
if (!document.head.querySelector('#dbd-login-styles')) {
  styleTag.id = 'dbd-login-styles'
  document.head.appendChild(styleTag)
}

const floatLabel = [
  'dbd-label-l',
  'top-1/2 -translate-y-1/2',
  'peer-focus:top-4 peer-focus:-translate-y-1/2 peer-focus:scale-[0.87] peer-focus:origin-[left_center] peer-focus:text-[#4B3FD8] peer-focus:font-medium',
  'peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:scale-[0.87] peer-[:not(:placeholder-shown)]:origin-[left_center] peer-[:not(:placeholder-shown)]:text-[#4B3FD8] peer-[:not(:placeholder-shown)]:font-medium',
].join(' ')

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/dashboard')
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  return (
    <div style={{ background: '#0A3D3D', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px 20px', fontFamily: "'Inter', sans-serif" }}>
      <div className="dbd-card-login" style={{ background: '#F7F7EC', borderRadius: '24px', padding: '44px 40px 40px', width: '100%', maxWidth: '420px', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', position: 'relative', zIndex: 1 }}>
        
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '30px', fontWeight: '800', color: '#0A3D3D', letterSpacing: '-0.8px', textAlign: 'center', marginBottom: '6px' }}>
          Dar<span style={{ color: '#4B3FD8' }}>Bel</span>Dar
        </div>

        <p style={{ textAlign: 'center', fontSize: '13.5px', color: '#6A8A78', marginBottom: '32px', lineHeight: 1.5 }}>
          Welcome back — log in to your account
        </p>

        <button className="dbd-google-btn-l" onClick={handleGoogle} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
          <div style={{ flex: 1, height: '1px', background: '#D6DDD6' }} />
          <span style={{ fontSize: '12px', color: '#8AAA95', fontWeight: '600', letterSpacing: '0.5px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#D6DDD6' }} />
        </div>

        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#CC0000', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} noValidate>
          <div className="dbd-field-l">
            <input className="dbd-input-l peer" type="email" placeholder=" " value={email} onChange={e => setEmail(e.target.value)} required />
            <label className={floatLabel}>Email address</label>
          </div>
          <div className="dbd-field-l">
            <input className="dbd-input-l peer" type="password" placeholder=" " value={password} onChange={e => setPassword(e.target.value)} required />
            <label className={floatLabel}>Password</label>
          </div>
          <div style={{ textAlign: 'right', marginBottom: '10px', marginTop: '-6px' }}>
            <Link to="/forgot-password" style={{ color: '#4B3FD8', fontSize: '13px', textDecoration: 'none', fontWeight: '500' }}>
              Mot de passe oublié ?
            </Link>
          </div>
          <button type="submit" className="dbd-continue-btn-l" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#6A8A78', marginTop: '20px' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#4B3FD8', fontWeight: '600', textDecoration: 'none' }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}