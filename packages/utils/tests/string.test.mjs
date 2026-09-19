import assert from "node:assert/strict";
import test from "node:test";

const { isEmptyHtmlString, sanitizeHTML } = await import("../dist/index.js");

test("sanitizeHTML returns decoded text without executable markup", () => {
  assert.equal(
    sanitizeHTML(
      "<p>Hello <strong>world</strong> &amp; friends</p><script>alert(1)</script><textarea>hidden</textarea><xmp>also hidden</xmp>"
    ),
    "Hello world & friends"
  );
});

test("isEmptyHtmlString preserves explicitly allowed meaningful elements", () => {
  assert.equal(isEmptyHtmlString("<p> </p>"), true);
  assert.equal(isEmptyHtmlString('<img src="image.png">', ["img"]), false);
  assert.equal(isEmptyHtmlString("<textarea></textarea>", ["textarea"]), false);
  assert.equal(isEmptyHtmlString("<script>alert(1)</script><style>body {}</style>"), true);
});
