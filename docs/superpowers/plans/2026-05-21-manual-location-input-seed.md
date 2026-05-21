# Manual Location Input Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the manual location input to stay empty after a user clears it while still seeding once from stored location on initial load.

**Architecture:** Keep CuacaPage state-controlled input, add a `hasSeededManualInput` ref to gate the one-time seed effect and to mark user edits. Update the Autocomplete test mock so tests can drive and observe the input value.

**Tech Stack:** Next.js (app router), React 19, MUI, Vitest, Testing Library.

---

## File Structure

- Modify: app/dashboard/cuaca/page.tsx
- Modify: tests/components/CuacaPageWeather.test.tsx

### Task 1: Enhance Autocomplete Test Mock

**Files:**
- Modify: tests/components/CuacaPageWeather.test.tsx

- [ ] **Step 1: Update the Autocomplete mock to pass inputValue and onInputChange**

```tsx
vi.mock('@mui/material/Autocomplete', async () => {
  const React = await import('react');

  type AutocompleteProps = {
    renderInput: (params: Record<string, unknown>) => unknown;
    inputValue?: string;
    onInputChange?: (event: unknown, value: string, reason: string) => void;
  };

  return {
    default: ({ renderInput, inputValue = '', onInputChange }: AutocompleteProps) =>
      React.createElement('div', null, renderInput({
        id: 'manual-location',
        value: inputValue,
        onChange: (event: { target: { value: string } }) => {
          onInputChange?.(event, event.target.value, 'input');
        },
      })),
  };
});
```

- [ ] **Step 2: Run the component tests to confirm no regressions yet**

Run: `npm run test -- tests/components/CuacaPageWeather.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/components/CuacaPageWeather.test.tsx
git commit -m "test: improve Autocomplete mock for CuacaPage"
```

### Task 2: Add Failing Test for Clear Behavior

**Files:**
- Modify: tests/components/CuacaPageWeather.test.tsx

- [ ] **Step 1: Add the new test**

```tsx
  it('does not refill manual location input after clearing', async () => {
    render(<CuacaPage />);

    const input = await screen.findByLabelText(/Lokasi Manual/i);
    await waitFor(() => expect(input).toHaveValue('Mulyoagung, Dau, Kabupaten Malang'));

    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() => expect(input).toHaveValue(''));
  });
```

- [ ] **Step 2: Run the test to verify it fails with current behavior**

Run: `npm run test -- tests/components/CuacaPageWeather.test.tsx`
Expected: FAIL in "does not refill manual location input after clearing" with the input value reverting to the stored label.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/components/CuacaPageWeather.test.tsx
git commit -m "test: cover manual location clear behavior"
```

### Task 3: Gate the One-Time Seed in CuacaPage

**Files:**
- Modify: app/dashboard/cuaca/page.tsx

- [ ] **Step 1: Add a seed flag and update the effect and handlers**

```tsx
import { useEffect, useRef, useState, type MouseEvent } from 'react';

const initialManualLocationLabel = manualLocationDetail?.label || manualLocation;
const [manualLocationInput, setManualLocationInput] = useState(initialManualLocationLabel);
const hasSeededManualInput = useRef(Boolean(initialManualLocationLabel));

useEffect(() => {
  if (hasSeededManualInput.current) return;
  const storedLocationLabel = manualLocationDetail?.label || manualLocation;
  if (storedLocationLabel && !selectedManualLocation && manualLocationInput.length === 0) {
    setManualLocationInput(storedLocationLabel);
    hasSeededManualInput.current = true;
  }
}, [manualLocation, manualLocationDetail?.label, manualLocationInput.length, selectedManualLocation]);

// In onInputChange
hasSeededManualInput.current = true;

// In onChange
hasSeededManualInput.current = true;
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npm run test -- tests/components/CuacaPageWeather.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit the fix**

```bash
git add app/dashboard/cuaca/page.tsx
git commit -m "fix: seed manual location input only once"
```

---

## Plan Self-Review

- Spec coverage: Seeds only once and prevents auto-refill after user clear; test coverage included.
- Placeholder scan: No placeholders or TBDs.
- Type consistency: React hooks and handler signatures match existing usage.
