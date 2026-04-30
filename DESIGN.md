# Design System - Frametale

## Product Context
- **What this is:** Frametale is a story-to-visual-IP production studio. It turns a novel seed into a reusable world, then into characters, clues, storyboards, assets, and short-form video output.
- **Who it is for:** There are two primary users. Creators move a story from idea to production. Operators manage providers, models, accounts, costs, and system health.
- **Space / industry:** AI-assisted narrative production, novel-to-video tooling, creator workflow software.
- **Project type:** Light-first editorial web app with public landing/auth surfaces, creator workspaces, and an admin console.

## Design Thesis
- **Core thesis:** This product should feel like a narrative studio, not a cloud dashboard.
- **Primary promise:** The first thing users understand is the production pipeline, not model plumbing.
- **Mental-model split:** Creator surfaces should feel guided and confident. Admin surfaces should feel precise, denser, and more operational, while still belonging to the same brand world.

## Aesthetic Direction
- **Direction:** Narrative Studio / Editorial Light Utility
- **Decoration level:** intentional
- **Mood:** calm, credible, airy, and slightly editorial. Public pages should feel like a brand booklet with production intent. Creator pages should feel like a studio desk under daylight. Admin pages should feel operational, but still belong to the same lighter Frametale world.
- **Reference basis:** This pass is based on the current codebase, existing Frametale product framing, and current screenshots. No external competitive research was used in this iteration.

### Safe Choices
- **Light editorial shell:** The brand reads more distinctive and more trustworthy on pale paper-like surfaces than on a generic dark SaaS shell.
- **Creator / admin split:** These users have different goals. Separate mental models are not a polish pass; they are core product structure.
- **Restrained accent strategy:** Accent color should signal progress and focus. Success, warning, and error states should stay strictly semantic.

### Deliberate Risks
- **Editorial display typography:** Public and key creator moments should feel more like a real narrative brand and less like a generic SaaS starter.
- **Warm metal accent inside a cool system:** A small amount of amber-gold warmth helps shift the product from "tooling" toward "studio."
- **Asymmetric public composition:** Public pages should avoid symmetrical SaaS-template hero layouts. Story on the left and action on the right is more memorable and more brand-specific.
- **Code-native logo system:** The brand mark should be rendered consistently from SVG or component code, not mixed bitmap variants.

## Information Architecture
- **Public:** `/`, `/login`, `/register`, `/verify-email`, `/forgot-password`
- **Creator app:** `/app/projects`, `/app/novel-workbench`, `/app/projects/:projectName`, `/app/projects/:projectName/settings`, `/app/account`
- **Admin console:** `/app/admin?section=agent|providers|media|usage|api-keys`

### IA Rules
- **Post-login home:** `/app/projects` is the default creator landing page.
- **Novel Workbench:** This is a creator entry flow, not an advanced settings page.
- **Admin console:** Keep it denser, more structured, and less cinematic than creator surfaces.
- **Trust-critical surfaces:** Home, auth, email verification, long-running jobs, and destructive actions must feel calm, explicit, and legitimate.

## Typography
- **Display / hero:** `Manrope`
  Why: it keeps the wordmark and major headlines compact, friendly, and editorial without drifting into startup-template typography.
- **Body / UI:** `Inter`
  Why: it gives the product denser operational readability once the overall layout and brand tokens carry the distinctiveness.
- **CJK companion:** `Noto Sans SC`
  Why: stable coverage for Chinese UI text without changing the overall tone.
- **Data / tables:** `Manrope` with `font-variant-numeric: tabular-nums`
- **Code / logs / IDs:** `IBM Plex Mono`
- **Loading strategy:** Self-host when possible. Otherwise use preconnect plus `font-display: swap`.
- **Do not use as primary UI fonts:** `Inter`, `Avenir Next`, `Trebuchet MS`, `Roboto`, `Arial`

### Type Scale
- `display-2xl`: 72 / 80 / 700
- `display-xl`: 60 / 68 / 700
- `h1`: 44 / 52 / 700
- `h2`: 32 / 40 / 700
- `h3`: 24 / 32 / 600
- `title`: 20 / 28 / 600
- `body-lg`: 18 / 30 / 500
- `body`: 16 / 26 / 500
- `body-sm`: 14 / 22 / 500
- `caption`: 12 / 18 / 500
- `micro`: 11 / 16 / 600

