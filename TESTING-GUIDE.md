# Accessibility Testing Guide - CYOA App

## Quick Start Testing

### 1. Keyboard Navigation Test
**Goal:** Navigate entire site using only keyboard

1. **Starting on Home Page:**
   ```
   - Press Tab to move through elements
   - Look for visible blue outline (focus indicator)
   - All buttons should be reachable
   - Try Read buttons → Should navigate to story
   ```

2. **On Read Page:**
   ```
   - Use Arrow Up/Down to navigate story choices
   - Press Enter to select a choice
   - See focus move to first choice initially
   - Page should scroll to content automatically
   ```

3. **On Author Page:**
   ```
   - Tab through form fields
   - Press Tab through error messages (if any)
   - Fill form and press Enter or click Submit
   - Success message appears
   - Clear button resets form
   ```

---

## 2. Screen Reader Testing

### macOS (Built-in VoiceOver)
```
Enable VoiceOver:
- System Settings → Accessibility → VoiceOver
- Toggle ON
- Cmd + F5 also toggles

Test Features:
- VoiceOver + Right Arrow: Move through page
- VoiceOver + U: Web rotor (sections, links, etc.)
- Listen for page structure announced
- Form labels should be announced with fields
- Error messages should be announced as alerts
```

### Testing Points:
- [ ] Page title announces correctly
- [ ] Navigation sections announced
- [ ] Form labels tied to inputs
- [ ] Error messages marked as alerts
- [ ] Button purposes clear
- [ ] Loading states announced
- [ ] Page transitions announced

---

## 3. Color & Contrast Testing

### Using Browser DevTools:
1. Open DevTools (F12 or Cmd+Option+I)
2. Elements → Computed Styles → Color section
3. Check contrast ratio

### Key Elements to Test:
- [ ] Text on buttons (should show 4.5:1+)
- [ ] Form labels (4.5:1+)
- [ ] Status badges (text should not rely on color alone)
- [ ] Links (should have underline or other indicator)

### Tool: Use axe DevTools Extension
1. Install from Chrome/Firefox store
2. Run scan on each page
3. Review violations

---

## 4. Mobile Responsiveness

### Test Sizes:
- **320px width** (iPhone SE):
  - Single column layout
  - Buttons full width or stacked
  - No horizontal scroll
  
- **768px width** (iPad):
  - 2-column grid for stories
  - Form still usable
  
- **1024px+ width** (Desktop):
  - 3-column grid for stories
  - Full layout visible

### Tools:
```
DevTools → Toggle device toolbar (Ctrl+Shift+M or Cmd+Shift+M)
Or manually resize browser window
```

---

## 5. Feature Testing Checklist

### Home Page
- [ ] Story list displays (with mock data)
- [ ] Can click "Read" on story → Goes to Read page
- [ ] Can click "Create Story" → Goes to Author page
- [ ] Breadcrumbs show Home
- [ ] Responsive at 320px, 768px, 1024px

### Author Page
- [ ] Form fields display
- [ ] Typing in fields updates character counter
- [ ] Submit button disables while submitting
- [ ] Error messages show for empty fields
- [ ] Success message appears after submit
- [ ] Clear button resets form
- [ ] Can navigate back via breadcrumb

### Read Page
- [ ] Story content displays
- [ ] Page number and progress bar show
- [ ] Can click choices to navigate
- [ ] Arrow keys navigate choices
- [ ] Focus moves to first choice on load
- [ ] "Start Over" button resets to page 1
- [ ] "Back to Stories" navigates home
- [ ] Keyboard navigation works

---

## 6. Error Handling Testing

### Test Error States:

1. **Form Validation:**
   ```
   - Try submit empty form
   - Error messages appear in red
   - Fields marked with aria-invalid="true"
   - Screen reader announces errors
   ```

2. **Story Not Found:**
   ```
   - Visit /read/nonexistent
   - Error message with retry button
   - Can navigate back
   ```

3. **Error Boundary:**
   ```
   - Component error shows error UI
   - Reload button available
   - User not stuck on blank page
   ```

---

## 7. Focus Management Testing

