# Personal Finance Guidance App - Product Brainstorm

---

## The Problem

Most personal finance tools fall into two camps: lightweight trackers that show you what already happened, or complex budgeting systems that demand daily maintenance. Users who care about long-term wealth building, debt payoff, and financial freedom are underserved. They don't need to categorize every coffee purchase. They need a high-level command center that answers one question: **Am I on track?**

### Pain Points in the Current Market

- **YNAB is powerful but exhausting.** Users report a 2-3 month learning curve and describe the daily maintenance as a second job. Credit card handling is universally confusing. At $14.99/month, many feel the cost is hard to justify for something they dread opening.
- **Mint/Empower focus on what already happened.** Backward-looking transaction tracking doesn't help someone who wants to model their future.
- **Monarch Money is close but still transaction-heavy.** Great UI, but still fundamentally a budgeting app with net worth tacked on.
- **ProjectionLab is the best at forward modeling** but has no check-in or tracking workflow. It's a simulator, not a living dashboard.
- **Spreadsheets work until they don't.** People build elaborate Google Sheets, then stop opening them. There's no guidance, no nudges, no structure.

### What's Missing

A tool that sits between a budgeting app and a financial planner. Something you check in with periodically (not daily), that helps you see if your wealth is growing according to plan, tells you when to course-correct, and makes the whole process feel calm and approachable rather than stressful.

---

## Product Vision

**A periodic check-in platform for your financial life.** Not a budgeting app. Not a transaction tracker. A guidance system that helps you build wealth, pay off debt, and stay on course toward financial freedom, with an AI companion that can answer questions, run projections, and coach you along the way.

### Core Philosophy

1. **Check-in, don't check constantly.** This is a quarterly/monthly review tool, not a daily habit.
2. **Forward-looking, not backward-looking.** Focus on projections, plans, and goals rather than past transactions.
3. **Guided, not overwhelming.** TurboTax-style walkthroughs. The app tells you what to do next.
4. **Manual by design.** No account linking. Users enter data themselves. This is a feature, not a limitation: it builds awareness and keeps things simple and private.
5. **AI-native.** The AI companion isn't bolted on. It's the primary way users interact with their data.

---

## Name Ideas


### Product Names

This table has older names we considered, but we ultimately went with "SearchBundle", Since we already own searchbundle.io and it captures the essence of the product: a bundle of tools and insights that you can search through to understand your financial picture.

| Name | Vibe | Notes |
|------|------|-------|
| **Bearing** | Nautical navigation. "Get your bearing." | Clean, calm, implies direction and orientation. |
| **Waypoint** | Checkpoints on a journey | Matches the periodic check-in model perfectly. |
| **Northward** | Always moving in the right direction | Aspirational, clean, implies steady progress. |
| **Steadfast** | Reliability, consistency | Feels grounded and trustworthy. |
| **Trailhead** | Starting point for a journey | Great for onboarding energy, less so for ongoing use. |
| **Clearview** | Clarity and visibility | Simple, descriptive, approachable. |
| **Meridian** | A line of longitude, a high point | Sophisticated, geographic, implies measurement and peak. |
| **Basecamp** | Home base for your financial journey | Warm, familiar, implies safety and preparation. |
| **Lighthouse** | Guiding light through complexity | Strong metaphor, slightly overused. |
| **Crest** | The peak, the top of a wave | Short, punchy, aspirational. |

### AI Companion Names

These are recommended names from Claude, but I'm going with "Cooper" from Interstellar because Cooper has been to the future and knows what the past self should do.

