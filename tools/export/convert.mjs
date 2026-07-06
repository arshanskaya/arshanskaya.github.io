// Converts raw WP REST dumps (tools/export/raw/*.json) into Astro content
// collection markdown files under src/content/{posts,pages}/.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify as toYaml } from "yaml";
import { buildMediaIndex } from "./lib/media-index.mjs";
import { buildCategoryMap } from "./lib/categories.mjs";
import { createTurndownService } from "./lib/turndown-setup.mjs";
import { htmlToText } from "./lib/html-text.mjs";
import { expandPortfolioSlideshow } from "./lib/shortcodes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..");
const CONTENT_DIR = path.join(REPO_ROOT, "src", "content");

// Blank-titled duplicate of /contact-form/ — see HANDOVER.md.
const SKIP_PAGE_SLUGS = new Set(["contact"]);

function cleanMarkdown(md) {
  return md
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}

async function loadRaw(name) {
  return JSON.parse(await readFile(path.join(__dirname, "raw", `${name}.json`), "utf8"));
}

async function convertOne(item, { turndown, mediaIndex, categoryMap, kind }) {
  let html = item.content.rendered;
  html = expandPortfolioSlideshow(html, item.id, mediaIndex);
  const body = cleanMarkdown(turndown.turndown(html));

  const frontmatter = {
    title: htmlToText(item.title.rendered),
    date: item.date,
    slug: item.slug,
    description: htmlToText(item.excerpt?.rendered || "").replace(/\[[a-z_]+[^\]]*\]/gi, "").trim(),
  };
  if (kind === "posts") {
    frontmatter.categories = categoryMap.slugsFor(item.categories);
  }

  const file = `---\n${toYaml(frontmatter).trim()}\n---\n\n${body}`;
  const dest = path.join(CONTENT_DIR, kind, `${item.slug}.md`);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, file);
  return dest;
}

async function main() {
  const [posts, pages, categories, media] = await Promise.all([
    loadRaw("posts"),
    loadRaw("pages"),
    loadRaw("categories"),
    loadRaw("media"),
  ]);

  const mediaIndex = buildMediaIndex(media);
  const categoryMap = buildCategoryMap(categories);
  const turndown = createTurndownService(mediaIndex);

  let count = 0;
  for (const post of posts) {
    await convertOne(post, { turndown, mediaIndex, categoryMap, kind: "posts" });
    count++;
  }
  for (const page of pages) {
    if (SKIP_PAGE_SLUGS.has(page.slug)) continue;
    await convertOne(page, { turndown, mediaIndex, categoryMap, kind: "pages" });
    count++;
  }
  console.log(`Wrote ${count} markdown files to src/content/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