### Visual Indicators:
- [ ] All buttons have blue outline when focused
- [ ] Form fields show blue ring when focused
- [ ] Links show outline when tabbed to
- [ ] Focus never "lost" or invisible
- [ ] Tab order is logical (left→right, top→bottom)

### On Dialogs (when implemented):
- [ ] Focus moves into dialog
- [ ] Can only tab within dialog
- [ ] Escape closes dialog and returns focus
- [ ] First interactive element focused on open

---

## 8. Loading States

### Test:
1. Go to Home page
2. Refresh (F5)
3. Should see loading spinner
4. After 2-3 seconds, stories appear
5. Loading message was announced to screen readers

---

## 9. Reduced Motion

### Enable Reduced Motion:
```
macOS:
- System Settings → Accessibility → Display
- Turn ON "Reduce motion"

Linux:
- Settings → Accessibility → Visibility
- Enable Prefers Reduced Motion
```

### Test:
- [ ] Page still interactive
- [ ] Animations removed (but functionality stays)
- [ ] Transitions disabled (smooth scroll becomes instant)
- [ ] No motion sickness triggers

---

## 10. Responsiveness at Edge Cases

### Extra Small (320px):
- [ ] Text readable without zoom
- [ ] Buttons have 44px+ touch targets
- [ ] No horizontal scroll
- [ ] Form inputs not obscured

### Extra Large (1400px+):
- [ ] Content centered, not stretched
- [ ] Still readable
- [ ] Line length reasonable (not too wide)

---

## Common Issues & Fixes

### ❌ Focus invisible
**Fix:** Check that element has `focus:outline-none focus:ring-2`

### ❌ Screen reader doesn't announce error
**Fix:** Check `aria-invalid="true"` and error is in `aria-describedby`

### ❌ Color alone conveys information
**Fix:** Add icon, text label, or pattern to status

### ❌ Mobile buttons too small
**Fix:** Ensure at least 44x44px with padding

### ❌ Form field has no label
**Fix:** Add `<label htmlFor="fieldId">` and `id` on input

---

## Automated Testing Tools

### Browser Extensions:
1. **axe DevTools** - Scans for violations
2. **WAVE** - Visual feedback on accessibility
3. **Lighthouse** (built-in) - Performance + a11y

### Run:
```
DevTools → Lighthouse → Run audit → Check Accessibility score
```

---

## Manual Testing Scenario

**Complete User Journey (No Mouse):**

1. **Start:** Close your eyes or just use keyboard
2. **Home Page:**
   - Tab to "Create Story"
   - Press Enter → Go to Author
3. **Author Page:**
   - Tab to title field
   - Type a title
   - Tab to author field
   - Type author name
   - Tab to content field
   - Type story
   - Tab to submit button
   - Press Enter
   - Wait for success message (should be announced)
   - Press Tab back to Home
4. **Home Page:**
   - Tab to Read button
   - Press Enter → Go to Read
5. **Read Page:**
   - Listen for content announced
   - Press Down Arrow
   - Focus moves to first choice (should be announced)
   - Press Down again
   - Focus moves to second choice
   - Press Enter
   - Page updates, moves to next story page (should announce)
6. **Success!** You've used the app entirely by keyboard

---

## Reporting a Bug

When you find an issue, note:
1. What page/feature
2. What you were doing (keyboard, mouse, screen reader, etc.)
3. What happened
4. What should have happened
5. Device/browser used

Example:
```
BUG: Read page - choices not announcing to screen reader
- Page: Read (story 1, page 1)
- Action: Navigated with screen reader, reached choices
- What happened: Screen reader said "button" but not what choice
- Should say: "Choice: Enter the cave, button"
- Device: macOS, Safari, VoiceOver
```

---

## Testing Frequency

- ✅ Every page change: Test keyboard navigation
- ✅ Every form: Test validation + screen reader
- ✅ Before deployment: Run Lighthouse audit
- ✅ On bug report: Test with issue scenario

---

**Happy Testing! 🎉**

If you find any accessibility issues, remember: fixing them makes the app better for everyone, including keyboard users, screen reader users, people with low vision, and users with slow/unreliable internet!
