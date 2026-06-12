import { useTranslation } from "react-i18next";
import { LOGEMENT_OPTIONS } from "./filterOptions";

const ITEM = "rounded-xl text-sm text-gray-800 hover:bg-gray-100 cursor-pointer transition-colors";

export default function LogementControl({ value, onChange, onSelect }) {
  const { t } = useTranslation();
  return (
    <>
      <div className={ITEM} style={{ padding: "10px 14px" }} onClick={() => { onChange({ logement: null }); onSelect?.(); }}>
        {t("filter.allLogements")}
      </div>
      {LOGEMENT_OPTIONS.map((o) => (
        <div key={o.value} className={ITEM} style={{ padding: "10px 14px" }} onClick={() => { onChange({ logement: o.value }); onSelect?.(); }}>
          {t(`filter.logementOptions.${o.key}`)}
        </div>
      ))}
    </>
  );
}
