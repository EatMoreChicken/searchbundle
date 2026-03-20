# Design System Strategy: The Financial Sanctuary

## 1. Overview & Creative North Star
**Creative North Star: The Luminous Sandbox**

Most financial tools feel like spreadsheets—rigid, cold, and anxiety-inducing. This design system rejects the "banking-as-a-fortress" aesthetic in favor of a "sanctuary." We are building a space that feels like a high-end, tactile playground where users don't just "manage" money; they *explore* their future.

To move beyond the "template" look, we utilize **Organic Asymmetry** and **Tonal Depth**. By avoiding rigid grids and standard borders, we create a layout that feels fluid and breathable. We treat the interface as a living environment where elements don't just sit on a page—they inhabit a three-dimensional space of soft light and frosted surfaces.

---

## 2. Colors & Surface Philosophy
The palette is anchored in growth (Mint/Teal) and warmth (Amber). We use these not as mere accents, but as light sources within the UI.

### The "No-Line" Rule
**Borders are strictly prohibited for sectioning content.** Standard 1px lines create visual "noise" that triggers a feeling of confinement. Instead, boundaries must be defined through background color shifts. Use `surface-container-low` for large background sections and `surface-container-highest` for interior modules to create natural, soft-edge separation.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use a "Nesting" approach to define importance:
*   **Base Layer:** `surface` (#f7faf8) – The canvas.
*   **Primary Containers:** `surface-container-low` (#f1f4f2) – Used for major content blocks.
*   **Active Modules:** `surface-container-lowest` (#ffffff) – These act as "elevated" cards that feel like fresh sheets of paper floating on the base.

### The "Glass & Gradient" Rule
To inject "soul" into the interface, hero sections and primary call-to-actions (CTAs) should utilize subtle radial gradients.
*   **The Signature Glow:** Transition from `primary` (#006761) to `primary_container` (#15827b) at a 45-degree angle.
*   **Glassmorphism:** For floating navigation or modal overlays, use `surface_container_lowest` with an 80% opacity and a `20px` backdrop-blur. This keeps the user connected to the "sandbox" beneath.

---

## 3. Typography
We utilize **Manrope** for its geometric clarity and modern, approachable rhythm. It balances the playfulness of a rounded sans-serif with the authority of a professional typeface.

*   **Display & Headlines:** Use `display-lg` (3.5rem) and `headline-lg` (2rem) to create an editorial feel. Increase letter-spacing slightly (-0.02em) on headlines to give them a premium, "spaced" look.
*   **Titles & Body:** `title-md` (1.125rem) serves as the primary navigation and card heading font. `body-lg` (1rem) is our workhorse for legibility.
*   **The Hierarchy of Trust:** Use `tertiary_fixed_variant` (#643f00) for high-value insights or "Aha!" moments. This warm amber contrast against the teal backgrounds signals importance without the "alarm" of a traditional red error color.

---

## 4. Elevation & Depth
In this design system, depth is a feeling, not a drop-shadow effect.

### The Layering Principle
Avoid shadows on static elements. Instead, stack your surface tokens. A `surface-container-lowest` card placed on a `surface-container-low` background creates a "Zero-Shadow Lift" that feels incredibly clean and sophisticated.

### Ambient Shadows
When an element must float (e.g., a "Simulate Future" FAB), use a custom ambient shadow:
*   **Color:** Tinted with `on_surface` (#181c1b) at 6% opacity.
*   **Blur:** `30px` to `40px` (extra-diffused).
*   **Offset:** Y: `8px`, X: `0`.
This mimics natural light rather than a digital "glow."

### The "Ghost Border" Fallback
If an element *must* have a border for accessibility (e.g., an input field), use the `outline_variant` (#bdc9c7) at **20% opacity**. This creates a "Ghost Border" that guides the eye without breaking the soft aesthetic.

---

## 5. Components

### Buttons
*   **Primary:** Uses a soft gradient from `primary` to `primary_container`. Rounded at `9999px` (Full) or `ROUND_SIXTEEN` (1rem). No shadow; instead, use a subtle 10% `on_primary_fixed` inner glow.
*   **Secondary:** `secondary_container` (#aeedd5) background with `on_secondary_container` (#316d5b) text.

### Inputs & Selectors
*   **Text Fields:** Never use a bottom line. Use a `surface_container_high` (#e6e9e7) fill with `ROUND_SIXTEEN`. On focus, transition the background to `surface_container_lowest` and apply a Ghost Border of `primary`.
*   **Checkboxes & Radios:** Always rounded. Use `primary` for the "checked" state. The "check" icon should be `on_primary` (#ffffff).

### Lists & Cards
*   **Prohibited:** Divider lines/Horizontal rules.
*   **The Solution:** Use `vertical spacing (token 4: 1.4rem)` and subtle background shifts. For a list of transactions, each item should sit on a alternating `surface_container_low` and `surface_container` background to indicate separation.

### The "Sandbox" Slider (Custom Component)
Essential for modeling financial futures. Use a thick track (`surface_container_highest`) and a large, circular thumb in `tertiary` (#805200) to make "playing with numbers" feel tactile and rewarding.

---

## 6. Do's and Don'ts

### Do
*   **DO** use whitespace as a structural tool. If in doubt, add more `spacing-6` (2rem).
*   **DO** use `tertiary` (Amber) for curiosity-driven elements (e.g., "What if you saved $100 more?").
*   **DO** use asymmetrical layouts—place a large display-size number off-center to create a modern, editorial vibe.

### Don't
*   **DON'T** use 100% black (#000000) for text. Use `on_surface` (#181c1b) to maintain the soft, inviting tone.
*   **DON'T** use sharp corners. Everything must adhere to `ROUND_SIXTEEN` or `full` to maintain the "safe sandbox" feel.
*   **DON'T** use "Standard" Modal Overlays. Use the Glassmorphism approach to keep the UI feeling light and interconnected.