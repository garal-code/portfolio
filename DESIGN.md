---
version: alpha
name: Garal-portfolio
description: >-
  Personal portfolio of Javier García Álvarez (Garal), a Software & Agent Engineer. A warm editorial
  system built on a deep forest-green band and a paper-cream canvas, with a single gold accent. Display
  type is Bricolage Grotesque set extra-bold and tightly tracked; body type is DM Sans. Surfaces are
  flat: depth comes from color blocking and rounded panels, never from shadows.

colors:
  forest: "#123a2f"
  forest-deep: "#0b2620"
  ink: "#10231d"
  cream: "#f4f1ea"
  sand: "#e6e1d6"
  surface-card: "#ffffff"
  gold: "oklch(0.82 0.14 80)" # ≈ #f3b94c
  mint-muted: "#b9cfc6"
  sage: "#7fa497"
  sage-dark: "#5c7a70"
  body: "#3d554c"
  meta: "#6f8a80"
  rule-dark: "rgba(244, 241, 234, 0.18)"
  selection-bg: "rgba(18, 58, 47, 0.18)"

typography:
  display-hero:
    fontFamily: Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif
    fontSize: clamp(48px, 9vw, 104px)
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: -0.04em
  display-lg:
    fontFamily: Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif
    fontSize: 44px
    fontWeight: 800
    letterSpacing: -0.02em
  display-md:
    fontFamily: Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif
    fontSize: 36px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif
    fontSize: 25px
    fontWeight: 800
    letterSpacing: -0.02em
  tagline:
    fontFamily: Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: -0.02em
  title-lg:
    fontFamily: Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif
    fontSize: 24px
    fontWeight: 700
  title-md:
    fontFamily: Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif
    fontSize: 22px
    fontWeight: 700
  body-md:
    fontFamily: DM Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: DM Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.55
  meta:
    fontFamily: DM Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 13px
    fontWeight: 400
  eyebrow:
    fontFamily: DM Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 700
    letterSpacing: 0.2em
    textTransform: uppercase
  label:
    fontFamily: DM Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 600
  button:
    fontFamily: DM Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 15px
    fontWeight: 700
  button-sm:
    fontFamily: DM Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 700
  badge:
    fontFamily: DM Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 700

rounded:
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px

spacing:
  xs: 6px
  sm: 10px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 56px
  section: 64px
  gutter-mobile: 24px
  gutter-desktop: 64px

components:
  hero-band:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.cream}"
    padding: "32px 24px 0 (mobile), 32px 64px 0 (md+)"
  top-nav-link:
    backgroundColor: transparent
    textColor: "{colors.gold}"
    typography: "{typography.label}"
  interest-row:
    backgroundColor: transparent
    textColor: "{colors.cream}"
    titleTypography: "{typography.title-lg}"
    noteColor: "{colors.mint-muted}"
    border: "1px top and bottom, {colors.rule-dark}"
    padding: 14px 0
  project-panel:
    backgroundColor: "{colors.cream}"
    rounded: "{rounded.xl} top corners only"
    imageBackground: "{colors.forest-deep}"
    padding: "{spacing.xl}"
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.cream}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 14px 20px
  button-outline:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    border: "1.5px solid {colors.forest}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.md}"
    padding: 11px 20px
  segmented-tabs:
    backgroundColor: "{colors.sand}"
    rounded: "{rounded.full}"
    padding: 6px
  segmented-tab:
    backgroundColor: transparent
    textColor: "{colors.body}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 10px 20px
  segmented-tab-selected:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.cream}"
  content-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  badge-current:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.cream}"
    typography: "{typography.badge}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  skill-chip:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm} at weight 600"
    rounded: "{rounded.full}"
    padding: 10px 18px
  contact-band:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    typography: "{typography.display-sm}"
    rounded: "{rounded.xl}"
    padding: 16px
---

## Overview

Garal is a personal brand, not a SaaS product. The page should read like the cover and contents of a well-made technical magazine: one confident name, one clear statement of who the person is, then the evidence (project, experience, education, stack) and a direct way to get in touch.

The atmosphere is **warm, grounded and editorial**. A deep **forest band** (`{colors.forest}`) opens the page and carries the name, tagline and interests in cream. The rest of the page sits on a **paper-cream canvas** (`{colors.cream}`) with white content cards. A single **gold accent** (`{colors.gold}`) marks the moments that matter: the tagline, the navigation and the closing contact band.

