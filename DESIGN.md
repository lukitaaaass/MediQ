---
name: Hygia
description: Asistente clínico con IA para médicos hispanohablantes
colors:
  warm-parchment: "#f6f5f1"
  parchment-deep: "#efede6"
  surface-white: "#ffffff"
  near-black: "#161a1d"
  ink-soft: "#3c4246"
  ink-mute: "#595f64"
  evidence-teal: "oklch(54% 0.09 195)"
  evidence-teal-dark: "oklch(78% 0.13 155)"
  ok-green: "oklch(60% 0.12 155)"
  danger-red: "oklch(58% 0.18 25)"
  warn-amber: "oklch(62% 0.14 40)"
  info-blue: "oklch(60% 0.12 240)"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(48px, 7.2vw, 112px)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(36px, 5vw, 68px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(20px, 2vw, 26px)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.1em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "18px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "20px"
  lg: "36px"
  xl: "56px"
components:
  button-primary:
    backgroundColor: "{colors.near-black}"
    textColor: "{colors.warm-parchment}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.near-black}"
    textColor: "{colors.warm-parchment}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.near-black}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.near-black}"
  button-accent:
    backgroundColor: "{colors.evidence-teal}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  input-field:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.near-black}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  card-surface:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.lg}"
    padding: "clamp(20px, 2.6vw, 36px)"
---

# Design System: Hygia

## 1. Overview

**Creative North Star: "The Clinical Notebook"**

Hygia's visual system is the typeset equivalent of a well-maintained clinical notebook: warm off-white pages, near-black ink with precise hierarchy, and a single muted teal marking what requires attention. Every design decision is filtered through the question a consultant asks before opening their mouth: "Is this necessary?" If the answer is no, it doesn't appear.

The system is editorial without being decorative. Fraunces (variable optical-size serif) carries the structural weight of headings, reinforcing that Hygia reasons and presents, never sells. Inter handles the body work quietly; IBM Plex Mono serves labels, metadata, and anything that must feel accurate rather than conversational. The three-typeface system is the maximum. Nothing else enters.

Color is restrained to near-monochrome with one accent: Evidence Teal, a muted cyan-green that appears where clinical attention is warranted — active states, CTA buttons, confirmations, the live-session indicator. In dark mode, the accent shifts from teal (hue 195) to a warmer green (hue 155), reflecting the shift from daytime precision to night-shift terminal energy. This is intentional and should never be "fixed."

This system explicitly rejects: startup-purple SaaS gradients, hospital-blue sterility, AI-hype neon, and consumer-wellness pastel. If it resembles a productivity tool for knowledge workers, an EMR from 2012, a ChatGPT wrapper, or a meditation app, something has gone wrong.

**Key Characteristics:**
- Three-typeface hierarchy: Fraunces (serif display) + Inter (sans body) + IBM Plex Mono (label/code)
- Near-monochrome palette with one restrained accent (Evidence Teal)
- Flat-by-default elevation; depth through tonal layering, not shadows
- Warm off-white base (#f6f5f1), not white; ink near-black (#161a1d), not black
- Dense information layout with intentional breathing room at section breaks
- All semantic colors expressed in OKLCH for perceptual linearity


## 2. Colors: The Notebook Palette

A near-monochromatic ink-and-parchment system with one active voice.

### Primary
- **Evidence Teal** (`oklch(54% 0.09 195)` light / `oklch(78% 0.13 155)` dark): The only color in the system with chromatic identity. Applied to: CTA buttons, active indicators, the live session dot, accent text in headings (em tags), success-adjacent confirmations. Intentionally muted, never neon. In light mode it reads teal-cyan; in dark mode it reads green — this hue shift is a feature, not inconsistency.

### Neutral
- **Warm Parchment** (`#f6f5f1`): The page. Used as the root background. Slightly warm (amber hue tilt), never pure white. Signals that this is a document surface, not a screen.
- **Parchment Deep** (`#efede6`): Secondary background for sidebars, code blocks, and interactive containers that need to sit one level below the page. Also used for hover states on ghost elements.
- **Surface White** (`#ffffff`): Cards, modals, and elevated containers. The only pure white in the system; reserved for surfaces that must read as "lifted" from the parchment base.
- **Near-Black** (`#161a1d`): Primary text and filled button backgrounds. Carries a faint cool-blue tint — not a warm ink, not a cold charcoal. Never pure `#000`.
- **Ink Soft** (`#3c4246`): Secondary text, active navigation labels, card subheadings. Readable at distance.
- **Ink Mute** (`#595f64`): Metadata, timestamps, mono labels, placeholder text, disabled states. Use when information is contextual, not primary.

### Semantic
- **Ok Green** (`oklch(60% 0.12 155)`): Confirmed states, success badges, "done" step indicators. Shares the green hue family with dark-mode Evidence Teal — they are visually related.
- **Danger Red** (`oklch(58% 0.18 25)`): Destructive actions, validation errors, critical alerts. Highest chroma in the system; use sparingly.
- **Warn Amber** (`oklch(62% 0.14 40)`): Advisory states, non-critical warnings. Warmer than danger.
- **Info Blue** (`oklch(60% 0.12 240)`): Informational callouts, neutral banners.

### Named Rules
**The One Voice Rule.** Evidence Teal appears on no more than 10% of any given screen in light mode. Its restraint is what makes it legible as "action" or "confirmation" — if it appears freely, it stops communicating anything.

**The Hue-Shift Rule.** Dark mode shifts Evidence Teal from hue 195 (teal) to hue 155 (green) at higher lightness (78% vs 54%). This is intentional. Never override `--accent` in dark mode back to hue 195.

**The No-Pure-White Rule.** The page is `#f6f5f1`, not `#fff`. Cards are `#fff` specifically because the contrast with the parchment base communicates elevation. Using `#fff` as the page color collapses this hierarchy.


## 3. Typography: Three-Part Hierarchy

**Display Font:** Fraunces (variable weight 300-700, optical sizes), Georgia, serif
**Body Font:** Inter, system-ui, -apple-system, sans-serif
**Label / Code Font:** IBM Plex Mono, ui-monospace, monospace

**Character:** Fraunces brings optical-size editorial authority to headings — not decorative oldstyle, not stiff slab. Its italic variants read as emphasis without performance. Inter handles body text with quiet professionalism. IBM Plex Mono gives metadata and labels the precision feel of typed output, differentiating clinical data from prose without needing color.

### Hierarchy
- **Display** (weight 400, `clamp(48px, 7.2vw, 112px)`, line-height 0.98, tracking -0.02em): Hero headlines only. The size range from 48px to 112px is intentional; at large viewport widths, this fills the visual field as a journal cover would.
- **Headline** (weight 400, `clamp(36px, 5vw, 68px)`, line-height 1.02, tracking -0.02em): Section titles (h2). Fraunces at this size reads like a chapter heading in a medical reference.
- **Title** (weight 400, `clamp(20px, 2vw, 26px)`, line-height 1.2, tracking -0.02em): Card headings, modal titles, feature names (h3). Fraunces variable at smaller optical sizes.
- **Body** (weight 400, `16px`, line-height 1.55): All running prose. Inter at 16px with 1.55 line-height is the minimum for clinical readability; do not drop below this. Max line length 65-75ch.
- **Lede** (weight 400, `clamp(16px, 1.2vw, 19px)`, line-height 1.55): Section subheadlines and lead paragraphs. Slightly larger body.
- **Label** (weight 400, `10.5-12px`, tracking 0.08-0.12em, uppercase): IBM Plex Mono. Used for section eyebrows, metadata labels, pricing tier names, empty-state annotations, and the "Cómo funciona" step numbers. This is not decorative — it marks structural metadata.
- **Mono Body** (`13-14px`, line-height 1.6): IBM Plex Mono at readable size. Used in the clinical chat sidebar, security inspector panels, and code-adjacent contexts.

### Named Rules
**The Italic Emphasis Rule.** Emphasis in Fraunces headings uses `font-style: italic; font-weight: 300` (lighter italic), not bold. Bold on Fraunces at display sizes reads loud and unmedical. Italic at 300 reads refined.

**The Mono Precision Rule.** IBM Plex Mono never appears in running body copy. It marks system metadata, labels, and data. When a user sees mono, they know they're reading a fact, not a sentence.


## 4. Elevation

Hygia is flat-by-default. Depth is communicated through tonal surface layering: parchment base (`#f6f5f1`) below, parchment deep (`#efede6`) for secondary areas, surface white (`#ffffff`) for cards and modals. Shadows exist but are architectural, not decorative.

### Shadow Vocabulary
- **Ambient card shadow** (`0 1px 0 rgba(30,35,39,0.05), 0 20px 60px -40px rgba(0,0,0,0.10)`): The hero card and a small number of elevated surfaces use this. The first layer is a 1px hairline border of the rule color; the second is a soft large-radius ambient glow. Together they read as "lifted slightly off the page" without theatrics.
- **Focus ring** (`0 0 0 4px color-mix(in oklab, var(--accent) 15%, transparent)`): Applied to focused form inputs and interactive elements. Not a shadow — a low-opacity teal halo. This is the only place teal appears as a diffuse color.
- **Modal backdrop** (`rgba(0,0,0,0.4)`): A semi-transparent overlay behind modals. No blur.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. The ambient card shadow appears only on a small number of hero/featured containers. Regular content cards, feature grid cells, and list items use border-only separation (`1px solid var(--rule-2)`). A new shadow must earn its place.


## 5. Components

Components in Hygia follow "Measured restraint": occupy the space the content requires, signal state through color and border changes, never through scale transforms at rest. The pill radius on buttons contrasts deliberately with the rectilinear grid of the page.

### Buttons
- **Shape:** Pill (999px radius) for all button variants; 10px radius for form-context submit buttons.
- **Primary:** `background: #161a1d; color: #f6f5f1`. Padding 10px 16px. On hover: `translateY(-1px)` — a 1px lift, no color change. On active: `scale(0.97)` — immediate tactile compression.
- **Ghost:** `background: transparent; border: 1px solid var(--rule-2); color: #161a1d`. On hover: `background: #fff; border-color: #3c4246`. No lift.
- **Accent:** `background: oklch(54% 0.09 195); color: #fff`. Reserved for the single most important action on a screen.
- **Focus:** All buttons receive a 2.5px `outline` in Evidence Teal at `outline-offset: 3px` via `:focus-visible`.
- **Disabled:** `opacity: 0.55; cursor: not-allowed; transform: none`.
- **Min touch target:** 44px height on mobile.

### Cards / Containers
- **Standard card:** `background: #fff; border: 1px solid var(--rule-2); border-radius: 14px`. Internal padding: `clamp(20px, 2.6vw, 36px)`. On hover: `border-color: #3c4246; transform: translateY(-2px)`.
- **Featured card (pricing):** `background: #161a1d; color: #f6f5f1`. Same radius. The only dark card in the system on a light-mode page; creates a visual anchor in the pricing grid.
- **Surface container (sidebar, secondary panels):** `background: #efede6`. No border, no radius. Flows into the layout.
- **No nested cards.** A card inside a card is always wrong.

### Inputs / Fields
- **Style:** `background: #fff; border: 1px solid var(--rule-2); border-radius: 10px; padding: 14px 16px; font-size: 15px`.
- **Focus:** `border-color: #3c4246; box-shadow: 0 0 0 4px color-mix(in oklab, oklch(54% 0.09 195) 15%, transparent)`. The teal halo on focus is the most visible application of Evidence Teal in the product UI.
- **Error:** `border-color: oklch(58% 0.18 25)`. No red background.
- **Disabled:** `opacity: 0.55`. No style change beyond opacity.

### Navigation
- **Top nav:** Sticky, `backdrop-filter: saturate(1.1) blur(10px)`, 64px height, `background: color-mix(in oklab, var(--bg) 82%, transparent)`. The blurred transparency is contextual — the nav reads the page below it.
- **Nav links:** Inter 14px, `color: #3c4246` default, `color: #161a1d` active/hover. No underlines, no pills, no indicators beyond color.
- **Brand mark:** A 26px circle with the near-black fill and an Evidence Teal dot inset. The only place the brand uses a geometric mark.
- **Mobile nav:** Full-screen overlay at z-index 40, slides in from top on burger tap.

### Tabs / Segmented Controls
- **Container:** `background: #efede6; padding: 4px; border-radius: 999px`.
- **Active tab:** `background: #fff; box-shadow: 0 1px 0 var(--rule-2); color: #161a1d`.
- **Inactive:** `color: #595f64`. Transition on background 150ms.

### Signature Component: The Composer (Chat Input)
The chat composer is the highest-frequency interactive element in the product. It is a multi-line textarea inside a card-style container with a 16px radius, a subtle border that shifts to `#3c4246` on focus, and a rounded send button. File attachment and specialty selector are secondary actions in the composer chrome. The composer expands vertically with content (max-height 200px) and has no horizontal resize handle.

### Semantic Badges / Status Indicators
Inline mono-font badges (10-11px, uppercase, tracking 0.06em) carry plan tiers, trial status, and session state. They use `color-mix()` to derive backgrounds from semantic color tokens at 10-15% opacity — never hard-coded badge colors.


## 6. Do's and Don'ts

### Do:
- **Do** use `oklch()` for all semantic colors (accent, ok, danger, warn, info). Hex is reserved for neutral surfaces (#f6f5f1, #efede6, #ffffff, #161a1d). This keeps the semantic layer perceptually uniform and easy to adjust by lightness alone.
- **Do** use Fraunces at font-weight 400 with `letter-spacing: -0.02em` for all display and headline sizes. The tracking tightening is load-bearing; without it, Fraunces reads loose at large sizes.
- **Do** express em-tag emphasis inside Fraunces headings as `font-style: italic; font-weight: 300` (the lighter italic optical size). Never bold emphasis in display type.
- **Do** use IBM Plex Mono for all metadata labels at 10.5-12px with `text-transform: uppercase` and `letter-spacing: 0.08-0.12em`. Mono text is structural, not decorative — it signals "this is a system value."
- **Do** keep Evidence Teal below 10% of any given screen surface area (The One Voice Rule). Its scarcity is its signal value.
- **Do** separate page regions with 1px solid `var(--rule)` or `var(--rule-2)` borders — these are near-transparent and read as breath, not structure. Section padding does the structural work.
- **Do** confirm that all interactive elements have `:focus-visible` with the 2.5px Evidence Teal outline before shipping. WCAG AA minimum throughout; the user base includes high-stress clinical environments where keyboard navigation is common.
- **Do** use `prefers-reduced-motion: no-preference` guards for all decorative animations (pulse, blink, entrance reveals). State-change transitions (150-200ms) are exempt.

### Don't:
- **Don't** use purple, violet, or blue-purple anywhere in the system. Hygia is not a SaaS productivity tool for knowledge workers. Purple is the fastest way to make Hygia look like a Notion template or a Loom marketing page.
- **Don't** use hospital blue (`#0078D4`, `#1890FF`, steel blues) or white-dominant clinical layouts with stethoscope/heart iconography. Doctors associate this aesthetic with the outdated EMR software they despise. It signals "we don't understand medicine, we just Googled it."
- **Don't** use gradient text (`background-clip: text` with a gradient). It is always decorative, never meaningful. Use a single solid color; use weight or size for emphasis.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe accent on cards, callouts, or alerts. This is the side-stripe anti-pattern. Rewrite with a full border, a background tint, or a leading icon.
- **Don't** use AI-hype aesthetics: neon on dark, particle effects, animated gradient backgrounds, "Powered by AI" badges, the purple-to-pink gradient palette associated with ChatGPT / Midjourney / Perplexity. The AI is Hygia's infrastructure, not its identity.
- **Don't** use consumer-wellness softness: pastel palettes, rounded-everything layouts, Calm/Headspace-adjacent softness. Hygia is used during acute care. "Relaxing" is the wrong register.
- **Don't** add nested cards. A card inside a card collapses the elevation system and makes the interface feel cluttered. If content needs grouping inside a card, use a section divider or a background fill, never another card.
- **Don't** add glassmorphism (blur + semi-transparent cards) as decoration. The top navigation uses `backdrop-filter` structurally to maintain readable contrast while sticky. That is the only sanctioned use of blur in the system.
- **Don't** use `#000000` or `#ffffff` as the base page or body text color. Near-black `#161a1d` and warm parchment `#f6f5f1` are the floor and ceiling. Pure black/white signals generic and destroys the notebook warmth.
- **Don't** animate layout properties (width, height, top, left, margin, padding). Animate only transform and opacity.
