# Tomorrow's Earth Expo - Design System

A comprehensive design system for Tomorrow's Earth Expo 2026, inspired by modern SaaS products like Notion, Stripe, and Webflow. This document ensures consistency across all pages and components.

---

## Color Palette

### Primary Colors
- **Leaf Green**: `#10b981` - Primary action, success states, eco-theme
- **Digital Cyan**: `#06b6d4` - Secondary action, highlights, tech-theme
- **Ocean Blue**: `#0ea5e9` - Information, links, trust

### Neutral Colors
- **Slate 50**: `#f8fafc` - Lightest background
- **Slate 100**: `#f1f5f9` - Light background, hover states
- **Slate 200**: `#e2e8f0` - Borders, dividers
- **Slate 600**: `#475569` - Secondary text
- **Slate 900**: `#0f172a` - Primary text, headings

### Semantic Colors
- **Success**: `#10b981` (Leaf Green) - Success messages, approved states
- **Warning**: `#f59e0b` (Amber) - Warnings, pending states
- **Error**: `#ef4444` (Red) - Errors, rejected states
- **Info**: `#0ea5e9` (Ocean Blue) - Information, neutral states

### Background Colors
- **Light Mode**: `#ffffff` (white) - Main background
- **Light Mode Secondary**: `#f8fafc` (Slate 50) - Secondary backgrounds
- **Dark Mode**: `#0f172a` (Slate 900) - Main background
- **Dark Mode Secondary**: `#1e293b` (Slate 800) - Secondary backgrounds

---

## Typography