| Name | Personality | Notes |
|------|-------------|-------|
| **Atlas** | Knowledgeable guide, carries the weight | Strong, mythological, implies support and navigation. |
| **Sage** | Wise, calm advisor | Approachable, gender-neutral, implies wisdom without arrogance. |
| **Compass** | Directional, always pointing the right way | On-brand with navigation theme. |
| **Beacon** | Guiding light | Warm, helpful, pairs well with Lighthouse. |
| **Scout** | Friendly explorer who goes ahead to check things out | Casual, approachable, implies looking ahead. |
| **Fino** | Short for "financial," sounds friendly | Casual, easy to say, feels like a helpful friend. |
| **Harper** | Human-sounding, trustworthy | Feels like a real advisor you'd talk to. |
| **Pace** | Keeps you on track, sets the rhythm | Directly tied to the check-in cadence of the app. |

---

## Core Features

### 1. The Dashboard ("Your Position")

The first thing users see. A calm, spacious overview of their financial life.

- **Net worth** displayed prominently with a trend line (monthly/quarterly/yearly)
- **Assets panel** with grouped accounts (investments, property, savings, other)
- **Debts panel** with grouped liabilities (mortgage, student loans, auto, credit cards)
- **On-track indicator** for each account that has a plan attached (green/yellow/red)
- **Next check-in reminder** showing when the user last updated and suggesting when to come back

### 2. Accounts & Assets

Each account is a card with:

- **Current balance** (manually entered)
- **Balance history** as a simple line chart over time
- **Contribution plan** (e.g., "$1,500/month into brokerage")
- **Growth assumption** (e.g., "10% annual return")
- **Projection chart** showing expected value at 5, 10, 20, 40 years
- **On-track status** comparing actual balance to projected balance
- **Notes** section for context ("Switched to index funds in March," "Employer match increased to 6%")
- **Check-in history** showing past updates with timestamps and notes

### 3. Debts & Liabilities

Each debt is a card with:

- **Remaining balance** (manually entered)
- **Original loan terms** (principal, rate, term)
- **Payment plan** (minimum payment, extra payments)
- **Payoff projection** showing estimated payoff date
- **Interest saved calculator** showing impact of extra payments
- **Amortization view** so users can see principal vs. interest breakdown
- **Notes** section ("Refinanced at 5.2% in January," "Making $200 extra/month starting June")
- **Check-in history**

### 4. Check-In Flow

The core interaction pattern. A guided, step-by-step process (TurboTax-style):

1. **"Welcome back"** screen showing time since last check-in
2. **Account-by-account update** where the app walks you through each account, pre-fills the last known balance, and asks "What's the current balance?"
3. **Change detection** that flags anything surprising ("Your brokerage dropped 12% since last check-in. Want to add a note?")
4. **Goal review** showing how each account compares to its plan
5. **Summary screen** with net worth change, progress toward goals, and any recommended actions
6. **AI debrief** where Atlas summarizes the check-in and offers insights

Check-in cadence options: monthly, quarterly, semi-annual, annual. The app nudges you when it's time.

### 5. Plans & Projections

For each account or goal, users can create a plan:

- **Contribution schedule** (amount, frequency)
- **Expected growth rate** (with inflation adjustment toggle)
- **Target amount** and/or **target date**
- **Projection chart** with optimistic/expected/conservative scenarios
- **"What if" sliders** to adjust contribution amount, growth rate, or timeline and see the impact in real time
- **Compound interest calculator** built in
- **Milestone markers** on the timeline (e.g., "Pay off car," "Hit $100K," "Retirement")

### 6. Atlas (AI Companion)

Available everywhere in the app. Users can:

- **Ask questions about their data.** "Am I on track to pay off my mortgage by 2035?" "What happens if I increase my 401k contribution by 2%?"
- **Get explanations.** "Why did my net worth drop this quarter?" "What's the Rule of 72?"
- **Run scenarios.** "If I put an extra $500/month toward my student loans, when will they be paid off?" "What if the market returns 7% instead of 10%?"
- **Get suggestions.** "Based on my accounts, where should I focus extra cash?" "Should I pay off debt or invest more?"
- **Take guided actions.** "Help me set up a plan for my new Roth IRA." "Walk me through a quarterly check-in."
- **Learn.** Short, contextual lessons about compound interest, debt snowball vs. avalanche, asset allocation, etc.

