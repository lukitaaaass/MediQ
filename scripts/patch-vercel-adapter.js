import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function patchFile(relPath, search, replace, label) {
  try {
    const filePath = join(__dirname, relPath);
    const content = readFileSync(filePath, 'utf8');
    const patched = content.replace(search, replace);
    if (content === patched) {
      console.log(`[patch] ${label}: already patched or pattern not found, skipping.`);
    } else {
      writeFileSync(filePath, patched, 'utf8');
      console.log(`[patch] ${label}: patched successfully.`);
    }
  } catch (e) {
    console.warn(`[patch] ${label}: could not patch:`, e.message);
  }
}

patchFile(
  '../node_modules/@astrojs/vercel/dist/index.js',
  'const fourOhFourRoute = routes.find(',
  'const fourOhFourRoute = routes?.find(',
  'fourOhFourRoute'
);

patchFile(
  '../node_modules/@astrojs/vercel/dist/lib/redirects.js',
  'for (const route of routes)',
  'for (const route of (routes || []))',
  'getRedirects'
);
