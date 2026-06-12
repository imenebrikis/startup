import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";

export default function RoomsControl({ value: chambres, onChange }) {
  const { t } = useTranslation();
  return (
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
  );
}
