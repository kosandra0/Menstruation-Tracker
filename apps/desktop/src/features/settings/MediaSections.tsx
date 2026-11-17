import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ImagePlus, Loader2, RotateCcw, Sparkles, Trash2, Wand2 } from "lucide-react";
import { cn } from "@mt/ui";
import { generatePalette } from "@mt/design-tokens";
import { Button } from "../../components/ui/Button";
import { Switch } from "../../components/ui/Switch";
import { ColorField, Segmented, SettingRow, Slider } from "../../components/ui/controls";
import { toast } from "../../components/common/feedback";
import { useBackgroundUrl, useBackgroundVersion } from "../../components/layout/BackgroundLayer";
import { useResolvedMode } from "../../app/providers/ThemeProvider";
import { useAppearance, type BackgroundSettings } from "../../stores/appearance";
import { ImageImportError, clearBackground, loadBackground, prepareImage, saveBackground } from "../../lib/bgImage";
import { candidatesFromSwatches, extractSwatches, type PaletteCandidate, type Swatch } from "../../lib/imagePalette";
import { PalettePreview } from "./PalettePreview";

function filterOf(b: BackgroundSettings): CSSProperties {
  return { filter: `brightness(${b.brightness}) contrast(${b.contrast}) saturate(${b.saturate})${b.blur ? ` blur(${Math.min(b.blur, 8)}px)` : ""}` };
}

