> **NOTE — the palette in this file is not the one in use.**
> Every drawn asset here is current: the mark with the 11, the wordmark, the
> lockups and the signature all ship exactly as specified below. The palette
> does not. This document describes the amber system. The site runs
> a deep red and black dark palette. Nothing in the colour column below is in
> use. No hex values are repeated here on purpose: this note has now been wrong
> twice by naming the palette of the day, so `src/styles/index.css` is the only
> authority on colour and the place to read it from.
>
> Typeface likewise: the grotesk is Mona Sans, matching the reference. The serif
> slot still holds Bodoni Moda — the reference sets Brier, a commercial face that
> cannot ship without a purchased licence.

# Handoff: DK 11 brand system — amber

## Palette-only handoff — read first

**Nothing drawn changes here.** The mark, the wordmark, the lockups and the signature are
byte-identical to the red package: same paths, same viewBoxes, same coordinates. They are included
so this folder stays a complete system, but if you already applied the red handoff you do not need
to touch a single SVG. Diff them and you will find no changes.

**What changes is the accent and the two grounds derived from it: red → amber.** Search the
codebase for `#FF1730`, `#5F1D23` and `#CBB6B2` and replace them per the mapping table below.
`ink` `#14140F` and `paper` `#EFEEE9` are unchanged again, as they have been through both
switches. The accent's **token name stays `signal`** — only its value moves — so if colour lives
in one place (tokens file, CSS custom properties, Tailwind theme) this is three value changes and
one find-and-replace.

**The constraint that broke last time is gone.** Ink on the red accent was 4.77:1, which forced
the closing strip to be rebuilt as a separate ink panel. Ink on amber is **10.08:1**. Small print
on the accent is safe, the accent needs no special cases anywhere, and any ink-panel workaround
added for the red footer can be removed — set that copy in `ink` directly on `signal`.

## Overview

A geometric monogram of the initials **D** and **K** with the racing number **11** cut into the
D's counter, drawn as a single ligature: one vertical bar closes the bowl of the D **and** acts as
the stem of the K, so neither letter can be lifted out on its own. The whole form is sheared 12°
to the right. Original work on a 20-unit grid, not derived from any existing logo.

The design exploration is `DK Monogram.dc.html` — this mark is option **4a**.

## About the design files

The `.dc.html` file in this bundle is a **design reference created in HTML** — a presentation of
several monogram directions, not production code. It will not render outside its authoring
preview (it depends on a runtime file that is not included).

The **SVGs are the deliverable and the source of truth.** Drop them into the target codebase as
assets, or inline the path in a component using that codebase's own conventions (React component,
Vue SFC, SwiftUI `Path`, sprite sheet, icon font — whatever the project already uses).

## Fidelity

**High fidelity, final geometry.** The coordinates below are the mark, not an approximation.
Do not redraw, re-trace, or "clean up" the path; do not round the decimals.

## The asset files

| File | viewBox | Use |
| --- | --- | --- |
| `dk-monogram.svg` | `0 0 238.01 160` | Primary. Tight-cropped to the ink, no padding. |
| `dk-monogram-square.svg` | `0 0 256 256` | App icon / favicon / avatar. Same mark, centred with padding. |
| `dk-monogram-construction.svg` | `0 0 280 200` | The upright ligature plus the `skewX(-12)` transform that generates the italic. Reference for regenerating or animating the shear; **do not ship this one** — some renderers and icon pipelines drop transforms. |
| `dk-wordmark.svg` | `0 0 1120 360` | Two-line wordmark, display cut. Unchanged. |
| `dk-wordmark-small.svg` | `0 0 1204 352` | Two-line wordmark, small cut. Unchanged. |
| `dk-lockup-horizontal.svg` | `0 0 1646.27 360` | Mark + wordmark, side by side. |
| `dk-lockup-stacked.svg` | `0 0 1120 660` | Mark + wordmark, stacked. Primary lockup. |
| `dk-lockup-square.svg` | `0 0 1024 1024` | Stacked lockup in a square. Avatars, app icons, OG images. |
| `dk-signature-single.svg` | `0 0 1000 977` | Signature, one path. Animate this one. Unchanged. |
| `dk-signature.svg` | `0 0 1000 977` | Signature, one path per stroke. Unchanged. |

Everything fills or strokes with `currentColor`, so colour is set by CSS `color` (or the platform
equivalent) on the parent. There is no hard-coded colour in any asset.

