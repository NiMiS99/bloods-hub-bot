// scripts/generate-sitemap.js
// Generates sitemap.xml dynamically based on dashboard/out/ directory structure
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://bloodswow.it';
const outDir = path.join(__dirname, '..', 'dashboard', 'out');

const PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/raid/', changefreq: 'daily', priority: '0.9' },
  { path: '/classifiche/', changefreq: 'daily', priority: '0.8' },
  { path: '/eventi/', changefreq: 'daily', priority: '0.8' },
  { path: '/hall-of-fame/', changefreq: 'weekly', priority: '0.8' },
  { path: '/chi-siamo/', changefreq: 'monthly', priority: '0.7' },
  { path: '/youtube/', changefreq: 'weekly', priority: '0.8' },
  { path: '/blog/', changefreq: 'weekly', priority: '0.9' },
  { path: '/unisciti/', changefreq: 'monthly', priority: '0.7' },
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(p => `  <url>
    <loc>${BASE_URL}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

const outPath = path.join(outDir, 'sitemap.xml');
fs.writeFileSync(outPath, xml.trim() + '\n');
console.log(`Sitemap generated: ${outPath} (${PAGES.length} URLs)`);
