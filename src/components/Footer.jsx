import { Link } from "react-router-dom";
import { Camera, MessageCircle, Send, AtSign } from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import Logo from "./Logo";

// NOTE: this project's global reset (`* { padding: 0; margin: 0 }` in
// index.css) zeroes out Tailwind's padding/margin utilities. So spacing here is
// done with inline styles + fl/grid `gap` (which the reset doesn't touch).

const QUICK_LINKS = [
  { label: "Accueil", to: "/" },
  { label: "Comment ça marche", to: "/#how-it-works" },
  { label: "Parcourir", to: "/browse" },
];

const SUPPORT_LINKS = [
  { label: "FAQ", to: "#" },
  { label: "Nous contacter", to: "#" },
];

const SOCIALS = [
  { label: "Instagram", Icon: Camera },
  { label: "Facebook", Icon: MessageCircle },
  { label: "Telegram", Icon: Send },
  { label: "X", Icon: AtSign },
];

const linkClass =
  "text-[#005B5B]/75 hover:text-[#005B5B] transition-colors duration-200 text-sm";

export default function Footer() {
  return (
    <footer className="w-full bg-[#ADEBB3] text-[#005B5B]">
      <div
        className="w-full max-w-6xl"
        style={{ margin: "0 auto", padding: "56px 24px 28px" }}
      >
        {/* ── Main grid: stacks on mobile, 3 columns on desktop ─────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Column 1 — brand + tagline + socials */}
          <div className="flex flex-col gap-4">
            <Logo size={24} color="#005B5B" />
            <p
              className="text-[#005B5B]/75 text-sm leading-relaxed"
              style={{ maxWidth: 260 }}
            >
              Découvrez l'Algérie, une maison à la fois.
            </p>
            <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
              {SOCIALS.map(({ label, Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex items-center justify-center rounded-full border border-[#005B5B]/25 text-[#005B5B] hover:bg-[#005B5B] hover:text-[#ADEBB3] transition-colors duration-200"
                  style={{ width: 38, height: 38 }}
                >
                  <Icon style={{ width: 17, height: 17 }} />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 — quick links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[#005B5B] font-semibold text-sm uppercase tracking-wider">
              Liens Rapides
            </h3>
            <ul className="flex flex-col gap-3" style={{ listStyle: "none" }}>
              {QUICK_LINKS.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — support */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[#005B5B] font-semibold text-sm uppercase tracking-wider">
              Support
            </h3>
            <ul className="flex flex-col gap-3" style={{ listStyle: "none" }}>
              {SUPPORT_LINKS.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────────── */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-3 border-t border-[#005B5B]/20"
          style={{ marginTop: 48, paddingTop: 24 }}
        >
          <p className="text-[#005B5B]/60 text-xs">
            © 2026 DarBelDar. Tous droits réservés.
          </p>
          <div className="flex items-center gap-5">
            <a href="#" className="text-[#005B5B]/60 hover:text-[#005B5B] transition-colors duration-200 text-xs">
              Conditions
            </a>
            <a href="#" className="text-[#005B5B]/60 hover:text-[#005B5B] transition-colors duration-200 text-xs">
              Confidentialité
            </a>
            <LanguageSelector />
          </div>
        </div>
      </div>
    </footer>
  );
}
