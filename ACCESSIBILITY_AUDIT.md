# Accessibility Audit & WCAG Compliance Guide

## WCAG 2.1 Level AA Compliance

This application aims for WCAG 2.1 Level AA compliance, ensuring accessibility for all users including those with disabilities.

---

## 1. Perceivable

### 1.1 Text Alternatives
- [ ] All images have descriptive `alt` text
- [ ] Icon-only buttons have `aria-label` attributes
- [ ] Charts and graphs have text descriptions
- [ ] Videos have captions and transcripts

**Implementation:**
```tsx
// ✅ Good: Descriptive alt text
<img src="project.jpg" alt="Student project on renewable energy" />

// ✅ Good: Icon button with aria-label
<button aria-label="Close dialog">
  <XIcon />
</button>

// ❌ Bad: Missing alt text
<img src="project.jpg" />

// ❌ Bad: Generic alt text
<img src="project.jpg" alt="image" />
```

### 1.2 Color Contrast
- [ ] Normal text: 4.5:1 contrast ratio minimum
- [ ] Large text (18pt+): 3:1 contrast ratio minimum
- [ ] Graphical elements: 3:1 contrast ratio minimum
- [ ] Color not sole means of conveying information

**Testing Tools:**
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Lighthouse (Chrome DevTools)
- WAVE Browser Extension

### 1.3 Adaptable
- [ ] Content is presented in meaningful sequence
- [ ] Instructions don't rely on shape, size, or visual location alone
- [ ] Relationships and associations are clear
- [ ] Semantic HTML is used correctly

**Implementation:**
```tsx
// ✅ Good: Semantic HTML
<nav>
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/projects">Projects</a></li>
  </ul>
</nav>

// ✅ Good: Proper heading hierarchy
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>

// ❌ Bad: Non-semantic divs
<div className="nav">
  <div className="nav-item"><a href="/">Home</a></div>
</div>

// ❌ Bad: Skipped heading levels
<h1>Title</h1>
<h3>Subsection</h3> {/* Should be h2 */}
```

---

## 2. Operable

### 2.1 Keyboard Accessible
- [ ] All functionality available via keyboard
- [ ] No keyboard trap (can tab out of any element)
- [ ] Focus order is logical
- [ ] Keyboard shortcuts don't conflict with browser/assistive tech

**Implementation:**
```tsx
// ✅ Good: Button is keyboard accessible
<button onClick={handleClick}>Click me</button>

// ✅ Good: Links are keyboard accessible
<a href="/page">Link text</a>

// ❌ Bad: Div used as button (not keyboard accessible)
<div onClick={handleClick}>Click me</div>

// ✅ Good: Proper focus management
const [focusedIndex, setFocusedIndex] = useState(0);
const handleKeyDown = (e) => {
  if (e.key === 'ArrowDown') {
    setFocusedIndex(prev => (prev + 1) % items.length);
  }
};
```

### 2.2 Focus Visible
- [ ] Focus indicator is always visible
- [ ] Focus indicator has at least 2px outline
- [ ] Focus indicator has sufficient contrast (3:1)
- [ ] Focus order follows visual layout

**CSS:**
```css
/* ✅ Good: Visible focus ring */
button:focus-visible {
  outline: 2px solid #0ea5e9;
  outline-offset: 2px;
}

/* ❌ Bad: No focus indicator */
button:focus {
  outline: none;
}
```

### 2.3 Enough Time
- [ ] No time limits on interactions
- [ ] Users can pause, stop, or extend time limits
- [ ] Auto-updating content can be paused
- [ ] Animations can be disabled

**Implementation:**
```tsx
// ✅ Good: User can pause carousel
const [isPaused, setIsPaused] = useState(false);

<div onMouseEnter={() => setIsPaused(true)}
     onMouseLeave={() => setIsPaused(false)}>
  <Carousel paused={isPaused} />
</div>

// ✅ Good: Respect prefers-reduced-motion
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 2.4 Navigable
- [ ] Purpose of each link is clear
- [ ] Multiple ways to find content (navigation, search, sitemap)
- [ ] Focus order is logical
- [ ] Link text is descriptive

**Implementation:**
```tsx
// ✅ Good: Descriptive link text
<a href="/projects/123">View project: Renewable Energy System</a>

// ❌ Bad: Generic link text
<a href="/projects/123">Click here</a>

// ✅ Good: Skip to main content link
<a href="#main" className="sr-only">
  Skip to main content
</a>
```

---

## 3. Understandable

### 3.1 Readable
- [ ] Page language is specified
- [ ] Language of parts is identified
- [ ] Text is clear and simple
- [ ] Abbreviations are explained

**Implementation:**
```html
<!-- ✅ Good: Language specified -->
<html lang="en">

<!-- ✅ Good: Language change identified -->
<p>The word <span lang="fr">bonjour</span> means hello.</p>

<!-- ✅ Good: Abbreviations explained -->
<p><abbr title="HyperText Markup Language">HTML</abbr> is...</p>
```

### 3.2 Predictable
- [ ] Navigation is consistent across pages
- [ ] Components behave consistently
- [ ] No unexpected context changes
- [ ] Form submission is predictable

**Implementation:**
```tsx
// ✅ Good: Consistent navigation across pages
// Same Navigation component on every page

// ✅ Good: Form validation feedback
<input 
  type="email" 
  onChange={handleChange}
  aria-invalid={hasError}
  aria-describedby={hasError ? "error-msg" : undefined}