/** Before / after thumbnails of the current adjustments. */
function BeforeAfter({ url, b }: { url: string; b: BackgroundSettings }) {
  const frame = "relative aspect-video overflow-hidden rounded-xl border border-line bg-surface-alt";
  const img = (extra: CSSProperties): CSSProperties => ({ position: "absolute", inset: 0, backgroundImage: `url("${url}")`, backgroundSize: b.fit, backgroundPosition: `${b.posX}% ${b.posY}%`, backgroundRepeat: "no-repeat", ...extra });
  return (
    <div className="grid grid-cols-2 gap-3">
      <figure><div className={frame}><div style={img({})} /></div><figcaption className="t-small mt-1.5 text-center text-muted">Original</figcaption></figure>
      <figure><div className={frame}>
        <div style={img({ transform: `scale(${b.scale})`, transformOrigin: `${b.posX}% ${b.posY}%`, opacity: b.opacity, ...filterOf(b) })} />
        {b.tintAmount > 0 && <div className="absolute inset-0" style={{ background: b.tintColor, opacity: b.tintAmount, mixBlendMode: "color" }} />}
        {b.overlayStrength > 0 && <div className="absolute inset-0" style={{ background: b.overlayColor, opacity: b.overlayStrength }} />}
        {b.vignette > 0 && <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${b.vignette}) 100%)` }} />}
      </div><figcaption className="t-small mt-1.5 text-center text-muted">With your adjustments</figcaption></figure>
    </div>
  );
}

/** Generates coordinated palettes from the current image, previews them, and applies on request (reversibly). */
function ImageTheme({ version }: { version: number }) {
  const resolved = useResolvedMode();
  const themeId = useAppearance((s) => s.themeId);
  const addPalette = useAppearance((s) => s.addPalette);
  const set = useAppearance((s) => s.set);
  const [swatches, setSwatches] = useState<Swatch[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const analysedVersion = useRef(-1);

  // Palette data is recomputed only when the image changes.
  useEffect(() => {
    if (analysedVersion.current !== version) { setSwatches(null); setPicked(null); }
  }, [version]);

  const analyse = async () => {
    setBusy(true); setError(null);
    try {
      const blob = await loadBackground();
      if (!blob) throw new Error("No image");
      const sw = await extractSwatches(blob);
      analysedVersion.current = version;
      setSwatches(sw);
      if (sw.length === 0) setError("This image has no visible pixels to analyse.");
    } catch (e) {
      setError(e instanceof Error && e.message.includes("timed out") ? "Analysing took too long. Try a smaller image." : "The colours could not be read from this image.");
    } finally {
      setBusy(false);
    }
  };

  const candidates: PaletteCandidate[] = useMemo(() => {
    if (!swatches) return [];
    const base = candidatesFromSwatches(swatches);
    if (!picked) return base;
    // The user's preferred dominant colour goes first.
    const sw = swatches.find((s) => s.hex === picked);
    return sw ? [{ id: "picked", label: "Your choice", accent: sw.hex, accent2: base.find((c) => c.accent !== sw.hex)?.accent ?? sw.hex }, ...base.filter((c) => c.accent !== sw.hex)].slice(0, 5) : base;
  }, [swatches, picked]);

  const apply = (c: PaletteCandidate) => {
    setPrevious(themeId);
    const id = addPalette({ name: `From image · ${c.label}`, accent: c.accent, accent2: c.accent2 === c.accent ? undefined : c.accent2 });
    set("themeId", `custom:${id}`);
    toast.success("Image theme applied. Your previous theme is one click away.");
  };

  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display t-title flex items-center gap-2 text-ink"><Wand2 className="size-4 text-accent" aria-hidden />Theme from this image</h3>
          <p className="t-small mt-0.5 max-w-lg text-muted">Colours are read on this computer, off the main thread, and never uploaded. Readable text contrast is always kept.</p>
        </div>
        <Button size="sm" onClick={() => void analyse()} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{swatches ? "Analyse again" : "Suggest palettes"}</Button>
      </div>
      {error && <p role="alert" className="t-small mt-3 text-danger">{error}</p>}
      {swatches && swatches.length > 0 && (
        <div className="mt-4 space-y-4">
          <div>
            <div className="t-small mb-2 text-muted">Dominant colours (choose one to lead the palette)</div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Dominant colours">
              {swatches.map((s) => (
                <button key={s.hex} type="button" aria-pressed={picked === s.hex} aria-label={`Use ${s.hex} (${Math.round(s.share * 100)}% of image)`} onClick={() => setPicked(picked === s.hex ? null : s.hex)}
                  className={cn("size-9 rounded-full border-2 transition-transform hover:scale-105", picked === s.hex ? "border-ink" : "border-line")} style={{ background: s.hex }} title={`${s.hex} · ${Math.round(s.share * 100)}%`} />
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {candidates.map((c) => (
              <div key={c.id} className="rounded-xl border border-line p-2.5">
                <PalettePreview palette={generatePalette({ accent: c.accent, accent2: c.accent2 }, resolved)} mode={resolved} label={`${c.label} palette preview`} />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="t-small text-ink">{c.label}</span>
                  <Button size="sm" variant="soft" onClick={() => apply(c)}>Apply</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {previous !== null && (
        <Button className="mt-4" size="sm" variant="ghost" onClick={() => { set("themeId", previous); setPrevious(null); }}><RotateCcw className="size-4" />Go back to the previous theme</Button>
      )}
    </div>
  );
}

export function BackgroundSection() {
  const b = useAppearance((s) => s.background);
  const patch = useAppearance((s) => s.patch);
  const reset = useAppearance((s) => s.resetGroup);
  const version = useBackgroundVersion((s) => s.version);
  const bump = useBackgroundVersion((s) => s.bump);
  const url = useBackgroundUrl(b.hasImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await prepareImage(file);
      await saveBackground(blob);
      patch("background", { hasImage: true, enabled: true });
      bump();
      toast.success("Background image set.");
    } catch (e) {
      toast.error(e instanceof ImageImportError ? e.message : "The image could not be saved.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    try {
      await clearBackground();
      patch("background", { hasImage: false });
      bump();
      toast.info("Background image removed.");
    } catch {
      toast.error("The image could not be removed.");
    }
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif" hidden aria-label="Choose a background image" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <SettingRow title="Background image" description="Choose any PNG, JPEG, WebP, GIF, BMP or AVIF picture. It is kept on this computer only; very large images are shrunk to save memory.">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{b.hasImage ? "Replace image" : "Choose image"}</Button>
          {b.hasImage && <Button size="sm" variant="ghost" onClick={() => void remove()}><Trash2 className="size-4" />Remove</Button>}
        </div>
      </SettingRow>

      {b.hasImage && (
        <>
          <SettingRow title="Show background" description="Turn the picture off without deleting it.">
            <Switch checked={b.enabled} onCheckedChange={(v) => patch("background", { enabled: v })} aria-label="Show background image" />
          </SettingRow>
          {url && <div className="py-4"><BeforeAfter url={url} b={b} /></div>}
          <div className="space-y-3.5 py-3" role="group" aria-label="Background adjustments">
            <SettingRow title="Fit" description="Cover fills the window; contain shows the whole picture."><Segmented label="Image fit" value={b.fit} options={[{ value: "cover", label: "Cover" }, { value: "contain", label: "Contain" }]} onChange={(v) => patch("background", { fit: v })} /></SettingRow>
            <Slider label="Horizontal focus" value={b.posX} min={0} max={100} onChange={(v) => patch("background", { posX: v })} format={(v) => `${v}%`} />
            <Slider label="Vertical focus" value={b.posY} min={0} max={100} onChange={(v) => patch("background", { posY: v })} format={(v) => `${v}%`} />
            <Slider label="Zoom" value={b.scale} min={1} max={3} step={0.05} onChange={(v) => patch("background", { scale: v })} format={(v) => `${v.toFixed(2)}×`} />
            <Slider label="Brightness" value={b.brightness} min={0.4} max={1.6} step={0.05} onChange={(v) => patch("background", { brightness: v })} format={(v) => `${Math.round(v * 100)}%`} />
            <Slider label="Contrast" value={b.contrast} min={0.5} max={1.5} step={0.05} onChange={(v) => patch("background", { contrast: v })} format={(v) => `${Math.round(v * 100)}%`} />
            <Slider label="Saturation" value={b.saturate} min={0} max={2} step={0.05} onChange={(v) => patch("background", { saturate: v })} format={(v) => `${Math.round(v * 100)}%`} />
            <Slider label="Image opacity" value={b.opacity} min={0.05} max={1} step={0.05} onChange={(v) => patch("background", { opacity: v })} format={(v) => `${Math.round(v * 100)}%`} />
            <Slider label="Blur" value={b.blur} min={0} max={24} onChange={(v) => patch("background", { blur: v })} format={(v) => `${v}px`} />
            <ColorField label="Tint colour" value={b.tintColor} placeholder="#7c5cbf" onChange={(v) => patch("background", { tintColor: v })} showRgb={false} />
            <Slider label="Tint strength" value={b.tintAmount} min={0} max={0.8} step={0.05} onChange={(v) => patch("background", { tintAmount: v })} format={(v) => `${Math.round(v * 100)}%`} />
            <ColorField label="Overlay colour" value={b.overlayColor} placeholder="#000000" onChange={(v) => patch("background", { overlayColor: v })} showRgb={false} />
            <Slider label="Overlay strength" value={b.overlayStrength} min={0} max={0.9} step={0.05} onChange={(v) => patch("background", { overlayStrength: v })} format={(v) => `${Math.round(v * 100)}%`} />
            <Slider label="Vignette" value={b.vignette} min={0} max={0.8} step={0.05} onChange={(v) => patch("background", { vignette: v })} format={(v) => `${Math.round(v * 100)}%`} />
          </div>
          <p className="t-small text-muted">Cards and text always sit on solid surfaces, so any picture stays readable. Sharpening is not offered because the display engine has no true sharpen filter.</p>
          <div className="mt-3"><Button size="sm" variant="soft" onClick={() => reset("background")}><RotateCcw className="size-4" />Reset adjustments</Button></div>
          <ImageTheme version={version} />
        </>
      )}
    </div>
  );
}