### Primary path data

```
M34.01,0 L 138.01,0 L 153.76,20 L 151.21,32 L 190.01,0 L 238.01,0 L 141,80 L 204,160 L 156,160 L 130.8,128 L 128.25,140 L 104,160 L 0,160 Z M57.81,48 L 74.78,34 L 80.78,34 L 61.23,126 L 41.23,126 Z M93.81,48 L 110.78,34 L 116.78,34 L 97.23,126 L 77.23,126 Z
```

`fill-rule="evenodd"` is **required** and is now load-bearing in three places: the two slots that
form the 11 are subpaths, as is the rest of the counter. Without `evenodd` the slots fill in, the
11 disappears, and the mark becomes a solid blob.

### Upright construction path (for reference)

```
M20,20 H124 L144,40 V52 L176,20 H224 L144,100 L224,180 H176 L144,148 V160 L124,180 H20 Z M54,68 L68,54 H74 V146 H54 Z M90,68 L104,54 H110 V146 H90 Z
```

Rendered inside `transform="translate(40,0) skewX(-12)"`, this produces the primary path exactly.

## Construction rules

Unit grid, cap height = 160 units:

- **Cap height** 160 · **stroke weight** 34 · **chamfer** 20
- **The eleven:** two slots in the D's counter, each **20 units wide** with a **14-unit 45° flag**
  cut off the top-left corner, **16 units apart**, running the full 92-unit height of the counter.
  The flag is what makes each slot read as a numeral one rather than a slit; it is 0.7 × the
  slot width and nothing else in the system uses that ratio.
- Every diagonal is exactly **45°**; every cut is vertical, horizontal, or 45°
- The K's arm and leg converge on a single point on the shared bar at half cap height
- **Shear** −12° (`skewX(-12)`, i.e. `x' = x − tan(12°)·y`), pivoting on the baseline
- Ink dimensions after shear: **238.01 × 160** units (aspect ratio 1.4876 : 1) — unchanged from
  the previous mark

Nothing about the mark is optical — every value is on the grid. If a size or spacing needs to
change, change it in these units and re-derive.

## Palette, resolved

Amber / sodium — instrument panels, status lamps, industrial signage, amber CRT phosphor. It reads
as *running*, not *failing*, which is the point: the hero is a wireframe rack with lit bays, and a
saturated red field on that reads as a fault light.

Five grounds, one per section, each painting its own. The two middle grounds are derived from the
accent's own hue (76–80° in OKLCH) at a fraction of its chroma — same treatment as the previous two
systems, which is what makes the five read as one family with `signal` the only saturated thing
on the page.

| Token | Hex | Ground for | Mark & type on it |
| --- | --- | --- | --- |
| `paper` | `#EFEEE9` | Hero, About | `ink` (15.9:1) |
| `sand` | `#C5BAA7` | Track record | `ink` (9.6:1) |
| `bronze` | `#4B3008` | Statement band | `paper` (10.5:1) |
| `ink` | `#14140F` | Work gallery; all dark type | `paper` (15.9:1) |
| `signal` | `#FFB000` | Contact footer, full bleed | `ink` (**10.1:1**) |

### Ink on the accent: 10.08:1 — small print is safe

Stated plainly because this is what broke last time. `ink` `#14140F` on `signal` `#FFB000`
measures **10.08:1**. That clears AA for body text (4.5:1), AAA for body text (7:1), and AAA for
large text (4.5:1) with room to spare. Consequences:

- Body copy, captions, fine print, form labels and legal text may all sit in `ink` directly on
  `signal`. No minimum type size applies on the accent.
- The accent needs **no special cases** — it behaves like any other light ground in the system.
- Any ink panel or inset added to the footer to work around the red accent's 4.77:1 can be
  deleted; put the copy back on the accent.
- `paper` on `signal` is 1.58:1 and must never be used. White or off-white type on the accent is
  invisible — this is the one direction that fails, and it fails for every light accent, red
  included.

`#FFB000` is your value, kept as given: at OKLCH L 0.812 / C 0.170 / h 76.4 it is already at the
gamut edge for that lightness, so there is no brighter amber available and no reason to move it.
It is amber rather than orange — hue 76 sits well clear of the 40–60 orange band.

**The mark never carries the accent.** On `signal` it is `ink`. `signal` is a ground the ink mark
sits on, never a colour the mark takes.

