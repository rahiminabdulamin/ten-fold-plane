import gristEditorCss from "../../../proxy/grist-custom.css?raw";

/** Apply the same UI policy as Grist's stylesheet before exposing the editor. */
export function applyGristEditorStyle(document: Document) {
  if (document.getElementById("tenfold-editor-style")) return;
  const style = document.createElement("style");
  style.id = "tenfold-editor-style";
  style.textContent = gristEditorCss;
  document.head.appendChild(style);
}
