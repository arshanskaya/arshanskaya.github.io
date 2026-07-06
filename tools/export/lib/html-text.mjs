import domino from "@mixmark-io/domino";

const doc = domino.createDocument("<div id='root'></div>");
const root = doc.getElementById("root");

// Strips tags and decodes entities from a small HTML snippet (titles,
// excerpts, captions) by round-tripping it through a real DOM parser.
export function htmlToText(html) {
  root.innerHTML = html || "";
  return root.textContent.trim().replace(/\s+/g, " ");
}
