import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="overlay fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]" />
      <DialogPrimitive.Content className="dialog-content fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-surface p-6 shadow-lift">
        <DialogPrimitive.Title className="font-display text-xl text-ink">{title}</DialogPrimitive.Title>
        {description && (
          <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted">
            {description}
          </DialogPrimitive.Description>
        )}
        <div className="mt-5">{children}</div>
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-alt hover:text-ink"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
