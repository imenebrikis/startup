import { useTranslation } from "react-i18next"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Two-language toggle (French / English). Defaults to French.
const LANGS = {
  fr: { flag: "🇫🇷", label: "Français" },
  en: { flag: "🇬🇧", label: "English" },
}

export default function LanguageSelector() {
  const { i18n } = useTranslation()
  // Normalise region variants (e.g. "en-US") down to our two base languages.
  const language = i18n.language?.startsWith("en") ? "en" : "fr"
  const active = LANGS[language]
  // Only ever offer the *other* language as the switch target.
  const other = language === "fr" ? "en" : "fr"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Changer de langue"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-[#E5DFCE] bg-white text-[13.5px] font-medium text-[#005B5B] transition-colors hover:bg-[#ADEBB3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#005B5B]/40"
          style={{ padding: "0 14px" }}
        >
          <span>{active.label.slice(0, 2).toUpperCase()}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[160px] border border-[#E5DFCE] bg-white"
        style={{ padding: 4 }}
      >
        <button
          onClick={() => i18n.changeLanguage(other)}
          className="flex w-full items-center gap-2 rounded-md text-left text-[13.5px] font-medium text-[#005B5B] transition-colors hover:bg-[#ADEBB3] focus:outline-none focus-visible:bg-[#F3EEE0]"
          style={{ padding: "9px 12px" }}
        >
          <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>{LANGS[other].flag}</span>
          <span>{LANGS[other].label}</span>
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
