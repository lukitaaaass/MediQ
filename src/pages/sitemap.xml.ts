import { getCollection } from 'astro:content';

const STATIC_PAGES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: '/',           changefreq: 'weekly',  priority: '1.0' },
  { path: '/pricing',    changefreq: 'monthly', priority: '0.8' },
  { path: '/demo',       changefreq: 'monthly', priority: '0.9' },
  { path: '/informes',   changefreq: 'monthly', priority: '0.9' },
  { path: '/analiticas', changefreq: 'monthly', priority: '0.9' },
  { path: '/blog',       changefreq: 'weekly',  priority: '0.9' },
  { path: '/triadas',    changefreq: 'monthly', priority: '0.6' },
  { path: '/login',      changefreq: 'yearly',  priority: '0.3' },
];

const SITE = 'https://mediq.app';

export async function GET() {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const staticUrls = STATIC_PAGES.map(p =>
    `  <url>\n    <loc>${SITE}${p.path}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
  ).join('\n');

  const blogUrls = posts.map(post => {
    const lastmod = (post.data.updatedDate || post.data.publishDate).toISOString().split('T')[0];
    return `  <url>\n    <loc>${SITE}/blog/${post.slug}/</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls}\n${blogUrls}\n</urlset>\n`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
