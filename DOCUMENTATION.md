# Project Documentation

This file provides a quick reference for common Tailwind CSS utility classes used in this project.

## 1. Typography

### Type Scale

| Class      | rem   | px   | Example usage         |
|------------|-------|------|----------------------|
| `text-xs`  | 0.75  | 12px | Smallest text        |
| `text-sm`  | 0.875 | 14px |                      |
| `text-base`| 1     | 16px | Default body text    |
| `text-lg`  | 1.125 | 18px |                      |
| `text-xl`  | 1.25  | 20px |                      |
| `text-2xl` | 1.5   | 24px |                      |
| `text-3xl` | 1.875 | 30px |                      |
| `text-4xl` | 2.25  | 36px |                      |
| `text-5xl` | 3     | 48px |                      |
| `text-6xl` | 3.75  | 60px |                      |
| `text-7xl` | 4.5   | 72px |                      |
| `text-8xl` | 6     | 96px |                      |
| `text-9xl` | 8     |128px | Largest text         |

For more details, see the [Tailwind Font Size Docs](https://tailwindcss.com/docs/font-size).

## 2. Sizing & Spacing

### Common Heights & Widths

| Class | Property          | Value (rem) | Value (px) |
|-------|-------------------|-------------|------------|
| `h-4` / `w-4` | `height/width: 1rem`    | `1`         | `16px`     |
| `h-8` / `w-8` | `height/width: 2rem`    | `2`         | `32px`     |
| `h-12`/ `w-12`| `height/width: 3rem`    | `3`         | `48px`     |
| `h-16`/ `w-16`| `height/width: 4rem`    | `4`         | `64px`     |
| `h-20`/ `w-20`| `height/width: 5rem`    | `5`         | `80px`     |
| `h-24`/ `w-24`| `height/width: 6rem`    | `6`         | `96px`     |
| `h-32`/ `w-32`| `height/width: 8rem`    | `8`         | `128px`    |
| `h-48`/ `w-48`| `height/width: 12rem`   | `12`        | `192px`    |
| `h-64`/ `w-64`| `height/width: 16rem`   | `16`        | `256px`    |
| `h-96`/ `w-96`| `height/width: 24rem`   | `24`        | `384px`    |

### Common Padding & Margin

| Class | Property              | Value (rem) | Value (px) |
|-------|-----------------------|-------------|------------|
| `p-1` / `m-1` | `padding/margin: 0.25rem` | `0.25`      | `4px`      |
| `p-2` / `m-2` | `padding/margin: 0.5rem`  | `0.5`       | `8px`      |
| `p-4` / `m-4` | `padding/margin: 1rem`    | `1`         | `16px`     |
| `p-8` / `m-8` | `padding/margin: 2rem`    | `2`         | `32px`     |
| `p-12`/ `m-12`| `padding/margin: 3rem`    | `3`         | `48px`     |
| `p-16`/ `m-16`| `padding/margin: 4rem`    | `4`         | `64px`     |
| `p-20`/ `m-20`| `padding/margin: 5rem`    | `5`         | `80px`     |
| `p-24`/ `m-24`| `padding/margin: 6rem`    | `6`         | `96px`     |
| `p-32`/ `m-32`| `padding/margin: 8rem`    | `8`         | `128px`    |
| `p-48`/ `m-48`| `padding/margin: 12rem`   | `12`        | `192px`    |
| `p-64`/ `m-64`| `padding/margin: 16rem`   | `16`        | `256px`    |
| `p-96`/ `m-96`| `padding/margin: 24rem`   | `24`        | `384px`    |

*Use directional prefixes for specific sides:*
- `pt-` / `mt-` (top)
- `pr-` / `mr-` (right)
- `pb-` / `mb-` (bottom)
- `pl-` / `ml-` (left)
- `px-` / `mx-` (horizontal)
- `py-` / `my-` (vertical)

For more details, see the [Tailwind Spacing Docs](https://tailwindcss.com/docs/spacing).

### Gap Values (Grid & Flexbox)

| Class | Property | Value (rem) | Value (px) | Common Usage |
|-------|----------|-------------|------------|--------------|
| `gap-0` | `gap: 0px` | `0` | `0px` | No spacing |
| `gap-px` | `gap: 1px` | — | `1px` | Minimal separator |
| `gap-0.5` | `gap: 0.125rem` | `0.125` | `2px` | Very tight |
| `gap-1` | `gap: 0.25rem` | `0.25` | `4px` | Tight spacing |
| `gap-1.5` | `gap: 0.375rem` | `0.375` | `6px` | — |
| `gap-2` | `gap: 0.5rem` | `0.5` | `8px` | Small spacing |
| `gap-2.5` | `gap: 0.625rem` | `0.625` | `10px` | — |
| `gap-3` | `gap: 0.75rem` | `0.75` | `12px` | — |
| `gap-3.5` | `gap: 0.875rem` | `0.875` | `14px` | — |
| `gap-4` | `gap: 1rem` | `1` | `16px` | **Standard spacing** |
| `gap-5` | `gap: 1.25rem` | `1.25` | `20px` | — |
| `gap-6` | `gap: 1.5rem` | `1.5` | `24px` | **Our current header gap** |
| `gap-7` | `gap: 1.75rem` | `1.75` | `28px` | — |
| `gap-8` | `gap: 2rem` | `2` | `32px` | **Large spacing** |
| `gap-9` | `gap: 2.25rem` | `2.25` | `36px` | — |
| `gap-10` | `gap: 2.5rem` | `2.5` | `40px` | — |
| `gap-11` | `gap: 2.75rem` | `2.75` | `44px` | — |
| `gap-12` | `gap: 3rem` | `3` | `48px` | Extra large |
| `gap-14` | `gap: 3.5rem` | `3.5` | `56px` | — |
| `gap-16` | `gap: 4rem` | `4` | `64px` | — |
| `gap-20` | `gap: 5rem` | `5` | `80px` | — |
| `gap-24` | `gap: 6rem` | `6` | `96px` | — |
| `gap-32` | `gap: 8rem` | `8` | `128px` | Very large |

### Directional Gap
- **`gap-x-*`**: Horizontal gap only (column spacing)
- **`gap-y-*`**: Vertical gap only (row spacing)

**Example**: `gap-x-8 gap-y-4` gives 32px horizontal, 16px vertical spacing.

For more details, see the [Tailwind Gap Docs](https://tailwindcss.com/docs/gap).

## 3. Layout & Alignment

### Flexbox Quick-start
| Goal | Parent class(es) | Child helpers |
|------|------------------|---------------|
| Horizontal row (default)  | `flex` | `gap-*`, `flex-1`, `basis-*` |
| Vertical stack | `flex flex-col` | — |
| Center both axes | `flex items-center justify-center` | — |
| Align top / left | `flex items-start justify-start` | — |
| Space-between | `flex justify-between` | — |
| Wrap items | `flex flex-wrap gap-*` | — |

### CSS Grid Essentials
| Columns | Class | Notes |
|---------|-------|-------|
| 2 equal cols | `grid grid-cols-2` | Add `gap-*` for spacing |
| 3 equal cols | `grid grid-cols-3` | — |
| Custom widths | `grid-cols-[200px_1fr]` | arbitrary values (Tailwind v3.3+) |
| Auto-fit cards | `grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]` | responsive cards |

Common helpers: `gap-4`, `gap-x-8`, `gap-y-2`, `place-items-center`, `place-content-between`.

### Responsive Break-points
Prefix any class with the breakpoint label:
| Prefix | Min-width |
|--------|-----------|
| `sm:`  | 640px |
| `md:`  | 768px |
| `lg:`  | 1024px |
| `xl:`  | 1280px |
| `2xl:` | 1536px |

Example: `class="grid grid-cols-1 md:grid-cols-2 gap-8"`.

### Spacing Recap
Remember `gap-*` is for Grid/Flex spacing, while `space-x-*` / `space-y-*` adds nested margins between flex children.

### Utility Glossary (Layout)
| Class | Effect | Notes |
|-------|--------|-------|
| `w-full` | `width: 100%` | Fills the width of its parent |
| `max-w-screen-sm` / `md` / `lg` / `xl` / `2xl` | `max-width` caps at the named breakpoint | Combine with `mx-auto` to create responsive, centered wrappers |
| `mx-auto` | `margin-left/right: auto` | Horizontally centers a block element when its width < parent |
| `container` | Tailwind’s responsive fixed-width wrapper | Includes automatic `mx-auto` and padding |
| `space-x-*` / `space-y-*` | Adds horizontal / vertical gap *between* flex children | Doesn’t affect first/last child |
| `gap-*` | Grid/Flex gap shorthand | Applies to both axes unless `gap-x-*`/`gap-y-*` used |
| `flex-1` | `flex: 1 1 0%` | Child grows to fill available space |
| `basis-*` | Sets `flex-basis` (initial width/height) | e.g. `basis-1/3`, `basis-48` |
| `shrink-0` / `grow` | Control flex shrinking / growing | Useful in responsive nav bars |
| `grid-cols-n` | Sets fixed number of grid columns | `grid-cols-12` etc. |
| `auto-cols-auto` / `auto-rows-fr` | Control implicit grid tracks | See Grid docs for variations |

# Design System Style Documentation (NewsKit-Inspired)

## 1. Primitives Layer (Raw Values)
| Name               | Value      | Description         |
|--------------------|------------|---------------------|
| --primitive-white  | #FFFFFF    | White               |
| --primitive-black  | #172121    | Black (dark bg)     |
| --primitive-grey   | #ABA79F    | Grey (secondary)    |
| --primitive-cream  | #DED9CE    | Cream (light bg)    |
| --primitive-dark   | #2C3030    | Dark surface        |
| --primitive-accent | #06F795    | Accent/primary      |

**Defined in:** `src/styles/primitives.css`

---

## 2. Semantic Tokens Layer (Tokens)

### Ink (Typography & Icons)
| Token Name                  | Default Value           | Description         | Tailwind Class         |
|-----------------------------|-------------------------|---------------------|------------------------|
| --color-ink-primary         | var(--primitive-white)  | Main text           | text-ds-ink-primary    |
| --color-ink-secondary       | var(--primitive-grey)   | Secondary text      | text-ds-ink-secondary  |
| --color-ink-accent          | var(--primitive-accent) | Accent text         | text-ds-ink-accent     |
| --color-ink-cream           | var(--primitive-cream)  | Cream text          | text-ds-ink-cream      |

### Interface (Structure & Surfaces)
| Token Name                  | Default Value           | Description         | Tailwind Class         |
|-----------------------------|-------------------------|---------------------|------------------------|
| --color-interface-background| var(--primitive-black)  | Main background     | bg-ds-bg               |
| --color-interface-surface   | var(--primitive-dark)   | Card/surface bg     | bg-ds-surface          |

### Interactive (Actions & States)
| Token Name                        | Default Value           | Description         | Tailwind Class                    |
|-----------------------------------|-------------------------|---------------------|-----------------------------------|
| --color-interactive-primary       | var(--primitive-accent) | Primary button/bg   | bg-ds-interactive-primary          |
| --color-interactive-primary-hover | #05e184                 | Button hover        | hover:bg-ds-interactive-primary-hover |

### Expressive (Brand/Decorative)
| Token Name                  | Default Value           | Description         | Tailwind Class         |
|-----------------------------|-------------------------|---------------------|------------------------|
| --color-brand-accent        | var(--primitive-cream)  | Brand accent        | text-ds-ink-cream      |

**Defined in:** `src/styles/tokens.css`

---

## 3. Theme Switching (Mode Layer)
| Theme         | Token                        | Value                        |
|---------------|------------------------------|------------------------------|
| [data-theme="dark"]  | --color-interface-background      | var(--primitive-black)       |
|               | --color-ink-primary          | var(--primitive-white)        |
| [data-theme="light"] | --color-interface-background      | var(--primitive-cream)       |
|               | --color-ink-primary          | var(--primitive-black)        |

**Switch theme by toggling `data-theme` on `<html>` or `<body>`.**

---

## 4. Tailwind Integration
| Semantic Token           | Tailwind Class                | Example Usage                        |
|-------------------------|-------------------------------|--------------------------------------|
| --color-interface-background | bg-ds-bg                  | `bg-ds-bg`                           |
| --color-interface-surface    | bg-ds-surface              | `bg-ds-surface`                      |
| --color-ink-primary          | text-ds-ink-primary        | `text-ds-ink-primary`                |
| --color-ink-secondary        | text-ds-ink-secondary      | `text-ds-ink-secondary`              |
| --color-ink-accent           | text-ds-ink-accent         | `text-ds-ink-accent`                 |
| --color-ink-cream            | text-ds-ink-cream          | `text-ds-ink-cream`                  |
| --color-interactive-primary  | bg-ds-interactive-primary  | `bg-ds-interactive-primary`          |
| --color-interactive-primary-hover | hover:bg-ds-interactive-primary-hover | `hover:bg-ds-interactive-primary-hover` |

**Defined in:** `tailwind.config.js`

---

## 5. Style Presets (Component States)

### Example: Button Style Preset Table
| State      | Background Token                | Text Token                | Border Token                | Tailwind Example |
|------------|---------------------------------|---------------------------|-----------------------------|------------------|
| Default    | --color-interactive-primary     | --color-ink-primary       | --color-interactive-primary | `bg-ds-interactive-primary text-ds-ink-primary` |
| Hover      | --color-interactive-primary-hover| --color-ink-primary       | --color-interactive-primary-hover | `hover:bg-ds-interactive-primary-hover` |
| Disabled   | --color-interface-surface       | --color-ink-secondary     | --color-interface-surface   | `bg-ds-surface text-ds-ink-secondary` |

---

## 6. Usage Guidelines
| Guideline                                      | Example/Note                                      |
|------------------------------------------------|---------------------------------------------------|
| Never use raw hex values in components          | Always use tokens or style presets                |
| Use semantic tokens for all color, spacing, and typography | `bg-ds-bg`, `text-ds-ink-primary`                 |
| Use style presets for component states          | `stylePresetButtonPrimary`                        |
| Switch themes by toggling `data-theme`          | `<html data-theme="dark">`                       |
| Document all tokens and presets                 | Keep this file up to date                         |

---

## 7. Example Component
| Component | Example Code |
|-----------|-------------|
| Button    | ```astro
<button class="bg-ds-interactive-primary hover:bg-ds-interactive-primary-hover text-ds-ink-primary px-4 py-2 rounded">
  <slot />
</button>
``` |

---

## 8. Scalability
| Principle | How to Apply |
|-----------|--------------|
| Add new tokens for brand, spacing, elevation, etc. | Extend `tokens.css` and Tailwind config |
| Use tokens in all components for maintainability   | Reference only semantic classes/tokens  |
| Document all tokens and usage                      | Keep this file up to date               |

---

## 9. References
- [NewsKit Colours Foundation](https://www.newskit.co.uk/theme/foundation/colours/)
- [NewsKit Design Tokens](https://www.newskit.co.uk/theme/foundation/design-tokens/)
- [NewsKit Style Presets](https://www.newskit.co.uk/theme/presets/style-presets/)
 