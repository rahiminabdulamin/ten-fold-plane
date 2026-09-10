import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MaintenanceMessage } from "./maintenance-message";

describe("MaintenanceMessage", () => {
  it("identifies the startup error as a Ten-Fold error", () => {
    const markup = renderToStaticMarkup(<MaintenanceMessage />);

    expect(markup).toContain("Ten-Fold");
    expect(markup).not.toContain("Looks like Plane");
  });
});