**Key Characteristics:**
- Two-surface rhythm: forest band on top, cream canvas below. The cream project panel overlaps the bottom of the forest band with rounded top corners, so the hand-off between surfaces feels like a page being turned, not a hard cut.
- One accent only. Gold is the brand voltage; everything else is a green-tinted neutral.
- Display type is loud (extra-bold, tightly tracked, up to 104px); body type is quiet (DM Sans 400 at 15–16px, generous 1.55 line height).
- Flat surfaces. No shadows, no gradients, no glass. Depth comes from color blocking and rounded panels.
- Content is in Spanish (`lang="es"`); code, tokens and this document are in English.

## Colors

### Brand & Accent
- **Forest** (`{colors.forest}` — #123a2f): The brand color. Hero band background, primary buttons, selected tab, "current" badge, outline-button borders.
- **Forest Deep** (`{colors.forest-deep}` — #0b2620): Placeholder background behind project imagery while it loads.
- **Gold** (`{colors.gold}` — `oklch(0.82 0.14 80)`, ≈ #f3b94c): The only accent. Tagline, top navigation links and the full-bleed contact band. Never used for body text on light surfaces.

### Surface
- **Cream** (`{colors.cream}` — #f4f1ea): Page canvas and the project panel.
- **Sand** (`{colors.sand}` — #e6e1d6): Recessed tracks, such as the segmented-tab container.
- **Surface Card** (`{colors.surface-card}` — #ffffff): Content cards and skill chips that sit on cream.

### Text
- **Ink** (`{colors.ink}` — #10231d): Headlines and primary text on light surfaces. A green-black, never pure black.
- **Body** (`{colors.body}` — #3d554c): Paragraph text and unselected tab labels.
- **Sage Dark** (`{colors.sage-dark}` — #5c7a70): Dates and eyebrows on light surfaces.
- **Meta** (`{colors.meta}` — #6f8a80): Lowest-priority metadata, such as the technology list on job cards.
- **Sage** (`{colors.sage}` — #7fa497): Eyebrows on the forest band.
- **Mint Muted** (`{colors.mint-muted}` — #b9cfc6): Secondary text on the forest band.

### Lines & States
- **Rule Dark** (`{colors.rule-dark}` — cream at 18%): Hairlines on the forest band.
- **Selection** (`{colors.selection-bg}` — forest at 18%): Text selection background, with ink text.

### Measured contrast (WCAG 2.1)

| Pair | Ratio | Use |
|---|---|---|
| cream on forest | 11.1 | Hero name and copy |
| gold on forest | 7.1 | Tagline, nav links |
| mint-muted on forest | 7.7 | Interest notes |
| sage on forest | 4.6 | Eyebrow (passes AA, barely) |
| ink on cream | 14.5 | Default text |
| ink on gold | 9.3 | Contact band |
| body on white | 8.1 | Card paragraphs |
| sage-dark on white | 4.7 | Dates on cards |
| sage-dark on cream | 4.2 | Eyebrow on project panel (fails AA for small text) |
| meta on white | 3.7 | Tech list on cards (fails AA for small text) |

## Typography

### Font Family
- **Display:** Bricolage Grotesque (Google Fonts, optical size 12–96, weights 500/700/800). Used for every headline, card title and the tagline.
- **Body/UI:** DM Sans (Google Fonts, weights 400/500/700). Used for paragraphs, labels, buttons, eyebrows and metadata.

### Hierarchy

| Token | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| `display-hero` | clamp(48px, 9vw, 104px) | 800 | 0.9 | -0.04em | The name in the hero |
| `display-lg` | 44px | 800 | normal | -0.02em | Section titles ("Trayectoria") |
| `display-md` | 36px | 800 | 1 | -0.02em | Project name |
| `display-sm` | 25px | 800 | normal | -0.02em | Contact band question |
| `tagline` | 20px | 700 | 1 | -0.02em | Bio line under the name, in gold |
| `title-lg` | 24px | 700 | normal | 0 | Interest titles |
| `title-md` | 22px | 700 | normal | 0 | Card titles |
| `body-md` | 16px | 400 | 1.55 | 0 | Long descriptions |
| `body-sm` | 15px | 400 | 1.55 | 0 | Card summaries |
| `meta` | 13px | 400 | normal | 0 | Technology lists |
| `eyebrow` | 12px | 700 | normal | 0.2em, uppercase | Section labels |
| `label` | 14px | 600 | normal | 0 | Nav links, tabs, dates |
| `button` | 15px | 700 | normal | 0 | Primary button |
| `button-sm` | 14px | 700 | normal | 0 | Outline buttons |

### Principles
- Display sizes always carry negative tracking; the bigger the size, the tighter (-0.04em at hero scale, -0.02em below).
- Emphasis comes from size and the display face before weight. Body text never goes above 700.
- Eyebrows are the only uppercase text, and always use 0.2em tracking.
- Use `text-wrap: balance` (`.text-balance`) on multi-line headlines.

## Layout

### Spacing System
Tailwind's 4px scale. The recurring values are `{spacing.xs}` 6px (tab track padding), `{spacing.sm}` 10px, `{spacing.md}` 16px (grid gaps), `{spacing.lg}` 24px (card padding, mobile gutter), `{spacing.xl}` 32px (project panel padding, section inner gap), `{spacing.2xl}` 56px (hero column gap) and `{spacing.section}` 64px (section vertical padding, desktop gutter).

### Grid & Container
- Full-bleed sections with side gutters: 24px on mobile, 64px from `md` (768px).
- No fixed max-width container. The hero name caps at 782px; the hero switches to a two-column grid (`1fr` + 340px interests) from `lg` (1024px).
- The project panel is a two-column grid (`1fr` image + 300px copy) from `lg`.
- Card grids: 2 columns for experience, 3 for education, from `md`.

### Whitespace Philosophy
Big type, tight blocks. Inside a block, elements sit close (10–20px gaps) so each card reads as one unit; between blocks, give room (32–64px). Avoid evenly distributed whitespace that makes everything look equally important.

## Elevation & Depth

The system is intentionally **flat**. There are no box shadows anywhere.

Depth comes from three devices:
1. **Color blocking:** forest band vs cream canvas.
2. **Card on canvas:** white cards on cream, and a sand track behind the tabs.
3. **Overlap:** the cream project panel rises into the forest band with only its top corners rounded.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.md}` | 12px | Buttons |
| `{rounded.lg}` | 16px | Content cards |
| `{rounded.xl}` | 20px | Large panels (project panel top, contact band) |
| `{rounded.full}` | 9999px | Tabs, tab track, skill chips, badges |

Rule: the bigger the surface, the larger the radius. Pills are reserved for small, selectable or tag-like elements.

### Imagery
- Project imagery is a real product screenshot, `object-cover`, 280px tall on mobile and 440px from `lg`.
- No stock photography, no decorative illustrations, no fake UI built from divs.

## Components

### Hero band (`{component.hero-band}`)
Forest background. Top-right navigation with gold text links (GitHub, LinkedIn). Below: the name in `display-hero`, the bio in gold `tagline`, and on desktop a right column with the "Lo que sigo de cerca" interests list.

### Interest row (`{component.interest-row}`)
A short list (3 items) of title + note pairs, separated by `{colors.rule-dark}` hairlines top and bottom. Title in `title-lg` cream, note in `label`-sized mint-muted text, baseline-aligned and justified to opposite ends.

### Project panel (`{component.project-panel}`)
Cream panel overlapping the bottom of the hero band. Screenshot on the left, copy on the right: eyebrow ("Proyecto personal"), `display-md` name, `body-md` description and a primary button ("Ver la app →").

### Buttons
- **Primary** (`{component.button-primary}`): forest fill, cream text, 12px radius. One per section at most.
- **Outline** (`{component.button-outline}`): transparent with a 1.5px forest border and ink text. Used in groups (contact links).
- **Text link** (`{component.top-nav-link}`): gold label text with no underline, only on the forest band.
- Hover on every link and button is the same: opacity to 0.85, with a 180ms ease transition. No color swaps, no lift, no shadow.

### Segmented tabs (`{component.segmented-tabs}`)
A sand pill track holding pill tabs. The selected tab turns forest with cream text (driven by `aria-selected`). Tabs follow the ARIA tabs pattern (`role="tablist"`, `role="tab"`, `role="tabpanel"`), and panels stay visible without JavaScript via a `<noscript>` override.

### Content card (`{component.content-card}`)
White, 16px radius, 24px padding, no border, no shadow. Header row: `title-md` title on the left, `label` date in sage-dark on the right, plus an optional "Actual" `badge-current`. Then a `body-sm` summary and an optional `meta` technology list joined with " · ".

### Skill chip (`{component.skill-chip}`)
White pill with ink text at 15px/600. Displayed as a wrapping flex row with 10px gaps.

### Contact band (`{component.contact-band}`)
Full-width gold panel, 20px radius, closing the page. A `display-sm` question on the left ("¿Hablamos de software, mercados o IA?") and a group of outline buttons on the right.

## Motion

- **Entrance:** elements marked `data-animate` start at `opacity: 0; translateY(24px)` and animate to rest over 0.55s ease when 10% of them enters the viewport (`IntersectionObserver`, root margin -50px at the bottom). Each element animates once.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, every `data-animate` element is shown immediately with no transition.
- **Interaction:** 180ms ease on color, border, background, opacity, transform and shadow for links.
- **Scroll:** `scroll-behavior: smooth` on `html`. No scroll listeners; scroll-linked effects use `IntersectionObserver` or a scroll-driven library.

## Do's and Don'ts

### Do
- Open every page with the forest band and close it with the gold contact band.
- Keep gold as the single accent. If something needs emphasis, make it bigger in Bricolage Grotesque before reaching for a new color.
- Use green-tinted neutrals (ink, body, sage, meta) for text. Never pure black or neutral grey.
- Keep surfaces flat and let color blocking create hierarchy.
- Write UI copy in Spanish, in the first person and plainly.
- Respect `prefers-reduced-motion` in every new animation.

### Don't
- Don't add a second accent color (no blue links, no purple gradients, no red CTAs).
- Don't add box shadows, glassmorphism or gradient meshes.
- Don't use Bricolage Grotesque for paragraphs or DM Sans for headlines.
- Don't put gold text on cream or white; it fails contrast. Gold is a fill on light surfaces and a text color only on forest.
- Don't use pure white as the page background. White is only for cards on cream.
- Don't mix radius families on one surface: buttons stay at 12px, cards at 16px, panels at 20px.
- Don't add scroll cues, decorative status dots, version labels or fake terminal/dashboard UI.

## Responsive Behavior

### Breakpoints (Tailwind defaults)

| Name | Width | Key changes |
|---|---|---|
| Mobile | < 640px | Single column; 24px gutters; journey header stacks title over tabs; contact band stacks question over buttons |
| `sm` | ≥ 640px | Journey header and contact band go side by side |
| `md` | ≥ 768px | 64px gutters; experience cards 2-up, education 3-up |
| `lg` | ≥ 1024px | Hero becomes name + interests columns; project panel becomes image + copy columns; image grows to 440px |

### Touch Targets
- Buttons are at least 44px tall (14px vertical padding + 15px text).
- Tabs are about 40px tall; keep them at least that size.

### Collapsing Strategy
- Grids drop columns instead of shrinking cards.
- The hero name scales fluidly with `clamp()` instead of breakpoint jumps.
- Navigation stays as two inline text links at every width; no hamburger is needed.

## Iteration Guide

1. Reference tokens (`{colors.forest}`, `{component.content-card}`), never raw hex. In code, use the Tailwind theme names defined in `src/styles/global.css` (`bg-forest`, `text-gold`, `font-display`).
2. When a new token is needed, add it to `@theme` in `src/styles/global.css` and to this file in the same change.
3. New sections alternate surfaces deliberately: forest → cream → (white cards on cream) → gold close.
4. One primary button per section. Groups of actions use outline buttons.
5. This file is the source of truth for the visual identity. When an installed design skill (such as `design-taste-frontend`) proposes a different palette, font or radius system, this file wins.

## Known Gaps

- `{colors.meta}` on white (3.7:1) and `{colors.sage-dark}` on cream (4.2:1) fail WCAG AA for small text. Darken these tokens before adding more text that uses them.
- A `dark` Tailwind variant is declared in `global.css`, but there is no dark theme yet. The forest band works as the dark surface for now.
- Date ranges and the page title use an em dash (`2019 — 2023`, `Name — Title`). Keep this consistent or replace it everywhere at once.
- There is no logo or wordmark token; the name set in `display-hero` acts as the wordmark.
- The 3D scroll world (a growing bonsai) is specified in `docs/bonsai-world/world-bible.md`. It uses the same palette roles (forest for foliage, cream for ceramic and stone, gold for practical light and annotations) and adds natural greens for the world only. Vermilion is allowed on the world's traditional architecture (pagoda, torii) but never in the UI, whose only accent remains gold.
