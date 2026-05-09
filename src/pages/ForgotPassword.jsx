import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'

const styleTag = document.createElement('style')
styleTag.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Inter:wght@400;500;600&display=swap');

  @keyframes dbd-fade-up-fp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .dbd-card-fp { animation: dbd-fade-up-fp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .dbd-field-fp { position: relative; margin-bottom: 16px; }
  .dbd-input-fp {
    width: 100%; padding: 22px 16px 8px;
    border: 1.5px solid #E0E5E0; border-radius: 12px;
    background: #fff; font-size: 15px;
    font-family: 'Inter', sans-serif; color: #111;
    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }
  .dbd-input-fp:focus { border-color: #4B3FD8; box-shadow: 0 0 0 3px rgba(75,63,216,0.12); }
  .dbd-label-fp {
    position: absolute; left: 16px; top: 50%;
    transform: translateY(-50%); font-size: 15px;
    color: #8AAA95; font-family: 'Inter', sans-serif;
    pointer-events: none; transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
  }
  .dbd-input-fp:focus ~ .dbd-label-fp,
  .dbd-input-fp:not(:placeholder-shown) ~ .dbd-label-fp {
    top: 14px; transform: translateY(-50%) scale(0.78);
    transform-origin: left center; color: #4B3FD8; font-weight: 500;
  }
  .dbd-btn-fp {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg, #5B50E8 0%, #4B3FD8 100%);
    border: none; border-radius: 100px; color: #fff;
    font-size: 15px; font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: pointer; margin-top: 4px;
    box-shadow: 0 4px 20px rgba(75,63,216,0.35);
    transition: box-shadow 0.2s, transform 0.12s;
  }
  .dbd-btn-fp:hover:not(:disabled) { box-shadow: 0 6px 28px rgba(75,63,216,0.45); transform: translateY(-1px); }
  .dbd-btn-fp:disabled { opacity: 0.7; cursor: not-allowed; }
  .dbd-btn-fp-outline {
    width: 100%; padding: 14px;
    background: transparent;
    border: 1.5px solid #4B3FD8; border-radius: 100px; color: #4B3FD8;
    font-size: 15px; font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: pointer; margin-top: 10px;
    transition: background 0.18s, transform 0.12s;
  }
  .dbd-btn-fp-outline:hover:not(:disabled) { background: rgba(75,63,216,0.06); transform: translateY(-1px); }
  .dbd-btn-fp-outline:disabled { opacity: 0.7; cursor: not-allowed; }
`
if (!document.head.querySelector('#dbd-fp-styles')) {
  styleTag.id = 'dbd-fp-styles'
  document.head.appendChild(styleTag)
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResendLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div style={{ background: '#0A3D3D', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px 20px', fontFamily: "'Inter', sans-serif" }}>
      <div className="dbd-card-fp" style={{ background: '#F7F7EC', borderRadius: '24px', padding: '48px 40px 44px', width: '100%', maxWidth: '440px', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>

        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '30px', fontWeight: '800', color: '#0A3D3D', letterSpacing: '-0.8px', textAlign: 'center', marginBottom: '32px' }}>
          Dar<span style={{ color: '#4B3FD8' }}>Bel</span>Dar
        </div>

        {!sent ? (
          <>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '28px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 10px', textAlign: 'center' }}>
              Mot de passe oublié ?
            </h1>
            <p style={{ fontSize: '14px', color: '#717182', textAlign: 'center', lineHeight: 1.6, marginBottom: '28px' }}>
              Entrez votre adresse email et nous vous enverrons des instructions pour réinitialiser votre mot de passe.
            </p>

            {error && (
              <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#991B1B', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="dbd-field-fp">
                <input
                  className="dbd-input-fp"
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <label className="dbd-label-fp">Adresse email</label>
              </div>
              <button type="submit" className="dbd-btn-fp" disabled={loading}>
                {loading ? 'Envoi...' : 'Continuer'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#717182', marginTop: '20px' }}>
              <Link to="/" style={{ color: '#4B3FD8', fontWeight: '600', textDecoration: 'none' }}>
                ← Retour à la connexion
              </Link>
            </p>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ background: '#E8F5E9', borderRadius: '50%', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={32} color="#0A3D3D" strokeWidth={1.8} />
              </div>
            </div>

            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '24px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 10px', textAlign: 'center' }}>
              Vérifiez votre email
            </h1>
            <p style={{ fontSize: '14px', color: '#717182', textAlign: 'center', lineHeight: 1.6, marginBottom: '8px' }}>
              Nous avons envoyé un lien de réinitialisation à
            </p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', textAlign: 'center', marginBottom: '28px', wordBreak: 'break-all' }}>
              {email}
            </p>

            {error && (
              <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#991B1B', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <button className="dbd-btn-fp-outline" onClick={handleResend} disabled={resendLoading}>
              {resendLoading ? 'Envoi...' : 'Renvoyer l\'email'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#717182', marginTop: '18px' }}>
              <Link to="/" style={{ color: '#4B3FD8', fontWeight: '600', textDecoration: 'none' }}>
                ← Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
