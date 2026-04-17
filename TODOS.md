# TODOS.md

## P0

- [ ] Split `/app/settings` into an admin-only console.
  Why: provider, usage, API key, and agent controls do not belong in the normal creator navigation.
  Outcome: ordinary users stay in a clean creative flow; operators get a clear utility surface.

- [ ] Redesign `Novel Workbench` as a creator-first guided flow.
  Why: the current page still exposes too much runtime and diagnostics language above the actual "start a novel" action.
  Outcome: a user can understand what to do, what is happening, and what comes next without reading system internals.

- [ ] Replace the projects empty state with a two-path starter experience.
  Why: `0 projects` is a product moment, not a blank dashboard.
  Outcome: new users can either create a video project directly or start from a novel seed with confidence.

## P1

- [ ] Introduce frontend design tokens for type, radius, surface, and shadow.
  Why: the UI already has a visual direction, but it is not yet a system.
  Outcome: new screens stop drifting and existing screens become easier to polish consistently.

- [ ] Separate creator-facing copy from admin-facing copy across settings and job flows.
  Why: operational language currently leaks into creative surfaces.
  Outcome: creators see guidance; admins see diagnostics.

- [ ] Define mobile-specific layouts for projects, novel workbench, and project workspace.
  Why: current responsiveness is implementation-led, not explicitly designed.
  Outcome: mobile does not feel like a compressed desktop shell.

## P2

- [ ] Rework project cards to foreground story progress over generic thumbnail-first presentation.
  Why: the product advantage is narrative continuity, not just media generation.
  Outcome: the project list becomes a story control room instead of a generic asset grid.

- [ ] Formalize trust-surface rules for auth pages, verification emails, reset flows, and delivery failures.
  Why: account flows are now functional but still need a fully unified trust language.
  Outcome: the product feels legitimate and consistent during sensitive account actions.
