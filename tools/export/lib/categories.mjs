// Category cleanup per PLAN.md: fix the "Acrilyc" typo, drop the unused
// "Comission" typo-duplicate (0 posts) and drop "Uncategorized".
const RENAME = { acrilyc: { slug: "acrylic", name: "Acrylic" } };
const DROP_SLUGS = new Set(["comission", "uncategorized"]);

export function buildCategoryMap(categoryList) {
  const byId = new Map();
  for (const cat of categoryList) {
    if (DROP_SLUGS.has(cat.slug)) continue;
    const renamed = RENAME[cat.slug];
    byId.set(cat.id, renamed ?? { slug: cat.slug, name: cat.name });
  }
  return {
    slugsFor: (ids) => ids.map((id) => byId.get(id)).filter(Boolean).map((c) => c.slug),
  };
}
