import { useEffect, useState } from "react";
import { create } from "zustand";
import { useAppearance } from "../../stores/appearance";
import { loadBackground } from "../../lib/bgImage";

/** Bumped whenever the stored background image is replaced or removed. */
export const useBackgroundVersion = create<{ version: number; bump: () => void }>((set) => ({ version: 0, bump: () => set((s) => ({ version: s.version + 1 })) }));

/** Object URL of the stored background, or null. The URL is revoked when it is replaced or the component unmounts. */
export function useBackgroundUrl(active: boolean): string | null {
  const version = useBackgroundVersion((s) => s.version);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!active) { setUrl(null); return; }
    let cancelled = false;
    let created: string | null = null;
    loadBackground()
      .then((blob) => {
        if (cancelled || !blob) return;
        created = URL.createObjectURL(blob);
        setUrl(created);
      })
      .catch(() => console.warn("[background] image could not be loaded"));
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [active, version]);
  return active ? url : null;
}

/** Renders the user's background image behind the app, with all adjustments applied as cheap CSS (no re-decoding). */
export function BackgroundLayer() {
  const bg = useAppearance((s) => s.background);
  const url = useBackgroundUrl(bg.enabled && bg.hasImage);

  useEffect(() => {
    const el = document.documentElement;
    if (url) el.dataset.bg = "on";
    else delete el.dataset.bg;
    return () => { delete el.dataset.bg; };
  }, [url]);

  if (!url) return null;
  const inset = -(bg.blur * 2);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute"
        style={{
          inset,
          backgroundImage: `url("${url}")`,
          backgroundSize: bg.fit,
          backgroundPosition: `${bg.posX}% ${bg.posY}%`,
          backgroundRepeat: "no-repeat",
          transform: `scale(${bg.scale})`,
          transformOrigin: `${bg.posX}% ${bg.posY}%`,
          opacity: bg.opacity,
          filter: `brightness(${bg.brightness}) contrast(${bg.contrast}) saturate(${bg.saturate})${bg.blur ? ` blur(${bg.blur}px)` : ""}`,
        }}
      />
      {bg.tintAmount > 0 && <div className="absolute inset-0" style={{ background: bg.tintColor, opacity: bg.tintAmount, mixBlendMode: "color" }} />}
      {bg.overlayStrength > 0 && <div className="absolute inset-0" style={{ background: bg.overlayColor, opacity: bg.overlayStrength }} />}
      {bg.vignette > 0 && <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${bg.vignette}) 100%)` }} />}
    </div>
  );
}
