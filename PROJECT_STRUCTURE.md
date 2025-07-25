# Project Structure Documentation

## Overview
This Astro project follows a component-based architecture with clear separation of concerns and consistent naming conventions.

## Directory Structure

```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   └── Button.astro      # Button component (PascalCase)
│   ├── layout/               # Layout-specific components
│   │   ├── Header.astro      # Site header component
│   │   └── Footer.astro      # Site footer component
│   └── sections/             # Page section components
│       ├── IntroSection.astro
│       ├── MediaSection.astro
│       ├── VimeoSection.astro
│       ├── TextSection.astro
│       ├── ImageRightSection.astro
│       ├── PhonesSection.astro
│       └── CreditsSection.astro
├── layouts/
│   └── Layout.astro          # Main layout wrapper
├── pages/
│   ├── index.astro           # Homepage
│   ├── 404.astro            # 404 error page
│   └── works/
│       └── [slug].astro      # Dynamic project pages
├── styles/
│   ├── main.css             # Main stylesheet
│   ├── primitives.css       # Design system primitives
│   └── tokens.css           # Design system tokens
├── utils/
│   └── mediaUtils.ts        # Shared utility functions
├── assets/                  # Static assets (images, SVGs)
└── scripts/                 # Client-side JavaScript (as requested)
```

## Naming Conventions

### Components
- **PascalCase** for component files: `Button.astro`, `Header.astro`
- **Descriptive names** that clearly indicate purpose
- **Consistent suffixes**: `Section` for page sections, `Component` for reusable components

### Folders
- **Lowercase** with clear, descriptive names
- **Logical grouping**: `ui/` for reusable components, `layout/` for layout components, `sections/` for page sections

## Component Categories

### UI Components (`components/ui/`)
Reusable, generic components that can be used across the site:
- `Button.astro` - Button component with various states and types

### Layout Components (`components/layout/`)
Site-wide layout components:
- `Header.astro` - Site navigation and branding
- `Footer.astro` - Site footer with navigation controls

### Section Components (`components/sections/`)
Page-specific content sections:
- `IntroSection.astro` - Project introduction with hero media
- `MediaSection.astro` - Full-width media display
- `VimeoSection.astro` - Vimeo video embeds
- `TextSection.astro` - Text-only content
- `ImageRightSection.astro` - Text with image on right
- `PhonesSection.astro` - Complex phone layout with sticky text
- `CreditsSection.astro` - Project credits display

## Shared Utilities

### `utils/mediaUtils.ts`
Contains shared functions used across multiple components:
- `renderMedia()` - Handles image/video rendering with responsive srcsets
- `renderRichText()` - Processes rich text content from Strapi

## Benefits of This Structure

1. **Maintainability** - Clear separation makes it easy to find and modify components
2. **Reusability** - UI components can be reused across different pages
3. **Scalability** - Easy to add new components without cluttering the structure
4. **Consistency** - Standardized naming and organization patterns
5. **Developer Experience** - Intuitive folder structure for new team members

## Adding New Components

### UI Component
1. Create file in `src/components/ui/ComponentName.astro`
2. Use PascalCase naming
3. Export clear Props interface
4. Make it generic and reusable

### Layout Component
1. Create file in `src/components/layout/ComponentName.astro`
2. Use PascalCase naming
3. Import UI components as needed
4. Focus on layout and structure

### Section Component
1. Create file in `src/components/sections/ComponentName.astro`
2. Use PascalCase naming with `Section` suffix
3. Import shared utilities from `utils/`
4. Handle specific content types and layouts 