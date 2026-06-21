import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import Logo from "../components/Logo";
import Footer from "../components/Footer";

// Two-column FAQ: left intro (sticky on desktop), right accordion list grouped
// into categories. Single-open accordion — opening one collapses any other.
export default function Faq() {
  const { t } = useTranslation();
  const categories = t("faq.categories", { returnObjects: true });
  const cats = Array.isArray(categories) ? categories : [];

  const [openKey, setOpenKey] = useState(null);
  const toggle = (key) => setOpenKey((k) => (k === key ? null : key));

  return (
    <div style={{ minHeight: "100vh", background: "#FBF8EF", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        .faq-grid { display: grid; grid-template-columns: minmax(280px, 360px) 1fr; gap: 56px; align-items: start; }
        .faq-aside { position: sticky; top: 96px; }
        @media (max-width: 880px) {
          .faq-grid { grid-template-columns: 1fr; gap: 28px; }
          .faq-aside { position: static; top: auto; }
        }
      `}</style>

      {/* ── Header ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px", maxWidth: 1200, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <Logo to="/" size={22} color="#0A3D3D" />
      </header>

      {/* ── Main ── */}
      <main style={{ flex: 1, maxWidth: 1200, width: "100%", margin: "0 auto", padding: "40px 32px 80px", boxSizing: "border-box" }}>
        <div className="faq-grid">
          {/* Left — intro */}
          <aside className="faq-aside">
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 42, fontWeight: 700, color: "#0A3D3D", margin: 0, lineHeight: 1.08, letterSpacing: "-0.02em" }}>
              {t("faq.heading")}
            </h1>
            <p style={{ marginTop: 16, fontSize: 15, color: "#6E7B79", lineHeight: 1.6, maxWidth: 320 }}>
              {t("faq.subtitle")}
            </p>
          </aside>

          {/* Right — categorized accordions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {cats.map((cat, ci) => (
              <section key={ci} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h2 style={{ fontSize: 12.5, fontWeight: 700, color: "#005B5B", textTransform: "uppercase", letterSpacing: "0.1em", margin: "4px 0 4px 4px" }}>
                  {cat.title}
                </h2>

                {(cat.items || []).map((item, ii) => {
                  const key = `${ci}-${ii}`;
                  const open = openKey === key;
                  return (
                    <div
                      key={key}
                      style={{
                        borderRadius: 20,
                        background: open ? "#FFFFFF" : "#ADEBB3",
                        boxShadow: open ? "0 10px 30px rgba(0,0,0,0.08)" : "none",
                        transition: "background 0.25s ease, box-shadow 0.25s ease",
                        overflow: "hidden",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        aria-expanded={open}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                          gap: 16, padding: "18px 22px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#0A3D3D", lineHeight: 1.35 }}>
                          {item.q}
                        </span>
                        <ChevronDown style={{ width: 20, height: 20, color: "#005B5B", flexShrink: 0, transition: "transform 0.3s ease", transform: open ? "rotate(180deg)" : "none" }} />
                      </button>

                      {/* Smoothly animates from 0fr → 1fr regardless of answer length */}
                      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
                        <div style={{ overflow: "hidden" }}>
                          <p style={{ margin: 0, padding: "0 22px 20px", fontSize: 14, color: "#6E7B79", lineHeight: 1.65 }}>
                            {item.a}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        </div>

        {/* ── Still stuck? contact block ── */}
        <div
          style={{
            marginTop: 56, maxWidth: 620, marginLeft: "auto", marginRight: "auto",
            background: "#E4F6E6", border: "1px solid #D5E9D8", borderRadius: 20,
            padding: "28px 32px", textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 15, color: "#0A3D3D", lineHeight: 1.6 }}>
            {t("faq.contact.lead")}
            <a
              href="mailto:darbeldar.dz@gmail.com"
              style={{ color: "#005B5B", fontWeight: 700, textDecoration: "underline" }}
            >
              darbeldar.dz@gmail.com
            </a>
            {t("faq.contact.tail")}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
