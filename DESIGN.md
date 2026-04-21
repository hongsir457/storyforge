# Design System - Storyforge

## Product Context
- **What this is:** Storyforge is a story-to-visual-IP production studio. It turns a novel seed into a reusable world, then into characters, clues, storyboards, assets, and short-form video output.
- **Who it is for:** There are two primary users. Creators move a story from idea to production. Operators manage providers, models, accounts, costs, and system health.
- **Space / industry:** AI-assisted narrative production, novel-to-video tooling, creator workflow software.
- **Project type:** Dark-first web app with public landing/auth surfaces, creator workspaces, and an admin console.

## Design Thesis
- **Core thesis:** This product should feel like a narrative studio, not a cloud dashboard.
- **Primary promise:** The first thing users understand is the production pipeline, not model plumbing.
- **Mental-model split:** Creator surfaces should feel guided and confident. Admin surfaces should feel precise, denser, and more operational, while still belonging to the same brand world.

## Aesthetic Direction
- **Direction:** Narrative Studio / Cinematic Editorial Utility
- **Decoration level:** intentional
- **Mood:** calm, credible, dark, and slightly editorial. Public pages should feel like a title sequence or brand booklet. Creator pages should feel like a studio desk. Admin pages should feel like a control rack, not a marketing site.
- **Reference basis:** This pass is based on the current codebase, existing Storyforge product framing, and current screenshots. No external competitive research was used in this iteration.

### Safe Choices
- **Dark-first studio shell:** The product has to hold images, video, timelines, logs, and long text. A dark shell gives media and state colors room to breathe.
- **Creator / admin split:** These users have different goals. Separate mental models are not a polish pass; they are core product structure.
- **Restrained accent strategy:** Accent color should signal progress and focus. Success, warning, and error states should stay strictly semantic.

### Deliberate Risks
- **Editorial display typography:** Public and key creator moments should feel more like a real narrative brand and less like a generic SaaS starter.
- **Warm metal accent inside a cool system:** A small amount of amber-gold warmth helps shift the product from "tooling" toward "studio."
- **Asymmetric public composition:** Public pages should avoid symmetrical SaaS-template hero layouts. Story on the left and action on the right is more memorable and more brand-specific.

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
- **Display / hero:** `Space Grotesk`
  Why: strong structure, modern but not generic, better brand character than `Inter`.
- **Body / UI:** `Manrope`
  Why: good small-size readability on dark surfaces and less template-feeling than the default SaaS stack.
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
- **Approach:** balanced, dark-first, restrained public glow plus denser studio surfaces
- **Primary:** `#38A8F5` - trust, forward motion, public CTA, creator entry actions
- **Secondary:** `#5B5CE6` - active selection, in-studio actions, focused workflow state
- **Accent metal:** `#D8A55A` - editorial warmth, trust callouts, empty-state warmth, diagnostics framing
- **Semantic success:** `#2BCB90`
- **Semantic warning:** `#E2A446`
- **Semantic error:** `#F06C82`
- **Semantic info:** `#62B6FF`

### Neutrals
- `#F7F8FB` text-high
- `#D9DFE8` text
- `#9AA5B5` text-muted
- `#657184` text-faint
- `#273247` line-strong
- `#1A2334` surface-raised
- `#101826` surface
- `#060B14` canvas

### Color Rules
- Public CTA defaults to sky. In-studio active and generate actions default to indigo. Do not use both as equal co-primary colors inside the same region.
- Amber is for diagnostics, guided warnings, and warmth. It is not the default main button color.
- Rose is only for blocked or destructive states.
- Large backgrounds should be deep ink and subtle atmospheric light, not blue-purple AI gradients.

### Suggested Tokens
- `--sf-canvas: #060B14`
- `--sf-surface: #101826`
- `--sf-surface-raised: #1A2334`
- `--sf-surface-glass: rgba(18, 25, 38, 0.76)`
- `--sf-line-subtle: rgba(154, 165, 181, 0.12)`
- `--sf-line-strong: rgba(154, 165, 181, 0.24)`
- `--sf-text: #D9DFE8`
- `--sf-text-muted: #9AA5B5`
- `--sf-text-faint: #657184`
- `--sf-primary: #38A8F5`
- `--sf-secondary: #5B5CE6`
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

### Novel Workbench
- The first screen must answer what this page does, what the user needs to fill in, and where they go after success.
- Diagnostics belong in a lower-priority disclosure area.
- Job history should read like a production record, not a backend dump.

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
- Public pages may use sky for primary. Studio actions prefer indigo.

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
- Body contrast must meet AA on dark surfaces
- Long-running status and toasts should use `aria-live`

## Anti-Slop Rules
- No blue-purple default brand gradients
- No generic 3-card feature grid with icon circles
- No centering everything by default
- No uniform bubbly radius on every element
- No emoji as a primary navigation or product action icon
- No vague `AI-powered` or `all-in-one solution` marketing copy

## Immediate Design Priorities
1. Unify the font stack and remove `Inter`, `Avenir Next`, and `Trebuchet MS` drift.
2. Make public pages feel more story-led and less template-led.
3. Turn `/app/projects` into a true creator home instead of a tool cluster.
4. Tighten the workspace header and rail hierarchy so phase, project, and actions read clearly.
5. Land design tokens into CSS variables and utility patterns.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-21 | Rebuilt Storyforge design-system baseline | Replaced the older concept-only document with implementation-ready typography, color, layout, and motion guidance |
| 2026-04-21 | Kept the dark-first studio direction | The product has to hold media, long text, logs, timelines, and creator state at the same time |
| 2026-04-21 | Strengthened the creator/admin split | Creation and system configuration are different mental models and should diverge in IA and visual density |
