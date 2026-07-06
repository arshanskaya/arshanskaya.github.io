// Maps every known WordPress media URL (original + every registered thumbnail
// size) to the local path we save the original under, so any <img src> or
// data-full-url found in content HTML can be rewritten to a local asset.
//
// Old post content sometimes links images via "http://www.arshanskaya.com/..."
// while the REST API reports canonical URLs as "https://arshanskaya.com/...".
// Matching is done on the URL path only (scheme/host stripped) to cover both.
const UPLOADS_PATH_PREFIX = "/wp-content/uploads/";

function pathOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

// Non-image attachments (e.g. PDFs) get an empty media_details, so derive
// their "file" (path relative to wp-content/uploads/) from source_url instead.
function fileOf(item) {
  if (item.media_details?.file) return item.media_details.file;
  const p = pathOf(item.source_url);
  return p.startsWith(UPLOADS_PATH_PREFIX) ? p.slice(UPLOADS_PATH_PREFIX.length) : null;
}

export function buildMediaIndex(mediaList) {
  const pathToLocal = new Map();
  const idToLocal = new Map();
  const attachedByPost = new Map();

  for (const item of mediaList) {
    const file = fileOf(item);
    if (!file) continue;
    const localPath = `assets/uploads/${file}`;

    pathToLocal.set(pathOf(item.source_url), localPath);
    idToLocal.set(item.id, localPath);

    const sizes = item.media_details?.sizes ?? {};
    for (const size of Object.values(sizes)) {
      if (size.source_url) pathToLocal.set(pathOf(size.source_url), localPath);
    }

    if (item.post != null) {
      if (!attachedByPost.has(item.post)) attachedByPost.set(item.post, []);
      attachedByPost.get(item.post).push(item);
    }
  }
  for (const list of attachedByPost.values()) list.sort((a, b) => a.id - b.id);

  function resolveUrl(url) {
    if (!url) return null;
    const clean = pathOf(url.split("?")[0]);
    const direct = pathToLocal.get(clean);
    if (direct) return direct;
    if (!clean.startsWith(UPLOADS_PATH_PREFIX)) return null;
    // Fallback: strip a "-WIDTHxHEIGHT" suffix WP appends to thumbnail
    // filenames and retry against the original file name.
    const stripped = clean.replace(/-\d+x\d+(?=\.[a-zA-Z0-9]+$)/, "");
    return pathToLocal.get(stripped) ?? null;
  }

  return {
    resolveUrl,
    resolveId: (id) => idToLocal.get(id) ?? null,
    attachedTo: (postId) => attachedByPost.get(postId) ?? [],
    allOriginals: () => mediaList.filter((m) => fileOf(m)).map((m) => ({ ...m, file: fileOf(m) })),
  };
}
