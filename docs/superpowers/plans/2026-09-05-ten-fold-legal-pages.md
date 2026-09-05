# Ten-Fold Legal Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish first-party Ten-Fold Terms of Service and Privacy Policy pages, and expose them in authentication and authenticated navigation.

**Architecture:** Add two public React Router routes backed by focused legal-page components that share a small layout. Keep policy text local to the web app so the pages work without API access. Update the shared account agreement component and workspace sidebar to link to same-origin routes.

**Tech Stack:** React, React Router route configuration, TypeScript, Tailwind CSS, Plane web application.

**Spec:** `docs/superpowers/specs/2026-09-05-ten-fold-legal-pages-design.md`

## Global Constraints

- Policies identify Kognitif AI Enterprise, Brunei Darussalam as the Ten-Fold operator.
- Policies identify `contact@kognitif.ai` as the contact address.
- Content must be original operational draft text, not copied from Plane.
- No authentication, workspace-permission, or API-contract changes.
- Public URLs are exactly `/terms` and `/privacy`.

---

## File structure

- Create `apps/web/core/components/legal/legal-page-layout.tsx`: shared public page shell and inter-policy navigation.
- Create `apps/web/core/components/legal/terms-of-service.tsx`: original terms content.
- Create `apps/web/core/components/legal/privacy-policy.tsx`: original privacy content.
- Create `apps/web/app/(home)/terms/page.tsx`: public terms route entry.
- Create `apps/web/app/(home)/privacy/page.tsx`: public privacy route entry.
- Modify `apps/web/app/routes/core.ts`: register `/terms` and `/privacy` under the public home layout.
- Modify `apps/web/core/components/account/terms-and-conditions.tsx`: use same-origin legal links.
- Modify `apps/web/app/(all)/[workspaceSlug]/(projects)/sidebar.tsx`: add authenticated Legal links.

### Task 1: Public legal pages and routing

**Files:**

- Create: `apps/web/core/components/legal/legal-page-layout.tsx`
- Create: `apps/web/core/components/legal/terms-of-service.tsx`
- Create: `apps/web/core/components/legal/privacy-policy.tsx`
- Create: `apps/web/app/(home)/terms/page.tsx`
- Create: `apps/web/app/(home)/privacy/page.tsx`
- Modify: `apps/web/app/routes/core.ts`

**Interfaces:**

- Produces `LegalPageLayout({ title, children })` for both policy components.
- Produces public routes `/terms` and `/privacy` rendered within the existing home layout.

- [ ] Add the routes beside the existing home index route: `route("terms", "./(home)/terms/page.tsx")` and `route("privacy", "./(home)/privacy/page.tsx")`.
- [ ] Run `pnpm --filter web typecheck`; expect a failure naming the missing route modules.
- [ ] Implement a semantic shared layout using `main`, `article`, `h1`, `h2`, effective date text, and a link to the other policy.
- [ ] Implement original Terms content covering service use, accounts/workspaces, acceptable use, customer content, availability, third parties, termination, disclaimers, liability, changes, and contact.
- [ ] Implement original Privacy content covering data categories, Google sign-in, DigitalOcean and Resend, security, retention, rights, changes, and contact.
- [ ] Implement thin modules that render `TermsOfService` and `PrivacyPolicy` respectively.
- [ ] Re-run `pnpm --filter web typecheck`; expect exit code 0.
- [ ] Commit the public-page files with message `feat: add Ten-Fold legal pages`.

### Task 2: Replace account links and add sidebar discovery

**Files:**

- Modify: `apps/web/core/components/account/terms-and-conditions.tsx`
- Modify: `apps/web/app/(all)/[workspaceSlug]/(projects)/sidebar.tsx`

**Interfaces:**

- Consumes `/terms` and `/privacy` from Task 1.
- Produces user-visible paths to both policies from sign-in/sign-up and the workspace sidebar.

- [ ] Run `rg -n "https://plane.so/legals/(terms-and-conditions|privacy-policy)" apps/web/core/components/account/terms-and-conditions.tsx`; expect two existing Plane-hosted links.
- [ ] Replace the shared agreement URLs with `termsOfService: "/terms"` and `privacyPolicy: "/privacy"`; retain the wording and new-tab behavior.
- [ ] Add a compact Legal section after the projects list using normal `/terms` and `/privacy` anchors, visible for every authenticated workspace member and independent of project permissions.
- [ ] Run `rg -n "plane.so/legals|/terms|/privacy" apps/web/core/components/account/terms-and-conditions.tsx 'apps/web/app/(all)/[workspaceSlug]/(projects)/sidebar.tsx'`; expect no Plane link and both local paths in both user surfaces.
- [ ] Run `pnpm exec oxfmt` on the touched TypeScript files and `pnpm --filter web typecheck`; expect both to succeed.
- [ ] Commit the integration with message `feat: link Ten-Fold legal policies`.

### Task 3: Production-oriented verification

**Files:** Verify only the files from Tasks 1 and 2.

**Interfaces:** Consumes the completed public routes and link integrations; produces build evidence for handoff.

- [ ] Run `pnpm --filter web build`; expect exit code 0 and emitted web assets.
- [ ] Run `rg -n "Kognitif AI Enterprise|contact@kognitif.ai|DigitalOcean|Resend|/terms|/privacy" apps/web/core/components/legal apps/web/core/components/account/terms-and-conditions.tsx 'apps/web/app/(all)/[workspaceSlug]/(projects)/sidebar.tsx'`; expect every required contact, provider, and route.
- [ ] Run `git status --short && git diff --check`; expect no whitespace errors and only legal-page work in addition to the user’s pre-existing changes.

## Self-review

- Spec coverage: Task 1 implements the public pages; Task 2 replaces auth links and adds sidebar discovery; Task 3 provides build and scope verification.
- Placeholder scan: all paths, content sections, commands, and verification checks are explicit.
- Type consistency: route modules consume the component names defined in Task 1, and Task 2 consumes the exact `/terms` and `/privacy` paths from Task 1.
