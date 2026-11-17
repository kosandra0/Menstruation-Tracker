import * as Menu from "@radix-ui/react-dropdown-menu";
import { cn } from "@mt/ui";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({ className, ...props }: Menu.DropdownMenuContentProps) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={6}
        align="end"
        className={cn(
          "menu-content z-50 min-w-40 rounded-xl border border-line bg-surface p-1.5 shadow-lift",
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: Menu.DropdownMenuItemProps) {
  return (
    <Menu.Item
      className={cn(
        "flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink outline-none",
        "data-[highlighted]:bg-accent-soft",
        className,
      )}
      {...props}
    />
  );
}
