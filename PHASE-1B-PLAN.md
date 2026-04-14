# Phase 1B: Person B - Frontend Build (Accessibility + Fully Functional)

## Overview
Build a fully functional, accessible (WCAG 2.1 AA compliant) Choose-Your-Own-Adventure authoring and reading interface.

**Focus Areas:**
- ♿ Accessibility (keyboard navigation, ARIA labels, screen readers)
- 🔧 Fully functional components (no TODOs blocking users)
- 🎨 Polish UI/UX with proper error handling & loading states
- 🌍 Responsive design
- ⚡ Performance optimization

---

## Deliverables Checklist

### Core Pages (Enhanced)
- [x] **Home Page** - Landing, story grid, CTA
- [x] **Author Page** - Story creation form
- [x] **Read Page** - Story reader/player

### New Components (Accessibility Focus)
- [ ] **Header Navigation** - Accessible nav bar with skip links
- [ ] **Footer** - Links, info, accessibility statement
- [ ] **Alert/Toast** - Non-blocking notifications (ARIA live)
- [ ] **Loading Spinner** - Accessible loading indicator
- [ ] **Breadcrumbs** - Navigation context
- [ ] **Error Boundary** - Graceful error handling
- [ ] **Modal/Dialog** - Accessible confirmation dialogs

### Utility Modules
- [ ] **API Client** - Centralized axios instance with error handling
- [ ] **useStories Hook** - Story data management
- [ ] **useForm Hook** - Form state & validation
- [ ] **constants.js** - App routes, messages, config

### Accessibility Improvements
- [ ] Semantic HTML throughout
- [ ] ARIA labels and descriptions
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus management
- [ ] Color contrast (WCAG AA compliant)
- [ ] Form validation with error messages
- [ ] Skip to main content links
- [ ] Reduced motion support

### Styling & Design
- [ ] Enhanced Tailwind configuration (custom utilities)
- [ ] Dark mode support (optional but valuable)
- [ ] Custom CSS for animations (prefer CSS over JS)
- [ ] Better spacing and typography

### Testing Checklist
- [ ] All buttons/links keyboard accessible
- [ ] Screen reader announces page sections
- [ ] Forms have proper labels & error messages
- [ ] Loading states show progress
- [ ] Error states are recoverable
- [ ] Mobile responsive (test at 320px, 768px, 1024px+)
- [ ] Color contrast passes axe DevTools check

---

## Implementation Order

### Step 1: Create Utility Modules (15 min)
- API client with interceptors
- Custom hooks for data management
- Constants file

### Step 2: Create Base Components (30 min)
- Header with accessibility features
- Toast/Alert system
- Loading spinner
- Error boundary

### Step 3: Enhance Existing Pages (45 min)
- Home.jsx - Add breadcrumbs, improve layout
- Author.jsx - Better form with validation
- Read.jsx - Keyboard controls, screen reader optimizations

### Step 4: Polish & Testing (30 min)
- Test keyboard navigation
- Check ARIA implementations
- Verify mobile responsiveness
- Final styling tweaks

---

## Accessibility Standards

**Target: WCAG 2.1 Level AA**

### Critical Fixes
1. All interactive elements must be keyboard accessible
2. All images/icons need alt text or ARIA labels
3. Form inputs must have associated labels
4. Focus indicators must be visible
5. Color must not be the only way to convey information
6. Text contrast minimum 4.5:1 for normal text

### Nice-to-Haves
1. Dark mode support
2. Prefers-reduced-motion media query
3. Skip links on every page
4. Breadcrumb navigation
5. Print-friendly styles

---

## Time Estimate: 2-2.5 hours
- Utilities: 15 min
- Components: 30 min
- Page enhancements: 45 min
- Testing/Polish: 30 min

---

## Notes
- Mock API responses (Person A handles real backend)
- Focus on making UI feel polished and professional
- Every error should be user-friendly with recovery options
- Test everything on mobile and keyboard-only
