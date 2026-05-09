import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Check } from 'lucide-react'

const styleTag = document.createElement('style')
styleTag.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Inter:wght@400;500;600&display=swap');

  @keyframes dbd-fade-up-rp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dbd-card-rp { animation: dbd-fade-up-rp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .dbd-field-rp { position: relative; margin-bottom: 16px; }
  .dbd-input-rp {
    width: 100%; padding: 22px 44px 8px 16px;
    border: 1.5px solid #E0E5E0; border-radius: 12px;
    background: #fff; font-size: 15px;
    font-family: 'Inter', sans-serif; color: #111;
    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }
  .dbd-input-rp:focus { border-color: #4B3FD8; box-shadow: 0 0 0 3px rgba(75,63,216,0.12); }
  .dbd-label-rp {
    position: absolute; left: 16px; top: 50%;
    transform: translateY(-50%); font-size: 15px;
    color: #8AAA95; font-family: 'Inter', sans-serif;
    pointer-events: none; transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
  }
  .dbd-input-rp:focus ~ .dbd-label-rp,
  .dbd-input-rp:not(:placeholder-shown) ~ .dbd-label-rp {
    top: 14px; transform: translateY(-50%) scale(0.78);
    transform-origin: left center; color: #4B3FD8; font-weight: 500;
  }
  .dbd-eye-btn {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; padding: 4px;
    color: #8AAA95; display: flex; align-items: center;
    transition: color 0.15s;
  }
  .dbd-eye-btn:hover { color: #4B3FD8; }
  .dbd-btn-rp {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg, #5B50E8 0%, #4B3FD8 100%);
    border: none; border-radius: 100px; color: #fff;
    font-size: 15px; font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: pointer; margin-top: 4px;
    box-shadow: 0 4px 20px rgba(75,63,216,0.35);
    transition: box-shadow 0.2s, transform 0.12s;
  }
  .dbd-btn-rp:hover:not(:disabled) { box-shadow: 0 6px 28px rgba(75,63,216,0.45); transform: translateY(-1px); }
  .dbd-btn-rp:disabled { opacity: 0.7; cursor: not-allowed; }
`
if (!document.head.querySelector('#dbd-rp-styles')) {
  styleTag.id = 'dbd-rp-styles'
  document.head.appendChild(styleTag)
}

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  // sessionReady: true once Supabase fires PASSWORD_RECOVERY (meaning the code/token from the
  // email link has been exchanged for a live session). updateUser() only works after this.
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let timer

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
        clearTimeout(timer)
      }
    })

    // If PASSWORD_RECOVERY never fires within 10 s, the link is missing/expired/already used
    timer = setTimeout(() => setSessionExpired(true), 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      console.error('[ResetPassword] updateUser() failed:', error)
      setError(`Erreur (${error.status ?? '?'}) : ${error.message}`)
    } else {
      setSuccess(true)
    }
  }

  return (
    <div style={{ background: '#0A3D3D', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px 20px', fontFamily: "'Inter', sans-serif" }}>
      <div className="dbd-card-rp" style={{ background: '#F7F7EC', borderRadius: '24px', padding: '48px 40px 44px', width: '100%', maxWidth: '440px', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>

        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '30px', fontWeight: '800', color: '#0A3D3D', letterSpacing: '-0.8px', textAlign: 'center', marginBottom: '32px' }}>
          Dar<span style={{ color: '#4B3FD8' }}>Bel</span>Dar
        </div>

        {!success ? (
          <>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '28px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 10px', textAlign: 'center' }}>
              Changez votre mot de passe
            </h1>
            <p style={{ fontSize: '14px', color: '#717182', textAlign: 'center', lineHeight: 1.6, marginBottom: '28px' }}>
              Choisissez un nouveau mot de passe sécurisé pour votre compte.
            </p>

            {/* Link expired / no valid token in URL */}
            {sessionExpired && !sessionReady ? (
              <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#991B1B', textAlign: 'center', lineHeight: 1.6 }}>
                Ce lien est invalide ou a expiré.{' '}
                <Link to="/forgot-password" style={{ color: '#7f1d1d', fontWeight: '700', textDecoration: 'underline' }}>
                  Demandez un nouveau lien.
                </Link>
              </div>
            ) : !sessionReady ? (
              /* Waiting for Supabase to exchange the code from the URL */
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#717182', fontSize: '14px' }}>
                <div style={{ width: '28px', height: '28px', border: '3px solid #e5e7eb', borderTopColor: '#4B3FD8', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
                Vérification du lien en cours…
              </div>
            ) : (
              <>
                {error && (
                  <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#991B1B', marginBottom: '16px' }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="dbd-field-rp">
                    <input
                      className="dbd-input-rp"
                      type={showPassword ? 'text' : 'password'}
                      placeholder=" "
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <label className="dbd-label-rp">Nouveau mot de passe *</label>
                    <button type="button" className="dbd-eye-btn" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="dbd-field-rp">
                    <input
                      className="dbd-input-rp"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder=" "
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <label className="dbd-label-rp">Confirmer le nouveau mot de passe *</label>
                    <button type="button" className="dbd-eye-btn" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <button type="submit" className="dbd-btn-rp" disabled={loading}>
                    {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                  </button>
                </form>
              </>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ background: '#D1FAE5', borderRadius: '50%', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={36} color="#059669" strokeWidth={2.5} />
              </div>
            </div>

            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 12px', textAlign: 'center' }}>
              Mot de passe modifié !
            </h1>
            <p style={{ fontSize: '14px', color: '#717182', textAlign: 'center', lineHeight: 1.6, marginBottom: '28px' }}>
              Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>

            <button className="dbd-btn-rp" style={{ marginTop: 0 }} onClick={() => navigate('/')}>
              Retour à DarBelDar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
