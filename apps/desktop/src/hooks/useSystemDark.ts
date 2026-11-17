import { useSyncExternalStore } from "react";

const QUERY = "(prefers-color-scheme: dark)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True when the OS prefers a dark colour scheme. */
export function useSystemDark(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
