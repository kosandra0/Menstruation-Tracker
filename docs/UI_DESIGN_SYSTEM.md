# UI design system

## Tokens and themes
`packages/design-tokens/src/themes.ts` defines six palettes (Lavender Dream, Rosewater, Sage Garden, Ocean Mist, Warm Sand, Midnight), each with `light` and `dark`. `applyTheme` writes CSS variables (`--c-*`) on `<html>` plus `data-theme` / `data-mode`. `styles/index.css` maps them to Tailwind utilities (`bg-surface`, `text-muted`, `border-line`, `bg-accent`, `shadow-soft`, `bg-hero`, `bg-accent-gradient`…). Shadows and gradients are derived from tokens with `color-mix`. **Components must never hardcode colours**; add a token instead.

Mode: `system | light | dark` (Zustand `settings`, persisted). Theme switches add `html.theme-transition` for ~450 ms to animate colours. `main.tsx` applies the theme before first render to avoid flashes.

Status colours: `success`, `warning`, `danger`, `info` (per mode, shared across themes). Text on accent uses `accent-contrast`.

## Typography
System fonts only (privacy, offline): Segoe UI Variable for UI; a Palatino/Georgia display serif (`font-display`) for headings and key numbers. Page title 32 px display; card title 15 px semibold; body 13–15 px; overlines 11 px uppercase tracked.

## Shape, spacing, layout
Card radius 20 px (`rounded-card`), controls 12 px (`rounded-control`), chips pill. Content max-width 1080 px, 40 px page padding, 24 px grid gaps. Title bar 40 px; sidebar 252 px (76 px collapsed).

## Components
`components/ui` (Button, Card, Switch, Dialog, DropdownMenu — Radix + tokens), `components/common` (PageHeader, Reveal, DemoBadge, PreviewNotice, Chip, ErrorBoundary), `components/layout` (TitleBar, Sidebar). Sample data must carry `DemoBadge` or `PreviewNotice`.

## Motion
Language in `lib/motion.ts`: 0.3–0.5 s ease-out `[0.22,1,0.36,1]`, small translations (≤14 px), no bounce. Page entrance, staggered card reveal, sidebar width + shared-layout active pill, calendar month fade, dialog/menu CSS keyframes. Reduced motion: `MotionConfig` (OS preference or Settings override) and a CSS rule that zeroes durations.

## Accessibility
Visible focus rings, labelled controls, `aria-pressed`/`aria-checked` states, Radix keyboard behaviour. Contrast was chosen by hand and **not yet audited** — run an automated check before release.

## v0.2.0 design-system notes
- Tokens: colour (`--c-*`, generated from a palette), typography (`--font-body`, `--s-base/heading/body/label`, `--fw-body`, `--lh-body`, `--ls-body`), motion (`--dur-*`, `--ease-out`), elevation (`--shadow-soft/lift`). Components never hard-code theme colours.
- Semantic type classes: `.t-heading`, `.t-title`, `.t-body`, `.t-small`, `.t-label` follow the user's typography multipliers.
- Ten themes (six hand-crafted, four generated), each in light and dark; user palettes use the same generator and contrast policy (text >= 7:1 on canvas, secondary text >= 4.5:1, accent >= 3:1 on cards, accent button text >= 4.5:1).
- Shared controls: `Slider`, `Segmented`, `Select`, `ColorField` (hex + picker + RGB + live contrast), `SettingRow`, `MoodBar`, charts with text summaries.
- Meaning is never colour-only: the calendar uses fill, dashed outline and glyphs; mood bars print their value.
- Icons: Lucide only (one stroke style). App logos: `icons/*.png` (512x512) and `.ico`; see icons/README.md.


## v0.3.0 additions (2026-11-16)
- Themes: ten more generated mid-tone palettes in the family of Slate Dusk, Terracotta and Plum Velvet (Dusk Lagoon, Mulberry Mist, Clay Rose, Fog Harbor, Copper Dusk, Fig & Honey, Olive Ember, Storm Blossom, Mauve Dune, Pine Slate). All 20 themes pass the same contrast audit in light and dark.
- Roundness: `--radius-card` = chosen px (0-24, default 20), `--radius-control` = 0.6 x that. Bars have their own radius (0-24) and height (4-28).
- Notification popup styles: soft card, accent, tinted, minimal, compact; they scope the theme variables on the card element so a popup can use a different theme than the app.
- Clock: SVG analog face using theme tokens; digital clock with tabular numerals; formatting through `Intl.DateTimeFormat` (region default or forced 12/24 h, IANA time zone).
