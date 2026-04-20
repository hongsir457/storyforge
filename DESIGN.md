# DESIGN.md

## Product Frame

- External brand: `Storyforge / 叙影工场`
- External subtitle: `AI novel&video studio / 小说与视频自动生成工作台`
- Internal compatibility name: `autovideo`
- Product wedge: `小说 -> 分镜 -> 视频`

Storyforge is not a generic AI playground and not a generic video editor. It is a narrative production studio that turns a seed idea into a reusable story world, then into scenes, assets, and short-form video output.

The design must make that production line obvious on every major surface.

## Design Thesis

The product should feel like a narrative atelier, not a cloud dashboard.

Three rules:

1. The first thing users understand is the story pipeline, not the model plumbing.
2. Creator surfaces should feel guided and confident; operational surfaces should feel precise and contained.
3. Trust must be visible at the pixel level, especially in auth, settings, and job status flows.

## North Star Experience

Within 10 seconds, a new user should understand:

- this is for turning stories into visual IP
- there is a clear first step
- the product already knows what comes next after that first step

Within 5 minutes, an authenticated user should feel:

- I know where to start
- I can see the state of my story assets
- I am not managing infrastructure by accident

## Audience Split

There are two distinct users. The UI must stop mixing them.

### 1. Creator

Primary goals:

- create a project
- start from a seed or manuscript
- inspect assets, story state, and progress
- continue into storyboard and video production

### 2. Operator / Admin

Primary goals:

- configure providers
- manage agent settings
- inspect usage and cost
- debug delivery or model issues

Rule: creator navigation and admin navigation must not share the same top-level mental model.

## Information Architecture

### Public

```text
/                      Brand promise + entry
/login                 Sign in
/register              Create account
/verify-email          Verify account
/forgot-password       Reset password
```

### Creator App

```text
/app/projects                   Home for signed-in creators
/app/novel-workbench            Start from seed and generate novel
/app/projects/:projectName      Single project workspace
/app/projects/:projectName/settings
/app/account                    Personal profile and security
```

### Admin

```text
/app/admin?section=agent
/app/admin?section=providers
/app/admin?section=media
/app/admin?section=usage
/app/admin?section=api-keys
```

### IA Rules

- `/app/projects` is the primary post-login landing page.
- `Novel Workbench` is a creator flow, not an admin tool.
- `SystemConfigPage` should conceptually become `Admin Console`.
- Project-level media settings belong inside a project, never in the novel creation entry.
- Global provider and model configuration must be admin-only.

## Page Intent

### Home

Purpose:

- explain the product in one sentence
- establish brand tone
- route the user to sign in or create an account

Hierarchy:

1. brand promise
2. story pipeline
3. primary CTA
4. supporting trust signals

The home page should sell the transformation, not the list of AI capabilities.

Preferred framing:

- headline: story-to-visual-IP transformation
- body: world, character, chapter, storyboard, asset continuity
- support cards: three concrete production promises, not generic feature marketing

### Auth Pages

Purpose:

- reduce anxiety
- explain exactly what happens next
- preserve brand trust

Rules:

- every auth page uses the same shell and same tonal center
- error messages must be plain, direct, and non-technical
- email verification and password reset must feel like account safety, not system plumbing

### Projects Page

Purpose:

- act as the creator home
- show owned work only
- make the next action obvious

Hierarchy:

1. page identity
2. create / import / enter novel workbench
3. project cards
4. secondary account and settings actions

Rules:

- project cards should foreground story progress, not only thumbnail aesthetics
- the empty state is a product feature and must offer a warm start
- account name and logout are utilities, not primary navigation

### Novel Workbench

Purpose:

- start the novel-generation pipeline from a seed
- help the user understand progress and outcomes

Hierarchy:

1. what this page does
2. create-new-job form
3. current / recent jobs
4. diagnostics, only when needed

Rules:

- default view must prioritize creation, not environment inspection
- operational details such as workspace, git, uv, and env source belong in a collapsible diagnostics area
- job records must read like a guided production log, not raw backend output
- when a job is running, show current phase, recent meaningful events, and expected next milestone

### Project Workspace

Purpose:

- make a single project feel like a living story system

Hierarchy should be story-first:

1. current production phase
2. characters / clues / scripts / shots
3. asset actions
4. deep utilities

### Project Settings

Purpose:

- hold project-specific media defaults

Rules:

- this is where aspect ratio, generation mode, and default clip duration belong
- settings copy should explain why a creator would change something, not just what the field is called

### Admin Console

Purpose:

- hold global operational configuration

Rules:

- visually distinct from creator surfaces
- more compact, more utility-focused, less cinematic
- only accessible to admins

## Visual System

### Tone

- dark studio environment
- high-contrast, restrained color accents
- strong surfaces with soft glow, not neon overload

### Color Roles

- `sky`: primary trust and forward motion
- `indigo`: studio actions and active selection
- `emerald`: success and healthy completion
- `amber`: caution, pending work, diagnostics
- `rose`: destructive or blocked states
- `gray/slate`: utility surfaces and quiet scaffolding