### 7. Notes & Journal

Each account has its own notes timeline, but there's also a global financial journal:

- Timestamped entries tied to check-ins
- Freeform notes about financial decisions, life changes, or context
- AI can reference notes when answering questions ("You mentioned in your March notes that you were considering refinancing...")
- Searchable across all accounts

### 8. Debt Payoff Tools

- **Snowball vs. Avalanche comparison** showing both strategies side by side
- **Extra payment impact calculator** for any debt
- **Payoff timeline** with visual countdown
- **Interest savings display** ("By paying $200 extra/month, you'll save $23,400 in interest and pay off 7 years early")
- **Mortgage-specific tools**: amortization schedule, recast calculator, refinance comparison

### 9. Property Tracking

For real estate, vehicles, and other non-liquid assets:

- **Estimated value** (manually entered, with prompt to update periodically)
- **Associated debt** linked to the asset (e.g., mortgage linked to house)
- **Equity calculator** (value minus remaining debt)
- **Equity growth chart** over time
- **Notes** for improvements, appraisals, or market observations

### 10. Reports & Insights

- **Net worth over time** (monthly, quarterly, yearly views)
- **Asset allocation breakdown** (what percentage is in investments vs. property vs. cash, etc.)
- **Debt-to-asset ratio** trend
- **Goal progress report** for all active plans
- **Year-in-review** annual summary generated by Atlas
- **Exportable** as PDF for sharing with a financial advisor or spouse

---

## User Stories

### The Long-Term Investor

> "I contribute $1,500/month to my brokerage account and assume 10% annual growth. I want to see what this looks like in 40 years with inflation adjustments. Every quarter, I want to check in and see if my actual balance is tracking to the projection. If the market had a bad year, I want Atlas to reassure me or suggest adjustments."

### The Homeowner Paying Extra

> "We have a 30-year mortgage but we're making extra payments. I want to see how much interest we're saving and when we'll actually be done. Every few months, I log in, enter our remaining balance, and the app updates the payoff projection. I also want to track our home's value so I can see our equity growing."

### The Debt-Free Dreamer

> "I have student loans, a car payment, and some credit card debt. I want to see all of it in one place with a clear payoff order. I want Atlas to tell me whether snowball or avalanche is better for my situation, and I want to see a timeline of when I'll be completely debt-free."

### The FIRE Planner

> "I'm aiming for financial independence by 45. I have multiple investment accounts, rental property equity, and a plan. I need a single dashboard that shows my total net worth, my FI number, and how close I am. Quarterly check-ins keep me honest, and I want to model different scenarios like 'What if I move to a lower cost-of-living area?'"

### The New Grad Starting Out

> "I just started my first job and have no idea what I'm doing. I want something that walks me through setting up my financial picture without being overwhelming. Atlas can teach me about 401k matching, emergency funds, and how to think about my first budget at a high level."

### The Couple Planning Together

> "My partner and I want to see our combined financial picture. We each have our own accounts, but we want a shared view of net worth, shared goals (like saving for a house), and the ability to both check in and update balances. Atlas should understand our combined situation."

### The Annual Reviewer

> "I don't want to think about money more than once or twice a year. I want to do a thorough review in January, make sure everything is on track, adjust any plans, and then forget about it until next January. The app should make that annual check-in thorough but not painful."

---

## Features Users Are Asking For (Market Research)

Based on research across Reddit communities (r/personalfinance, r/ynab, r/financialindependence), review sites, and competitor analysis:

