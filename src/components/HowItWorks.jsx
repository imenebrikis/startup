import { Link } from "react-router-dom";
import MotionButton from "./MotionButton";
import tripSvg from "../assets/Trip-cuate.svg";
import paperMapSvg from "../assets/PaperMap-cuate.svg";

const HEADING_FONT = "'Bricolage Grotesque', sans-serif";
const BODY_FONT = "'Satoshi', sans-serif"; // fontshare, Bold (700)

const BRAND_TEAL = "#005B5B"; // primary text

const STEPS = [
  {
    number: "01",
    title: "Publiez ce que vous avez.",
    desc: "Créez un profil et listez votre maison gratuitement. Quelques photos et détails, c'est tout ce qu'il faut.",
  },
  {
    number: "02",
    title: "Trouvez ce que vous cherchez.",
    desc: "Explorez des centaines de maisons vérifiées à travers les 58 wilayas et trouvez votre coup de cœur.",
  },
  {
    number: "03",
    title: "Puis voyagez gratuitement.",
    desc: "Contactez le propriétaire, convenez des détails, échangez les clés, et partez sans payer pour l'hébergement.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{
        position: "relative",
        // Above the scroll plane (which lives in the App.jsx wrapper at a lower
        // z-index); background is transparent so the cream comes from that
        // wrapper and the plane shows through on the left behind this content.
        zIndex: 2,
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: "96px 24px",
        boxSizing: "border-box",
      }}
    >
      {/* ── Top-left corner asset: mirrors the bottom-right one, same size ── */}
      <img
        src={paperMapSvg}
        alt="Illustration d'une carte papier"
        style={{
          position: "absolute",
          top: 0,
          left: "clamp(24px, 5vw, 80px)",
          width: "clamp(176px, 22vw, 307px)",
          objectFit: "contain",
          objectPosition: "top left",
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.95,
        }}
      />

      {/* ── Corner asset: absolute overlay, sits behind the content stack ── */}
      <img
        src={tripSvg}
        alt="Illustration d'une voyageuse avec ses bagages"
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "clamp(176px, 22vw, 307px)", // ~20% smaller so the CTA leads
          objectFit: "contain",
          objectPosition: "bottom right",
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.95,
        }}
      />

      {/* ── Centered vertical content stack ───────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Title */}
        <h2
          style={{
            fontFamily: "'Satoshi', sans-serif", // match the Hero hook
            fontWeight: 900,
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: BRAND_TEAL,
            textAlign: "center",
            margin: "0 0 96px 0",
          }}
        >
          Loyers trop chers ?
          <br />
          Essayez l&apos;échange
          <br />
          à la place.
        </h2>

        {/* 3-step horizontal row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "48px",
            width: "100%",
            marginBottom: "80px",
          }}
        >
          {STEPS.map((step) => (
            <div
              key={step.number}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                textAlign: "left",
              }}
            >
              {/* Soft hand-drawn serif badge (Going.com style) */}
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "#C5E8F2",
                  color: "#4A1518",
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 600,
                  fontStyle: "italic",
                  fontSize: "28px",
                  fontVariationSettings: '"SOFT" 100, "opsz" 144',
                  marginBottom: "16px",
                }}
              >
                {step.number}
              </span>

              {/* Step title */}
              <h3
                style={{
                  fontFamily: HEADING_FONT,
                  fontWeight: 700,
                  fontSize: "clamp(1.125rem, 2vw, 1.375rem)",
                  letterSpacing: "-0.01em",
                  color: BRAND_TEAL,
                  margin: "0 0 12px 0",
                }}
              >
                {step.title}
              </h3>

              {/* Step description */}
              <p
                style={{
                  fontFamily: BODY_FONT,
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  color: "rgba(0, 91, 91, 0.75)",
                  maxWidth: "280px",
                  margin: 0,
                }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Centered CTA — same brand MotionButton the Hero uses */}
        <div
          style={{ display: "flex", justifyContent: "center", width: "100%" }}
        >
          <Link to="/register" style={{ display: "inline-block" }}>
            <MotionButton label="Join for free" />
          </Link>
        </div>
      </div>
    </section>
  );
}
