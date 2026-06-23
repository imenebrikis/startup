import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import Logo from "./Logo";

// lucide doesn't ship Instagram/TikTok brand glyphs, so we inline the official
// logo paths. fill="currentColor" lets them inherit the link colour + hover.
function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.43-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.13 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13-.67-.66-1.34-1.07-2.13-1.38-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0z" />
      <path d="M12 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zM12 16a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
      <circle cx="18.41" cy="5.59" r="1.44" />
    </svg>
  );
}

function TiktokIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

const SOCIALS = [
  { label: "Instagram", Icon: InstagramIcon, href: "https://instagram.com/darbeldar", external: true },
  { label: "TikTok", Icon: TiktokIcon, href: "https://tiktok.com/@darbeldar2026", external: true },
  { label: "Email", Icon: Mail, href: "mailto:darbeldar.dz@gmail.com", external: false },
];

const linkClass =
  "inline-block py-1 text-[#2E4747] hover:text-[#005B5B] hover:underline underline-offset-2 transition-colors duration-200 text-sm rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005B5B]";

export default function Footer() {
  const { t } = useTranslation();

  const QUICK_LINKS = [
    { label: t("home.footer.links.home"),       to: "/" },
    { label: t("home.footer.links.howItWorks"), to: "/#how-it-works" },
    { label: t("home.footer.links.browse"),     to: "/browse" },
  ];

  const SUPPORT_LINKS = [
    { label: t("home.footer.links.faq"),     to: "/faq" },
    { label: t("home.footer.links.contact"), to: "/faq" },
    { label: t("home.footer.terms"),         to: "/terms" },
    { label: t("home.footer.privacy"),       to: "/privacy" },
  ];

  return (
    <footer className="w-full bg-[#ADEBB3] text-[#005B5B]">
      <div
        className="w-full max-w-6xl"
        style={{ margin: "0 auto", padding: "56px 24px 28px" }}
      >
        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Column 1 — brand + tagline + socials */}
          <div className="flex flex-col gap-4">
            <Logo size={24} color="#005B5B" />
            <p className="text-[#2E4747] text-sm leading-relaxed" style={{ maxWidth: 260 }}>
              {t("home.footer.tagline")}
            </p>
            <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
              {SOCIALS.map(({ label, Icon, href, external }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-center justify-center rounded-full bg-[#2E4747] text-[#ADEBB3] hover:bg-[#005B5B] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005B5B]"
                  style={{ width: 44, height: 44 }}
                >
                  <Icon style={{ width: 17, height: 17 }} />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 — quick links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[#005B5B] font-semibold text-sm uppercase tracking-wider">
              {t("home.footer.quickLinks")}
            </h3>
            <ul className="flex flex-col gap-3" style={{ listStyle: "none" }}>
              {QUICK_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className={linkClass}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — support */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[#005B5B] font-semibold text-sm uppercase tracking-wider">
              {t("home.footer.support")}
            </h3>
            <ul className="flex flex-col gap-3" style={{ listStyle: "none" }}>
              {SUPPORT_LINKS.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className={linkClass}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-3 border-t border-[#005B5B]/20"
          style={{ marginTop: 48, paddingTop: 24 }}
        >
          <p className="text-[#2E4747] text-xs">
            {t("home.footer.copyright")}
          </p>
          <div className="flex items-center gap-5">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </footer>
  );
}
