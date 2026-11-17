import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@mt/ui";

export function Switch({ className, ...props }: SwitchPrimitive.SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border border-line bg-surface-alt transition-colors duration-200",
        "data-[state=checked]:border-transparent data-[state=checked]:bg-accent",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-[18px] translate-x-[3px] rounded-full bg-surface shadow-soft ring-1 ring-line transition-transform duration-200 data-[state=checked]:translate-x-[22px] data-[state=checked]:ring-0" />
    </SwitchPrimitive.Root>
  );
}