1. **No account linking required.** Privacy-conscious users love tools like ProjectionLab that never ask for bank credentials. Manual entry feels safer and more intentional.
2. **Forward projections, not just history.** The most-requested missing feature in budgeting apps is the ability to see where you're heading, not just where you've been.
3. **Scenario modeling.** "What if" tools are consistently praised in ProjectionLab and requested in apps that lack them.
4. **Debt payoff visualization.** Users want to see the impact of extra payments in real time, with clear interest savings calculations.
5. **Net worth tracking that isn't an afterthought.** Many budgeting apps add net worth as a secondary feature. Users want it front and center.
6. **Simplicity over completeness.** The #1 reason people abandon finance tools is that they're too complex or time-consuming. Users consistently choose "good enough and easy" over "comprehensive and hard."
7. **Guided onboarding.** YNAB's biggest criticism is its steep learning curve. Users want to be walked through setup.
8. **AI-powered insights.** Users are excited about AI in finance apps (Copilot Money, Monarch) but want it to be genuinely helpful, not gimmicky.
9. **Data export and portability.** Users want to own their data and be able to leave without losing everything.
10. **Transparent, fair pricing.** YNAB's price increases from ~$50/yr to $109/yr caused significant backlash. Users want clear, stable pricing.
11. **Customizable reports.** Users want to slice their data differently: by account type, by time range, by goal.
12. **Collaboration features.** Couples and families want shared access without separate accounts.
13. **Mobile-friendly but not mobile-first.** Most serious financial review happens on desktop/tablet. Mobile is for quick balance checks.
14. **Notes and context.** Users want to annotate their financial data with reasoning, decisions, and life context.
15. **Inflation-adjusted projections.** Knowing your future dollars in today's dollars is consistently requested.

---

## Design & Styling Direction

### The Financial Sanctuary

The UI is a "sanctuary" — soft, layered, breathable. We reject the banking-as-a-fortress aesthetic. Surfaces feel physical, like frosted glass and floating paper. Depth comes from layered backgrounds, not drop shadows. Boundaries come from color shifts, not border lines.

### Key Design Principles

- **Breathing room.** Generous whitespace everywhere. Nothing cramped or dense.
- **No-Line Rule.** Borders are prohibited for sectioning content. Use background color shifts between surface layers instead.
- **Zero-Shadow Lift.** Stack surface tokens for clean depth without shadows.
- **Glass & Gradient.** Hero sections and primary CTAs use subtle radial gradients. Floating elements use glassmorphism (80% opacity + 20px backdrop-blur).
- **Organic Asymmetry.** Avoid rigid grids where possible. Editorial layouts with large numbers offset for visual interest.
- **Progressive disclosure.** Show the summary first. Details on demand.

### Typography

Single font family: **Manrope** (Google Fonts, weights 200–800). Geometric clarity, modern, approachable.

- Display/Headlines: 3.5rem (56px), weight 800, letter-spacing -0.02em.
- Body: 1rem (16px), weight 400–500.
- Labels/Meta: 0.75rem (12px), uppercase, weight 600–700, tracking-widest.
- Large monetary values: 3–3.75rem (48–60px), weight 900 (black), tracking tight.

### Color Direction

The palette is anchored in growth (Teal) and warmth (Amber). These colors serve as light sources within the UI.

| Role | Color | Hex |
|------|-------|-----|
| Base canvas | Surface | #f7faf8 |
| Primary containers | Surface container low | #f1f4f2 |
| Elevated cards | Surface container lowest | #ffffff |
| Primary text | On-surface | #181c1b |
| Secondary text | On-surface variant | #3e4947 |
| Primary interactive | Primary (Teal) | #006761 |
| Gradient endpoint | Primary container | #15827b |
| Positive/growth | Secondary (Mint) | #2c6956 |
| Insight/curiosity | Tertiary (Amber) | #805200 |
| Alert/negative | Error (Red) | #ba1a1a |
| Cooper AI | Primary (Teal) | #006761 |

### Iconography

Material Symbols Outlined (Google) throughout. Variable font settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24. Filled variant for active states.

### Inspiration

