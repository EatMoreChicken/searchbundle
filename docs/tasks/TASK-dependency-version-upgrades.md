---
name: dependency-version-upgrades
description: Upgraded all project dependencies to latest recommended versions, migrated Tailwind v3 to v4 CSS-first config, and updated Docker postgres image to 17-bookworm.
status: completed
---

# Dependency Version Upgrades

## Description

Upgrade all project dependencies to their latest recommended versions. Two packages require non-trivial migration work beyond a version bump: **Tailwind CSS v3 → v4** (CSS-first config, removes `tailwind.config.js`) and **Next.js 15 → 16** (Turbopack as default dev bundler).

---

## Motivation

The project was scaffolded with approximate version ranges. Before any feature work begins, aligning to current stable/latest versions ensures we avoid building on outdated APIs and reduces the friction of upgrading mid-development.

---

## Critical Decisions

- **Tailwind v4 CSS-first config.** All design tokens move from `tailwind.config.js` into CSS `@theme {}` blocks in `globals.css`. The `tailwind.config.js` file is deleted. `autoprefixer` is removed from `devDependencies` and `postcss.config.js` — it's built into Tailwind v4's engine. The PostCSS plugin changes from `tailwindcss` to `@tailwindcss/postcss` (a separate package).
- **Next.js 16 — no middleware.ts needed.** We don't have a `middleware.ts`, so the `middleware→proxy.ts` rename doesn't affect us. The `rewrites()` config in `next.config.ts` is unchanged. No code changes are needed for Next.js 16 since our pages are all shells with no params yet.
- **next-auth stays beta.** There is no stable v5 yet. We pin to `"beta"` tag (resolves to latest beta at install time).
- **`@types/node` stays at `^22.0.0`** to track Node LTS (v22). v25 is available but v22 is the LTS line.
- **Docker postgres: `17` → `17-bookworm`.** Pinning the Debian variant prevents OS-level collation surprises from minor Docker image pulls in the future.

---

## Implementation Plan

### Phase 1 — Package version bumps

Update semver ranges in all `package.json` files. No logic changes required for these packages.

```
root package.json:
  concurrently: ^8.2.2 → ^9.2.1

apps/web/package.json:
  next: ^15.0.0 → ^16.1.6
  react: ^19.0.0 → ^19.2.1
  react-dom: ^19.0.0 → ^19.2.1
  next-auth: ^5.0.0-beta.25 → "beta"
  typescript: ^5.6.0 → ^5.9.3
  tailwindcss: ^3.4.0 → ^4.2.1
  postcss: ^8.4.0 → ^8.5.0
  REMOVE: autoprefixer
  ADD: @tailwindcss/postcss: ^4.2.1

apps/api/package.json:
  fastify: ^5.0.0 → ^5.8.2
  @fastify/cors: ^10.0.0 → ^11.2.0
  @fastify/cookie: ^11.0.0 → ^11.0.2
  tsx: ^4.19.0 → ^4.21.0
  typescript: ^5.6.0 → ^5.9.3

packages/db/package.json:
  drizzle-orm: ^0.36.0 → ^0.45.1
  postgres: ^3.4.0 → ^3.4.8
  drizzle-kit: ^0.28.0 → ^0.31.9
  typescript: ^5.6.0 → ^5.9.3
```

### Phase 2 — Tailwind v4 migration

**`postcss.config.js`** — replace the v3 plugin configuration:
```js
// BEFORE
{ plugins: { tailwindcss: {}, autoprefixer: {} } }

// AFTER  
{ plugins: { "@tailwindcss/postcss": {} } }
```

**`globals.css`** — replace `@tailwind` directives with `@import "tailwindcss"` and migrate all theme config from `tailwind.config.js` into a `@theme {}` block:
```css
/* BEFORE */
@tailwind base;
@tailwind components;
@tailwind utilities;
/* theme in tailwind.config.js */

/* AFTER */
@import "tailwindcss";

@theme {
  /* all colors, fonts here */
  --color-bg: #FAFAF8;
  --font-display: "DM Serif Display", serif;
  /* etc. */
}
```

In Tailwind v4, `--color-bg` in `@theme` auto-generates `bg-bg`, `text-bg`, etc. matching all existing class names in our shell pages.

**`tailwind.config.js`** — delete entirely (dead code in v4).

### Phase 3 — README / docs update

Update the Docker command in README to use `postgres:17-bookworm` instead of `postgres:16`.

---

## Potential Considerations

- **Class name parity.** All utility classes used in our shell pages (`font-display`, `font-body`, `text-text-secondary`, etc.) map 1:1 from v3 config keys to v4 CSS variable names. No class renames needed.
- **`theme()` in CSS.** The `globals.css` body styles use `theme('fontFamily.body')` and `theme('colors.bg')`. These need to be replaced with `var(--font-body)` and `var(--color-bg)` since the `theme()` function behavior changes in v4 (it reads from CSS variables now, so the old dotted path syntax doesn't apply to custom tokens).
- **drizzle-kit minor jump (0.28 → 0.31).** Drizzle-kit CLI flags are stable across these minors; existing migration files remain valid. A re-run of `db:generate` is not needed unless the schema changes.

---

## Test Steps

1. Run `npm install` at the project root — should complete with no peer dependency errors.
2. Run `npm run dev` — both servers should start cleanly (web on :3000, api on :3001).
3. Visit http://localhost:3000 — page should load and render correctly (no missing styles).
4. Inspect the rendered `<h1>` — it should use `DM Serif Display` (font-display class).
5. Check body background — should be `#FAFAF8` (warm off-white, not pure white).
6. Run `npm run build` — should complete with no TypeScript or Tailwind errors.
7. Run `npm run db:generate` in the `packages/db` workspace — should work without errors.
