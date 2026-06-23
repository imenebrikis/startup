import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MotionButton from "./MotionButton";
import tripSvg from "../assets/Trip-cuate.svg";
import paperMapSvg from "../assets/PaperMap-cuate.svg";
import { supabase } from "../lib/supabase";

const HEADING_FONT = "'Bricolage Grotesque', sans-serif";
const BODY_FONT = "'Satoshi', sans-serif";
const BRAND_TEAL = "#005B5B";

export default function HowItWorks() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Phone detection — same matchMedia convention as Hero.jsx, so the decorative
  // top-left map can be dropped on phone (where it overlaps the heading) while
  // desktop stays pixel-identical.
  const [isPhone, setIsPhone] = useState(
    () => (typeof window !== "undefined" ? window.matchMedia("(max-width: 767.98px)").matches : false)
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767.98px)");
    const onChange = (e) => setIsPhone(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setIsAuthenticated(true);
    });
  }, []);

  const handleCta = () => navigate(isAuthenticated ? "/dashboard" : "/register");

  const headlineParts = t("home.howItWorks.headlineParts", { returnObjects: true });
  const steps = t("home.howItWorks.steps", { returnObjects: true });

  return (
    <section
      id="how-it-works"
      style={{
        position: "relative",
        zIndex: 2,
        width: "100%",
        minHeight: isPhone ? "auto" : "100vh",
        backgroundColor: "transparent",
        borderTop: isPhone ? "1px solid rgba(0, 0, 0, 0.16)" : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: isPhone ? "flex-start" : "center",
        overflow: isPhone ? "visible" : "hidden",
        padding: isPhone ? "28px 24px 200px" : "96px 24px",
        boxSizing: "border-box",
      }}
    >
      {/* Top-left corner asset — hidden on phone (overlaps the heading at narrow widths) */}
      {!isPhone && (
        <img
          src={paperMapSvg}
          alt={t("home.howItWorks.mapAlt")}
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
      )}

      {/* Bottom-right corner asset — on phone, smaller and resting in the freed
          bottom band: clear of the CTA above, above the footer. */}
      <img
        src={tripSvg}
        alt={t("home.howItWorks.travelerAlt")}
        style={{
          position: "absolute",
          bottom: isPhone ? "-8px" : 0,
          right: 0,
          width: isPhone ? "168px" : "clamp(176px, 22vw, 307px)",
          objectFit: "contain",
          objectPosition: "bottom right",
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.95,
        }}
      />

      {/* Centered content stack */}
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
        {/* Eyebrow — phone only (keeps desktop identical to deployed) */}
        {isPhone && (
          <span
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#357A20",
              textAlign: "center",
              margin: "0 0 16px 0",
            }}
          >
            {t("home.howItWorks.eyebrow")}
          </span>
        )}

        {/* Title */}
        <h2
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontWeight: 900,
            fontSize: isPhone ? "clamp(1.375rem, 6vw, 1.875rem)" : "clamp(2rem, 5vw, 3.25rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: BRAND_TEAL,
            textAlign: "center",
            margin: isPhone ? "0 0 40px 0" : "0 0 96px 0",
          }}
        >
          {Array.isArray(headlineParts)
            ? headlineParts.map((part, i) => (
                <span key={i}>
                  {part}
                  {i < headlineParts.length - 1 && <br />}
                </span>
              ))
            : headlineParts}
        </h2>

        {/* 3-step horizontal row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: isPhone ? "24px" : "48px",
            width: "100%",
            marginBottom: isPhone ? "48px" : "80px",
          }}
        >
          {(Array.isArray(steps) ? steps : []).map((step, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: isPhone ? "#DCF1DF" : "#C5E8F2",
                  color: isPhone ? "#005B5B" : "#4A1518",
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 600,
                  fontStyle: "italic",
                  fontSize: "28px",
                  fontVariationSettings: '"SOFT" 100, "opsz" 144',
                  marginBottom: "16px",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

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

        {/* CTA */}
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <MotionButton label={t("home.howItWorks.cta")} fillClassName="bg-[#adebb3]" onClick={handleCta} />
        </div>
      </div>
    </section>
  );
}
