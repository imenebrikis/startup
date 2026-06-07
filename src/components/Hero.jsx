import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MotionButton from "./MotionButton";
import Logo from "./Logo";

export default function Hero() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  const NAV_LINKS = [
    { label: t("home.nav.home"),       to: "/" },
    { label: t("home.nav.howItWorks"), to: "/#how-it-works" },
    { label: t("home.nav.login"),      to: "/login" },
    { label: t("home.nav.signUp"),     to: "/register" },
  ];

  const headlineParts = t("home.hero.headlineParts", { returnObjects: true });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="w-full relative z-50 bg-[#F3EEE0]">
      {/* ── Dynamic Navbar ── */}
      <nav
        className={`fixed top-0 left-0 w-full z-[100] h-[84px] flex items-end pb-4 transition-colors duration-300 ${
          scrolled ? "bg-[#004949] shadow-md" : "bg-transparent"
        }`}
      >
        <div className="w-full h-full flex flex-row">
          {/* Left 55% — logo */}
          <div className="w-[55%] flex items-center" style={{ paddingLeft: "100px" }}>
            <Logo to="/" size={24} color={scrolled ? "#ffffff" : "#0A3D3D"} />
          </div>

          {/* Right 45% — nav links */}
          <div className="w-[45%] flex items-center justify-evenly pr-6">
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
        </div>
      </nav>

      {/* ── Hero Body ── */}
      <div className="relative w-full min-h-screen md:h-screen flex flex-col md:flex-row">
        {/* Left Column */}
        <div className="hero-left w-full md:w-[55%] md:h-full flex flex-col items-center justify-center pt-28 pb-12 md:py-0">
          <div className="w-full max-w-2xl px-8 lg:px-12 flex flex-col justify-center gap-6 text-left">
            {/* Headline */}
            <h1
              className="font-satoshi font-normal text-4xl md:text-5xl lg:text-6xl xl:text-[88px] text-[#005B5B] leading-[1.05] tracking-tighter m-0 p-0"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              {Array.isArray(headlineParts)
                ? headlineParts.map((part, i) => (
                    <span key={i}>
                      {part}
                      {i < headlineParts.length - 1 && <br className="hidden md:block" />}
                    </span>
                  ))
                : headlineParts}
            </h1>

            {/* Description */}
            <p className="font-satoshi font-bold text-xl text-[#4A4A4A] leading-snug max-w-lg m-0 p-0">
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
          className="w-full md:w-[45%] h-[60vh] md:h-full p-6 md:p-8"
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
