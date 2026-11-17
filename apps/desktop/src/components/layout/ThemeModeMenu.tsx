import { Check, Monitor, Moon, Sun } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/DropdownMenu";
import { useAppearance, type ModePreference } from "../../stores/appearance";
import { useResolvedMode } from "../../app/providers/ThemeProvider";

const OPTIONS: { value: ModePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System default", icon: Monitor },
];

export function ThemeModeMenu() {
  const mode = useAppearance((s) => s.mode);
  const set = useAppearance((s) => s.set);
  const Icon = useResolvedMode() === "dark" ? Moon : Sun;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Colour mode"
        className="no-drag grid h-8 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-ink"
      >
        <Icon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {OPTIONS.map(({ value, label, icon: Ico }) => (
          <DropdownMenuItem key={value} onSelect={() => set("mode", value)}>
            <Ico className="size-4 text-muted" />
            <span className="flex-1">{label}</span>
            {mode === value && <Check className="size-4 text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
