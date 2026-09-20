import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeStore } from "./theme.store";

describe("ThemeStore extended sidebar", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", { setItem: vi.fn() });
  });

  it("opens the requested navigation panel", () => {
    const store = new ThemeStore();

    store.openExtendedSidebar("personal");

    expect(store.isExtendedSidebarOpened).toBe(true);
    expect(store.extendedSidebarMode).toBe("personal");
  });
});
