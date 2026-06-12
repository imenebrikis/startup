import { useTranslation } from "react-i18next";
import { TYPE_OPTIONS } from "./filterOptions";

const ITEM = "rounded-xl text-sm text-gray-800 hover:bg-gray-100 cursor-pointer transition-colors";

export default function TypeControl({ value, onChange, onSelect }) {
  const { t } = useTranslation();
  return (
    <>
      <div className={ITEM} style={{ padding: "10px 14px" }} onClick={() => { onChange({ type: null }); onSelect?.(); }}>
        {t("filter.allTypes")}
      </div>
      {TYPE_OPTIONS.map((o) => (
        <div key={o.value} className={ITEM} style={{ padding: "10px 14px" }} onClick={() => { onChange({ type: o.value }); onSelect?.(); }}>
          {t(`filter.typeOptions.${o.key}`)}
        </div>
      ))}
    </>
  );
}