/>
{hasError && <span id="error-msg">Invalid email</span>}

// ❌ Bad: Unexpected context change
<a href="/page" onClick={() => window.open('/page')}>
  Opens in new window without warning
</a>
```

### 3.3 Input Assistance
- [ ] Error messages are clear
- [ ] Suggestions are provided for errors
- [ ] Labels and instructions are clear
- [ ] Form validation is helpful

**Implementation:**
```tsx
// ✅ Good: Clear error message
<div>
  <label htmlFor="email">Email</label>
  <input 
    id="email" 
    type="email"
    aria-describedby="email-error"
  />
  {error && <span id="email-error" role="alert">{error}</span>}
</div>

// ✅ Good: Helpful validation
if (!email.includes('@')) {
  setError('Email must include @');
}

// ❌ Bad: Vague error
setError('Invalid input');
```

---

## 4. Robust

### 4.1 Compatible
- [ ] HTML is valid and semantic
- [ ] ARIA is used correctly
- [ ] Components work with assistive technology
- [ ] No duplicate IDs

**Implementation:**
```tsx
// ✅ Good: Semantic HTML
<button onClick={handleClick}>Submit</button>

// ✅ Good: Proper ARIA usage
<div role="alert" aria-live="polite">
  {message}
</div>

// ✅ Good: Form associations
<label htmlFor="name">Name</label>
<input id="name" type="text" />

// ❌ Bad: Non-semantic button
<div onClick={handleClick} role="button">
  Submit
</div>

// ❌ Bad: Duplicate IDs
<input id="email" />
<input id="email" /> {/* Duplicate! */}
```

---

## Keyboard Navigation Checklist

### Tab Order
- [ ] Tab order follows visual layout (left-to-right, top-to-bottom)
- [ ] No keyboard trap
- [ ] Focus is visible at all times
- [ ] Skip links are available

**Implementation:**
```tsx
// ✅ Good: Natural tab order
<header>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>
</header>
<main>
  <button>Submit</button>
</main>

// ✅ Good: Skip to main content
<a href="#main" className="sr-only">
  Skip to main content
</a>
<nav>...</nav>
<main id="main">...</main>

// ✅ Good: Custom tab order if needed
<div tabIndex={0}>Custom element</div>
```

### Keyboard Shortcuts
- [ ] Escape closes dialogs/menus
- [ ] Enter activates buttons
- [ ] Space activates buttons/checkboxes
- [ ] Arrow keys navigate lists/menus

**Implementation:**
```tsx
const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    closeDialog();
  } else if (e.key === 'Enter') {
    handleSubmit();
  } else if (e.key === ' ') {
    e.preventDefault();
    handleToggle();
  } else if (e.key === 'ArrowDown') {
    focusNextItem();
  }
};
```

---

## Screen Reader Testing

### ARIA Landmarks
- [ ] `<nav>` for navigation
- [ ] `<main>` for main content
- [ ] `<aside>` for sidebars
- [ ] `<footer>` for footer
- [ ] `role="region"` for other sections

**Implementation:**
```tsx
<header>
  <nav>Navigation</nav>
</header>
<main>
  <article>Content</article>
  <aside>Sidebar</aside>
</main>
<footer>Footer</footer>
```

### ARIA Labels
- [ ] Icon buttons have `aria-label`
- [ ] Form inputs have associated labels
- [ ] Dialogs have `aria-labelledby`
- [ ] Lists have proper structure

**Implementation:**
```tsx
// ✅ Good: Icon button label
<button aria-label="Close">
  <XIcon />
</button>

// ✅ Good: Form label
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// ✅ Good: Dialog label
<dialog aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Action</h2>
</dialog>

// ✅ Good: List structure
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
```

### ARIA Live Regions
- [ ] Status messages use `role="status"`
- [ ] Alerts use `role="alert"`
- [ ] Live regions use `aria-live="polite"` or `aria-live="assertive"`

**Implementation:**
```tsx
// ✅ Good: Status message
<div role="status" aria-live="polite">
  {successMessage}
</div>

// ✅ Good: Alert
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

---

## Testing Tools

| Tool | Purpose | Link |
|------|---------|------|
| Lighthouse | Accessibility audit | Built into Chrome DevTools |
| WAVE | Visual feedback on accessibility | https://wave.webaim.org/ |
| NVDA | Screen reader (Windows) | https://www.nvaccess.org/ |
| JAWS | Screen reader (Windows) | https://www.freedomscientific.com/products/software/jaws/ |
| VoiceOver | Screen reader (macOS/iOS) | Built-in |
| WebAIM | Contrast checker | https://webaim.org/resources/contrastchecker/ |
| axe DevTools | Accessibility checker | https://www.deque.com/axe/devtools/ |

---

## Implementation Checklist

### Perceivable
- [ ] All images have alt text
- [ ] Color contrast meets WCAG AA
- [ ] Text is readable
- [ ] No color-only information

### Operable
- [ ] All functionality is keyboard accessible
- [ ] Focus is always visible
- [ ] No keyboard traps
- [ ] Tab order is logical

### Understandable
- [ ] Language is specified
- [ ] Navigation is consistent
- [ ] Error messages are clear
- [ ] Instructions are provided

### Robust
- [ ] HTML is valid
- [ ] ARIA is used correctly
- [ ] Components work with assistive tech
- [ ] No duplicate IDs

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Articles](https://webaim.org/articles/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)
