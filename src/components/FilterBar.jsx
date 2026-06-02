import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, Calendar, SlidersHorizontal, Minus, Plus, MapPin, X } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { fr, enUS } from "date-fns/locale";
import { format } from "date-fns";
import "react-day-picker/style.css";

// `value` is the canonical value persisted to / filtered against the DB; `key`










// only resolves the user-facing label, so translating never breaks filtering.
const TYPE_OPTIONS = [
  { value: "exchange", key: "exchange" },
  { value: "sale", key: "sale" },
  { value: "both", key: "both" },
];

// Values stored in listings.property_type (AddListing); key → translated label.
const LOGEMENT_OPTIONS = [
  { value: "maison", key: "maison" },
  { value: "appart", key: "appart" },
  { value: "villa", key: "villa" },
  { value: "studio", key: "studio" },
  { value: "penthouse", key: "penthouse" },
];

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
];
const CHECK_RULES = [
  { value: "Pas de fêtes", key: "noParties" },
  { value: "Familles uniquement", key: "familiesOnly" },
  { value: "Pas d'alcool", key: "noAlcohol" },
];
const SMOKING = [{ v: null, key: "any" }, { v: "Non-fumeur", key: "nonSmoker" }, { v: "Fumeur", key: "smoker" }];
const PETS = [{ v: null, key: "any" }, { v: "Pas d'animaux", key: "noPets" }, { v: "Animaux acceptés", key: "petsAllowed" }];

// Matches the "Publier" CTA on the same navbar: mint-green pill, black bold text.
const CHIP =
  "bg-[#ADEBB3] text-black px-4 py-2 rounded-full text-[13px] font-bold flex items-center gap-1.5 hover:bg-[#9FE0A6] transition-colors cursor-pointer whitespace-nowrap";
const ITEM = "rounded-xl text-sm text-gray-800 hover:bg-gray-100 cursor-pointer transition-colors";
const ICON_CLASS = "w-4 h-4 stroke-[2] text-black";

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function fmtDay(d, locale = fr) {
  const p = format(new Date(d), "d MMMM", { locale }).split(" ");
  if (p[1]) p[1] = cap(p[1]);
  return p.join(" ");
}

// Chip whose dropdown is portaled to <body> so it's never clipped by the row.
function FilterChip({ id, label, icon, open, setOpen, width = 260, children }) {
  const btnRef = useRef(null);
  const [pos, setPos] = useState(null);
  const isOpen = open === id;

  useLayoutEffect(() => {
    if (!isOpen || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    let left = Math.min(r.left, window.innerWidth - width - 8);
    left = Math.max(8, left);
    setPos({ top: r.bottom + 8, left });
  }, [isOpen, width]);

  return (
    <>
      <button ref={btnRef} type="button" className={CHIP} onClick={() => setOpen(isOpen ? null : id)}>
        {label}
        {icon}
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

export default function FilterBar({ filters, onChange, wilayas = [] }) {
  const { t, i18n } = useTranslation();
  const dpLocale = i18n.language === "en" ? enUS : fr;
  const [open, setOpen] = useState(null);
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
    const onMove = () => setOpen(null);
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

  return (
    <div ref={rowRef} className="flex flex-row items-center gap-3 overflow-x-auto no-scrollbar py-2">
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

      {/* ── Wilaya ── */}
      <FilterChip id="wilaya" open={open} setOpen={setOpen} width={300} label={wilaya || t("filter.wilaya")} icon={<ChevronDown className={ICON_CLASS} />}>
        <div className="custom-scrollbar" style={{ maxHeight: 320, overflowY: "auto" }}>
          <div className={ITEM} style={{ padding: "10px 14px" }} onClick={() => { onChange({ wilaya: null }); setOpen(null); }}>
            {t("filter.allWilayas")}
          </div>
          {wilayas.map((w) => (
            <div key={w} className={ITEM} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }} onClick={() => { onChange({ wilaya: w }); setOpen(null); }}>
              <MapPin style={{ width: 14, height: 14, color: "#0A3D3D", flexShrink: 0 }} />
              {w}
            </div>
          ))}
        </div>
      </FilterChip>

      {/* ── Type ── */}
      <FilterChip id="type" open={open} setOpen={setOpen} width={220} label={typeLabel} icon={<ChevronDown className={ICON_CLASS} />}>
        <div className={ITEM} style={{ padding: "10px 14px" }} onClick={() => { onChange({ type: null }); setOpen(null); }}>
          {t("filter.allTypes")}
        </div>
        {TYPE_OPTIONS.map((o) => (
          <div key={o.value} className={ITEM} style={{ padding: "10px 14px" }} onClick={() => { onChange({ type: o.value }); setOpen(null); }}>
            {t(`filter.typeOptions.${o.key}`)}
          </div>
        ))}
      </FilterChip>

      {/* ── Logements ── */}
      <FilterChip id="logement" open={open} setOpen={setOpen} width={220} label={logementLabel} icon={<ChevronDown className={ICON_CLASS} />}>
        <div className={ITEM} style={{ padding: "10px 14px" }} onClick={() => { onChange({ logement: null }); setOpen(null); }}>
          {t("filter.allLogements")}
        </div>
        {LOGEMENT_OPTIONS.map((o) => (
          <div key={o.value} className={ITEM} style={{ padding: "10px 14px" }} onClick={() => { onChange({ logement: o.value }); setOpen(null); }}>
            {t(`filter.logementOptions.${o.key}`)}
          </div>
        ))}
      </FilterChip>

      {/* ── Chambres (stepper) ── */}
      <FilterChip id="rooms" open={open} setOpen={setOpen} width={240} label={roomsLabel} icon={<ChevronDown className={ICON_CLASS} />}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px" }}>
          <span className="text-sm font-medium text-gray-800">{t("filter.roomsMin")}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              type="button"
              onClick={() => onChange({ chambres: Math.max(0, chambres - 1) })}
              disabled={chambres === 0}
              className="flex items-center justify-center rounded-full border border-gray-300 hover:border-gray-800 transition-colors disabled:opacity-40"
              style={{ width: 30, height: 30 }}
            >
              <Minus style={{ width: 14, height: 14 }} />
            </button>
            <span className="text-sm font-semibold text-gray-900" style={{ minWidth: 24, textAlign: "center" }}>{chambres}</span>
            <button
              type="button"
              onClick={() => onChange({ chambres: Math.min(10, chambres + 1) })}
              disabled={chambres === 10}
              className="flex items-center justify-center rounded-full border border-gray-300 hover:border-gray-800 transition-colors disabled:opacity-40"
              style={{ width: 30, height: 30 }}
            >
              <Plus style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </FilterChip>

      {/* ── Date range ── */}
      <FilterChip id="date" open={open} setOpen={setOpen} width={660} label={dateLabel} icon={<Calendar className={ICON_CLASS} />}>
        <div className="fb-cal">
          <DayPicker
            mode="range"
            numberOfMonths={2}
            locale={dpLocale}
            selected={dateRange?.from ? dateRange : undefined}
            onSelect={(range) => onChange({ dateRange: range || { from: null, to: null } })}
          />
          {dateRange?.from && (
            <button
              type="button"
              onClick={() => { onChange({ dateRange: { from: null, to: null } }); setOpen(null); }}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
              style={{ marginTop: 6, marginLeft: 8 }}
            >
              {t("filter.clearDates")}
            </button>
          )}
        </div>
      </FilterChip>

      {/* ── Plus de filtres ── */}
      <button type="button" className={CHIP} onClick={openModal}>
        <SlidersHorizontal className={ICON_CLASS} />
        {t("filter.moreFilters")}
      </button>

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
