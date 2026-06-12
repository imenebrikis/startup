import { useTranslation } from "react-i18next";
import { DayPicker } from "react-day-picker";

export default function DateControl({ value: dateRange, onChange, months = 2, minDate, maxDate, locale, onSelect }) {
  const { t } = useTranslation();
  return (
    <div className="fb-cal">
      <DayPicker
        mode="range"
        numberOfMonths={months}
        locale={locale}
        selected={dateRange?.from ? dateRange : undefined}
        onSelect={(range) => onChange({ dateRange: range || { from: null, to: null } })}
        disabled={[{ before: minDate }, { after: maxDate }]}
        startMonth={minDate}
        endMonth={maxDate}
      />
      {dateRange?.from && (
        <button
          type="button"
          onClick={() => { onChange({ dateRange: { from: null, to: null } }); onSelect?.(); }}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          style={{ marginTop: 6, marginLeft: 8 }}
        >
          {t("filter.clearDates")}
        </button>
      )}
    </div>
  );
}
