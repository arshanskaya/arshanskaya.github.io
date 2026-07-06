// One-off fetch of all WordPress content via the public REST API.
// Writes raw JSON dumps to tools/export/raw/ so convert.mjs can be
// re-run/tweaked without re-fetching.
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, "raw");
const BASE = "https://arshanskaya.com/wp-json/wp/v2";

async function fetchAllPages(endpoint) {
  const perPage = 100;
  let page = 1;
  let all = [];
  while (true) {
    const res = await fetch(`${BASE}/${endpoint}?per_page=${perPage}&page=${page}`);
    if (!res.ok) {
      // WP returns 400 for a page number past the last page.
      if (res.status === 400 && page > 1) break;
      throw new Error(`${endpoint} page ${page}: HTTP ${res.status}`);
    }
    const batch = await res.json();
    all = all.concat(batch);
    const totalPages = Number(res.headers.get("X-WP-TotalPages") ?? "1");
    console.log(`  ${endpoint} page ${page}/${totalPages} (+${batch.length}, total ${all.length})`);
    if (page >= totalPages) break;
    page++;
  }
  return all;
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });

  for (const endpoint of ["posts", "pages", "categories", "media"]) {
    console.log(`Fetching ${endpoint}...`);
    const data = await fetchAllPages(endpoint);
    await writeFile(path.join(RAW_DIR, `${endpoint}.json`), JSON.stringify(data, null, 2));
    console.log(`Saved ${data.length} ${endpoint} -> raw/${endpoint}.json`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
