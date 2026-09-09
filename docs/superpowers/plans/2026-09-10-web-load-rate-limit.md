# Web Load Rate-Limit Implementation Plan

**Goal:** Prevent normal web startup from receiving Caddy 429 responses and avoid aggressive Copilot identity retries.

**Specification:** The web container must serve all boot assets without its own rate limiter. The Copilot identity client must use `Retry-After` when supplied; other failures use 5-second exponential backoff capped at 60 seconds. A successful refresh resets the failure count and resumes token-expiry refresh scheduling.

## Implementation

1. Add a pure `getRetryDelay` helper and regression tests for server-directed and fallback delays.
2. Use the helper in the existing Copilot identity effect, keeping only one scheduled retry and resetting failures after success.
3. Remove the Caddy rate-limit directive and its custom build dependency from the web image.
4. Verify focused tests, TypeScript checks, Caddy parsing through the production image when Docker is available, and inspect the final diff.
