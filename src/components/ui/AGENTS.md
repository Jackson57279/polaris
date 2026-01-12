# POLARIS KNOWLEDGE BASE

**Generated:** 2025-01-10
**Commit:** cf077f7f
**Branch:** electron-desktop-integration-polaris-ide

## OVERVIEW
shadcn/ui component library with reusable UI primitives for Polaris frontend.

## STRUCTURE
```
src/components/ui/
├── input.tsx, textarea.tsx, select.tsx, checkbox.tsx, switch.tsx
├── card.tsx, sheet.tsx, dialog.tsx, popover.tsx, tooltip.tsx
├── button.tsx, toggle.tsx, accordion.tsx, collapsible.tsx
├── alert.tsx, alert-dialog.tsx, sonner.tsx, progress.tsx, skeleton.tsx
├── table.tsx, avatar.tsx, badge.tsx, kbd.tsx, separator.tsx
├── tabs.tsx, breadcrumb.tsx, navigation-menu.tsx
└── aspect-ratio.tsx, scroll-area.tsx, resizable.tsx, drawer.tsx
```

## WHERE TO LOOK
| Category | Components | Location |
|----------|------------|----------|
| Forms | input, textarea, select, checkbox, radio-group, switch, slider | src/components/ui/ |
| Layout | card, sheet, dialog, popover, tooltip, hover-card | src/components/ui/ |
| Navigation | tabs, breadcrumb, pagination, navigation-menu | src/components/ui/ |
| Feedback | alert, alert-dialog, sonner, progress, skeleton | src/components/ui/ |
| Data Display | table, avatar, badge, kbd, separator | src/components/ui/ |
| Interactive | button, toggle, toggle-group, accordion, collapsible | src/components/ui/ |
| Utilities | aspect-ratio, scroll-area, resizable, drawer | src/components/ui/ |

## CONVENTIONS
- **Variant system**: Use class-variance-authority (cva) for component variants
- **Class merging**: Always use cn() utility from @/lib/utils for Tailwind class merging
- **Data slots**: Use data-slot attributes for consistent theming
- **Accessibility**: Include focus-visible styles, ARIA attributes, and keyboard navigation
- **Radix UI**: Base all interactive components on Radix UI primitives
- **TypeScript**: Strict typing with React.ComponentProps and VariantProps

## ANTI-PATTERNS
- **No direct Tailwind classes**: Always use cn() for className merging
- **No custom CSS**: Use only Tailwind classes, no custom stylesheets
- **No variant props without cva**: Define variants using cva for consistency
- **No missing data-slot**: All components must have data-slot attributes
- **No accessibility shortcuts**: Always include proper focus and ARIA support
