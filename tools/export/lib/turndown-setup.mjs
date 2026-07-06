import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

function escapeMd(text) {
  return text.replace(/([*_[\]])/g, "\\$1");
}

// Content files live at src/content/{posts,pages}/<slug>.md, two levels
// below src/, so assets at src/assets/uploads/... are reached via ../../.
function assetPathFor(localPath, fallbackUrl) {
  return localPath ? `../../${localPath}` : fallbackUrl;
}

function resolveImgUrl(node) {
  return node.getAttribute("data-full-url") || node.getAttribute("src");
}

function galleryBlock(lines) {
  return `\n\n<!-- gallery -->\n${lines.join("\n\n")}\n<!-- /gallery -->\n\n`;
}

export function createTurndownService(mediaIndex) {
  const service = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  service.use(gfm);
  service.remove(["style", "script"]);

  // Gutenberg gallery block: one combined caption for the whole gallery.
  service.addRule("gutenbergGallery", {
    filter: (node) =>
      node.nodeName === "FIGURE" && (node.getAttribute("class") || "").includes("wp-block-gallery"),
    replacement: (_content, node) => {
      const imgs = Array.from(node.querySelectorAll("img"));
      const lines = imgs.map((img) => {
        const local = mediaIndex.resolveUrl(resolveImgUrl(img));
        const alt = escapeMd(img.getAttribute("alt") || "");
        return `![${alt}](${assetPathFor(local, resolveImgUrl(img))})`;
      });
      const captionEl = node.querySelector("figcaption");
      const caption = captionEl ? captionEl.textContent.trim().replace(/\s+/g, " ") : "";
      if (caption) lines.push(`*${escapeMd(caption)}*`);
      return galleryBlock(lines);
    },
  });

  // Classic [gallery] shortcode output: <div class="gallery"><dl class="gallery-item">
  // one <dt><a><img></a></dt> + optional <dd class="gallery-caption"> per image.
  service.addRule("classicGallery", {
    filter: (node) =>
      node.nodeName === "DIV" && (node.getAttribute("class") || "").split(/\s+/).includes("gallery"),
    replacement: (_content, node) => {
      const items = Array.from(node.querySelectorAll("dl.gallery-item"));
      const lines = items.map((dl) => {
        const img = dl.querySelector("img");
        const link = dl.querySelector("a");
        const url = link?.getAttribute("href") || (img && resolveImgUrl(img));
        const local = mediaIndex.resolveUrl(url);
        const alt = escapeMd(img?.getAttribute("alt") || "");
        const captionEl = dl.querySelector(".gallery-caption");
        const caption = captionEl ? captionEl.textContent.trim().replace(/\s+/g, " ") : "";
        const imgLine = `![${alt}](${assetPathFor(local, url)})`;
        return caption ? `${imgLine}\n*${escapeMd(caption)}*` : imgLine;
      });
      return galleryBlock(lines);
    },
  });

  // Any remaining standalone image (not part of a gallery block above).
  service.addRule("image", {
    filter: "img",
    replacement: (_content, node) => {
      const url = resolveImgUrl(node);
      const local = mediaIndex.resolveUrl(url);
      const alt = escapeMd(node.getAttribute("alt") || "");
      return `![${alt}](${assetPathFor(local, url)})`;
    },
  });

  // Links pointing at a WP media file directly (WP's "Link To > Media File"
  // image option) — rewrite to the local asset so nothing depends on the old
  // WP server once it's decommissioned.
  service.addRule("linkToLocalMedia", {
    filter: (node) => node.nodeName === "A" && Boolean(mediaIndex.resolveUrl(node.getAttribute("href"))),
    replacement: (content, node) => {
      const local = mediaIndex.resolveUrl(node.getAttribute("href"));
      return `[${content}](${assetPathFor(local, node.getAttribute("href"))})`;
    },
  });

  // Video embeds (YouTube/Vimeo iframes) have no markdown equivalent;
  // keep the raw HTML, markdown renderers pass it through untouched.
  service.addRule("iframe", {
    filter: "iframe",
    replacement: (_content, node) => `\n\n${node.outerHTML}\n\n`,
  });

  return service;
}
