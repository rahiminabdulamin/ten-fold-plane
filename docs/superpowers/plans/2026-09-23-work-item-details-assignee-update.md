# Work-item Details Assignee Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make assignee updates from an existing work item's details page succeed.

**Architecture:** Supply the workspace ID already present on the loaded issue to the existing update serializer; retain the established `assignee_ids` API contract and validation.

**Tech Stack:** Django REST Framework, pytest.

**Spec:** `docs/superpowers/specs/2026-09-23-work-item-details-assignee-update-design.md`

## Global Constraints

- No frontend payload changes, new dependencies, or serializer abstractions.
- Preserve active workspace-member validation for `assignee_ids`.
- Work in the current checkout as explicitly requested.

## Review Focus

- Empty `assignee_ids` must still clear assignees through the existing serializer behavior.
- A non-member assignee must continue to receive a 400.
- State-only updates must remain unaffected by the added serializer context.

---

### Task 1: Cover and repair details-page assignee updates

**Files:**

- Modify: `apps/api/plane/tests/contract/api/test_issue_assignee_label_validation.py`
- Modify: `apps/api/plane/app/views/issue/base.py:691`

**Interfaces:**

- Consumes: PATCH data shaped as `{ "assignee_ids": ["<workspace-member-uuid>"] }`.
- Produces: HTTP 204 and an `IssueAssignee` row for the selected member.

- [ ] **Step 1: Write the failing API contract test**

```python
response = api_key_client.patch(url, {"assignee_ids": [str(create_user.id)]}, format="json")

assert response.status_code == status.HTTP_204_NO_CONTENT
create_issue.refresh_from_db()
assert list(create_issue.assignees.values_list("id", flat=True)) == [create_user.id]
```

- [ ] **Step 2: Run the regression test and verify it fails**

Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest plane/tests/contract/api/test_issue_assignee_label_validation.py -q`

Expected: failure caused by the missing `workspace_id` serializer context during a non-empty assignee update.

- [ ] **Step 3: Supply the issue workspace ID to the existing serializer**

```python
serializer = IssueCreateSerializer(
    issue,
    data=request.data,
    partial=True,
    context={"project_id": project_id, "workspace_id": issue.workspace_id},
)
```

- [ ] **Step 4: Run the regression file and verify it passes**

Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest plane/tests/contract/api/test_issue_assignee_label_validation.py -q`

Expected: all tests pass, including valid assignment and invalid-assignee rejection.

- [ ] **Step 5: Run the API unit serializer coverage**

Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest plane/tests/unit/serializers/test_issue_serializer_api.py -q`

Expected: all tests pass.
