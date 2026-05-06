import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '../node_modules/@astrojs/vercel/dist/index.js');

try {
  const content = readFileSync(filePath, 'utf8');
  const patched = content.replace(
    'const fourOhFourRoute = routes.find(',
    'const fourOhFourRoute = routes?.find('
  );
  if (content === patched) {
    console.log('[patch] Already patched or pattern not found, skipping.');
  } else {
    writeFileSync(filePath, patched, 'utf8');
    console.log('[patch] @astrojs/vercel patched successfully.');
  }
} catch (e) {
  console.warn('[patch] Could not patch @astrojs/vercel:', e.message);
}
