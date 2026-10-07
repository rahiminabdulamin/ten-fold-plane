# Assistant launcher viewport visibility

The desktop assistant launcher must remain accessible when the browser width or height shrinks. Its fixed pixel coordinates currently update only on initialization or dragging, so narrowing the window leaves it offscreen.

Reuse the existing 56px launcher and 24px gutter clamp on window resize. Preserve the current position when it fits, and move it inward when it does not. Keep dragging, reset, opening, mobile behavior and storage semantics intact. Remove the resize listener on unmount. No dependencies or panel redesign.

Acceptance: shrinking an 1800×1400 viewport to 1000×800 clamps an offscreen launcher to x=920, y=720; a dragged position at x=100, y=150 stays unchanged. Null initialization is safe. Listener cleanup uses the same callback.
