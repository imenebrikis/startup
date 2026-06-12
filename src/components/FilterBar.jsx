import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { fr, enUS } from "date-fns/locale";
import { format } from "date-fns";
import { motion } from "framer-motion";
import "react-day-picker/style.css";
import WilayaControl from "./filters/WilayaControl";
import DateControl from "./filters/DateControl";
import LogementControl from "./filters/LogementControl";
import RoomsControl from "./filters/RoomsControl";
import TypeControl from "./filters/TypeControl";
import { TYPE_OPTIONS, LOGEMENT_OPTIONS } from "./filters/filterOptions";

// `value` is the canonical value persisted to / filtered against the DB; `key`










// only resolves the user-facing label, so translating never breaks filtering.
// TYPE_OPTIONS and LOGEMENT_OPTIONS now live in ./filters/filterOptions (imported above).

// Mirrors the amenity vocabulary saved by AddListing (listings.amenities). The
// `value` must stay in French to match stored data; `key` resolves the label.
const AMENITIES = [
  { value: "Climatisation", key: "ac" },
  { value: "Chauffage", key: "heating" },
  { value: "Wifi", key: "wifi" },
  { value: "Citerne d'eau", key: "waterTank" },
  { value: "Chauffe-eau", key: "waterHeater" },
  { value: "Groupe électrogène", key: "generator" },
  { value: "Parking / Garage", key: "parking" },
  { value: "Jardin / Terrasse", key: "garden" },
  { value: "Piscine", key: "pool" },
  { value: "Cuisine équipée", key: "kitchen" },
  { value: "Machine à laver", key: "washer" },
  { value: "Ascenseur", key: "elevator" },
  { value: "Vue sur mer", key: "seaView" },
  { value: "Sécurité (Caméras / Alarme)", key: "security" },
  { value: "Jacuzzi", key: "jacuzzi" },
];
const CHECK_RULES = [
  { value: "Pas de fêtes", key: "noParties" },
  { value: "Familles uniquement", key: "familiesOnly" },
  { value: "Pas d'alcool", key: "noAlcohol" },
  { value: "Photos/Vidéos interdites", key: "noPhotos" },
  { value: "Pas d'invités tiers", key: "noThirdPartyGuests" },
];
const SMOKING = [{ v: null, key: "any" }, { v: "Non-fumeur", key: "nonSmoker" }, { v: "Fumeur", key: "smoker" }];
const PETS = [{ v: null, key: "any" }, { v: "Pas d'animaux", key: "noPets" }, { v: "Animaux acceptés", key: "petsAllowed" }];

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function fmtDay(d, locale = fr) {
  const p = format(new Date(d), "d MMMM", { locale }).split(" ");
  if (p[1]) p[1] = cap(p[1]);
  return p.join(" ");
}

