import { describe, expect, it } from "vitest";
import { meta } from "./layout";

describe("published issue metadata", () => {
  it("uses the Ten-Fold logo instead of a project's legacy cover image", () => {
    const tags = meta({
      loaderData: {
        metadata: {
          name: "Published roadmap",
          description: "A public project view",
          cover_image: "https://cdn.example.com/plane-logo.png",
        },
      },
    } as never);

    expect(tags).toContainEqual({ property: "og:image", content: expect.stringContaining("tenfold-logo-square") });
    expect(tags).toContainEqual({ name: "twitter:image", content: expect.stringContaining("tenfold-logo-square") });
    expect(tags).not.toContainEqual({ property: "og:image", content: "https://cdn.example.com/plane-logo.png" });
  });
});
