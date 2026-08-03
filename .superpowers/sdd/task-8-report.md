# Task 8 Report

## Status

Implemented: shared win screen, quit confirmation, human profile win recording, Bun/elementaryOS documentation, and carry-minor fixes.

## Commit

`feat: polish play flow, win screen, and README`

## Tests

- `bun run test`: 10 files, 36 tests passed
- `bun run build`: passed

## Manual checklist

- Kniffel custom scores and 60-point Kniffel: unit-tested
- Ludo terminal state and AI capture priority: unit-tested
- 2-human Memory completion, mute, profile reload, and UI-scale toggle: not browser-manually verified

## Concerns

The production build emits a dependency deprecation warning from `@vue/shared`; build exits successfully.

## Final review fixes

- TurnBanner supports game-specific hints with the existing Memory text as fallback.
- Game exit now navigates to the hub before clearing the active session, preventing the fallback screen flash.
- Ludo's "im Ziel" counter now includes only pieces at progress `43`.
- `bun run test`: 11 files, 39 tests passed.
