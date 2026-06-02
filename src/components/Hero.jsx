import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import MotionButton from "./MotionButton";

import Logo from "./Logo";

const NAV_LINKS = [
  { label: "Home", to: "/" },

  { label: "How it works", to: "/#how-it-works" },

  { label: "Parcourir", to: "/browse" },
];

export default function Hero() {
  const [scrolled, setScrolled] = useState(false);

  // Going.com-style dynamic navbar: transparent at the top, deep teal once

  // the user scrolls. Threshold of 10px keeps the switch crisp at the fold.

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);

    onScroll(); // sync on mount (handles reload mid-page)

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    // High z-index so the fixed navbar (nested here) paints ABOVE the sibling

    // How It Works section (z-index 2 in App.jsx) — otherwise that section's

    // corner illustrations leak over the navbar while scrolling.

    <div className="w-full relative z-50 bg-[#ADEBB3]">
      {/* ── Dynamic Navbar (Going.com layout): logo left, links + auth grouped

          on the right. Transparent at the top, deep teal once scrolled. ─── */}

      <nav
        className={`fixed top-0 left-0 w-full z-[100] h-[62px] flex items-center transition-colors duration-300 ${
          scrolled ? "bg-[#004949] shadow-md" : "bg-transparent"
        }`}
      >
        {/* Split layout mirroring the Hero body below: 55% logo / 45% links,
            so the nav aligns column-for-column with the headline and photo. */}
        <div className="w-full h-full flex flex-row">
          {/* Left Nav Section (55%) — logo sits above the headline. */}
          <div className="w-[55%] flex items-center justify-center">
            <div className="w-full max-w-2xl px-8 lg:px-12">
              <span className="inline-block">
                <Logo to="/" size={24} color={scrolled ? "#ffffff" : "#0A3D3D"} />
              </span>
            </div>
          </div>

          {/* Right Nav Section (45%) — links align above the right-column photo.
              Inline paddingRight matches the photo's right inset (reset kills pr-*). */}
          <div
            className="w-[45%] flex items-center justify-end pr-4 md:pr-8"
            style={{ paddingRight: 16 }}
          >
            <div className="flex items-center gap-8 lg:gap-10">
              <div className="hidden md:flex items-center gap-7 lg:gap-9">
                {NAV_LINKS.map(({ label, to }) => (
                  <Link
                    key={label}
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

                <Link
                  to="/login"
                  className={`font-satoshi font-bold uppercase tracking-wide text-sm transition-colors duration-300 ${
                    scrolled
                      ? "text-white/90 hover:text-white"
                      : "text-[#0A3D3D] hover:text-[#0A3D3D]"
                  }`}
                >
                  Login
                </Link>
              </div>

              {/* Auth button — left as-is per request (you'll style these later) */}
              <Link
                to="/register"
                className="bg-[#adebb3] text-[#005B5B] px-6 py-2.5 rounded-full font-bold hover:brightness-95 transition"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero Body (Refit-style split) — row on desktop, stacked on mobile ── */}

      <div className="relative w-full min-h-screen md:h-screen flex flex-col md:flex-row">
        {/* Left Column — transparent so the cream from the App.jsx wrapper

            shows through behind this text. */}

        <div className="w-full md:w-[55%] md:h-full flex flex-col items-center justify-center pt-28 pb-12 md:py-0">
          {/* Inner Text Wrapper - restricted width, explicit flexbox gap rhythm */}

          <div className="w-full max-w-2xl px-8 lg:px-12 flex flex-col justify-center gap-6 text-left">
            {/* 1. The Hook / Headline */}

            <h1
              className="font-satoshi font-normal text-4xl md:text-[88px] text-[#005B5B] leading-[1.05] tracking-tighter m-0 p-0"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              Vendez, échangez,
              <br className="hidden md:block" />
              explorez - chaque
              <br className="hidden md:block" />
              coin d&apos;Algérie est
              <br className="hidden md:block" />
              chez vous.
            </h1>

            {/* 2. The Description */}

            <p className="font-satoshi font-bold text-xl text-[#005B5B]/75 leading-snug max-w-lg m-0 p-0">
              Que vous souhaitiez vendre votre maison ou la troquer contre une
              nouvelle aventure, DarBelDar vous connecte avec des propriétaires
              à travers les 58 wilayas.
            </p>

            {/* 3. The CTA Button Wrapper */}

            <div className="m-0 p-0">
              <Link to="/browse" className="inline-block w-fit">
                <MotionButton
                  label="Découvrir nos lieux"
                  fillClassName="bg-[#ADEBB3]"
                  hoverTextClassName="group-hover:text-[#0F4C4A]"
                  hoverIconClassName="group-hover:text-[#0F4C4A]"
                />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column — photo as an inset card: consistent ~2rem margin lets

            the cream page background frame it on all sides, rounded corners.

            Full width below the text on mobile, 45% beside it on desktop. */}

        <div
          className="w-full md:w-[45%] h-[60vh] md:h-full p-6 md:p-8"
          style={{ padding: "20px 16px 15px 32px" }}
        >
          <img
            src="/hero-image.jpg"
            alt="Maisons contemporaines lumineuses en Algérie"
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
}