### Mapping from the red system

| Old | New | Note |
| --- | --- | --- |
| `paper #EFEEE9` | `#EFEEE9` | Unchanged, third handoff running. |
| `clay #CBB6B2` | `sand #C5BAA7` | Same lightness (OKLCH L 0.792), same 9.6:1 on ink, moved onto the amber hue. Drop-in swap; the Track record band shifts from dusty pink to warm sand. |
| `oxblood #5F1D23` | `bronze #4B3008` | Same role and the same ~10.5:1 against `paper`. Dark bronze instead of wine — still unmistakably a colour rather than a black. Drop-in swap. |
| `ink #14140F` | `#14140F` | Unchanged. |
| `signal #FF1730` | `signal #FFB000` | **Token name unchanged, value only.** Ink contrast goes 4.77:1 → **10.08:1**, so every restriction the red accent carried is lifted. Full-bleed footer with ink type, now including small type. |

Old hexes to delete on sight: `#FF1730`, `#5F1D23`, `#CBB6B2`. Anything left from the green system
— `#D8F23F`, `#B8BCAD`, `#323921`, `#CBFF2E`, `#D9D7CC`, `#262A1A` — should already be gone.

## Usage rules

- **Clear space:** 40 units on all four sides (0.25 × cap height). At a rendered height of
  32px that is 8px. Nothing — type, rules, image edges — enters that zone.
- **Minimum size:** **20px** tall on screen, 7mm in print. This is up from 16px: below 20px the
  16-unit gap between the two slots closes and the 11 reads as one thick slot. Where the mark must
  go smaller than 20px, there is no fallback in this system — make the mark bigger.
- **Colour:** solid single colour only. `ink` on light grounds (`paper`, `sand`, `signal`), `paper` on the two darks (`bronze`, `ink`).
- **Do not:** re-shear, un-shear, outline, add a second colour (including colouring the 11
  separately), add effects, stretch non-proportionally, or place the mark on a busy photograph
  without a solid panel behind it.
- **Backgrounds:** the mark needs ≥ 4.5:1 contrast against whatever sits behind it.

## Implementation notes

Inline SVG is preferred over `<img>` so `currentColor` works. Sizing: set **height** and let
width follow (`width: auto`), or set `width` with the 1.4876 aspect ratio. Example shape of a
React component — adapt to the codebase's actual component and styling conventions:

```jsx
export function DkMark({ size = 32, ...rest }) {
  return (
    <svg viewBox="0 0 238.01 160" height={size} width={size * 1.4876}
         role="img" aria-label="DK 11" {...rest}>
      <path fill="currentColor" fillRule="evenodd" d="M34.01,0 L 138.01,0 L 153.76,20 L 151.21,32 L 190.01,0 L 238.01,0 L 141,80 L 204,160 L 156,160 L 130.8,128 L 128.25,140 L 104,160 L 0,160 Z M57.81,48 L 74.78,34 L 80.78,34 L 61.23,126 L 41.23,126 Z M93.81,48 L 110.78,34 L 116.78,34 L 97.23,126 L 77.23,126 Z" />
    </svg>
  );
}
```

Accessibility: `role="img"` with `aria-label="DK 11"` when the mark stands alone; `aria-hidden="true"`
when it sits next to a text logotype that already says the name.

If the mark is ever animated, animate the shear on the construction file's group
(`skewX(0)` → `skewX(-12)`) rather than morphing the flattened path.

## Wordmark

Unchanged by this handoff. Drawn, not typeset — same construction as the mark (cap height 160,
stem 34, chamfers 20 and 40, all cuts vertical, horizontal or 45°). `KRISHNA`'s K **is** the
monogram's K, unscaled.

Two lines, `DHANUSH` over `KRISHNA`, letterspaced to the **same measure** — both lines are
exactly 1120 units wide, flush left and right. Line 2 carries more tracking than line 1 because it
holds a narrow `I` and a narrow `K`; that difference is what makes the two lines equal. Do not
re-track either line on its own.

| File | Tracking L1 / L2 | Use |
| --- | --- | --- |
| `dk-wordmark.svg` | 26 / 48.33 | Display cut. Anything **above 40px** tall. Leading 40 units. |
| `dk-wordmark-small.svg` | 40 / 62.33 | Small cut. **40px and below**, including the fixed bar. Leading 32. |

