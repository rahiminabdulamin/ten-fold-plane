# Copilot Tool Schema Compatibility Design

## Goal

Restore assistant responses by ensuring frontend tool parameters serialize to JSON Schema without references rejected by CopilotKit Intelligence.

## Root Cause

The work-item mutation schema reused one `z.string().date()` instance for both date fields. CopilotKit's Zod converter emits the second occurrence as `$ref: "#/properties/startDate/anyOf/0"`. The hosted Intelligence runtime rejects this schema with `Invalid JSON schema`, preventing an agent run before it processes a message.

## Change

Inline independent date validators for `startDate` and `targetDate`. Their validation behavior stays identical, but the serialized schema has two concrete date definitions and no `$ref`. No API, UI, or dependency changes are needed.

## Verification

Add a source-contract regression assertion that disallows the shared `dateSchema` declaration and requires independent date validators. Run the focused Copilot test and the web type check.
