# Manual Location Input Seed Design

Date: 2026-05-21
Status: Draft

## Context
- CuacaPage manual location input is controlled by `manualLocationInput`.
- An effect currently re-fills the input from stored manual location whenever the input becomes empty.
- This causes the field to refill when the user clears it.

## Goals
- Allow the user to clear the manual location input without auto-refill.
- Keep the initial value seeded from stored manual location on first render.

## Non-Goals
- Changing how manual location data is stored.
- Changing the autocomplete search behavior beyond preventing unwanted refills.

## Proposed Approach (Option A)
- Add a `hasSeededManualInput` ref in `CuacaPage`.
- Update the existing restore effect to seed only when:
  - a stored label exists,
  - the input is empty,
  - `hasSeededManualInput` is false.
- After seeding, set `hasSeededManualInput` to true so it never re-seeds.
- Keep ignoring MUI Autocomplete `onInputChange` events with `reason === 'reset'`.

## Data Flow
- On mount: localStorage values load via `useLocalStorage` -> seed input once.
- On user edits: input changes only via `onInputChange` or `onChange` handlers.

## UI Behavior
- Field shows the stored manual label on first load.
- Clearing the field keeps it empty until the user types or selects a location.

## Error Handling
- No new error handling is required; existing search errors remain unchanged.

## Testing
- Add or update a CuacaPage test that clears the manual location input and verifies it stays empty.
- Manual smoke check on the Cuaca page.

## Risks
- If the stored manual location changes after mount, the input will not auto-sync. This is acceptable for the desired UX.
