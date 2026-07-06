// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // Preview URL until the DNS cutover; switch back to https://arshanskaya.com
  // (and restore public/CNAME) when the domain moves — see README.md.
  site: "https://arshanskaya.github.io",
  integrations: [sitemap()],
  redirects: {
    "/feed/": "/rss.xml",
  },
});
