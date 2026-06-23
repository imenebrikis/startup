import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import MotionButton from "./MotionButton";
import Logo from "./Logo";

export default function Hero() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // The slide-in sheet is phone-only. Like Sidebar's drawer, we branch on a
  // matchMedia flag (not just a `md:hidden` class) so the portaled-to-body sheet
  // is never present on desktop, and auto-closes if the viewport grows past md.
  const [isPhone, setIsPhone] = useState(
    () => (typeof window !== "undefined" ? window.matchMedia("(max-width: 767.98px)").matches : false)
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767.98px)");
    const onChange = (e) => {
      setIsPhone(e.matches);
      if (!e.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const NAV_LINKS = [
    { label: t("home.nav.home"),       to: "/" },
    { label: t("home.nav.howItWorks"), to: "/#how-it-works" },
    { label: t("home.nav.login"),      to: "/login" },
    { label: t("home.nav.signUp"),     to: "/register" },
  ];

  // Phone menu shows the first 3; "Inscription" (last) becomes a standalone CTA button.
  const PHONE_MENU_LINKS = NAV_LINKS.slice(0, 3);
  const SIGNUP_LINK = NAV_LINKS[3];

  const headlineParts = t("home.hero.headlineParts", { returnObjects: true });

  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
      // Keep the mobile browser status bar in sync with the navbar (Android Chrome).
      // On phone the navbar is green from the start, so the status bar is green
      // immediately too; on desktop it's cream at the top, green once scrolled.
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) themeMeta.setAttribute("content", isScrolled || isPhone ? "#004949" : "#F3EEE0");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isPhone]);

  // On phone the navbar wears its green "scrolled" look from the moment the page
  // opens (no cream-over-hero phase); on desktop it stays driven by scroll.
  const greenNav = scrolled || isPhone;

  return (
    <div className="w-full relative z-50 bg-[#F3EEE0]">
      {/* ── Dynamic Navbar ── */}
      <nav
        className={`absolute md:fixed top-0 left-0 w-full z-[100] h-[84px] flex items-end pb-4 transition-colors duration-300 ${
          greenNav ? "bg-[#004949] shadow-md" : "bg-transparent"
        }`}
      >
        <div className="w-full h-full flex flex-row">
          {/* Logo — desktop: left 55% column w/ 100px inset. Phone: flex-1 w/ small inset. */}
          <div
            className="flex-1 min-w-0 md:w-[55%] md:flex-none flex items-center md:min-w-0"
            style={{ paddingLeft: isPhone ? 16 : 100 }}
          >
            <Logo to="/" size={24} color={greenNav ? "#ffffff" : "#0A3D3D"} />
          </div>

          {/* DESKTOP (md+) — right 45% column, 4 inline links. Unchanged from before. */}
          <div className="hidden md:flex w-[45%] items-center justify-evenly pr-6">
            {NAV_LINKS.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className={`font-satoshi font-bold uppercase tracking-wide text-sm transition-colors duration-300 ${
                  scrolled
                    ? "text-white/90 hover:text-white"
                    : "text-[#0A3D3D] hover:text-[#0A3D3D]"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* PHONE (below md) — Inscription CTA + hamburger. */}
          <div className="flex md:hidden items-center gap-2 pr-4">
            <Link
              to={SIGNUP_LINK.to}
              className="font-satoshi font-bold uppercase tracking-wide rounded-full transition-transform duration-200 active:scale-95"
              style={{
                fontSize: 14, color: "#005B5B", background: "#ADEBB3",
                padding: "9px 18px", lineHeight: 1, whiteSpace: "nowrap",
              }}
            >
              {SIGNUP_LINK.label}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
              className={`flex items-center justify-center h-11 w-11 rounded-full transition-colors duration-200 ${
                greenNav ? "text-white hover:bg-white/10" : "text-[#0A3D3D] hover:bg-[#0A3D3D]/10"
              }`}
            >
              {menuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Phone right-slide menu sheet ──
          Portaled to <body> (like FilterSheet) so it escapes the fixed nav's
          stacking/overflow, and stays mounted off-canvas with a transform slide
          + backdrop fade (like the Sidebar drawer). Phone-only via isPhone. */}
      {isPhone &&
        createPortal(
          <>
            {/* Reduced-motion floor — inline transitions can't carry a media query. */}
            <style>{`
              @media (prefers-reduced-motion: reduce) {
                .hero-menu-sheet, .hero-menu-backdrop { transition: none !important; }
              }
            `}</style>

            {/* Backdrop — fades via opacity, inert when closed. */}
            <div
              className="hero-menu-backdrop"
              aria-hidden="true"
              onClick={() => setMenuOpen(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(0,0,0,0.45)",
                opacity: menuOpen ? 1 : 0,
                pointerEvents: menuOpen ? "auto" : "none",
                transition: "opacity 0.22s ease",
              }}
            />

            {/* Panel — slides from the right edge. */}
            <aside
              className="hero-menu-sheet"
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed", top: 0, right: 0,
                height: "100dvh", width: "80%", maxWidth: 320,
                zIndex: 1001,
                background: "#F3EEE0",
                borderLeft: "1px solid #E5DFCE",
                boxShadow: menuOpen ? "-4px 0 28px rgba(0,0,0,0.18)" : "none",
                transform: menuOpen ? "translateX(0)" : "translateX(100%)",
                transition: "transform 0.28s cubic-bezier(0.32, 1, 0.58, 1)",
                display: "flex", flexDirection: "column",
                paddingTop: "env(safe-area-inset-top)",
                fontFamily: "'Satoshi', sans-serif",
              }}
            >
              {/* Header — brand + close affordance */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "18px 20px", borderBottom: "1px solid #E5DFCE", flexShrink: 0,
              }}>
                <Logo to="/" size={22} color="#0A3D3D" />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Fermer le menu"
                  className="flex items-center justify-center rounded-full transition-colors"
                  style={{
                    width: 40, height: 40, border: "none",
                    background: "transparent", color: "#005B5B", cursor: "pointer",
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Links — comfortably-spaced tappable rows */}
              <nav style={{ display: "flex", flexDirection: "column", padding: "8px 0" }}>
                {/* Accueil + Comment ça marche (Connexion is moved below the button). */}
                {PHONE_MENU_LINKS.slice(0, 2).map(({ label, to }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="font-satoshi font-bold uppercase tracking-wide transition-colors"
                    style={{
                      fontSize: 15, color: "#005B5B", textDecoration: "none",
                      padding: "16px 22px",
                    }}
                    onTouchStart={(e) => (e.currentTarget.style.background = "rgba(173,235,179,0.4)")}
                    onTouchEnd={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {label}
                  </Link>
                ))}

                {/* Inscription also lives in the sheet (still visible in the navbar). */}
                <Link
                  to={SIGNUP_LINK.to}
                  onClick={() => setMenuOpen(false)}
                  className="font-satoshi font-bold uppercase tracking-wide rounded-full transition-transform duration-200 active:scale-95"
                  style={{
                    margin: "12px 22px 0", textAlign: "center",
                    fontSize: 14, color: "#005B5B", background: "#ADEBB3",
                    padding: "12px 18px", textDecoration: "none",
                  }}
                >
                  {SIGNUP_LINK.label}
                </Link>

                {/* Connexion — moved below the button; same plain teal link style, centered. */}
                {PHONE_MENU_LINKS.slice(2).map(({ label, to }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="font-satoshi font-bold uppercase tracking-wide transition-colors"
                    style={{
                      fontSize: 15, color: "#005B5B", textDecoration: "none",
                      padding: "16px 22px", textAlign: "center",
                    }}
                    onTouchStart={(e) => (e.currentTarget.style.background = "rgba(173,235,179,0.4)")}
                    onTouchEnd={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </aside>
          </>,
          document.body
        )}

      {/* ── Hero Body ── */}
      <div className="relative w-full min-h-0 md:h-screen flex flex-col md:flex-row">
        {/* Left Column */}
        <div
          className="hero-left w-full md:w-[55%] md:h-full flex flex-col items-center justify-start md:justify-center"
          style={{ paddingTop: isPhone ? 112 : undefined, paddingBottom: isPhone ? 28 : undefined }}
        >
          <div className="w-full max-w-2xl px-8 lg:px-12 flex flex-col justify-center gap-7 md:gap-6 text-center md:text-left">
            {/* Headline */}
            <h1
              className="font-satoshi font-bold md:font-normal text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[88px] text-[#005B5B] leading-[1.05] tracking-tighter m-0 p-0"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              {Array.isArray(headlineParts)
                ? headlineParts.map((part, i) => (
                    <span key={i}>
                      {part}
                      {i < headlineParts.length - 1 && <br />}
                    </span>
                  ))
                : headlineParts}
            </h1>

            {/* Description */}
            <p
              className="font-satoshi font-medium md:font-bold text-xl text-[#4A4A4A] leading-snug max-w-lg m-0 p-0"
              style={{
                fontFamily: isPhone ? "'Switzer', sans-serif" : undefined,
                fontWeight: isPhone ? 600 : undefined,
                fontSize: isPhone ? "15px" : undefined,
                maxWidth: isPhone ? 280 : undefined,
                alignSelf: isPhone ? "center" : undefined,
              }}
            >
              {t("home.hero.description")}
            </p>

            {/* CTA */}
            <div className="m-0 p-0">
              <Link to="/browse" className="inline-block w-fit">
                <MotionButton
                  label={t("home.hero.cta")}
                  fillClassName="bg-[#ADEBB3]"
                  hoverTextClassName="group-hover:text-[#0F4C4A]"
                  hoverIconClassName="group-hover:text-[#0F4C4A]"
                />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column — photo */}
        <div
          className="hidden md:block w-full md:w-[45%] h-[60vh] md:h-full p-6 md:p-8"
          style={{ padding: "20px 16px 15px 32px" }}
        >
          <img
            src="/hero-image.jpg"
            alt={t("home.hero.imgAlt")}
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>
      </div>

      {/* Short-viewport safeguard: on landscape laptops with limited height the
          full-size headline, vertically centered in a 100vh column under the
          fixed 84px nav, can overflow upward into the logo/nav. On short screens
          only, anchor the hero text below the nav instead of centering it.
          Height media queries can't be expressed with Tailwind utilities. */}
      <style>{`
        @media (min-width: 768px) and (max-height: 768px) {
          .hero-left { justify-content: flex-start; padding-top: 104px; }
        }
      `}</style>
    </div>
  );
}
