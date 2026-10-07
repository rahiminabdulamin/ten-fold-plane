# Mobile calendar marker refinement

## Intent

Single-date work items show one dot without a pale stub. Date ranges show a connector thinner than their endpoint dots.

## Approach

Keep the existing 16px marker lanes and their positioning. Make the lane wrapper transparent. Render a centered 4px-high pale connector only when the item continues to an adjacent date. Keep endpoint dots 12px in diameter, centered vertically in the lane. An isolated item renders one centered 12px dark dot with no connector or endpoint offset.

## Acceptance criteria

- Single-date items show exactly one centered dark dot, no pale stub.
- Range connectors are 4px high; endpoint dots remain 12px in diameter.
- Range starts, middles and ends retain their existing horizontal extent and join across adjacent cells.
- Existing neutral colors remain: connector `#BFBFBF`, dots `#71777A`.
- Preserve separate lanes for overlapping items, row height, selected-date agenda, week boundary continuation, and desktop cards.
- No dependencies or changes to calendar data or interactions.

## Alternatives

Shrinking the whole existing marker would also shrink the dots and change lane positioning. Rendering the connector inside the existing transparent lane keeps alignment intact with fewer changes.

## Verification

Extend the existing mobile calendar checks for the isolated-dot and conditional thin-connector markup, watching them fail before implementation. Run calendar unit tests, mobile source contracts, changed-file lint and formatting, and web type checking. A source-contract test does not establish browser appearance; report whether browser rendering was verified.