### Type Rules
- Do not mix legacy font stacks across the app.
- Use letterspacing only for uppercase micro-labels.
- Enable tabular numerals on cost, stats, phase counts, and any columnar numbers.
- Keep long-form text around `66ch` when possible.

## Color
- **Approach:** pale editorial surfaces, restrained blue brand signal, warm amber secondary warmth
- **Primary:** `#1897D6` - trust, forward motion, creator entry actions, brand mark
- **Secondary:** `#26ABE8` - hover, emphasis, public CTA lift
- **Accent metal:** `#D8A55A` - editorial warmth, trust callouts, empty-state warmth, diagnostics framing
- **Semantic success:** `#2BCB90`
- **Semantic warning:** `#E2A446`
- **Semantic error:** `#F06C82`
- **Semantic info:** `#62B6FF`

### Neutrals
- `#FBFCFF` canvas
- `#F4F7FB` surface
- `#ECF1F7` surface-raised
- `#0F1B37` text-high
- `#49566F` text
- `#7A8598` text-muted
- `#A4ADBC` text-faint
- `rgba(117,132,159,0.18)` line-soft
- `rgba(24,151,214,0.22)` line-strong

### Color Rules
- Public CTA defaults to Frametale blue. Secondary emphasis may move slightly brighter blue, but not into purple.
- Amber is for diagnostics, guided warnings, and warmth. It is not the default main button color.
- Rose is only for blocked or destructive states.
- Large backgrounds should feel like paper, fogged glass, and subtle editorial lighting. Avoid dark AI-cloud gradients.

### Suggested Tokens
- `--sf-bg: #FBFCFF`
- `--sf-surface: rgba(255,255,255,0.88)`
- `--sf-surface-raised: rgba(248,250,253,0.96)`
- `--sf-surface-glass: rgba(255,255,255,0.82)`
- `--sf-line-subtle: rgba(117,132,159,0.18)`
- `--sf-line-strong: rgba(24,151,214,0.22)`
- `--sf-text: #0F1B37`
- `--sf-text-muted: #49566F`
- `--sf-text-faint: #7A8598`
- `--sf-primary: #1897D6`
- `--sf-secondary: #26ABE8`
- `--sf-accent-metal: #D8A55A`
- `--sf-success: #2BCB90`
- `--sf-warning: #E2A446`
- `--sf-error: #F06C82`

## Spacing
- **Base unit:** 4px
- **Density:** comfortable-compact
- **Scale:** `2, 4, 8, 12, 16, 24, 32, 48, 64, 96`

### Spacing Rules
- Use `24` and `32` as the default panel padding sizes.
- Keep horizontal action groups on `8` or `12` spacing only.
- Separate label, title, description, and action layers with clear rhythm instead of making every section feel equally weighted.

## Layout
- **Approach:** hybrid
- **Grid:** public `12 / 6 / 4`, creator app `12`, admin `12`
- **Max widths:** public `1280px`, creator hub `1360px`, workspace shell can stretch to `1440px`
- **Radius scale:** `10px`, `14px`, `20px`, `28px`, `999px`

### Layout Rules
- Public shell uses a story stage plus action card composition, not a centered generic SaaS block.
- Projects hub leads with "what to do next" and only then shows tools and project inventory.
- Novel Workbench keeps new-job creation as the first visual layer. Runtime history and diagnostics are second-layer information.
- Workspace keeps a stable three-track model: navigation rail, main canvas, assistant rail. None of them should collapse into decorative width.
- Admin pages should not use cinematic oversized hero treatments.

