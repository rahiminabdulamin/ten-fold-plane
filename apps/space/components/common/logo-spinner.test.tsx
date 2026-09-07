import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LogoSpinner } from "./logo-spinner";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));

describe("LogoSpinner", () => {
  it("shows Ten-Fold loading branding", () => {
    const markup = renderToStaticMarkup(<LogoSpinner />);

    expect(markup).toContain('alt="Ten-Fold"');
    expect(markup).toContain("Please wait...");
  });
});
