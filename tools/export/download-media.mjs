// Downloads every media original (skipping WP-generated thumbnail sizes)
// into src/assets/uploads/, mirroring the wp-content/uploads path structure.
import { mkdir, writeFile, stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMediaIndex } from "./lib/media-index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..");
const SRC_DIR = path.join(REPO_ROOT, "src");

async function alreadyDownloaded(dest) {
  try {
    const s = await stat(dest);
    return s.size > 0;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  if (await alreadyDownloaded(dest)) return "skip";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return "ok";
}

async function main() {
  const media = JSON.parse(await readFile(path.join(__dirname, "raw", "media.json"), "utf8"));
  const idx = buildMediaIndex(media);

  const jobs = idx.allOriginals().map((m) => ({ url: m.source_url, localPath: `assets/uploads/${m.file}` }));

  let ok = 0, skip = 0, fail = 0;
  for (const [i, job] of jobs.entries()) {
    const dest = path.join(SRC_DIR, job.localPath);
    try {
      const result = await download(job.url, dest);
      if (result === "ok") ok++; else skip++;
      if ((i + 1) % 20 === 0 || i === jobs.length - 1) {
        console.log(`[${i + 1}/${jobs.length}] downloaded=${ok} skipped=${skip} failed=${fail}`);
      }
    } catch (err) {
      fail++;
      console.error(`FAILED ${job.url}: ${err.message}`);
    }
  }
  console.log(`Done. ${ok} downloaded, ${skip} already present, ${fail} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
