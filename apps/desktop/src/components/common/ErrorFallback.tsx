import { TriangleAlert } from "lucide-react";
import { Button } from "../ui/Button";

export function ErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="rounded-2xl bg-accent-soft p-3 text-danger"><TriangleAlert className="size-6" /></div>
      <div>
        <h2 className="font-display text-xl text-ink">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted">The screen couldn’t be displayed. Your data was not affected.</p>
      </div>
      <Button variant="soft" onClick={onRetry ?? (() => window.location.reload())}>Try again</Button>
    </div>
  );
}
