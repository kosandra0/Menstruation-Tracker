import { useEffect, useState } from "react";
import { todayIso, type IsoDate } from "@mt/domain";

/** Today's local date; re-evaluates once at the next local midnight (one timer, cleaned up on unmount). */
export function useToday(): IsoDate {
  const [today, setToday] = useState<IsoDate>(() => todayIso());
  useEffect(() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
    const t = window.setTimeout(() => setToday(todayIso()), Math.max(1000, next.getTime() - now.getTime()));
    return () => window.clearTimeout(t);
  }, [today]);
  return today;
}
