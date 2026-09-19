import { describe, expect, it } from "vitest";

import { resolveSelectedWorkspaceId, resolveWorkspaceToolTarget } from "./workspace-context";

describe("Copilot Workspace context", () => {
  const availableIds = ["workspace-a", "workspace-b"];

  it("uses a valid Workspace route over a manual selection", () => {
    expect(
      resolveSelectedWorkspaceId({ routeProjectId: "workspace-b", selectedProjectId: "workspace-a", availableIds })
    ).toBe("workspace-b");
  });

  it("keeps a valid manual selection away from a Workspace route", () => {
    expect(
      resolveSelectedWorkspaceId({ routeProjectId: undefined, selectedProjectId: "workspace-b", availableIds })
    ).toBe("workspace-b");
  });

  it("selects exactly one Workspace and never guesses among many", () => {
    expect(
      resolveSelectedWorkspaceId({ routeProjectId: undefined, selectedProjectId: undefined, availableIds: ["only"] })
    ).toBe("only");
    expect(
      resolveSelectedWorkspaceId({ routeProjectId: undefined, selectedProjectId: undefined, availableIds })
    ).toBeNull();
  });

  it("clears inaccessible route and selected Workspace IDs", () => {
    expect(
      resolveSelectedWorkspaceId({ routeProjectId: "missing", selectedProjectId: "workspace-a", availableIds })
    ).toBeNull();
    expect(
      resolveSelectedWorkspaceId({ routeProjectId: undefined, selectedProjectId: "missing", availableIds: [] })
    ).toBeNull();
  });

  it("uses an explicit target for one call before selected context", () => {
    expect(resolveWorkspaceToolTarget("workspace-b", "workspace-a")).toBe("workspace-b");
    expect(resolveWorkspaceToolTarget(undefined, "workspace-a")).toBe("workspace-a");
    expect(resolveWorkspaceToolTarget(undefined, null)).toBeNull();
  });
});