Rule: one surface should not mix `sky` and `indigo` as equal competing primaries.

### Typography

Recommended pairing:

- display Latin: `Space Grotesk`
- body Latin: `Manrope`
- CJK UI/body: `Noto Sans SC`

If implementation complexity is a concern, unify on `Noto Sans SC` for CJK and `Manrope` for Latin body, while preserving a stronger display face for hero headlines.

### Radius

- input/button small: `12px`
- card/dialog: `16px`
- hero/public shell: `32px`

### Shadow

- public pages: deeper atmospheric shadows
- app surfaces: tighter, more structural shadows
- modals: strongest elevation in the system

### Iconography

- use line icons for system actions
- avoid mixing cute emoji, dense icons, and brand marks in the same header cluster

## Component Rules

### Buttons

- primary: filled, decisive, one per area
- secondary: outlined or tinted
- destructive: always rose, never primary position by default

Each region gets one obvious primary button. If two buttons look primary, hierarchy is broken.

### Cards

- cards must have a dominant data point
- avoid generic equal-weight metadata stacks
- card footer actions are secondary utilities, not the headline

### Forms

- labels always visible
- helper text explains consequence, not implementation detail
- inline errors appear near the field or submit action, never hidden elsewhere

### Empty States

Every empty state must include:

1. what this area is for
2. what to do next
3. one primary action

Optional:

- one secondary path for experienced users

Never ship `No items found.` as the entire state.

## Interaction State Matrix

```text
Feature            | Loading                     | Empty                                       | Error                                           | Success                                 | Partial
------------------ | --------------------------- | ------------------------------------------- | ----------------------------------------------- | --------------------------------------- | ---------------------------------------
Home               | n/a                         | n/a                                         | graceful fallback copy                          | CTA available                           | n/a
Login              | button spinner              | n/a                                         | plain-language auth error                       | redirect to /app/projects               | unverified email prompt
Register           | button spinner              | n/a                                         | delivery/auth validation message                | verification sent / pending             | verification created but delivery failed
Projects           | skeleton or centered loader | warm starter state with create + workbench  | import/delete failure toast + recover path      | project list visible                    | partial asset/progress summaries
Novel Workbench    | page loader / polling state | explain pipeline + start form               | job failure with stage and next action          | import completed and open-project CTA   | running with phase + live milestone
Project Workspace  | project detail loader       | no assets yet with next recommended action  | asset-level failure with retry affordance       | new asset/script/video available        | some assets generated, some pending
Project Settings   | form skeleton               | n/a                                         | save error inline + toast                       | saved confirmation                      | unsupported inherited defaults
Admin Console      | section skeleton            | explain missing providers/config            | provider validation error with exact section    | saved status + config health recovered  | some providers healthy, some missing
```

## Responsive Rules

### Mobile

- public shell collapses to a strong single-column narrative
- project header actions wrap into a second row
- novel workbench becomes stacked sections: create, jobs, details
- avoid side-by-side diagnostics and logs on phones

### Tablet

- maintain two-column composition only if each column can preserve hierarchy
- prefer stacked logs/detail panels over cramped split panes

### Desktop

- preserve cinematic breathing room
- use wide layouts to separate creation from inspection

Responsive is not "stack everything." Each breakpoint must preserve hierarchy.

## Accessibility Rules

- minimum interactive touch target: `44x44`
- visible focus state on all buttons, cards, menus, tabs, and nav
- color is never the only status signal
- use `aria-live` for long-running job status changes
- destructive dialogs must have explicit labels and clear escape path
- maintain readable contrast on all tinted surfaces

## Trust Surfaces

Trust-critical surfaces:

- home hero
- login/register/verify/reset
- email templates
- long-running generation jobs
- deletion / cancellation flows

Rules:

- brand identity must be consistent between email and UI
- system messages must explain what happened, what it means, and what to do next
- do not expose infrastructure details unless the user is in an advanced or admin context

## Email Design

Email templates should feel transactional, calm, and obviously legitimate.

Required elements:

- brand mark / logo
- clear headline
- short explanation
- large verification code or clear action
- expiry note
- support guidance

Avoid:

- plain unstyled text only
- overly promotional copy
- inconsistent sender name and brand name

## Copy Rules

- creator-facing copy should use narrative language
- admin-facing copy should use operational language
- do not mix "provider setup" language into creator-first screens unless setup is blocking the action
- job stages should describe outcomes, not only internal process names

## What Not To Build

- a generic analytics dashboard as the creator home
- a settings-first product shell
- a cluttered multi-primary header
- a generic SaaS hero with vague "AI-powered" copy

## Immediate Design Priorities

1. Split creator IA from admin IA.
2. Turn `Novel Workbench` into a creator-first guided flow.
3. Upgrade project empty state into a warm start surface.
4. Formalize tokens and typography into implementation-ready frontend conventions.
5. Keep email/auth trust surfaces visually synchronized with the app.
