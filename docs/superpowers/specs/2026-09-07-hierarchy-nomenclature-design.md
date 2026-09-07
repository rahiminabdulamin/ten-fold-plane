# Hierarchy Nomenclature Design

## Goal

Present Ten-Fold's hierarchy as Team (the existing workspace entity) and Workspace (the existing project entity), without changing application contracts.

## Scope

The frontend translation return path will translate English hierarchy words after i18next resolves existing keys. This retains locale keys, route names, TypeScript models, service calls, API payloads, and persisted data. Static notification and invitation templates will receive equivalent visible-copy changes only.

## Constraints

- `workspace` and `project` remain unchanged in identifiers, URLs, APIs, database models, and email template variables.
- Only rendered English copy changes: Workspace/Workspaces become Team/Teams; Project/Projects become Workspace/Workspaces.
- Email HTML changes are presentation-only and preserve template variables and links.

## Verification

Add a focused Node test for the terminology layer and the affected email templates, run it before and after implementation, then run i18n types and the web test suite.
