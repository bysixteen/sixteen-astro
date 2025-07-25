/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{astro,js,ts,jsx,tsx,vue,svelte,mdx,md}",
  ],
  theme: {
    extend: {
      fontFamily: {
        		sans: ['AtAero', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['Geist Mono', 'SF Mono', 'monospace'],
      },
      letterSpacing: {
        'heading': '-0.04em', // -4%
      },
      colors: {
        // INK TOKENS (Static content - text & icons)
        'ink-text-primary': 'var(--color-ink-text-primary-default)',
        'ink-text-secondary': 'var(--color-ink-text-secondary-subtle)',
        'ink-text-accent': 'var(--color-ink-text-accent-default)',
        'ink-text-cream': 'var(--color-ink-text-cream-default)',
        'ink-icon-primary': 'var(--color-ink-icon-primary-default)',
        'ink-icon-secondary': 'var(--color-ink-icon-secondary-subtle)',
        'ink-icon-accent': 'var(--color-ink-icon-accent-default)',
        
        // INTERACTIVE TOKENS (Actionable elements)
        'interactive-bg-primary': 'var(--color-interactive-background-primary-default)',
        'interactive-bg-primary-hover': 'var(--color-interactive-background-primary-hovered)',
        'interactive-bg-primary-pressed': 'var(--color-interactive-background-primary-pressed)',
        'interactive-text-primary': 'var(--color-interactive-text-primary-default)',
        'interactive-border-primary': 'var(--color-interactive-border-primary-default)',
        'interactive-border-primary-focus': 'var(--color-interactive-border-primary-focused)',
        
        // INTERFACE TOKENS (Structural, non-interactive)
        'interface-bg-default': 'var(--color-interface-background-fill-default)',
        'interface-bg-subtle': 'var(--color-interface-background-fill-subtle)',
        'interface-surface': 'var(--color-interface-background-surface-default)',
        'interface-bg-tag': 'var(--color-interface-background-tag-default)',
        'interface-border-divider': 'var(--color-interface-border-divider-default)',
        'interface-border-input': 'var(--color-interface-border-input-default)',
        'interface-bg-input-disabled': 'var(--color-interface-background-input-disabled)',
        
        // Gray Scale
        gray: {
          50: '#f9f9f9',
          100: '#f1f1f1',
          200: '#e1e1e1',
          300: '#c4c4c4',
          400: '#a8a8a8',
          500: '#8a8a8a',
          600: '#6d6d6d',
          700: '#5f5f5f',
          800: '#4a4a4a',
          900: '#2c2c2c',
        },
        cream: '#DED9CE', // semantic design token, not a primitive
      },
      transitionTimingFunction: {
        'premium': 'cubic-bezier(0.8, 0.15, 0.2, 1)',
      },
      spacing: {
        'section-sm': '60px',    // Mobile
        'section-md': '80px',    // Tablet
        'section-lg': '120px',   // Desktop
      },
      gridTemplateColumns: {
        '12': 'repeat(12, minmax(0, 1fr))',
      },
      gap: {
        'grid': '24px',
      },
      padding: {
        'grid': '80px',
      },
    },
  },
  plugins: [],
  // JIT is enabled by default in Tailwind CSS v3+
  // These settings optimize the JIT compilation
  future: {
    hoverOnlyWhenSupported: true,
  },
  experimental: {
    optimizeUniversalDefaults: true,
  },
}

