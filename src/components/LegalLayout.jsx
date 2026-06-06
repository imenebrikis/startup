import Logo from "./Logo";
import LanguageSelector from "./LanguageSelector";
import Footer from "./Footer";

// Shared shell for legal/static pages (Terms, Privacy). Creamy page background,
// a white readable content card with the standard 20px radius + soft shadow.
export default function LegalLayout({ title, children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#FBF8EF", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px", maxWidth: 1200, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <Logo to="/" size={22} color="#0A3D3D" />
        <LanguageSelector />
      </header>

      {/* Content card */}
      <main style={{ flex: 1, maxWidth: 820, width: "100%", margin: "0 auto", padding: "32px 24px 72px", boxSizing: "border-box" }}>
        <article style={{ background: "#FFFFFF", border: "1px solid #ECE4D2", borderRadius: 20, padding: "44px 48px", boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, color: "#0A3D3D", margin: "0 0 8px", lineHeight: 1.15, letterSpacing: "-0.02em" }}>
            {title}
          </h1>
          {children}
        </article>
      </main>

      <Footer />
    </div>
  );
}

// ── Shared typographic primitives ──────────────────────────────────────────
export function Section({ children }) {
  return (
    <h2 style={{ fontSize: 17, fontWeight: 700, color: "#005B5B", margin: "30px 0 10px" }}>
      {children}
    </h2>
  );
}

export function Para({ children }) {
  return (
    <p style={{ fontSize: 15, color: "#404B49", lineHeight: 1.7, margin: "0 0 12px" }}>
      {children}
    </p>
  );
}

export function Bullets({ items }) {
  return (
    <ul style={{ margin: "0 0 12px", paddingLeft: 22, color: "#404B49", fontSize: 15, lineHeight: 1.7 }}>
      {items.map((it, i) => (
        <li key={i} style={{ marginBottom: 6 }}>{it}</li>
      ))}
    </ul>
  );
}
