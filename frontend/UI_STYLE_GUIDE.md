# TailAdmin-Inspired UI Skill

Use this guide for every UI page and component in this frontend. The target is the visual language of `https://demo.tailadmin.com/`, adapted to this stock-analysis product rather than copied page-for-page.

## Source of Truth

- Use tokens and primitives from `src/app/tailadmin-theme.css`.
- Use Tailwind CSS v4 utilities for layout and one-off responsive behavior.
- Use `cn()` from `src/lib/utils.ts` for conditional classes.
- Use Lucide React for interface icons and Recharts for charts.
- Support light and `.dark` themes in every new component.

## Visual Language

- Use Outfit throughout the interface.
- Use `brand-500` (`#465fff`) for primary actions, active navigation, chart highlights, links, and focus rings.
- Use cool grays: `gray-900` for primary text, `gray-500` for supporting text, `gray-200` for borders, and `gray-50` for the app canvas.
- Use white cards with `rounded-2xl border border-gray-200`; in dark mode use `dark:border-gray-800 dark:bg-white/[0.03]` when utilities are preferable.
- Keep shadows restrained. Prefer borders plus `shadow-theme-xs`; use stronger shadows only for floating menus or dialogs.
- Prefer 16px card radius, 12px icon-container radius, 8px control radius, and full pills for statuses.
- Use roomy but compact dashboard spacing: `gap-4 md:gap-6`, card padding `p-5 md:p-6`, and page padding through `ui-container`.

## Component Rules

### Cards and Metrics

- Start standard panels with `ui-card`; divide structure into `ui-card-header` and `ui-card-body`.
- Use `ui-title` and `ui-description` for panel headings.
- Metric cards use a 48px `ui-icon-box`, a muted 14px label, a bold 24px to 30px value, and a semantic trend pill.
- Do not use decorative gradients or heavy shadows on routine dashboard cards.

### Buttons and Inputs

- Use `ui-button ui-button-primary` for the single main action in a region.
- Use `ui-button ui-button-secondary` for secondary actions.
- Use `ui-input` for text, search, number, date, and select controls.
- Controls must have visible hover, focus, disabled, and error states.
- Icon-only controls need an accessible name and a minimum 40px square target.

### Status and Financial Semantics

- Use `ui-badge` plus `ui-badge-success`, `ui-badge-warning`, or `ui-badge-error`.
- Positive performance uses success green; negative performance uses error red; caution and pending states use warning amber.
- Never rely on color alone: pair color with a sign, arrow, icon, or text label.
- Reserve brand blue for selection and action, not gain/loss meaning.

### Tables and Charts

- Wrap tables in `ui-table-wrap` and style the table with `ui-table`.
- Keep headers small and muted; emphasize the primary identifier in each row with `font-medium text-gray-800 dark:text-white/90`.
- Charts use brand blue as the primary series, success/error for directional data, gray-200 grid lines, and muted labels.
- Avoid chart borders, 3D effects, gradients, and saturated multi-color palettes unless categories require them.
- Provide an empty state and a textual summary for important chart values.

### Navigation and Layout

- Desktop dashboards use a persistent left sidebar and top header; mobile uses a drawer.
- Active navigation uses a pale brand background and brand-colored text/icon.
- Keep content width controlled with `ui-container`; use responsive grids rather than fixed dimensions.
- Prefer information hierarchy over decoration: title, short context, primary content, then secondary actions.

## Accessibility and Responsiveness

- Build mobile-first and check 375px, 768px, 1024px, and wide desktop layouts.
- Preserve keyboard access and visible focus rings.
- Use semantic HTML before ARIA.
- Meet WCAG AA contrast for text and controls.
- Respect reduced motion; animation should be subtle, purposeful, and generally 150ms to 200ms.
- Every async region needs loading, empty, error, and success states without layout jumps.

## Preferred Patterns

```tsx
<section className="ui-card">
  <header className="ui-card-header">
    <div>
      <h2 className="ui-title">Portfolio performance</h2>
      <p className="ui-description">Value and return over the selected period</p>
    </div>
    <button className="ui-button ui-button-secondary">View report</button>
  </header>
  <div className="ui-card-body">...</div>
</section>
```

```tsx
<span className="ui-badge ui-badge-success">+8.24%</span>
```

## Avoid

- Do not return to default Next.js starter styling.
- Do not mix unrelated visual systems, arbitrary colors, glassmorphism, oversized rounding, or deep shadows.
- Do not copy the reference site's bundled `style.css`; use the local tokens and primitives.
- Do not hardcode reference-site product content, branding, logos, or assets.
- Do not use generic stock photos when a data visualization, icon, or empty-state illustration is clearer.

## Completion Check

Before considering UI work complete, verify visual consistency, responsive layouts, light and dark mode, keyboard focus, semantic statuses, loading and empty states, and lint/build success.
