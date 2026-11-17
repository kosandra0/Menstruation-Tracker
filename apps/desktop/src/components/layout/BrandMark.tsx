import { useAppearance } from "../../stores/appearance";
import { logoSrc } from "../../lib/logos";

/** The app logo chosen in Settings > Personalization. Decorative: the app name is always next to it. */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  const logoId = useAppearance((s) => s.logoId);
  return (
    <img
      src={logoSrc(logoId)} width={size} height={size} alt="" aria-hidden draggable={false}
      className={className ?? "shrink-0 rounded-[22%] object-cover shadow-soft"}
      style={{ width: size, height: size }}
    />
  );
}