// One segment of the Airbnb-style search bar. Dropdown is portaled to <body>
// so the rounded pill container never clips it. `label` is the segment caption
// (Où / Quand …); clicking toggles its dropdown.
function FilterChip({ id, label, open, setOpen, hovered, setHovered, width = 260, children }) {
  const btnRef = useRef(null);
  const [pos, setPos] = useState(null);
  const isOpen = open === id;

  useLayoutEffect(() => {
    if (!isOpen || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    let left = Math.min(r.left, window.innerWidth - width - 8);
    left = Math.max(8, left);
    setPos({ top: r.bottom + 14, left });
  }, [isOpen, width]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(isOpen ? null : id)}
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
        className="fb-seg"
        style={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "12px 20px", border: "none", cursor: "pointer",
          whiteSpace: "nowrap", flexShrink: 0, fontFamily: "'Inter', sans-serif",
          fontSize: 13, fontWeight: 600, color: "#1a1a1a", background: "transparent",
        }}
      >
        {(isOpen || hovered === id) && (
          <motion.div
            layoutId="search-bar-highlight"
            className="absolute inset-0 bg-gray-100 rounded-full"
            style={{ zIndex: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <span style={{ position: "relative", zIndex: 10 }}>{label}</span>
      </button>
      {isOpen && pos && createPortal(
        <div
          data-filter-pop
          className="bg-white rounded-2xl border border-gray-200"
          style={{ position: "fixed", top: pos.top, left: pos.left, width, maxWidth: "calc(100vw - 16px)", padding: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.12)", zIndex: 300 }}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}

export default function FilterBar({ filters, onChange, wilayas = [], onOpenSheet }) {
  const { t, i18n } = useTranslation();
  const dpLocale = i18n.language === "en" ? enUS : fr;

  const today = new Date();
  const minDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const [open, setOpen] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const rowRef = useRef(null);

  // Local (draft) modal state — only pushed to master filters on "Appliquer".
  const [mEquip, setMEquip] = useState([]);
  const [mSmoking, setMSmoking] = useState(null);
  const [mPets, setMPets] = useState(null);
  const [mChecks, setMChecks] = useState({});

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (e.target.closest && e.target.closest("[data-filter-pop]")) return;
      if (rowRef.current && rowRef.current.contains(e.target)) return;
      setOpen(null);
    };
    // Close on page scroll/resize (the portal is position:fixed and won't follow),
    // but NOT when the scroll happens inside the dropdown's own scrollable list —
    // otherwise the panel closes the instant the user tries to scroll it.
    const onMove = (e) => {
      if (e?.target?.closest && e.target.closest("[data-filter-pop]")) return;
      setOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  const { wilaya, type, logement, chambres, dateRange, rules } = filters;

  const typeOpt = TYPE_OPTIONS.find((o) => o.value === type);
  const typeLabel = typeOpt ? t(`filter.typeOptions.${typeOpt.key}`) : t("filter.type");
  const logementOpt = LOGEMENT_OPTIONS.find((o) => o.value === logement);
  const logementLabel = logementOpt ? t(`filter.logementOptions.${logementOpt.key}`) : t("filter.logements");
  const roomsLabel = chambres > 0 ? t("filter.roomsCount", { count: chambres }) : t("filter.rooms");
  const dateLabel = dateRange?.from
    ? (dateRange.to
        ? t("filter.dateRange", { from: fmtDay(dateRange.from, dpLocale), to: fmtDay(dateRange.to, dpLocale) })
        : t("filter.dateSingle", { from: fmtDay(dateRange.from, dpLocale) }))
    : t("filter.date");

  const openModal = () => {
    setMEquip(filters.equipments || []);
    setMSmoking(rules?.smoking ?? null);
    setMPets(rules?.pets ?? null);
    setMChecks(CHECK_RULES.reduce((a, r) => ({ ...a, [r.value]: !!rules?.[r.value] }), {}));
    setModalOpen(true);
  };

  const applyModal = () => {
    const nextRules = {};
    if (mSmoking) nextRules.smoking = mSmoking;
    if (mPets) nextRules.pets = mPets;
    CHECK_RULES.forEach((r) => { if (mChecks[r.value]) nextRules[r.value] = r.value; });
    onChange({ equipments: mEquip, rules: nextRules });
    setModalOpen(false);
  };

  const toggleEquip = (a) => setMEquip((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  // Thin hairline rule between bar segments.
  const divider = <span style={{ width: 1, height: 30, background: "#e5e7eb", flexShrink: 0 }} />;

  return (
    <div ref={rowRef} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .fb-cal { --rdp-accent-color: #0A3D3D; --rdp-accent-background-color: #E4F6E6; }
        .fb-cal .rdp-months { display: flex; flex-direction: row; flex-wrap: nowrap; gap: 2rem; }
        .fb-cal .rdp-month { flex: none; }
        .fb-cal .rdp-month_caption { font-size: 14px; font-weight: 600; color: #0A3D3D; }
        .fb-cal .rdp-weekday { color: #9aa0a6; font-weight: 600; font-size: 11px; }
        .fb-cal .rdp-day_button { width: 40px; height: 40px; border: none; border-radius: 999px; font-size: 13px; color: #1f2937; }
        .fb-cal .rdp-day_button:hover { background: #f3f4f6; }
        .fb-cal .rdp-range_start .rdp-day_button, .fb-cal .rdp-range_end .rdp-day_button, .fb-cal .rdp-selected .rdp-day_button { background: #0A3D3D !important; color: #fff !important; }
        .fb-cal .rdp-range_middle .rdp-day_button { background: #E4F6E6 !important; color: #0A3D3D !important; border-radius: 0; }
        .fb-cal .rdp-chevron { fill: #0A3D3D; }
      `}</style>

      {/* ── Desktop: full 5-segment pill + more filters (lg+ only) ── */}
      <div className="hidden lg:flex" style={{ alignItems: "center", gap: 12 }}>

      {/* ── Airbnb-style segmented search bar ── */}
      <div style={{
        display: "flex", alignItems: "center",
        background: "#ffffff", borderRadius: 999,
        border: "1px solid #ebebeb", padding: 5,
        boxShadow: "0 1px 2px rgba(0,0,0,0.08), 0 6px 20px rgba(0,0,0,0.10)",
      }}>

        {/* Où → wilaya */}
        <FilterChip id="wilaya" open={open} setOpen={setOpen} hovered={hovered} setHovered={setHovered} width={300} label={t("filter.where")} value={wilaya || t("filter.anywhere")}>
          <WilayaControl value={wilaya} onChange={onChange} wilayas={wilayas} onSelect={() => setOpen(null)} />
        </FilterChip>

        {divider}

        {/* Quand → date range */}
        <FilterChip id="date" open={open} setOpen={setOpen} hovered={hovered} setHovered={setHovered} width={660} label={t("filter.when")} value={dateRange?.from ? dateLabel : t("filter.addDates")}>
          <DateControl value={dateRange} onChange={onChange} months={2} minDate={minDate} maxDate={maxDate} locale={dpLocale} onSelect={() => setOpen(null)} />
        </FilterChip>

        {divider}

        {/* Logement */}
        <FilterChip id="logement" open={open} setOpen={setOpen} hovered={hovered} setHovered={setHovered} width={220} label={t("filter.logements")} value={logementOpt ? logementLabel : t("filter.allLogements")}>
          <LogementControl value={logement} onChange={onChange} onSelect={() => setOpen(null)} />
        </FilterChip>

        {divider}

        {/* Chambres (stepper) */}
        <FilterChip id="rooms" open={open} setOpen={setOpen} hovered={hovered} setHovered={setHovered} width={240} label={t("filter.rooms")} value={chambres > 0 ? roomsLabel : t("filter.anyRooms")}>
          <RoomsControl value={chambres} onChange={onChange} />
        </FilterChip>

        {divider}

        {/* Type (5th segment) */}
        <FilterChip id="type" open={open} setOpen={setOpen} hovered={hovered} setHovered={setHovered} width={220} label={t("filter.type")} value={typeOpt ? typeLabel : t("filter.allTypes")}>
          <TypeControl value={type} onChange={onChange} onSelect={() => setOpen(null)} />
        </FilterChip>
      </div>

      {/* ── Plus de filtres → circular icon, outside the white pill (modal logic unchanged) ── */}
      <button
        type="button"
        onClick={openModal}
        aria-label={t("filter.moreFilters")}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 48, height: 48, borderRadius: "50%", border: "none",
          background: "#0A3D3D", color: "#fff", cursor: "pointer", flexShrink: 0,
        }}
      >
        <SlidersHorizontal style={{ width: 18, height: 18 }} />
      </button>
      </div>

      {/* ── Mobile: slim trigger pill (below lg only) — opens the FilterSheet ── */}
      <div className="flex lg:hidden" style={{ width: "100%" }}>
        <button
          type="button"
          onClick={onOpenSheet}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            background: "#ffffff", borderRadius: 999,
            border: "1px solid #ebebeb", padding: "12px 18px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.08), 0 6px 20px rgba(0,0,0,0.10)",
            cursor: "pointer", fontFamily: "'Inter', sans-serif",
            fontSize: 14, fontWeight: 600, color: "#717182",
          }}
        >
          <Search style={{ width: 18, height: 18, color: "#0A3D3D", flexShrink: 0 }} />
          {t("filter.searchPlaceholder")}
        </button>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="bg-black/50 fixed inset-0 z-50 flex items-center justify-center" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white rounded-3xl"
            style={{ width: "92%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 className="text-lg font-bold text-gray-900">{t("filter.modal.title")}</h2>
              <button type="button" onClick={() => setModalOpen(false)} aria-label={t("filter.modal.close")} className="flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" style={{ width: 34, height: 34 }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Équipements */}
            <h3 className="text-sm font-semibold text-gray-900" style={{ marginBottom: 12 }}>{t("filter.modal.amenities")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {AMENITIES.map((a) => (
                <label key={a.value} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={mEquip.includes(a.value)} onChange={() => toggleEquip(a.value)} style={{ width: 16, height: 16, accentColor: "#0A3D3D" }} />
                  {t(`filter.amenities.${a.key}`)}
                </label>
              ))}
            </div>

            {/* Règles de la maison */}
            <h3 className="text-sm font-semibold text-gray-900" style={{ marginBottom: 12 }}>{t("filter.modal.houseRules")}</h3>

            <div style={{ marginBottom: 14 }}>
              <div className="text-sm text-gray-700" style={{ marginBottom: 8 }}>{t("filter.modal.smoking")}</div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                {SMOKING.map((o) => (
                  <label key={o.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" name="fb-smoking" checked={mSmoking === o.v} onChange={() => setMSmoking(o.v)} style={{ width: 16, height: 16, accentColor: "#0A3D3D" }} />
                    {t(`filter.smoking.${o.key}`)}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className="text-sm text-gray-700" style={{ marginBottom: 8 }}>{t("filter.modal.pets")}</div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                {PETS.map((o) => (
                  <label key={o.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" name="fb-pets" checked={mPets === o.v} onChange={() => setMPets(o.v)} style={{ width: 16, height: 16, accentColor: "#0A3D3D" }} />
                    {t(`filter.pets.${o.key}`)}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {CHECK_RULES.map((r) => (
                <label key={r.value} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={!!mChecks[r.value]} onChange={() => setMChecks((p) => ({ ...p, [r.value]: !p[r.value] }))} style={{ width: 16, height: 16, accentColor: "#0A3D3D" }} />
                  {t(`filter.rules.${r.key}`)}
                </label>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid #e5e7eb", paddingTop: 18 }}>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:border-gray-800 transition-colors" style={{ padding: "10px 20px" }}>
                {t("filter.modal.close")}
              </button>
              <button type="button" onClick={applyModal} className="rounded-full text-sm font-semibold text-white" style={{ padding: "10px 20px", background: "#0A3D3D" }}>
                {t("filter.modal.apply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