- **TurboTax** for guided flow and step-by-step walkthroughs
- **Linear** for clean, spacious UI with purposeful minimalism
- **Notion** for the warm, human feel and flexible notes/journal
- **Apple Health** for the dashboard-with-drill-down pattern
- **ProjectionLab** for projection charts and scenario modeling UI

> **Full design system reference:** See [docs/DESIGN.md](DESIGN.md) and [docs/screen.png](screen.png).

---

## Pricing Considerations

Based on competitor analysis:

| Competitor | Price | Model |
|------------|-------|-------|
| YNAB | $14.99/mo or $109/yr | Full app behind paywall |
| Monarch Money | $14.99/mo or $99.99/yr | Full app behind paywall |
| ProjectionLab | ~$9/mo (Premium) | Free tier + paid tiers |
| Copilot Money | $10.99/mo or $79.99/yr | Full app behind paywall |
| Empower | Free | Monetizes via wealth management services |

### Suggested Approach

- **Free tier**: Up to 3 accounts, basic projections, limited Atlas interactions
- **Pro tier ($7-10/mo or $69-89/yr)**: Unlimited accounts, full projections, unlimited Atlas, reports, collaboration, data export
- Avoid aggressive upselling within the app. Users hate this.
- Annual pricing should offer meaningful savings (30%+).
- Consider a lifetime option for early adopters.

---

## Future Feature Ideas

These are not MVP but worth considering for the roadmap:

- **Financial literacy modules.** Short, guided lessons from Atlas on topics like compound interest, tax-advantaged accounts, insurance, estate planning.
- **Scenario comparison.** Save multiple "what if" scenarios and compare them side by side.
- **Shared goals.** Couples can create joint goals (house down payment, vacation fund) with combined tracking.
- **Advisor sharing.** Export a read-only view of your financial picture to share with a financial advisor.
- **Reminders and nudges.** "You haven't checked in since October. Ready for a quick update?" via email or push notification.
- **Benchmarking (opt-in).** Anonymous comparison to others in your age/income bracket. "Your savings rate is in the top 20% for your age group."
- **Recurring plan templates.** Pre-built plans for common goals: "Pay off $50K in student loans," "Save $20K emergency fund," "Reach $1M net worth."
- **Tax-aware projections.** Model after-tax returns for different account types (Roth vs. Traditional, taxable vs. tax-advantaged).
- **Life event modeling.** "I'm having a baby in 6 months" or "I'm switching jobs" and Atlas adjusts projections accordingly.
- **Import from spreadsheet.** For users migrating from Google Sheets or Excel, allow CSV import of historical balance data.
- **API for power users.** Let advanced users push data in programmatically.
- **Widget/extension.** A simple net worth widget for phone home screens or browser new tabs.

---

## Competitive Positioning

This app is **not**:
- A budgeting app (no transaction categorization)
- A bank aggregator (no account linking)
- A robo-advisor (no investment management)
- A daily-use app (periodic check-ins by design)

This app **is**:
- A financial command center for the big picture
- A projection and planning tool with real tracking
- An AI-guided checkpoint for your financial journey
- A calm, private, manual-entry tool that respects your time

### One-Line Pitch Options

- "Your financial checkpoint. Check in, stay on track, build wealth."
- "Stop budgeting every penny. Start building toward financial freedom."
- "The calm way to track your wealth and stay on course."
- "A quarterly check-in for your financial life. Guided by AI."
- "Know where you stand. See where you're headed."

---

## MVP Scope (Suggested)

For a first launch, focus on:

1. Account and debt management (add, edit, track balances over time)
2. Check-in flow (guided, step-by-step balance updates)
3. Basic projections (contribution + growth rate = future value chart)
4. Debt payoff calculator (extra payment impact, payoff date)
5. Net worth dashboard (total assets minus total debts, trend over time)
6. Notes per account
7. Atlas chat (basic Q&A about the user's own data, projections, and simple financial concepts)

Everything else can come in subsequent releases based on user feedback.