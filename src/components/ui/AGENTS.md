# POLARIS KNOWLEDGE BASE

**Generated:** 2025-01-05
**Commit:** dd285c3
**Branch:** 001-initial-setup

## OVERVIEW
shadcn/ui component library with 53 reusable UI primitives for Polaris frontend.

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