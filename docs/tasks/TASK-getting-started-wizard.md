---
name: getting-started-wizard
description: Extract the onboarding wizard from the dashboard into a standalone full-screen route at /getting-started, outside the (app) layout so no sidebar is shown.
status: completed
---

# TASK: Getting Started Wizard

## Motivation

The onboarding wizard (4-step flow: age, income target, strategy selection, strategy configurator) currently lives inside the dashboard page component. This is awkward because:
- The wizard isn't part of the dashboard; it's a one-time setup flow
- Users see the sidebar during onboarding even though they can't meaningfully use other pages yet
- The dashboard component is bloated with wizard detection logic

## What Changed

### New route group: `(onboarding)`
- Created `apps/web/src/app/(onboarding)/layout.tsx`: full-screen centered layout with no sidebar (similar to auth layout but styled for the wizard)
- Created `apps/web/src/app/(onboarding)/getting-started/page.tsx`: thin wrapper that loads user data, checks if onboarding is needed, renders OnboardingWizard, and redirects to /dashboard on completion

### Updated OnboardingWizard component
- Changed `onComplete` callback to no longer require returning data to a parent: on completion, the wizard calls `router.push("/dashboard")` to redirect
- The wizard is now self-contained: it loads its own user data if needed, saves via API, and redirects

### Updated dashboard page
- Removed `OnboardingWizard` import and rendering
- Removed `needsOnboarding` detection logic
- Dashboard now only handles the post-onboarding view (summary + edit form)
- If user arrives at dashboard without having completed onboarding, they get redirected to /getting-started

### Updated middleware
- No changes needed: /getting-started is a protected route (requires auth), which the existing middleware handles correctly

## Implementation Steps

1. Create `(onboarding)` route group with its own layout (no sidebar, full-screen)
2. Create `/getting-started` page that wraps OnboardingWizard
3. Update OnboardingWizard to redirect on completion instead of calling onComplete with data
4. Strip onboarding logic from dashboard, add redirect for unconfigured users
5. Type-check and validate

## Test Steps

1. Reset DB (`npm run db:reset`) and create a fresh user via sign-up
2. After sign-in, user should be redirected to `/getting-started` (full screen, no sidebar)
3. Complete all 4 wizard steps
4. After completion, user lands on `/dashboard` with summary card and chart
5. Revisiting `/getting-started` after completing onboarding should redirect back to `/dashboard`
6. Existing users with completed onboarding should go straight to `/dashboard` as before
