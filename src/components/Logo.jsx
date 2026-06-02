import { Link } from "react-router-dom";

const BRAND = "#0A3D3D";

// Two-tone wordmark: "Dar" (extrabold) · "Bel" (light, faded) · "Dar" (extrabold).
export default function Logo({ to, size = 22, color = BRAND, style, className }) {
  const text = (
    <span
      className={`font-sans${className ? " " + className : ""}`}
      style={{
        fontSize: size,
        color,
        letterSpacing: "-0.025em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        display: "inline-block",
        ...style,
      }}
    >
      <span style={{ fontWeight: 800 }}>Dar</span>
      <span style={{ fontWeight: 400, opacity: 0.7 }}>Bel</span>
      <span style={{ fontWeight: 800 }}>Dar</span>
    </span>
  );

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: "none", display: "inline-flex" }}>
        {text}
      </Link>
    );
  }
  return text;
}
