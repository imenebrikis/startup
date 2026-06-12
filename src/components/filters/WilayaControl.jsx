import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";

const ITEM = "rounded-xl text-sm text-gray-800 hover:bg-gray-100 cursor-pointer transition-colors";

export default function WilayaControl({ value, onChange, wilayas = [], onSelect }) {
  const { t } = useTranslation();
  return (
    <div className="custom-scrollbar" style={{ maxHeight: 320, overflowY: "auto" }}>
      <div className={ITEM} style={{ padding: "10px 14px" }} onClick={() => { onChange({ wilaya: null }); onSelect?.(); }}>
        {t("filter.allWilayas")}
      </div>
      {wilayas.map((w) => (
        <div key={w} className={ITEM} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }} onClick={() => { onChange({ wilaya: w }); onSelect?.(); }}>
          <MapPin style={{ width: 14, height: 14, color: "#0A3D3D", flexShrink: 0 }} />
          {w}
        </div>
      ))}
    </div>
  );
}
