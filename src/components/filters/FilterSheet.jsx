import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import WilayaControl from "./WilayaControl";
import DateControl from "./DateControl";
import LogementControl from "./LogementControl";
import RoomsControl from "./RoomsControl";
import TypeControl from "./TypeControl";
import { AMENITIES, CHECK_RULES, SMOKING, PETS } from "./filterOptions";

// Default (empty) filter shape — mirrors Browse's activeFilters initial state.
// Used by "Effacer" to reset everything through the same onChange contract.
const EMPTY_FILTERS = {
  wilaya: null,
  type: null,
  logement: null,
  chambres: 0,
  dateRange: { from: null, to: null },
  equipments: [],
  rules: {},
};

const sectionLabel = {
  fontSize: 13,
  fontWeight: 700,
  color: "#1a1a1a",
  margin: "0 0 8px",
  fontFamily: "'Inter', sans-serif",
};

export default function FilterSheet({ open, onClose, filters, onChange, wilayas = [], minDate, maxDate, locale }) {
  const { t } = useTranslation();
  if (!open) return null;

  // Équipements + Règles write LIVE through onChange (no draft/apply step), since
  // Browse filtering is reactive. We rebuild from the current filters each change
  // so unrelated rule keys are preserved.
  const equipments = filters.equipments || [];
  const rules = filters.rules || {};
  const smoking = rules.smoking ?? null;
  const pets = rules.pets ?? null;

  const toggleEquip = (a) =>
    onChange({ equipments: equipments.includes(a) ? equipments.filter((x) => x !== a) : [...equipments, a] });
  const setSmoking = (v) => {
    const next = { ...rules };
    if (v) next.smoking = v; else delete next.smoking;
    onChange({ rules: next });
  };
  const setPets = (v) => {
    const next = { ...rules };
    if (v) next.pets = v; else delete next.pets;
    onChange({ rules: next });
  };
  const toggleCheck = (rv) => {
    const next = { ...rules };
    if (next[rv]) delete next[rv]; else next[rv] = rv;
    onChange({ rules: next });
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          // Full-screen panel. inset:0 anchors all four edges to the viewport;
          // height:100dvh handles mobile browser chrome (and is simply ignored by
          // older engines, which then fall back to the inset bottom:0 stretch).
          position: "fixed", inset: 0,
          width: "100vw", height: "100dvh", maxWidth: "100vw",
          background: "#ffffff",
          borderRadius: 0,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          boxSizing: "border-box",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid #e5e7eb",
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{t("filter.sheetTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("filter.modal.close")}
            className="flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            style={{ width: 34, height: 34, border: "none", background: "transparent", cursor: "pointer" }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          padding: "18px 20px",
          display: "flex", flexDirection: "column", gap: 24,
          boxSizing: "border-box", maxWidth: "100vw",
        }}>
          {/* 1. Où */}
          <div>
            <p style={sectionLabel}>{t("filter.where")}</p>
            <WilayaControl value={filters.wilaya} onChange={onChange} wilayas={wilayas} />
          </div>

          {/* 2. Quand — single month for the narrow column */}
          <div>
            <p style={sectionLabel}>{t("filter.when")}</p>
            <DateControl value={filters.dateRange} onChange={onChange} months={1} minDate={minDate} maxDate={maxDate} locale={locale} />
          </div>

          {/* 3. Logement */}
          <div>
            <p style={sectionLabel}>{t("filter.logements")}</p>
            <LogementControl value={filters.logement} onChange={onChange} />
          </div>

          {/* 4. Chambres */}
          <div>
            <p style={sectionLabel}>{t("filter.rooms")}</p>
            <RoomsControl value={filters.chambres} onChange={onChange} />
          </div>

          {/* 5. Type */}
          <div>
            <p style={sectionLabel}>{t("filter.type")}</p>
            <TypeControl value={filters.type} onChange={onChange} />
          </div>

          {/* 6. Équipements — replicated from the desktop modal, writing live to onChange */}
          <div>
            <p style={sectionLabel}>{t("filter.modal.amenities")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
              {AMENITIES.map((a) => (
                <label key={a.value} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={equipments.includes(a.value)} onChange={() => toggleEquip(a.value)} style={{ width: 16, height: 16, accentColor: "#0A3D3D" }} />
                  {t(`filter.amenities.${a.key}`)}
                </label>
              ))}
            </div>
          </div>

          {/* 6b. Règles — replicated from the desktop modal, writing live to onChange */}
          <div>
            <p style={sectionLabel}>{t("filter.modal.houseRules")}</p>

            <div style={{ marginBottom: 14 }}>
              <div className="text-sm text-gray-700" style={{ marginBottom: 8 }}>{t("filter.modal.smoking")}</div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                {SMOKING.map((o) => (
                  <label key={o.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" name="fs-smoking" checked={smoking === o.v} onChange={() => setSmoking(o.v)} style={{ width: 16, height: 16, accentColor: "#0A3D3D" }} />
                    {t(`filter.smoking.${o.key}`)}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div className="text-sm text-gray-700" style={{ marginBottom: 8 }}>{t("filter.modal.pets")}</div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                {PETS.map((o) => (
                  <label key={o.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" name="fs-pets" checked={pets === o.v} onChange={() => setPets(o.v)} style={{ width: 16, height: 16, accentColor: "#0A3D3D" }} />
                    {t(`filter.pets.${o.key}`)}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CHECK_RULES.map((r) => (
                <label key={r.value} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={!!rules[r.value]} onChange={() => toggleCheck(r.value)} style={{ width: 16, height: 16, accentColor: "#0A3D3D" }} />
                  {t(`filter.rules.${r.key}`)}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sticky footer ── */}
        <div style={{
          flexShrink: 0, display: "flex", gap: 12,
          padding: "14px 20px", borderTop: "1px solid #e5e7eb", background: "#ffffff",
          // Clear the home indicator / browser chrome at the bottom edge.
          paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
        }}>
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            style={{
              flex: 1, padding: "12px", borderRadius: 999,
              border: "1.5px solid #0A3D3D", background: "transparent", color: "#0A3D3D",
              fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif",
            }}
          >
            {t("filter.clearAll")}
          </button>
          {/* Filtering is live/reactive in Browse, so "Appliquer" only needs to close the sheet. */}
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: "12px", borderRadius: 999,
              border: "none", background: "#0A3D3D", color: "#ffffff",
              fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif",
            }}
          >
            {t("filter.modal.apply")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