## Motion
- **Approach:** intentional
- **Enter easing:** `cubic-bezier(0.22, 1, 0.36, 1)`
- **Exit easing:** `cubic-bezier(0.4, 0, 1, 1)`
- **Move easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)`
- **Duration:** micro `90ms`, short `160-200ms`, medium `240-320ms`, long `420-560ms`

### Motion Rules
- Motion exists to clarify state: drawer open/close, hover lift, toast entry, progress movement, panel swaps.
- Animate `opacity`, `transform`, and sometimes `filter`. Avoid `transition: all`.
- Atmospheric motion is allowed only on public backgrounds and must stay subtle.
- Hover lift stays within `-2px`. Scale stays within `1.015`.
- Respect `prefers-reduced-motion` globally.

## Surface Patterns

### Public / Auth
- Public pages should feel like a brand cover, with fewer buttons and a stronger headline.
- Login, register, forgot-password, and verification share one shell.
- Public cards may use larger radius and glassier surfaces than admin pages, but keep depth to two layers.

### Creator Hub
- `/app/projects` is the creator home, not a system control board.
- The top section explains the next meaningful action.
- Project cards foreground stage, asset coverage, and next step rather than acting as generic thumbnail tiles.
- Treat the page as a command deck: one dominant launch panel, one compact studio pulse rail, then the project library.
- Project cards should read like production dossiers. Keep the cover/media area subordinate to progress, asset coverage, episode output, and the next action.
- Avoid three narrow project-card columns on desktop; wider two-column cards preserve story context and reduce dashboard fragmentation.

### Novel Workbench
- The first screen must answer what this page does, what the user needs to fill in, and where they go after success.
- Diagnostics belong in a lower-priority disclosure area.
- Job history should read like a production record, not a backend dump.
- Treat the page as a production desk: status strip first, launch form and writing partner side-by-side, then active run or history records below.
- The seed form and writing assistant should feel connected. Use shared surfaces and lighting rather than two unrelated cards.
- Running jobs stay in the active work area. Completed or terminal jobs move into the production record/history layer.

### Workspace
- The header must clearly hold brand, project, phase, and high-value actions.
- When the assistant rail opens, the main canvas must remain comfortably usable.
- Sidebar grouping stays stable and functional. Decorative icon noise is not allowed.

### Admin Console
- Higher density, stronger grouping, fewer brand theatrics.
- Headings, helper text, and errors should be more systematic than expressive.

## Component Rules

### Buttons
- Each region gets one obvious primary action.
- Primary: filled. Secondary: tinted or outlined. Danger: rose only.
- Public pages and creator entry flows use Frametale blue for primary. Do not reintroduce indigo as a co-primary without a product reason.

### Cards
- Every card needs one dominant signal: phase, asset coverage, next step, status, or hero media.
- Avoid stacking multiple equal-weight stat boxes unless one layer is clearly subordinate.

### Forms
- Labels stay visible.
- Helper text explains consequence, not implementation detail.
- Inputs target `44-48px` height and `44x44` minimum touch area.

### Empty States
- Every empty state includes what the area is for, what to do next, and one primary action.
- A secondary expert path is allowed, but only after the main path.
- Never ship `No items found.` as a complete empty state.

## Accessibility Rules
- Minimum interactive target: `44x44`
- All buttons, cards, tabs, menus, and dismiss controls need visible `focus-visible`
- Color is never the only status signal
- Body contrast must meet AA on pale surfaces and tinted panels
- Long-running status and toasts should use `aria-live`

## Anti-Slop Rules
- No blue-purple default brand gradients
- No generic 3-card feature grid with icon circles
- No centering everything by default
- No uniform bubbly radius on every element
- No emoji as a primary navigation or product action icon
- No vague `AI-powered` or `all-in-one solution` marketing copy

## Immediate Design Priorities
1. Keep the new Frametale spark logo and wordmark consistent across public, creator, and admin surfaces.
2. Make every entry surface feel lighter, more editorial, and less like a generic dark AI console.
3. Keep `/app/projects` as the creator home and `/app/novel-workbench` as the focused narrative intake surface.
4. Use one visual system for admin, account, project settings, and workspace internals instead of treating them as separate mini-products.
5. Let global design tokens absorb legacy dark components until each deep canvas is fully rewritten.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-21 | Rebuilt Frametale design-system baseline | Replaced the older concept-only document with implementation-ready typography, color, layout, and motion guidance |
| 2026-04-21 | Kept the dark-first studio direction | The product has to hold media, long text, logs, timelines, and creator state at the same time |
| 2026-04-21 | Strengthened the creator/admin split | Creation and system configuration are different mental models and should diverge in IA and visual density |
| 2026-04-29 | Redesigned creator home and novel workbench as connected studio surfaces | The screenshots showed fragmented equal-weight cards; the new rule is command deck first, production records second |
