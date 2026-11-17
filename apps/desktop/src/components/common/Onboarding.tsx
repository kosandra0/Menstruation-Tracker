import { useNavigate } from "react-router";
import { Lock, Palette, Sparkles } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { APP_NAME } from "@mt/config";
import { Button } from "../ui/Button";
import { BrandMark } from "../layout/BrandMark";
import { useAppearance } from "../../stores/appearance";

/** First-launch welcome. Short, skippable, and asks for no health information. */
export function Onboarding() {
  const onboarded = useAppearance((s) => s.onboarded);
  const set = useAppearance((s) => s.set);
  const navigate = useNavigate();
  const finish = (to?: string) => {
    set("onboarded", true);
    if (to) navigate(to);
  };
  return (
    <DialogPrimitive.Root open={!onboarded} onOpenChange={(o) => !o && finish()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay fixed inset-0 z-40 bg-ink/30" />
        <DialogPrimitive.Content className="dialog-content fixed left-1/2 top-1/2 z-50 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-surface p-7 shadow-lift">
          <BrandMark size={52} />
          <DialogPrimitive.Title className="font-display mt-4 text-[1.6rem] leading-tight text-ink">Welcome to {APP_NAME}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="t-body mt-2 leading-relaxed text-muted">A quiet, private place to understand your cycle and how you feel. There is nothing to set up.</DialogPrimitive.Description>
          <ul className="t-body mt-5 space-y-3.5 text-ink">
            <li className="flex gap-3"><Lock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /><span><strong className="font-medium">Private by design.</strong> Your records stay encrypted on this computer. No account, nothing uploaded.</span></li>
            <li className="flex gap-3"><Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /><span><strong className="font-medium">Estimates, not promises.</strong> Predictions use only what you record, always show a range, and are never medical advice or contraception.</span></li>
            <li className="flex gap-3"><Palette className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /><span><strong className="font-medium">Make it yours.</strong> Choose themes, colours, fonts and your own logo any time in Settings.</span></li>
          </ul>
          <div className="mt-7 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => finish()}>Skip for now</Button>
            <Button variant="soft" onClick={() => finish("/settings")}>Personalise</Button>
            <Button onClick={() => finish()}>Get started</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
