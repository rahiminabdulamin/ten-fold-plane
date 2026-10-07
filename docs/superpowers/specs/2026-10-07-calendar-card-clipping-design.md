# Calendar card clipping fix

## Intent and cause

Desktop Work Items calendars must show every loaded card when a week contains date ranges and multiple single-day items. Currently the week reuses interval lanes across dates to calculate its height, while the renderer stacks all single-day cards below the deepest range lane. Those two layouts disagree and the week's overflow clips cards.

## Approach

Keep the existing range overlay and per-day card lists. Calculate desktop row capacity as the deepest range lane count plus the largest single-day card count on any visible date. Use that capacity for desktop month-week height; keep the existing 32px header, 40px rows, 40px footer allowance, and 80px minimum content height.

Using every card's assigned lane for desktop positioning would require changing rendering and ordering. Removing overflow alone would let cards spill into the next week. Correcting the height is the smallest complete fix.

## Constraints and acceptance

- No dependencies, API changes, or store changes.
- Preserve mobile lane allocation, range continuation, hidden weekends, card ordering, drag targets, quick actions, and week layout.
- An early-week range plus three later single-day cards reserves four rows.
- Two occupied range lanes plus three single-day cards reserves five rows.
- Empty weeks and weeks containing only ranges or only single-day cards retain their minimum and required capacity.
- Month rows grow and the existing calendar scroll container handles overflow.

## Verification

Test real row-capacity calculation with the reported scenario, separated dates, overlap, range-only and empty weeks. Update the existing source contract to confirm month height consumes desktop capacity. Run focused calendar tests, formatting, lint, and web type checking. Browser verification depends on an available authenticated app session.
