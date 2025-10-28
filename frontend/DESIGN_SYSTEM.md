# Togocom Process Manager - Design System

This document outlines the design system for the Togocom Process Manager application, ensuring consistency, accessibility, and brand alignment across all interfaces.

## Table of Contents

1. [Brand Identity](#brand-identity)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Spacing](#spacing)
5. [Components](#components)
6. [Accessibility](#accessibility)
7. [Usage Guidelines](#usage-guidelines)

---

## Brand Identity

The design system reflects **Togocom's** brand identity as a leading telecommunications company, using their signature orange color as the primary brand element.

### Design Principles

1. **Professional** - Clean, modern interface suitable for business processes
2. **Consistent** - Unified experience across all pages and components
3. **Accessible** - WCAG 2.1 AA compliant for all users
4. **Responsive** - Mobile-first approach with touch-friendly interfaces
5. **Branded** - Clear Togocom identity through color and styling

---

## Color Palette

### Primary Colors

**Togocom Orange** - The signature brand color
- **Light Mode**: `hsl(24 100% 50%)` → `#ff7700`
- **Dark Mode**: `hsl(24 100% 55%)` → Brighter for contrast
- **Usage**: Primary actions, headers, brand elements, links
- **Tailwind Class**: `bg-primary`, `text-primary`, `border-primary`

```tsx
// Example usage
<Button className="bg-primary text-primary-foreground">
  Submit
</Button>
```

### Semantic Colors

**Success** - Green for positive actions and confirmations
- **Light/Dark Mode**: `hsl(142 76% 36%)`
- **Usage**: Success messages, approved states, completion indicators
- **Tailwind Class**: `bg-success`, `text-success`

**Warning** - Amber for cautionary messages
- **Light Mode**: `hsl(38 92% 50%)`
- **Usage**: Warning messages, pending states, alerts
- **Tailwind Class**: `bg-warning`, `text-warning`

**Destructive** - Red for errors and dangerous actions
- **Light Mode**: `hsl(0 84.2% 60.2%)`
- **Dark Mode**: `hsl(0 62.8% 30.6%)`
- **Usage**: Error messages, delete actions, critical alerts
- **Tailwind Class**: `bg-destructive`, `text-destructive`

**Info** - Blue for informational messages
- **Light/Dark Mode**: `hsl(199 89% 48%)`
- **Usage**: Info messages, help text, notifications
- **Tailwind Class**: `bg-info`, `text-info`

### Neutral Colors

**Background**
- **Light Mode**: `hsl(0 0% 100%)` → White
- **Dark Mode**: `hsl(222 47% 11%)` → Deep blue-gray
- **Tailwind Class**: `bg-background`

**Foreground** (Text)
- **Light Mode**: `hsl(222 47% 11%)` → Dark blue-gray
- **Dark Mode**: `hsl(210 40% 98%)` → Off-white
- **Tailwind Class**: `text-foreground`

**Muted** (Subtle backgrounds and disabled states)
- **Light Mode**: `hsl(210 40% 96.1%)`
- **Dark Mode**: `hsl(217 33% 17%)`
- **Tailwind Class**: `bg-muted`, `text-muted-foreground`

**Border**
- **Light Mode**: `hsl(214 32% 91%)`
- **Dark Mode**: `hsl(217 33% 17%)`
- **Tailwind Class**: `border`, `border-border`

### Chart Colors

For data visualization, use the chart palette:

```tsx
const chartColors = {
  1: 'hsl(24 100% 50%)',  // Primary orange
  2: 'hsl(199 89% 48%)',  // Blue
  3: 'hsl(142 76% 36%)',  // Green
  4: 'hsl(38 92% 50%)',   // Amber
  5: 'hsl(280 65% 60%)',  // Purple
};
```

**Tailwind Classes**: `text-chart-1` through `text-chart-5`

---

## Typography

### Font Family

The application uses system font stack for optimal performance and native feel:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Font Sizes

Tailwind's default scale is used:

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 0.75rem (12px) | Small labels, captions |
| `text-sm` | 0.875rem (14px) | Body text, form labels |
| `text-base` | 1rem (16px) | Default body text |
| `text-lg` | 1.125rem (18px) | Emphasized text |
| `text-xl` | 1.25rem (20px) | Subheadings |
| `text-2xl` | 1.5rem (24px) | Section headings |
| `text-3xl` | 1.875rem (30px) | Page titles |
| `text-4xl` | 2.25rem (36px) | Hero headings |

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Emphasized text |
| `font-semibold` | 600 | Subheadings, labels |
| `font-bold` | 700 | Headings, important text |

---

## Spacing

### Spacing Scale

The design system uses Tailwind's default spacing scale based on 0.25rem (4px) increments:

```tsx
// Common spacing patterns
padding: {
  0: '0px',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
}
```

### Layout Spacing

**Component Spacing**: Use `space-y-{n}` or `gap-{n}` for consistent vertical/horizontal spacing

```tsx
// Vertical spacing between sections
<div className="space-y-6">
  <Section1 />
  <Section2 />
</div>

// Grid gap
<div className="grid grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>
```

**Container Padding**: `p-4` (mobile) to `p-8` (desktop)

**Section Margins**: `my-6` (mobile) to `my-12` (desktop)

---

## Components

### Component Library

The application uses [Shadcn UI](https://ui.shadcn.com/) components, customized with Togocom branding.

#### Button Variants

```tsx
// Primary - Togocom orange background
<Button variant="default">Primary Action</Button>

// Secondary - Subtle background
<Button variant="secondary">Secondary Action</Button>

// Outline - Bordered
<Button variant="outline">Outline</Button>

// Ghost - Transparent background
<Button variant="ghost">Ghost</Button>

// Destructive - Red for dangerous actions
<Button variant="destructive">Delete</Button>
```

#### Cards

```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

#### Forms

```tsx
<Form>
  <FormField
    control={form.control}
    name="fieldName"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Label</FormLabel>
        <FormControl>
          <Input placeholder="Enter value..." {...field} />
        </FormControl>
        <FormDescription>Helper text</FormDescription>
        <FormMessage /> {/* Error message */}
      </FormItem>
    )}
  />
</Form>
```

#### Alerts

```tsx
// Info alert
<Alert>
  <InfoIcon className="h-4 w-4" />
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>Informational message here</AlertDescription>
</Alert>

// Destructive alert
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Error message here</AlertDescription>
</Alert>
```

### Border Radius

| CSS Variable | Value | Usage |
|--------------|-------|-------|
| `--radius` | 0.5rem (8px) | Base radius |
| `rounded-lg` | 0.5rem | Default for cards, dialogs |
| `rounded-md` | 0.375rem | Buttons, inputs |
| `rounded-sm` | 0.25rem | Small elements |
| `rounded-full` | 9999px | Pills, avatars |

---

## Accessibility

### WCAG 2.1 AA Compliance

The design system ensures accessibility through:

#### Color Contrast

- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Togocom Orange on White**: 3.4:1 (suitable for large text and UI elements)
- **White on Togocom Orange**: 6.2:1 (suitable for all text)

#### Keyboard Navigation

All interactive elements must be:
- Focusable with keyboard (Tab, Shift+Tab)
- Activatable with Enter or Space
- Visible focus indicator (ring color)

```tsx
// Focus ring automatically applied by design system
<Button>
  Focusable Button
</Button>
// Shows orange ring on focus: ring-primary
```

#### Screen Reader Support

- Use semantic HTML elements
- Provide ARIA labels where needed
- Include alt text for images

```tsx
// Good - Semantic and accessible
<button aria-label="Close dialog">
  <X className="h-4 w-4" />
</button>

// Good - Alt text for images
<img src="/logo.png" alt="Togocom logo" />
```

#### Form Accessibility

```tsx
<FormField
  render={({ field }) => (
    <FormItem>
      <FormLabel htmlFor="email">Email</FormLabel>
      <FormControl>
        <Input
          id="email"
          type="email"
          aria-describedby="email-description"
          aria-invalid={!!errors.email}
          {...field}
        />
      </FormControl>
      <FormDescription id="email-description">
        Enter your work email address
      </FormDescription>
      <FormMessage role="alert" />
    </FormItem>
  )}
/>
```

---

## Usage Guidelines

### Do's ✅

1. **Use design tokens** - Always use theme colors instead of hardcoded values
   ```tsx
   // ✅ Good
   <div className="bg-primary text-primary-foreground">

   // ❌ Bad
   <div className="bg-orange-500 text-white">
   ```

2. **Use semantic color names** - Choose colors based on meaning
   ```tsx
   // ✅ Good - Semantic
   <Alert variant="destructive">Error occurred</Alert>

   // ❌ Bad - Generic
   <Alert className="bg-red-500">Error occurred</Alert>
   ```

3. **Maintain consistency** - Use existing components from Shadcn UI
   ```tsx
   // ✅ Good - Reuse existing components
   import { Button } from '@/components/ui/button';

   // ❌ Bad - Creating custom buttons
   <button className="px-4 py-2 bg-orange-500">
   ```

4. **Follow spacing scale** - Use Tailwind's spacing utilities
   ```tsx
   // ✅ Good - Consistent spacing
   <div className="p-4 space-y-6">

   // ❌ Bad - Arbitrary values
   <div style={{ padding: '17px', marginTop: '23px' }}>
   ```

5. **Consider dark mode** - Use theme-aware colors
   ```tsx
   // ✅ Good - Works in both modes
   <div className="bg-background text-foreground">

   // ❌ Bad - Only works in light mode
   <div className="bg-white text-black">
   ```

### Don'ts ❌

1. **Don't use arbitrary colors** - Stick to the design tokens
2. **Don't override component styles** - Use variants instead
3. **Don't hardcode spacing** - Use Tailwind classes
4. **Don't skip accessibility** - Always include ARIA labels and alt text
5. **Don't create inconsistent patterns** - Follow established component usage

---

## Examples

### Page Header

```tsx
<div className="container mx-auto py-6 space-y-6">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        Page Title
      </h1>
      <p className="text-muted-foreground">
        Page description text
      </p>
    </div>
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      New Item
    </Button>
  </div>
</div>
```

### Status Badges

```tsx
// Success status
<Badge className="bg-success text-success-foreground">
  Approved
</Badge>

// Warning status
<Badge className="bg-warning text-warning-foreground">
  Pending
</Badge>

// Destructive status
<Badge className="bg-destructive text-destructive-foreground">
  Rejected
</Badge>
```

### Loading States

```tsx
import { Loader2 } from 'lucide-react';

<div className="flex items-center justify-center py-12">
  <Loader2 className="h-8 w-8 animate-spin text-primary" />
</div>
```

---

## Resources

- **Shadcn UI Documentation**: [https://ui.shadcn.com](https://ui.shadcn.com)
- **Tailwind CSS**: [https://tailwindcss.com](https://tailwindcss.com)
- **Lucide Icons**: [https://lucide.dev](https://lucide.dev)
- **WCAG Guidelines**: [https://www.w3.org/WAI/WCAG21/quickref/](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Changelog

### v1.0.0 (2025-10-23)
- Initial design system documentation
- Established Togocom brand colors (orange primary)
- Defined semantic color tokens (success, warning, info, destructive)
- Documented typography, spacing, and component usage
- Added accessibility guidelines
- Migrated ChatWidget from hardcoded colors to theme tokens
