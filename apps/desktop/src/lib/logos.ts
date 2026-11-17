import type { LogoId } from "@mt/config";
import bloomPetal from "../../../../icons/bloom-petal.png";
import lunarCycle from "../../../../icons/lunar-cycle.png";
import heartleaf from "../../../../icons/heartleaf.png";
import mt04 from "../../src-tauri/icons/mt04-petal-drop.png";
import mt05 from "../../src-tauri/icons/mt05-cycle-calendar.png";
import mt06 from "../../src-tauri/icons/mt06-gentle-profile.png";
import mt07 from "../../src-tauri/icons/mt07-lotus-stillness.png";
import mt08 from "../../src-tauri/icons/mt08-moon-blossom.png";
import mt09 from "../../src-tauri/icons/mt09-hourglass-bloom.png";
import mt10 from "../../src-tauri/icons/mt10-heart-rhythm.png";
import mt11 from "../../src-tauri/icons/mt11-calendar-drop.png";
import mt12 from "../../src-tauri/icons/mt12-butterfly-petals.png";
import mt13 from "../../src-tauri/icons/mt13-path-of-renewal.png";

export interface LogoOption {
  id: LogoId;
  name: string;
  description: string;
  src: string;
}

export const LOGOS: readonly LogoOption[] = [
  { id: "bloom-petal", name: "Bloom Petal", description: "A gently unfolding flower.", src: bloomPetal },
  { id: "lunar-cycle", name: "Lunar Cycle", description: "The phases of the moon.", src: lunarCycle },
  { id: "heartleaf", name: "Heartleaf", description: "A soft leaf shaped like a heart.", src: heartleaf },
  { id: "mt04-petal-drop", name: "Petal Drop", description: "A petal and a drop.", src: mt04 },
  { id: "mt05-cycle-calendar", name: "Cycle Calendar", description: "Days arranged in a cycle.", src: mt05 },
  { id: "mt06-gentle-profile", name: "Gentle Profile", description: "A calm side profile.", src: mt06 },
  { id: "mt07-lotus-stillness", name: "Lotus Stillness", description: "A quiet lotus.", src: mt07 },
  { id: "mt08-moon-blossom", name: "Moon Blossom", description: "A blossom under the moon.", src: mt08 },
  { id: "mt09-hourglass-bloom", name: "Hourglass Bloom", description: "Time and growth together.", src: mt09 },
  { id: "mt10-heart-rhythm", name: "Heart Rhythm", description: "A heart with a steady beat.", src: mt10 },
  { id: "mt11-calendar-drop", name: "Calendar Drop", description: "A calendar and a drop.", src: mt11 },
  { id: "mt12-butterfly-petals", name: "Butterfly Petals", description: "Wings made of petals.", src: mt12 },
  { id: "mt13-path-of-renewal", name: "Path of Renewal", description: "A path that begins again.", src: mt13 },
];

export function logoSrc(id: LogoId): string {
  return (LOGOS.find((l) => l.id === id) ?? LOGOS[0]).src;
}
