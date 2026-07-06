import { htmlToText } from "./html-text.mjs";

const PORTFOLIO_SLIDESHOW_RE = /\[portfolio_slideshow[^\]]*\]/g;

// A handful of old posts use the [portfolio_slideshow] shortcode from a
// plugin that's no longer installed, so /wp/v2 no longer expands it and the
// images are missing from content.rendered entirely. The images themselves
// are still attached to the post (media.post === postId), just not inlined
// in the shortcode's place, so rebuild an equivalent classic-gallery <div>
// from the attached media and substitute it in.
export function expandPortfolioSlideshow(html, postId, mediaIndex) {
  if (!PORTFOLIO_SLIDESHOW_RE.test(html)) return html;
  const attached = mediaIndex.attachedTo(postId).filter((m) => m.mime_type?.startsWith("image/"));
  if (attached.length === 0) return html.replace(PORTFOLIO_SLIDESHOW_RE, "");

  const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const items = attached
    .map((m) => {
      const alt = attr(m.alt_text || "");
      const caption = htmlToText(m.caption?.rendered || "");
      const captionHtml = caption ? `<dd class="gallery-caption">${caption}</dd>` : "";
      return `<dl class="gallery-item"><dt><a href="${attr(m.source_url)}"><img src="${attr(m.source_url)}" alt="${alt}"></a></dt>${captionHtml}</dl>`;
    })
    .join("");
  const reconstructed = `<div class="gallery reconstructed">${items}</div>`;

  PORTFOLIO_SLIDESHOW_RE.lastIndex = 0;
  return html.replace(PORTFOLIO_SLIDESHOW_RE, reconstructed);
}
