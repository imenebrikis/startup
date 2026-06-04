import { Trash2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Destructive "discard" button: a red-outline variant built on our radix-nova
// Button. Icon + label, fully overridable via props (onClick, disabled, etc.).
// Defaults to the French label used across the app; pass children to change it.
function ButtonDiscard({ className, children = "Annuler", icon = true, ...props }) {
  return (
    <Button
      variant="outline"
      className={cn(
        "gap-2 border-destructive! text-destructive! hover:bg-destructive/10!",
        "focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        className,
      )}
      {...props}
    >
      {icon && <Trash2Icon size={15} />}
      {children}
    </Button>
  )
}

export { ButtonDiscard }
export default ButtonDiscard
