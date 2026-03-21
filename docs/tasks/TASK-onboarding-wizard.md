---
name: onboarding-wizard
description: Multi-step Getting Started wizard replacing the old inline onboarding card and retirement target configurator for new users.
status: completed
---

# TASK: Getting Started Onboarding Wizard

## Description

Replace the existing inline onboarding card + retirement target configurator on the dashboard with a multi-step "Getting Started" wizard. The wizard guides new users through age entry, retirement income planning (with optional expense calculator), and a final summary, all with rich real-time feedback and visual elements.

## Motivation

The current dashboard onboarding is a flat, form-heavy experience that dumps birthday and retirement target fields on the same page. Users need a guided, step-by-step flow that:
- Feels less overwhelming
- Provides real-time visual feedback as they enter data
- Uses smart defaults and pre-filled values where possible
- Explains concepts with tooltips and guidance text
- Breaks up text inputs with visual elements (sliders, progress bars, charts)

## Critical Decisions

1. The wizard replaces the existing onboarding card AND the retirement target configurator into a unified multi-step flow.
2. The wizard shows ONLY when the user needs onboarding (no dateOfBirth or retirementAge) AND has no retirement target.
3. Once completed, the wizard saves to the same API endpoints (PATCH /api/users/me for age, PUT /api/retirement-target for target).
4. Three steps: (1) Age & Retirement Age, (2) Retirement Income Target, (3) Summary.
5. Data persists across steps in local state; only saved to DB on final step completion.
6. The existing "edit" flow for retirement target remains but is separate from the wizard.

## Implementation Plan

### Step 1: Age & Retirement Age Page
- **Year picker**: Scrollable/dropdown year selector (pre-fill ~30 years ago), then month dropdown, then day dropdown
- **Retirement age**: Default to 65, editable with a slider + numeric input
- **Live sidebar**: Shows current age calculated from birthday, years remaining, a visual "life timeline" progress bar
- **Guidance text**: "We use your age to calculate how long you have to reach your financial goals"

### Step 2: Retirement Income Target
- **Two modes** (card selector):
  - **"I already have a number"**: Direct dollar input for total retirement target
  - **"Help me figure it out"** (default selected): Enter desired annual retirement spending
- **Help me figure it out flow**:
  - Annual income input (in today's dollars) with guidance that this can be changed later
  - Expandable "Calculate from monthly expenses" section:
    - Pre-filled categories: Housing/Mortgage, Transportation, Healthcare, Groceries, Utilities, Insurance, Entertainment
    - Each has a name + dollar value
    - Can add/remove categories
    - Auto-sums to monthly total, then yearly total
    - Apply inflation rate to show future value
  - Inflation rate: Pre-filled at 3%, editable
  - Safe withdrawal rate: Pre-filled at 4%, with InfoTooltip
  - Expected annual return: Pre-filled at 7%, with InfoTooltip
- **Live calculations panel**:
  - Shows: portfolio target (today + inflation-adjusted), years remaining, monthly savings needed, annual savings needed
  - All values in today's dollars AND future dollars
  - Disclaimer: "These are estimates based on historical averages. Rough numbers are fine, you can refine later."

### Step 3: Summary
- At-a-glance summary of all entered information
- Visual chart: simple bar/area chart showing projected savings growth over years
- Key metrics: age range, total target, monthly savings, annual savings
- Clear messaging: "These are starting estimates to guide your financial planning. You can come back and adjust these anytime."
- "Get Started" button to save everything and dismiss the wizard

### Phase 1: Refactor dashboard page
- Extract wizard into a self-contained `OnboardingWizard` component
- Keep existing saved-target summary and edit flow intact
- Wire wizard completion to existing APIs

### Phase 2: Build Step 1 (Age)
- Year/month/day cascading selectors
- Retirement age slider + input
- Live calculations sidebar

### Phase 3: Build Step 2 (Income Target)
- Mode selector cards
- Annual income input with inflation preview
- Expandable monthly expense calculator
- Financial parameter inputs (inflation, withdrawal rate, return rate)
- Live calculations panel

### Phase 4: Build Step 3 (Summary)
- Summary tiles
- Progress chart
- Save and complete

## Test Steps

1. Clear user data: `date_of_birth = NULL`, `retirement_age = NULL`, delete `retirement_targets` for household
2. Log in as dev user, navigate to /dashboard
3. Wizard should appear with Step 1 (Age)
4. Select birth year, month, day; verify age calculates live
5. Adjust retirement age slider; verify years remaining updates
6. Click Next, verify Step 2 appears
7. "Help me figure it out" should be selected by default
8. Enter annual income; verify inflation-adjusted amount shows live
9. Expand "Calculate from expenses"; add a few items; verify auto-sum works
10. Toggle to "I already have a number"; enter a fixed amount; verify calculations update
11. Click Next, verify Summary shows all entered data with chart
12. Click "Get Started"; verify data saves to DB and wizard dismisses
13. Refresh page; verify saved target summary card appears (not wizard)
14. Click Edit on saved target; verify edit flow works independently of wizard