At **22px tall** the small cut renders cap height 10px, stem 2.13px, overall width 75.3px. That is
its floor. Below 22px drop the wordmark and run the mark alone.

## Lockups

| File | Composition |
| --- | --- |
| `dk-lockup-horizontal.svg` | Mark left at cap 300, optically centred on the two-line block, 80-unit gap, display cut wordmark right. |
| `dk-lockup-stacked.svg` | Mark centred above at cap 240, 60-unit gap, wordmark below. The primary lockup. |
| `dk-lockup-square.svg` | Stacked lockup centred in a square with 88 units of padding. |

**Clear space, all lockups: 40 units** on all four sides, measured in that file's own viewBox
units (0.25 × wordmark cap height). Nothing enters it — no rules, no type, no image edge.

Every lockup is a **single path** with the mark and the wordmark flattened into one set of
coordinates: no transforms, no groups, nothing for a pipeline to drop. `fill-rule="evenodd"` is
**load-bearing on every wordmark and lockup file** — the counters of `D`, `A` and `R`, and the two
slots of the 11, are all subpaths.

## Signature

Unchanged by this handoff. **Drawn, not traced.** Auto-tracing a photograph can only guess at the
pen — where it started, where it lifted, and where the centre of a stroke sits under a thick nib.
This signature was drawn directly as pointer input, so the path *is* the pen: stroke order, pen
lifts and centreline are exact rather than inferred, and nothing was regularised into a script
font.

It is a **centreline** path — stroked, never filled. `fill="none"` is on the root and every
subpath is open, so `getTotalLength()` and `stroke-dashoffset` behave.

| | |
| --- | --- |
| viewBox | `0 0 1000 977` |
| stroke-width | **27.9** at that viewBox |
| stroke-linecap / linejoin | `round` / `round` |
| Total path length | **4565** units |
| Subpaths | 2, in the order they were written |
| Aspect ratio | 1.024 : 1 |
| Colour | `currentColor` — set `color` on the parent |

### Scroll-driven draw-on

```js
const p = document.querySelector('#sig');   // dk-signature-single.svg, inlined
const L = p.getTotalLength();                // 4565
p.style.strokeDasharray = L;
p.style.strokeDashoffset = L;

// progress: 0 → 1 as the signature scrolls through the viewport
const draw = progress => { p.style.strokeDashoffset = L * (1 - progress); };
```

Inline the SVG (not `<img>`) so `currentColor` and the DOM handle work. Drive `progress` from an
`IntersectionObserver` plus `scroll`, or a scroll-linked animation; don't also put a CSS
transition on `stroke-dashoffset` or the two will fight. Render it **at least 240px wide** — below
that the 27.9-unit stroke drops under 7px and the tight loops fill in.

## Design tokens

| Token | Value |
| --- | --- |
| Ink | `#14140F` |
| Paper / reverse | `#EFEEE9` |
| Sand | `#C5BAA7` |
| Bronze | `#4B3008` |
| Signal (accent) | `#FFB000` |
| Cap height (grid) | 160 units |
| Stroke weight | 34 units |
| Chamfer | 20 units (inner) / 40 units (outer) |
| Numeral slot | 20 units wide, 16 apart, 14-unit flag |
| Diagonal angle | 45° |
| Mark shear | −12° |
| Clear space | 40 units (0.25 × cap height) |
| Min mark size | 20px / 7mm |
| Min wordmark size | 22px (small cut) |
| Mark aspect ratio | 1.4876 : 1 |
| Wordmark measure | 1120 units, both lines |

There is no typography in this handoff beyond the drawn wordmark — display and body faces are the
site's own.

## Files

- `dk-monogram.svg` — primary mark, with the 11
- `dk-monogram-square.svg` — square mark for icons
- `dk-monogram-construction.svg` — upright source + shear transform, reference only
- `dk-wordmark.svg` / `dk-wordmark-small.svg` — two-line wordmark, display and small cuts
- `dk-lockup-horizontal.svg` / `dk-lockup-stacked.svg` / `dk-lockup-square.svg` — mark + wordmark
- `dk-signature-single.svg` — signature, one path, 2 open subpaths — animate this one
- `dk-signature.svg` — signature as separate paths `s01`, `s02` for per-stroke control
- `DK Monogram.dc.html` — the exploration the mark was chosen from; option `4a`
