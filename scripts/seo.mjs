// Genera SEO estático antes del build:
//   - public/sitemap.xml  (solo con SITE_URL definida)
//   - public/robots.txt   (se le añade la línea `Sitemap:` si hay SITE_URL)
//
// Uso:  node scripts/seo.mjs
// Env:  SITE_URL (o VITE_SITE_URL)  → https://tudominio.com
//       VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY → lista las obras publicadas
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

function leerEnv() {
  const env = {};
  try {
    for (const linea of readFileSync(join(raiz, ".env"), "utf8").split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* sin .env seguimos con process.env */
  }
  return { ...env, ...process.env };
}

const ROBOTS_BASE = `User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /
`;

const escapar = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function obrasPublicadas(env) {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.warn("  · sin VITE_SUPABASE_URL/KEY: el sitemap solo incluirá la portada.");
    return [];
  }
  try {
    const r = await fetch(
      `${url}/rest/v1/escritos?select=id,actualizado&estado=eq.publicado&order=actualizado.desc&limit=5000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn(
      `  · no se pudo leer las obras publicadas (${e.message}): sitemap solo con portada.`,
    );
    return [];
  }
}

const env = leerEnv();
const site = (env.SITE_URL || env.VITE_SITE_URL || "").replace(/\/+$/, "");

if (!site) {
  console.warn(
    "[seo] AVISA: SITE_URL no está definida; no se genera el sitemap.\n" +
      "       Define SITE_URL=https://tudominio.com (o VITE_SITE_URL) en .env para activarlo.",
  );
} else if (!/^https?:\/\//.test(site)) {
  console.warn(
    `[seo] AVISA: SITE_URL debe empezar por http(s):// (valor: "${site}"); sitemap omitido.`,
  );
} else {
  const obras = await obrasPublicadas(env);
  const urls = [
    `  <url><loc>${escapar(site)}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...obras.map(
      (o) =>
        `  <url><loc>${escapar(site)}/obra/${o.id}</loc>` +
        (o.actualizado ? `<lastmod>${new Date(o.actualizado).toISOString()}</lastmod>` : "") +
        `<priority>0.8</priority></url>`,
    ),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
  writeFileSync(join(raiz, "public", "sitemap.xml"), sitemap, "utf8");
  console.log(`[seo] sitemap.xml con ${urls.length} URLs → public/sitemap.xml`);

  const robots = `${ROBOTS_BASE}\nSitemap: ${site}/sitemap.xml\n`;
  const actual = readFileSync(join(raiz, "public", "robots.txt"), "utf8");
  if (actual !== robots) {
    writeFileSync(join(raiz, "public", "robots.txt"), robots, "utf8");
    console.log("[seo] robots.txt actualizado con la línea Sitemap:");
  }
}
