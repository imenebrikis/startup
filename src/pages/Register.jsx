import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import Logo from "../components/Logo";


const styleTag = document.createElement("style");
styleTag.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Inter:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes dbd-fade-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes dbd-bg-shift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes dbd-spin {
    to { transform: rotate(360deg); }
  }

  .dbd-card {
    animation: dbd-fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  /* Floating label */
  .dbd-field { position: relative; margin-bottom: 14px; }

  .dbd-input {
    width: 100%;
    padding: 22px 16px 8px;
    border: 1.5px solid #E0E5E0;
    border-radius: 14px;
    background: #fff;
    font-size: 15px;
    font-family: 'Inter', sans-serif;
    color: #111;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .dbd-input:focus {
    border-color: #4B3FD8;
    box-shadow: 0 0 0 3px rgba(75, 63, 216, 0.12);
  }

  .dbd-label {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 15px;
    color: #8AAA95;
    font-family: 'Inter', sans-serif;
    pointer-events: none;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    background: transparent;
    padding: 0 2px;
  }

  .dbd-input:focus ~ .dbd-label,
  .dbd-input:not(:placeholder-shown) ~ .dbd-label {
    top: 14px;
    transform: translateY(-50%) scale(0.78);
    transform-origin: left center;
    color: #4B3FD8;
    font-weight: 500;
  }

  .dbd-google-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 14px 20px;
    border-radius: 100px;
    border: 1.5px solid #2A2A2A;
    background: #fff;
    cursor: pointer;
    margin-bottom: 22px;
    font-family: 'Inter', sans-serif;
    font-size: 14.5px;
    font-weight: 600;
    color: #111;
    transition: background 0.18s, box-shadow 0.18s, transform 0.12s;
    letter-spacing: -0.1px;
  }
  .dbd-google-btn:hover {
    background: #F3F4F6;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    transform: translateY(-1px);
  }
  .dbd-google-btn:active { transform: translateY(0); }

  .dbd-continue-btn {
    width: 100%;
    padding: 15px;
    background: linear-gradient(135deg, #5B50E8 0%, #4B3FD8 100%);
    border: none;
    border-radius: 100px;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    font-family: 'Bricolage Grotesque', sans-serif;
    cursor: pointer;
    margin-top: 6px;
    letter-spacing: 0.1px;
    box-shadow: 0 4px 20px rgba(75, 63, 216, 0.35);
    transition: box-shadow 0.2s, transform 0.12s, background 0.2s;
    position: relative;
    overflow: hidden;
  }
  .dbd-continue-btn:hover:not(:disabled) {
    box-shadow: 0 6px 28px rgba(75, 63, 216, 0.45);
    transform: translateY(-1px);
    background: linear-gradient(135deg, #6860F0 0%, #5248E0 100%);
  }
  .dbd-continue-btn:active:not(:disabled) { transform: translateY(0); }
  .dbd-continue-btn:disabled { opacity: 0.72; cursor: not-allowed; }

  .dbd-spinner {
    display: inline-block;
    width: 16px; height: 16px;
    border: 2.5px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: dbd-spin 0.7s linear infinite;
    vertical-align: middle;
    margin-right: 8px;
  }

  .dbd-bg {
    background: #0A3D3D;
    min-height: 100vh;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 48px 20px;
    font-family: 'Inter', sans-serif;
  }

  /* Decorative circles in background */
  .dbd-orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.18;
    pointer-events: none;
  }
  .dbd-orb-1 {
    width: 420px; height: 420px;
    background: #4B3FD8;
    top: -100px; right: -80px;
  }
  .dbd-orb-2 {
    width: 300px; height: 300px;
    background: #0D7A6A;
    bottom: -60px; left: -60px;
  }
`;
if (!document.head.querySelector("#dbd-styles")) {
  styleTag.id = "dbd-styles";
  document.head.appendChild(styleTag);
}

/* ─── Component ────────────────────────────────────────────────────────────── */
export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session) navigate("/profile", { replace: true });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/profile", { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const isStrongPassword = (pwd) =>
    pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isStrongPassword(password)) {
      setError("Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    await supabase.auth.signOut();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const user = data?.user;
    const session = data?.session;

    if (user && !session) {
      setSuccess("Inscription réussie ! Veuillez vérifier votre boîte mail pour confirmer votre compte.");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setLoading(false);
      return;
    }

    // Auto-confirm path: session exists, onAuthStateChange fires SIGNED_IN and the effect navigates.
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  return (
    <div className="dbd-bg">
      {/* Background orbs */}
      <div className="dbd-orb dbd-orb-1" />
      <div className="dbd-orb dbd-orb-2" />

      {/* Card */}
      <div
        className="dbd-card"
        style={{
          background: "#F7F7EC",
          borderRadius: "24px",
          padding: "44px 40px 40px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22), 0 1px 0 rgba(255,255,255,0.06)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
          <Logo size={38} accent="#ADEBB3" />
        </div>

        {/* Subtitle */}
        <p
          style={{
            textAlign: "center",
            fontSize: "13.5px",
            color: "#6A8A78",
            marginBottom: "32px",
            fontFamily: "'Inter', sans-serif",
            lineHeight: 1.5,
          }}
        >
          Exchange homes across Algeria — start your journey
        </p>

        {/* Google button */}
        <button className="dbd-google-btn" onClick={handleGoogle} type="button" id="google-signup-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* OR divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "22px",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "#D6DDD6" }} />
          <span style={{ fontSize: "12px", color: "#8AAA95", fontWeight: "600", letterSpacing: "0.5px" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "#D6DDD6" }} />
        </div>

        {/* Success */}
        {success && (
          <div
            role="status"
            style={{
              background: "#E8F8EC",
              border: "1.5px solid #6FCB7E",
              borderRadius: "10px",
              padding: "12px 16px",
              fontSize: "13.5px",
              color: "#0F6B2B",
              marginBottom: "14px",
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {success}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            style={{
              background: "#FFF0F0",
              border: "1.5px solid #E5484D",
              borderRadius: "10px",
              padding: "12px 16px",
              fontSize: "13.5px",
              color: "#B5001E",
              marginBottom: "14px",
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} noValidate>
          {/* Email field */}
          <div className="dbd-field">
            <input
              className="dbd-input"
              id="register-email"
              type="email"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <label className="dbd-label" htmlFor="register-email">
              Email address
            </label>
          </div>

          {/* Password field */}
          <div className="dbd-field">
            <input
              className="dbd-input"
              id="register-password"
              type={showPassword ? "text" : "password"}
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={{ paddingRight: 46 }}
            />
            <label className="dbd-label" htmlFor="register-password">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              tabIndex={-1}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6A8A78",
                borderRadius: 8,
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Confirm password field */}
          <div className="dbd-field">
            <input
              className="dbd-input"
              id="register-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder=" "
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={{ paddingRight: 46 }}
            />
            <label className="dbd-label" htmlFor="register-confirm-password">
              Confirmer le mot de passe
            </label>
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              tabIndex={-1}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6A8A78",
                borderRadius: 8,
              }}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Continue button */}
          <button
            type="submit"
            id="register-submit-btn"
            className="dbd-continue-btn"
            disabled={loading}
          >
            {loading && <span className="dbd-spinner" />}
            {loading ? "Création..." : "Continue"}
          </button>
        </form>

        {/* Bottom link */}
        <p
          style={{
            textAlign: "center",
            fontSize: "13px",
            color: "#6A8A78",
            marginTop: "20px",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Already have an account?{" "}
          <Link
            to="/"
            style={{
              color: "#4B3FD8",
              fontWeight: "600",
              textDecoration: "none",
              borderBottom: "1.5px solid transparent",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.target.style.borderBottomColor = "#4B3FD8")}
            onMouseLeave={(e) => (e.target.style.borderBottomColor = "transparent")}
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