### Font Family
- **Primary**: `Inter` (system font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
- **Headings**: `Inter` with increased letter-spacing
- **Category Titles**: `Times New Roman, Bold + Italic` (for academic appearance)
- **Subcategory Titles**: `Times New Roman, Bold` (black text)

### Heading Scale

| Level | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| H1 | 32px (2rem) | 700 Bold | 1.2 | -0.02em | Page titles, hero sections |
| H2 | 28px (1.75rem) | 700 Bold | 1.3 | -0.01em | Section headings |
| H3 | 24px (1.5rem) | 700 Bold | 1.4 | 0 | Subsection headings |
| H4 | 20px (1.25rem) | 600 Semibold | 1.5 | 0 | Card titles, form labels |
| H5 | 16px (1rem) | 600 Semibold | 1.5 | 0 | Small headings, badges |
| H6 | 14px (0.875rem) | 600 Semibold | 1.5 | 0.02em | Captions, metadata |

### Body Text

| Type | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Body Large | 16px (1rem) | 400 Regular | 1.6 | Main content, descriptions |
| Body Regular | 14px (0.875rem) | 400 Regular | 1.6 | Standard text, paragraphs |
| Body Small | 12px (0.75rem) | 400 Regular | 1.5 | Secondary text, metadata |
| Caption | 12px (0.75rem) | 500 Medium | 1.4 | Labels, hints, captions |

### Text Colors
- **Primary Text**: `#0f172a` (Slate 900) - Main content
- **Secondary Text**: `#475569` (Slate 600) - Descriptions, metadata
- **Tertiary Text**: `#64748b` (Slate 500) - Disabled, hints
- **Inverse Text**: `#ffffff` (White) - On dark backgrounds

---

## Spacing System

All spacing uses a base unit of 4px (0.25rem). This ensures consistent, predictable spacing throughout the interface.

### Spacing Scale

| Unit | Value | CSS Class | Usage |
|------|-------|-----------|-------|
| xs | 4px | `gap-1` | Tight spacing between elements |
| sm | 8px | `gap-2` | Small spacing between components |
| md | 12px | `gap-3` | Medium spacing, default |
| lg | 16px | `gap-4` | Large spacing, section padding |
| xl | 24px | `gap-6` | Extra large spacing, major sections |
| 2xl | 32px | `gap-8` | Double extra large, page sections |
| 3xl | 48px | `gap-12` | Triple extra large, major layout |

### Common Spacing Patterns

**Card Padding**: `p-6` (24px) for content padding, `p-4` (16px) for compact cards

**Section Padding**: `py-12` (48px) for vertical padding, `px-4` (16px) for horizontal

**Button Padding**: `px-4 py-2` (16px × 8px) for medium buttons, `px-6 py-3` (24px × 12px) for large

**Form Input Padding**: `px-3 py-2` (12px × 8px) for standard inputs

---

## Shadow System

Shadows create depth and hierarchy. Use the appropriate shadow level for each component.

### Shadow Scale

| Level | CSS Value | Usage |
|-------|-----------|-------|
| None | `shadow-none` | Flat elements, disabled states |
| Subtle | `shadow-sm` | Borders, light elevation |
| Default | `shadow` | Cards, dropdowns, modals |
| Medium | `shadow-md` | Elevated cards, hover states |
| Large | `shadow-lg` | Floating elements, popovers |
| Extra Large | `shadow-xl` | Modal overlays, notifications |

### Shadow Behavior
- **Rest State**: Use `shadow` (default)
- **Hover State**: Increase to `shadow-md` or `shadow-lg`
- **Active State**: Maintain `shadow` with color change
- **Disabled State**: Use `shadow-none`

---

## Border Radius

Rounded corners create a modern, friendly appearance. Use consistent radius values.

### Radius Scale

| Size | Value | CSS Class | Usage |
|------|-------|-----------|-------|
| None | 0px | `rounded-none` | Sharp corners (rare) |
| Small | 4px | `rounded-sm` | Input fields, small elements |
| Medium | 8px | `rounded` | Buttons, cards, standard |
| Large | 12px | `rounded-lg` | Large cards, modals |
| Extra Large | 16px | `rounded-xl` | Hero sections, featured cards |
| Full | 9999px | `rounded-full` | Badges, avatars, pills |

---

## Button Styles

### Button Variants

**Primary Button**
- Background: Leaf Green (`#10b981`)
- Text: White
- Hover: Darker shade with `shadow-md`
- Active: Even darker shade
- Disabled: Muted gray with reduced opacity

**Secondary Button**
- Background: Slate 100 (`#f1f5f9`)
- Text: Slate 900 (`#0f172a`)
- Border: Slate 200 (`#e2e8f0`)
- Hover: Slate 200 background
- Active: Slate 300 background

**Outline Button**
- Background: Transparent
- Text: Primary color
- Border: Primary color (2px)
- Hover: Light background tint
- Active: Darker text color

**Ghost Button**
- Background: Transparent
- Text: Primary color
- No border
- Hover: Light background tint
- Active: Darker text color

### Button Sizes

| Size | Padding | Font Size | Height | Usage |
|------|---------|-----------|--------|-------|
| Small | `px-3 py-1` | 12px | 32px | Compact actions |
| Medium | `px-4 py-2` | 14px | 40px | Standard buttons |
| Large | `px-6 py-3` | 16px | 48px | Primary CTAs |

---

## Card Component

Cards are the primary container for content. Use consistent padding and shadows.

### Card Structure
- **Padding**: `p-6` (24px) for standard cards, `p-4` (16px) for compact
- **Border Radius**: `rounded-lg` (8px)
- **Shadow**: `shadow` (default), `shadow-md` on hover
- **Border**: Optional `border border-slate-200` for subtle definition
- **Background**: White or Slate 50 for secondary

### Card Sections
- **Header**: `pb-4` with `border-b border-slate-200` for section separation
- **Content**: `py-4` for body content
- **Footer**: `pt-4` with `border-t border-slate-200` for actions

---

## Form Elements

### Input Fields
- **Padding**: `px-3 py-2` (12px × 8px)
- **Border**: `border border-slate-200`
- **Border Radius**: `rounded` (8px)
- **Focus State**: `border-blue-500 ring-2 ring-blue-200`
- **Disabled State**: `bg-slate-50 text-slate-500 cursor-not-allowed`
- **Error State**: `border-red-500 ring-2 ring-red-200`

### Labels
- **Font Size**: `text-sm` (14px)
- **Font Weight**: `font-medium` (500)
- **Color**: `text-slate-700`
- **Margin**: `mb-2` below label
- **Required Indicator**: Red asterisk `*`

### Placeholders
- **Color**: `text-slate-400`
- **Font Style**: Regular (not italic)

---

## Animations & Transitions

### Transition Timings
- **Fast**: 150ms - Quick feedback (hover, focus)
- **Standard**: 300ms - Default transitions (page changes, modals)
- **Slow**: 500ms - Entrance animations, complex transitions

### Easing Functions
- **Ease In Out**: `cubic-bezier(0.4, 0, 0.2, 1)` - Default smooth motion
- **Ease Out**: `cubic-bezier(0.0, 0, 0.2, 1)` - Exit animations
- **Ease In**: `cubic-bezier(0.4, 0, 1, 1)` - Entrance animations

### Common Animations

**Button Hover**
```css
transition: all 150ms ease-in-out;
transform: scale(1.02);
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
```

**Card Hover**
```css
transition: all 200ms ease-in-out;
transform: translateY(-2px);
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
```

**Page Fade In**
```css
animation: fadeIn 300ms ease-in-out;
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Loading Spinner**
```css
animation: spin 1s linear infinite;
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## Responsive Breakpoints

Use Tailwind's default breakpoints for consistent responsive design.

| Breakpoint | Width | CSS | Usage |
|------------|-------|-----|-------|
| Mobile | 0px | None | Default, mobile-first |
| Small | 640px | `sm:` | Small phones |
| Medium | 768px | `md:` | Tablets |
| Large | 1024px | `lg:` | Desktops |
| Extra Large | 1280px | `xl:` | Large desktops |
| 2XL | 1536px | `2xl:` | Ultra-wide displays |

### Mobile-First Approach
- Start with mobile styles (no prefix)
- Add responsive modifiers for larger screens (`md:`, `lg:`, etc.)
- Test at actual breakpoints: 320px, 375px, 425px, 768px, 1024px, 1280px

---

## Accessibility Guidelines

### Color Contrast
- **Normal Text**: Minimum 4.5:1 contrast ratio (WCAG AA)
- **Large Text**: Minimum 3:1 contrast ratio (WCAG AA)
- **Graphical Elements**: Minimum 3:1 contrast ratio

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Focus order should be logical (left-to-right, top-to-bottom)
- Focus indicators must be visible (minimum 2px outline)

### ARIA Labels
- Icon-only buttons: `aria-label="Action description"`
- Form inputs: `<label for="input-id">Label</label>`
- Landmarks: `<nav>`, `<main>`, `<footer>` semantic HTML

### Text Alternatives
- All images: Descriptive `alt` text
- Icons: Either `aria-label` or `title` attribute
- Charts/Graphs: Accompanying text description

---

## Component Patterns

### Loading State
- Show skeleton screen or spinner
- Disable interactive elements
- Maintain layout to prevent shift

### Error State
- Red border and icon
- Clear error message below input
- Suggest corrective action

### Success State
- Green checkmark icon
- Confirmation message
- Optional toast notification

### Empty State
- Centered illustration or icon
- Descriptive heading
- Call-to-action button

### Disabled State
- Reduced opacity (50-60%)
- Gray text color
- Cursor: not-allowed
- No hover effects

---

## Usage Guidelines

### When to Use Each Color
- **Leaf Green**: Primary actions, success, positive states
- **Digital Cyan**: Secondary actions, highlights, tech elements
- **Ocean Blue**: Links, information, trust-building
- **Slate 900**: Text, headings, primary content
- **Slate 600**: Secondary text, descriptions
- **Slate 200**: Borders, dividers, subtle separation

### When to Use Each Shadow
- **No Shadow**: Flat elements, disabled states
- **Subtle Shadow**: Borders, light elevation
- **Default Shadow**: Cards, standard elevation
- **Medium Shadow**: Hover states, elevated cards
- **Large Shadow**: Floating elements, modals

### When to Use Each Spacing
- **xs (4px)**: Tight spacing between inline elements
- **sm (8px)**: Small gaps between components
- **md (12px)**: Default spacing, most common
- **lg (16px)**: Section padding, larger gaps
- **xl (24px)**: Major section separation
- **2xl (32px)**: Page-level spacing
- **3xl (48px)**: Full-page sections

---

## Implementation Checklist

- [ ] All headings follow the typography scale
- [ ] All body text uses appropriate font sizes
- [ ] Spacing is consistent across all pages
- [ ] Color contrast meets WCAG AA standards
- [ ] All buttons have hover and active states
- [ ] All cards use consistent padding and shadows
- [ ] Forms have proper labels and error states
- [ ] Animations are smooth and purposeful
- [ ] Responsive design works at all breakpoints
- [ ] Keyboard navigation is fully functional
- [ ] Focus indicators are visible
- [ ] All images have alt text
- [ ] Icon-only buttons have aria-labels

---

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Web Accessibility Best Practices](https://www.a11y-101.com/)
- [Design System Best Practices](https://www.designsystems.com/)
